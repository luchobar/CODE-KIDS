import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import supertest from 'supertest';
import {
  generateTotpCode,
  hashPassword,
  isPasswordBreached,
  sanitizeRedirectUrl,
  timingSafeEqualStr,
} from '../crypto.js';
import { COOKIE_NAMES } from '../middleware.js';
import { createAuthApp } from '../routes.js';
import { AuthStore } from '../store.js';

/**
 * Helper para extraer cookies de la cabecera `set-cookie` de una respuesta HTTP
 */
function parseSetCookies(res) {
  const rawCookies = res.headers['set-cookie'] || [];
  const list = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
  const parsed = {};
  for (const item of list) {
    const [nameValue, ...attrs] = item.split(';').map((s) => s.trim());
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx > 0) {
      const name = nameValue.slice(0, eqIdx);
      const value = decodeURIComponent(nameValue.slice(eqIdx + 1));
      parsed[name] = {
        value,
        raw: item,
        attrs: attrs.map((a) => a.toLowerCase()),
      };
    }
  }
  return parsed;
}

function formatCookieHeader(cookieMap) {
  return Object.entries(cookieMap)
    .filter(([, v]) => v && v.value)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.value)}`)
    .join('; ');
}

describe('Suite de Seguridad y Autenticación (Security by Design)', () => {
  let store;
  let app;
  let request;
  let issuedResetTokens;

  beforeEach(() => {
    process.env.AUTH_MAILER_OFFLINE = '1';
    store = new AuthStore();
    issuedResetTokens = [];
    app = createAuthApp({
      store,
      onPasswordResetTokenIssued: (payload) => issuedResetTokens.push(payload),
    });
    request = supertest(app);
  });

  async function getCsrfContext() {
    const res = await request.get('/api/v1/auth/csrf').expect(200);
    const cookies = parseSetCookies(res);
    return {
      csrfToken: res.body.csrfToken,
      cookieHeader: formatCookieHeader(cookies),
      cookies,
    };
  }

  // ===========================================================================
  // 1. Pruebas Unitarias de Criptografía y Políticas
  // ===========================================================================
  it('UT-01 / UT-03: Hashea con Argon2id y detecta contraseñas filtradas o débiles', async () => {
    const strongPass = 'C0deK!ds_Secur3_2026#';
    const hash1 = await hashPassword(strongPass);
    const hash2 = await hashPassword(strongPass);

    assert.match(hash1, /^\$argon2id\$v=19\$m=\d+,(?:t=3,p=4|p=4,t=3)\$/);
    assert.notEqual(hash1, hash2, 'Dos hashes de la misma contraseña deben tener sal única');

    assert.equal(await isPasswordBreached('12345678'), true);
    assert.equal(await isPasswordBreached('password1'), true);
    assert.equal(await isPasswordBreached('qwerty123'), true);
    assert.equal(await isPasswordBreached('aaaaaaaaaa'), true);
    assert.equal(await isPasswordBreached(strongPass), false);
  });

  it('UT-01b: Comparación timing-safe y sanitizador anti Open-Redirect', () => {
    assert.equal(timingSafeEqualStr('token-secreto-123', 'token-secreto-123'), true);
    assert.equal(timingSafeEqualStr('token-secreto-123', 'token-secreto-124'), false);
    assert.equal(timingSafeEqualStr('', 'token'), false);

    assert.equal(sanitizeRedirectUrl('/python-lab?mission=1'), '/python-lab?mission=1');
    assert.equal(sanitizeRedirectUrl('https://evil-phishing.com'), '/dashboard');
    assert.equal(sanitizeRedirectUrl('//evil-phishing.com/login'), '/dashboard');
    assert.equal(sanitizeRedirectUrl('/\\evil-phishing.com'), '/dashboard');
    assert.equal(sanitizeRedirectUrl('javascript:alert(1)'), '/dashboard');
  });

  // ===========================================================================
  // 2. Registro, Cabeceras y Cookies Seguras
  // ===========================================================================
  it('UT-01 / UT-02 / UT-04: Registro rechaza contraseñas filtradas, normaliza email y emite cookies HttpOnly+Secure+SameSite', async () => {
    const csrf = await getCsrfContext();

    // Intento con contraseña en lista de filtradas
    const breachedRes = await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'sofi@codekids.edu.co',
        password: 'password123',
        name: 'Sofi',
        role: 'student',
      })
      .expect(400);

    assert.match(breachedRes.body.error, /filtraciones/i);

    // Registro válido
    const regRes = await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: '  Sofi@CodeKids.edu.co ',
        password: 'Pipo_Explorador_2026!Segura',
        name: 'Sofi',
        role: 'student',
      })
      .expect(201);

    assert.equal(regRes.body.status, 'REGISTERED');
    assert.equal(regRes.body.user.email, 'sofi@codekids.edu.co');

    // Verificar cabeceras de seguridad obligatorias
    assert.equal(regRes.headers['x-content-type-options'], 'nosniff');
    assert.match(regRes.headers['content-security-policy'], /default-src 'self'/);
    assert.match(regRes.headers['strict-transport-security'], /max-age=63072000/);

    // Verificar atributos de las cookies de sesión
    const cookies = parseSetCookies(regRes);
    const accessCookie = cookies[COOKIE_NAMES.accessToken];
    const refreshCookie = cookies[COOKIE_NAMES.refreshToken];

    assert.ok(accessCookie?.value, 'Debe emitir cookie __Host-access_token');
    assert.ok(refreshCookie?.value, 'Debe emitir cookie __Host-refresh_token');
    assert.ok(accessCookie.attrs.includes('httponly'), 'Access token debe ser HttpOnly');
    assert.ok(accessCookie.attrs.includes('secure'), 'Access token debe ser Secure');
    assert.ok(
      accessCookie.attrs.some((a) => a.startsWith('samesite=lax')),
      'Access token debe tener SameSite=Lax',
    );
    assert.ok(refreshCookie.attrs.includes('httponly'), 'Refresh token debe ser HttpOnly');
    assert.ok(refreshCookie.attrs.includes('secure'), 'Refresh token debe ser Secure');
    assert.ok(
      refreshCookie.attrs.some((a) => a.startsWith('samesite=strict')),
      'Refresh token debe tener SameSite=Strict',
    );

    // Intento de registro duplicado con diferente capitalización
    await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'SOFI@CODEKIDS.EDU.CO',
        password: 'Otra_Clave_Segura_2026!',
        name: 'Sofi Duplicada',
      })
      .expect(409);
  });

  // ===========================================================================
  // 3. Protección CSRF, Login, Mensajes Genéricos y Open-Redirect
  // ===========================================================================
  it('AB-03 / AB-08 / AB-09: Protege contra CSRF, evita enumeración de usuarios y neutraliza Open-Redirect', async () => {
    const csrf = await getCsrfContext();

    // Crear usuario válido
    await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'profe@codekids.edu.co',
        password: 'Docente_Clave_Fuerte_2026!',
        name: 'Profe Alex',
        role: 'teacher',
      })
      .expect(201);

    // AB-09: Petición de Login sin cabecera X-CSRF-Token debe fallar con 403
    await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .send({
        email: 'profe@codekids.edu.co',
        password: 'Docente_Clave_Fuerte_2026!',
      })
      .expect(403);

    // AB-03: Login con usuario inexistente vs usuario existente con clave errónea
    const nonExistentRes = await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'no.existe@codekids.edu.co',
        password: 'Clave_Equivocada_123!',
      })
      .expect(401);

    const wrongPassRes = await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'profe@codekids.edu.co',
        password: 'Clave_Equivocada_123!',
      })
      .expect(401);

    assert.equal(nonExistentRes.body.error, 'Credenciales inválidas.');
    assert.equal(wrongPassRes.body.error, 'Credenciales inválidas.');
    assert.deepEqual(nonExistentRes.body, wrongPassRes.body);

    // AB-08: Login exitoso con intento de Open-Redirect hacia dominio malicioso
    const loginRes = await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'profe@codekids.edu.co',
        password: 'Docente_Clave_Fuerte_2026!',
        returnTo: 'https://evil-attacker.example.com/phish',
      })
      .expect(200);

    assert.equal(loginRes.body.status, 'AUTHENTICATED');
    assert.equal(loginRes.body.redirectUrl, '/dashboard');
  });

  // ===========================================================================
  // 4. Fuerza Bruta, Rate Limiting (5 intentos / 15m) y Bloqueo Progresivo
  // ===========================================================================
  it('AB-01 / AB-02: Aplica Rate Limit al 6.º intento por IP+usuario y bloqueo progresivo ante Credential Stuffing distribuido', async () => {
    const csrf = await getCsrfContext();

    await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'victima@codekids.edu.co',
        password: 'Clave_Victima_Segura_2026!',
      })
      .expect(201);

    // 5 intentos fallidos desde la misma IP (10.0.0.50) -> 401
    for (let i = 1; i <= 5; i += 1) {
      await request
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '10.0.0.50')
        .set('Cookie', csrf.cookieHeader)
        .set('X-CSRF-Token', csrf.csrfToken)
        .send({
          email: 'victima@codekids.edu.co',
          password: `Intento_Fallido_${i}_Segura!`,
        })
        .expect(401);
    }

    // 6.º intento desde la misma IP (10.0.0.50) -> 429 Too Many Requests + Retry-After
    const rateLimitedRes = await request
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '10.0.0.50')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'victima@codekids.edu.co',
        password: 'Clave_Victima_Segura_2026!',
      })
      .expect(429);

    assert.ok(rateLimitedRes.headers['retry-after'], 'Debe incluir cabecera Retry-After');

    // AB-02: Incluso cambiando de IP (10.0.0.99), la cuenta quedó bloqueada temporalmente (locked_until) tras 5 fallos
    const lockedRes = await request
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '10.0.0.99')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'victima@codekids.edu.co',
        password: 'Clave_Victima_Segura_2026!', // ¡Incluso con la contraseña correcta!
      })
      .expect(401);

    assert.equal(lockedRes.body.error, 'Credenciales inválidas.');
  });

  // ===========================================================================
  // 5. Logout Real en Servidor, Rotación de Refresh Token y Detección de Reuso
  // ===========================================================================
  it('UT-06 / AB-04 / AB-05: Logout invalida el JWT inmediatamente y el reuso de un Refresh Token robado revoca toda la familia', async () => {
    const csrf = await getCsrfContext();

    const regRes = await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'explorador@codekids.edu.co',
        password: 'Clave_Explorador_2026#!',
        name: 'Leo',
      })
      .expect(201);

    const sessionCookies1 = parseSetCookies(regRes);
    const fullCookies1 = { ...csrf.cookies, ...sessionCookies1 };

    // Verificar sesión activa en /me
    await request
      .get('/api/v1/auth/me')
      .set('Cookie', formatCookieHeader(fullCookies1))
      .expect(200);

    // Rotar Refresh Token legítimamente -> obtenemos RefreshToken_2 y AccessToken_2
    const refreshRes = await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', formatCookieHeader(fullCookies1))
      .set('X-CSRF-Token', csrf.csrfToken)
      .expect(200);

    const sessionCookies2 = parseSetCookies(refreshRes);
    const fullCookies2 = { ...csrf.cookies, ...sessionCookies2 };

    // AB-04: Un atacante intenta reutilizar RefreshToken_1 (que ya fue rotado)
    await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', formatCookieHeader(fullCookies1))
      .set('X-CSRF-Token', csrf.csrfToken)
      .expect(401);

    // Como se detectó robo/reuso en la familia, incluso la sesión nueva (fullCookies2) queda revocada inmediatamente
    await request
      .get('/api/v1/auth/me')
      .set('Cookie', formatCookieHeader(fullCookies2))
      .expect(401);

    // Iniciar una nueva sesión limpia para probar Logout real (AB-05)
    const loginRes = await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'explorador@codekids.edu.co',
        password: 'Clave_Explorador_2026#!',
      })
      .expect(200);

    const sessionCookies3 = parseSetCookies(loginRes);
    const fullCookies3 = { ...csrf.cookies, ...sessionCookies3 };

    // Ejecutar Logout en servidor
    await request
      .post('/api/v1/auth/logout')
      .set('Cookie', formatCookieHeader(fullCookies3))
      .set('X-CSRF-Token', csrf.csrfToken)
      .expect(204);

    // AB-05: Si alguien intenta reutilizar el Access JWT capturado antes del logout, recibe 401
    await request
      .get('/api/v1/auth/me')
      .set('Cookie', formatCookieHeader(fullCookies3))
      .expect(401);
  });

  // ===========================================================================
  // 6. Recuperación de Contraseña (Un solo uso + Expiración corta) y 2FA/TOTP
  // ===========================================================================
  it('UT-05 / UT-07: Token de recuperación es de un solo uso y el flujo 2FA/TOTP opcional funciona extremo a extremo', async () => {
    const csrf = await getCsrfContext();

    const regRes = await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'valeria@codekids.edu.co',
        password: 'Clave_Inicial_Valeria_2026!',
      })
      .expect(201);

    // Solicitar recuperación de contraseña
    await request
      .post('/api/v1/auth/password-reset/request')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({ email: 'valeria@codekids.edu.co' })
      .expect(200);

    assert.equal(issuedResetTokens.length, 1);
    const { token: resetToken, mailDelivery } = issuedResetTokens[0];
    assert.ok(mailDelivery, 'Debe haber ejecutado el servicio de envío de correo (Nodemailer)');
    assert.equal(mailDelivery.sent, true, 'El correo de recuperación debe haberse enviado');
    assert.ok(mailDelivery.messageId, 'Nodemailer debe generar un Message-ID');
    assert.ok(
      mailDelivery.resetUrl.includes(encodeURIComponent(resetToken)),
      'El enlace enviado por correo debe incluir el token de un solo uso',
    );

    // 1.er uso del token de recuperación -> 200 OK
    await request
      .post('/api/v1/auth/password-reset/confirm')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        token: resetToken,
        newPassword: 'Nueva_Clave_Valeria_2026#!',
      })
      .expect(200);

    // 2.º uso del mismo token de recuperación -> 400 Bad Request (Un solo uso garantizado)
    await request
      .post('/api/v1/auth/password-reset/confirm')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        token: resetToken,
        newPassword: 'Otra_Clave_Intento_Reuso_2026!',
      })
      .expect(400);

    // La sesión anterior al cambio de contraseña debe haber quedado revocada
    const oldSessionCookies = { ...csrf.cookies, ...parseSetCookies(regRes) };
    await request
      .get('/api/v1/auth/me')
      .set('Cookie', formatCookieHeader(oldSessionCookies))
      .expect(401);

    // Iniciar sesión con la nueva contraseña y activar 2FA/TOTP
    const loginRes = await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'valeria@codekids.edu.co',
        password: 'Nueva_Clave_Valeria_2026#!',
      })
      .expect(200);

    const activeCookies = { ...csrf.cookies, ...parseSetCookies(loginRes) };
    const mfaSetupRes = await request
      .post('/api/v1/auth/mfa/setup')
      .set('Cookie', formatCookieHeader(activeCookies))
      .set('X-CSRF-Token', csrf.csrfToken)
      .expect(200);

    const { secretHex } = mfaSetupRes.body;
    assert.ok(secretHex);

    // Al volver a iniciar sesión, debe exigir segundo factor (MFA_REQUIRED)
    const mfaChallengeRes = await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'valeria@codekids.edu.co',
        password: 'Nueva_Clave_Valeria_2026#!',
      })
      .expect(200);

    assert.equal(mfaChallengeRes.body.status, 'MFA_REQUIRED');
    const challengeCookies = { ...csrf.cookies, ...parseSetCookies(mfaChallengeRes) };

    // Verificar código TOTP de 6 dígitos
    const totpCode = generateTotpCode(secretHex);
    const mfaVerifyRes = await request
      .post('/api/v1/auth/mfa/verify')
      .set('Cookie', formatCookieHeader(challengeCookies))
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({ code: totpCode })
      .expect(200);

    assert.equal(mfaVerifyRes.body.status, 'AUTHENTICATED');
  });

  // ===========================================================================
  // 7. SQL Injection, Long Password DoS y Privacidad del Log de Auditoría
  // ===========================================================================
  it('AB-06 / AB-07: Neutraliza SQL Injection, rechaza contraseñas >128 chars y jamás registra contraseñas ni tokens en logs', async () => {
    const csrf = await getCsrfContext();
    const secretPassword = 'Mi_Contrasena_Super_Secreta_No_Loguear_99!';

    await request
      .post('/api/v1/auth/register')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'auditoria@codekids.edu.co',
        password: secretPassword,
      })
      .expect(201);

    // Intento de SQL Injection en email
    await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: "' OR 1=1; DROP TABLE users; --",
        password: secretPassword,
      })
      .expect(401);

    // Intento de DoS criptográfico con contraseña de 5000 caracteres
    await request
      .post('/api/v1/auth/login')
      .set('Cookie', csrf.cookieHeader)
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: 'auditoria@codekids.edu.co',
        password: 'A'.repeat(5000),
      })
      .expect(401);

    // Revisar todos los registros de auditoría generados
    const logs = store.getAuditLogs();
    assert.ok(logs.length >= 3, 'Debe haber registrado eventos en auth_audit_logs');

    const serializedLogs = JSON.stringify(logs);
    assert.equal(
      serializedLogs.includes(secretPassword),
      false,
      'El log de auditoría NUNCA debe contener la contraseña en texto plano',
    );
    assert.equal(
      serializedLogs.includes('auditoria@codekids.edu.co'),
      false,
      'El log de auditoría almacena email_sha256 y no el email en claro',
    );
  });
});
