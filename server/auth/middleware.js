import crypto from 'node:crypto';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  sha256Hex,
  timingSafeEqualStr,
  verifyAccessToken,
} from './crypto.js';
import { authStore } from './store.js';

export const COOKIE_NAMES = {
  accessToken: '__Host-access_token',
  refreshToken: '__Host-refresh_token',
  csrfToken: '__Host-csrf_token',
  mfaChallenge: '__Host-mfa_challenge',
};

/**
 * Extrae la IP real del cliente de forma segura.
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Cabeceras de seguridad obligatorias ("Security by Design"):
 * - Strict-Transport-Security (HSTS)
 * - Content-Security-Policy (CSP)
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Cache-Control: no-store
 */
export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  // En producción (o si se activa ENFORCE_HTTPS=true), rechazar tráfico HTTP plano
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV !== 'production';

  if (!isHttps || (process.env.ENFORCE_HTTPS === 'true' && req.headers['x-forwarded-proto'] === 'http')) {
    return res.status(403).json({
      error: 'HTTPS es obligatorio para todas las operaciones de autenticación.',
    });
  }

  return next();
}

/**
 * Emite las cookies de sesión (Access JWT + Refresh Token Opaco) con flags estrictos:
 * HttpOnly, Secure, SameSite=Lax/Strict y Path=/ (cumpliendo el estándar RFC del prefijo __Host-).
 * Jamás se exponen tokens a localStorage.
 */
export function setSessionCookies(res, { accessToken, refreshToken }) {
  res.cookie(COOKIE_NAMES.accessToken, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  res.cookie(COOKIE_NAMES.refreshToken, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookies(res) {
  res.clearCookie(COOKIE_NAMES.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(COOKIE_NAMES.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
  res.clearCookie(COOKIE_NAMES.mfaChallenge, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Genera y asigna un token CSRF criptográficamente aleatorio en cookie HttpOnly + respuesta JSON
 * (Double-Submit Cookie respaldado por comparación en tiempo constante).
 */
export function issueCsrfToken(req, res) {
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  res.cookie(COOKIE_NAMES.csrfToken, csrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 2 * 60 * 60 * 1000, // 2 horas
  });
  return csrfToken;
}

/**
 * Crea el middleware CSRF vinculado al store activo para todos los endpoints de cambio de estado.
 */
export function createCsrfProtection(store = authStore) {
  return async function csrfProtection(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const cookieToken = req.cookies?.[COOKIE_NAMES.csrfToken];
    const headerToken = req.headers['x-csrf-token'];

    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      !timingSafeEqualStr(cookieToken, headerToken)
    ) {
      await store.writeAuditLog({
        emailHash: sha256Hex('anonymous'),
        eventType: 'CSRF_VALIDATION_FAILED',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        metadata: { path: req.originalUrl || req.url, method: req.method },
      });
      return res.status(403).json({
        error: 'Solicitud rechazada por protección CSRF.',
      });
    }

    return next();
  };
}

/**
 * Crea el middleware de autenticación vinculado al store activo.
 * Verifica firma RS256, expiración <= 15m y revocación del lado servidor (`sid`).
 */
export function createRequireAuth(store = authStore) {
  return async function requireAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAMES.accessToken];
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    try {
      const payload = verifyAccessToken(token);
      const isRevoked = await store.isAccessSessionRevoked(payload.sid);
      if (isRevoked) {
        clearSessionCookies(res);
        return res.status(401).json({ error: 'Sesión inválida o cerrada.' });
      }

      req.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
        role: payload.role,
        email: payload.email,
        name: payload.name,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' });
    }
  };
}

export const csrfProtection = createCsrfProtection(authStore);
export const requireAuth = createRequireAuth(authStore);
