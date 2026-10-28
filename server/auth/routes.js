import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateOpaqueRefreshToken,
  generatePasswordResetToken,
  getDummyPasswordHash,
  hashPassword,
  isPasswordBreached,
  PASSWORD_RESET_TTL_SECONDS,
  passwordNeedsRehash,
  REFRESH_TOKEN_TTL_SECONDS,
  sanitizeRedirectUrl,
  sha256Hex,
  signAccessToken,
  verifyPassword,
  verifyTotpCode,
} from './crypto.js';
import {
  clearSessionCookies,
  COOKIE_NAMES,
  createCsrfProtection,
  createRequireAuth,
  getClientIp,
  issueCsrfToken,
  securityHeadersMiddleware,
  setSessionCookies,
} from './middleware.js';
import { sendPasswordResetEmail } from './mailer.js';
import { authStore } from './store.js';

// =============================================================================
// Esquemas de validación en servidor con Zod (Nunca confiar solo en el cliente)
// =============================================================================
const EmailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Formato de correo inválido.')
  .max(254, 'El correo supera la longitud permitida.');

// Límite inferior 8 caracteres (política mínima) y superior 128 (mitiga DoS criptográfico)
const PasswordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña no puede superar 128 caracteres.');

const RegisterSchema = z.object({
  email: EmailField,
  password: PasswordField,
  name: z.string().trim().min(1).max(120).optional().default('Explorador'),
  role: z.enum(['student', 'teacher']).optional().default('student'),
  returnTo: z.string().optional().default('/dashboard'),
});

const LoginSchema = z.object({
  email: EmailField,
  password: PasswordField,
  returnTo: z.string().optional().default('/dashboard'),
});

const PasswordResetRequestSchema = z.object({
  email: EmailField,
});

const PasswordResetConfirmSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{24}\.[A-Za-z0-9_-]{32,64}$/, 'Formato de token inválido.'),
  newPassword: PasswordField,
});

const MfaVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'El código TOTP debe tener 6 dígitos.'),
  returnTo: z.string().optional().default('/dashboard'),
});

const GENERIC_AUTH_ERROR = 'Credenciales inválidas.';
const GENERIC_RESET_MESSAGE =
  'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

/**
 * Crea y configura el router Express para `/api/v1/auth`
 */
export function createAuthRouter({
  store = authStore,
  mailer = { sendPasswordResetEmail },
  onPasswordResetTokenIssued = null,
} = {}) {
  const router = express.Router();
  const csrfProtection = createCsrfProtection(store);
  const requireAuth = createRequireAuth(store);

  router.use(cookieParser());
  router.use(express.json({ limit: '32kb' }));
  router.use(securityHeadersMiddleware);

  // ---------------------------------------------------------------------------
  // 0. Emisión de Token CSRF (GET /api/v1/auth/csrf)
  // ---------------------------------------------------------------------------
  router.get('/csrf', (req, res) => {
    const csrfToken = issueCsrfToken(req, res);
    return res.status(200).json({ csrfToken });
  });

  // ---------------------------------------------------------------------------
  // 1. Registro de Usuario (POST /api/v1/auth/register)
  // ---------------------------------------------------------------------------
  router.post('/register', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Datos de registro inválidos.',
      });
    }

    const { email, password, name, role, returnTo } = parsed.data;
    const emailHash = sha256Hex(email);

    // 1.1 Comparar contra lista de contraseñas filtradas (100k local + HIBP k-Anonymity opcional)
    if (await isPasswordBreached(password)) {
      await store.writeAuditLog({
        emailHash,
        eventType: 'REGISTER_REJECTED_BREACHED_PASSWORD',
        ipAddress: ip,
        userAgent,
      });
      return res.status(400).json({
        error:
          'Esta contraseña aparece en filtraciones de seguridad conocidas. Por favor elige una contraseña más segura.',
      });
    }

    // 1.2 Verificar si el correo ya existe manteniendo trabajo criptográfico constante
    const existing = await store.findUserByEmail(email);
    const passwordHash = await hashPassword(password);

    if (existing) {
      await store.writeAuditLog({
        userId: existing.id,
        emailHash,
        eventType: 'REGISTER_CONFLICT_EMAIL',
        ipAddress: ip,
        userAgent,
      });
      return res.status(409).json({
        error: 'No fue posible completar el registro con los datos proporcionados.',
      });
    }

    const user = await store.createUser({
      email,
      passwordHash,
      name,
      role,
    });

    // 1.3 Emitir sesión inicial tras el registro
    const sessionId = crypto.randomUUID();
    const tokenFamilyId = crypto.randomUUID();
    const { rawToken: refreshToken, tokenHash: refreshTokenHash } = generateOpaqueRefreshToken();

    await store.createSession({
      sessionId,
      userId: user.id,
      tokenFamilyId,
      refreshTokenHash,
      ipAddress: ip,
      userAgent,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    });

    const accessToken = signAccessToken({
      userId: user.id,
      sessionId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    setSessionCookies(res, { accessToken, refreshToken });

    await store.writeAuditLog({
      userId: user.id,
      emailHash,
      eventType: 'REGISTER_SUCCESS',
      ipAddress: ip,
      userAgent,
      sessionId,
    });

    return res.status(201).json({
      status: 'REGISTERED',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectUrl: sanitizeRedirectUrl(returnTo),
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Login con enfoque "Security by Design" (POST /api/v1/auth/login)
  // ---------------------------------------------------------------------------
  router.post('/login', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 2.1 Extraer email candidato para aplicar Rate Limiting incluso ante payloads malformados
    const rawEmailCandidate =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'invalid-email';
    const emailHash = sha256Hex(rawEmailCandidate);

    // 2.2 Verificar ventana de Backoff activa en Rate Limiter
    const backoffStatus = await store.getRateLimitStatus(ip, emailHash);
    if (backoffStatus.blocked) {
      res.setHeader('Retry-After', String(backoffStatus.retryAfterSeconds));
      await store.writeAuditLog({
        emailHash,
        eventType: 'LOGIN_RATE_LIMITED',
        ipAddress: ip,
        userAgent,
        metadata: { retryAfterSeconds: backoffStatus.retryAfterSeconds },
      });
      return res.status(429).json({
        error: 'Demasiados intentos de inicio de sesión. Por favor espera antes de volver a intentar.',
        retryAfterSeconds: backoffStatus.retryAfterSeconds,
      });
    }

    // 2.3 Contabilizar intento en ventana de 15 minutos (máx 5 intentos por IP+usuario)
    const rlAttempt = await store.recordRateLimitAttempt(ip, emailHash);
    if (rlAttempt.exceeded) {
      res.setHeader('Retry-After', String(rlAttempt.retryAfterSeconds));
      await store.writeAuditLog({
        emailHash,
        eventType: 'LOGIN_RATE_LIMITED',
        ipAddress: ip,
        userAgent,
        metadata: {
          attemptsInWindow: rlAttempt.attemptsInWindow,
          retryAfterSeconds: rlAttempt.retryAfterSeconds,
        },
      });
      return res.status(429).json({
        error: 'Demasiados intentos de inicio de sesión. Por favor espera antes de volver a intentar.',
        retryAfterSeconds: rlAttempt.retryAfterSeconds,
      });
    }

    // 2.4 Validación estricta de esquema en servidor (mitiga SQLi / NoSQLi / Long Password DoS)
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      // Ejecutamos igualmente Argon2id sobre hash dummy para no filtrar validación por tiempo
      await verifyPassword(null, 'dummy-invalid-input-password');
      await store.writeAuditLog({
        emailHash,
        eventType: 'LOGIN_FAILED_VALIDATION',
        ipAddress: ip,
        userAgent,
      });
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    const { email, password, returnTo } = parsed.data;

    // 2.5 Buscar usuario en base de datos
    const user = await store.findUserByEmail(email);

    // 2.6 Verificar si la cuenta tiene un bloqueo temporal progresivo activo (locked_until > NOW)
    const isAccountLocked = Boolean(
      user?.locked_until && new Date(user.locked_until).getTime() > Date.now(),
    );

    // 2.7 Verificar contraseña con Argon2id SIEMPRE (usa DUMMY_PASSWORD_HASH si el usuario no existe)
    const isPasswordValid = await verifyPassword(user?.password_hash || null, password);

    if (!user || !user.is_active || isAccountLocked || !user.password_hash || !isPasswordValid) {
      if (user) {
        await store.incrementFailedLoginAttempts(user.id);
      }

      await store.writeAuditLog({
        userId: user?.id ?? null,
        emailHash,
        eventType: isAccountLocked ? 'LOGIN_BLOCKED_LOCKED_ACCOUNT' : 'LOGIN_FAILED',
        ipAddress: ip,
        userAgent,
      });

      // NUNCA revelar si el correo existe o si la cuenta está bloqueada
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    // 2.8 Rehash transparente si la configuración de Argon2id se incrementó
    if (passwordNeedsRehash(user.password_hash)) {
      const upgradedHash = await hashPassword(password);
      await store.updatePasswordHash(user.id, upgradedHash);
    }

    // 2.9 Si el usuario tiene 2FA/TOTP activo, emitir desafío intermedio sin abrir sesión definitiva aún
    if (user.totp_enabled) {
      const challengeId = await store.createMfaChallenge(user.id, 300);
      res.cookie(COOKIE_NAMES.mfaChallenge, challengeId, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 5 * 60 * 1000,
      });

      await store.writeAuditLog({
        userId: user.id,
        emailHash,
        eventType: 'LOGIN_MFA_CHALLENGE_ISSUED',
        ipAddress: ip,
        userAgent,
      });

      return res.status(200).json({
        status: 'MFA_REQUIRED',
      });
    }

    // 2.10 Resetear contadores de fallos y rate limit tras autenticación exitosa
    await Promise.all([
      store.clearRateLimit(ip, emailHash),
      store.resetFailedLoginAttempts(user.id),
    ]);

    // 2.11 Crear familia de sesión y emitir Access JWT (<=15m) + Refresh Token Opaco Rotativo
    const sessionId = crypto.randomUUID();
    const tokenFamilyId = crypto.randomUUID();
    const { rawToken: refreshToken, tokenHash: refreshTokenHash } = generateOpaqueRefreshToken();

    await store.createSession({
      sessionId,
      userId: user.id,
      tokenFamilyId,
      refreshTokenHash,
      ipAddress: ip,
      userAgent,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    });

    const accessToken = signAccessToken({
      userId: user.id,
      sessionId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    setSessionCookies(res, { accessToken, refreshToken });

    await store.writeAuditLog({
      userId: user.id,
      emailHash,
      eventType: 'LOGIN_SUCCESS',
      ipAddress: ip,
      userAgent,
      sessionId,
    });

    return res.status(200).json({
      status: 'AUTHENTICATED',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectUrl: sanitizeRedirectUrl(returnTo),
    });
  });

  // ---------------------------------------------------------------------------
  // 2b. Verificación de Segundo Factor 2FA/TOTP (POST /api/v1/auth/mfa/verify)
  // ---------------------------------------------------------------------------
  router.post('/mfa/verify', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const challengeId = req.cookies?.[COOKIE_NAMES.mfaChallenge];

    const parsed = MfaVerifySchema.safeParse(req.body);
    if (!parsed.success || !challengeId) {
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    const userId = await store.consumeMfaChallenge(challengeId);
    if (!userId) {
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    const user = await store.findUserById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret_enc) {
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    const secretHex = decryptTotpSecret(user.totp_secret_enc);
    const validCode = verifyTotpCode(secretHex, parsed.data.code);
    const emailHash = sha256Hex(user.email);

    if (!validCode) {
      await store.incrementFailedLoginAttempts(user.id);
      await store.writeAuditLog({
        userId: user.id,
        emailHash,
        eventType: 'LOGIN_MFA_FAILED',
        ipAddress: ip,
        userAgent,
      });
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    await store.resetFailedLoginAttempts(user.id);
    const sessionId = crypto.randomUUID();
    const tokenFamilyId = crypto.randomUUID();
    const { rawToken: refreshToken, tokenHash: refreshTokenHash } = generateOpaqueRefreshToken();

    await store.createSession({
      sessionId,
      userId: user.id,
      tokenFamilyId,
      refreshTokenHash,
      ipAddress: ip,
      userAgent,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    });

    const accessToken = signAccessToken({
      userId: user.id,
      sessionId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    res.clearCookie(COOKIE_NAMES.mfaChallenge, { path: '/api/v1/auth', secure: true, httpOnly: true });
    setSessionCookies(res, { accessToken, refreshToken });

    await store.writeAuditLog({
      userId: user.id,
      emailHash,
      eventType: 'LOGIN_MFA_SUCCESS',
      ipAddress: ip,
      userAgent,
      sessionId,
    });

    return res.status(200).json({
      status: 'AUTHENTICATED',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectUrl: sanitizeRedirectUrl(parsed.data.returnTo),
    });
  });

  // ---------------------------------------------------------------------------
  // 2c. Configuración opcional de 2FA/TOTP (POST /api/v1/auth/mfa/setup)
  // ---------------------------------------------------------------------------
  router.post('/mfa/setup', csrfProtection, requireAuth, async (req, res) => {
    const secretHex = crypto.randomBytes(20).toString('hex');
    const encrypted = encryptTotpSecret(secretHex);
    const backupCodes = Array.from({ length: 6 }, () => crypto.randomBytes(4).toString('hex'));
    const backupHashes = backupCodes.map((code) => sha256Hex(code));

    await store.enableUserTotp(req.auth.userId, encrypted, backupHashes);
    await store.writeAuditLog({
      userId: req.auth.userId,
      emailHash: sha256Hex(req.auth.email),
      eventType: 'MFA_TOTP_ENABLED',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      sessionId: req.auth.sessionId,
    });

    return res.status(200).json({
      status: 'MFA_ENABLED',
      secretHex,
      backupCodes,
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Rotación de Refresh Token y Detección de Reuso (POST /api/v1/auth/refresh)
  // ---------------------------------------------------------------------------
  router.post('/refresh', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.refreshToken];

    if (typeof rawRefreshToken !== 'string' || !rawRefreshToken) {
      return res.status(401).json({ error: 'Sesión no válida.' });
    }

    const refreshTokenHash = sha256Hex(rawRefreshToken);
    const session = await store.findSessionByRefreshHash(refreshTokenHash);

    if (!session) {
      clearSessionCookies(res);
      return res.status(401).json({ error: 'Sesión no válida.' });
    }

    const user = await store.findUserById(session.user_id);
    const emailHash = sha256Hex(user?.email || 'unknown');

    // DETECCIÓN DE ROBO / REUSO DE REFRESH TOKEN:
    // Si un Refresh Token que ya fue rotado o revocado vuelve a presentarse,
    // invalidamos inmediatamente TODA la familia de sesiones (token_family_id).
    if (session.revoked_at !== null) {
      await store.revokeSessionFamily(session.token_family_id, 'REUSE_DETECTED');
      clearSessionCookies(res);

      await store.writeAuditLog({
        userId: session.user_id,
        emailHash,
        eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
        ipAddress: ip,
        userAgent,
        sessionId: session.id,
        metadata: {
          tokenFamilyId: session.token_family_id,
          previousRevocationReason: session.revocation_reason,
        },
      });

      return res.status(401).json({ error: 'Alerta de seguridad: sesión revocada por reuso de token.' });
    }

    if (new Date(session.expires_at).getTime() <= Date.now() || !user || !user.is_active) {
      await store.revokeSessionByRefreshHash(refreshTokenHash, 'EXPIRED');
      clearSessionCookies(res);
      return res.status(401).json({ error: 'La sesión ha expirado.' });
    }

    // Rotar Refresh Token: invalida el actual y emite uno nuevo dentro de la misma familia
    const newSessionId = crypto.randomUUID();
    const { rawToken: newRefreshToken, tokenHash: newRefreshTokenHash } = generateOpaqueRefreshToken();

    await store.rotateSession({
      currentSessionId: session.id,
      newSessionId,
      newRefreshTokenHash,
      ipAddress: ip,
      userAgent,
      ttlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    });

    const newAccessToken = signAccessToken({
      userId: user.id,
      sessionId: newSessionId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    setSessionCookies(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    await store.writeAuditLog({
      userId: user.id,
      emailHash,
      eventType: 'SESSION_REFRESHED',
      ipAddress: ip,
      userAgent,
      sessionId: newSessionId,
    });

    return res.status(200).json({
      status: 'REFRESHED',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Logout Real del Lado Servidor (POST /api/v1/auth/logout)
  // ---------------------------------------------------------------------------
  router.post('/logout', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.refreshToken];
    const rawAccessToken = req.cookies?.[COOKIE_NAMES.accessToken];

    let revokedUserId = null;
    let revokedSessionId = null;

    if (typeof rawRefreshToken === 'string' && rawRefreshToken) {
      const refreshHash = sha256Hex(rawRefreshToken);
      const revoked = await store.revokeSessionByRefreshHash(refreshHash, 'USER_LOGOUT');
      if (revoked) {
        revokedUserId = revoked.user_id;
        revokedSessionId = revoked.id;
      }
    }

    if (typeof rawAccessToken === 'string' && rawAccessToken) {
      const decoded = jwt.decode(rawAccessToken);
      if (decoded && typeof decoded === 'object' && decoded.sid) {
        revokedSessionId = revokedSessionId || decoded.sid;
        revokedUserId = revokedUserId || decoded.sub;
        const remainingSeconds = decoded.exp
          ? Math.max(1, decoded.exp - Math.floor(Date.now() / 1000))
          : 900;
        store.markAccessSessionRevoked(decoded.sid, remainingSeconds);
      }
    }

    clearSessionCookies(res);

    await store.writeAuditLog({
      userId: revokedUserId,
      emailHash: sha256Hex(revokedUserId || 'anonymous'),
      eventType: 'LOGOUT_SUCCESS',
      ipAddress: ip,
      userAgent,
      sessionId: revokedSessionId,
    });

    return res.status(204).send();
  });

  // ---------------------------------------------------------------------------
  // 5. Recuperación de Contraseña - Solicitud (POST /api/v1/auth/password-reset/request)
  // ---------------------------------------------------------------------------
  router.post('/password-reset/request', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const parsed = PasswordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
    }

    const { email } = parsed.data;
    const emailHash = sha256Hex(email);
    const user = await store.findUserByEmail(email);

    if (!user || !user.is_active) {
      // Ejecutar trabajo criptográfico equivalente para evitar enumeración por tiempo
      await getDummyPasswordHash();
      await store.writeAuditLog({
        emailHash,
        eventType: 'PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL',
        ipAddress: ip,
        userAgent,
      });
      return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
    }

    const { token, selector, verifierSha256 } = generatePasswordResetToken();

    await store.createPasswordResetToken({
      userId: user.id,
      selector,
      verifierSha256,
      requestedIp: ip,
      ttlSeconds: PASSWORD_RESET_TTL_SECONDS, // 15 minutos
    });

    // Enviar el correo de recuperación con el token de un solo uso y expiración de 15m
    let mailDelivery = null;
    if (mailer && typeof mailer.sendPasswordResetEmail === 'function') {
      mailDelivery = await mailer.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token,
        expiresInMinutes: Math.round(PASSWORD_RESET_TTL_SECONDS / 60),
      });
    }

    if (typeof onPasswordResetTokenIssued === 'function') {
      onPasswordResetTokenIssued({
        email: user.email,
        token,
        expiresAtSeconds: PASSWORD_RESET_TTL_SECONDS,
        mailDelivery,
      });
    }

    await store.writeAuditLog({
      userId: user.id,
      emailHash,
      eventType: 'PASSWORD_RESET_REQUESTED',
      ipAddress: ip,
      userAgent,
      metadata: {
        selector, // Solo registramos el selector público, JAMÁS el verifier ni el token completo
        mailSent: Boolean(mailDelivery?.sent),
        mailMode: mailDelivery?.mode || 'none',
      },
    });

    const responsePayload = { message: GENERIC_RESET_MESSAGE };
    if (process.env.NODE_ENV !== 'production' && process.env.EXPOSE_DEV_RESET_TOKEN === '1') {
      responsePayload.devResetToken = token;
    }
    if (process.env.NODE_ENV !== 'production' && mailDelivery?.previewUrl) {
      responsePayload.devPreviewUrl = mailDelivery.previewUrl;
    }

    return res.status(200).json(responsePayload);
  });

  // ---------------------------------------------------------------------------
  // 6. Recuperación de Contraseña - Confirmación de un solo uso (POST /api/v1/auth/password-reset/confirm)
  // ---------------------------------------------------------------------------
  router.post('/password-reset/confirm', csrfProtection, async (req, res) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const parsed = PasswordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Solicitud de restablecimiento inválida.',
      });
    }

    const { token, newPassword } = parsed.data;

    if (await isPasswordBreached(newPassword)) {
      return res.status(400).json({
        error:
          'La nueva contraseña aparece en filtraciones conocidas. Por favor elige una contraseña diferente.',
      });
    }

    const [selector, rawVerifier] = token.split('.');
    const newPasswordHash = await hashPassword(newPassword);

    const result = await store.consumePasswordResetToken({
      selector,
      rawVerifier,
      newPasswordHash,
    });

    if (!result.ok) {
      await store.writeAuditLog({
        emailHash: sha256Hex('unknown'),
        eventType: 'PASSWORD_RESET_FAILED_INVALID_OR_USED_TOKEN',
        ipAddress: ip,
        userAgent,
        metadata: { selector },
      });
      return res.status(400).json({
        error: 'El enlace de recuperación es inválido, ya fue utilizado o ha expirado.',
      });
    }

    clearSessionCookies(res);

    await store.writeAuditLog({
      userId: result.userId,
      emailHash: sha256Hex(result.userId),
      eventType: 'PASSWORD_RESET_COMPLETED',
      ipAddress: ip,
      userAgent,
      metadata: { selector },
    });

    return res.status(200).json({
      status: 'PASSWORD_UPDATED',
      message: 'Contraseña actualizada correctamente. Por favor inicia sesión.',
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Perfil de Sesión Actual (GET /api/v1/auth/me)
  // ---------------------------------------------------------------------------
  router.get('/me', requireAuth, async (req, res) => {
    const user = await store.findUserById(req.auth.userId);
    if (!user || !user.is_active) {
      clearSessionCookies(res);
      return res.status(401).json({ error: 'Sesión no válida.' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: Boolean(user.totp_enabled),
      },
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Preparado para OAuth2 / OIDC con PKCE (GET /api/v1/auth/oauth/:provider)
  // ---------------------------------------------------------------------------
  router.get('/oauth/:provider', (req, res) => {
    const { provider } = req.params;
    if (!['google', 'github', 'microsoft'].includes(provider)) {
      return res.status(400).json({ error: 'Proveedor OAuth2 no soportado.' });
    }

    const state = crypto.randomBytes(24).toString('base64url');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    res.cookie('__Host-oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth/oauth',
      maxAge: 10 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'OAUTH2_READY',
      provider,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    });
  });

  return router;
}

/**
 * Crea una instancia Express completa con el router montado en `/api/v1/auth`
 */
export function createAuthApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use('/api/v1/auth', createAuthRouter(options));
  return app;
}
