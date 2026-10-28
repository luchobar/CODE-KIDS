import argon2 from 'argon2';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parámetros Argon2id recomendados por OWASP (preferido sobre bcrypt).
 * En entorno de test se permite un memoryCost menor solo si AUTH_FAST_CRYPTO_FOR_TESTS=1,
 * manteniendo siempre la variante Argon2id real.
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: process.env.AUTH_FAST_CRYPTO_FOR_TESTS === '1' ? 16384 : 65536, // 64 MiB en producción
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hash Argon2id precalculado al arranque para ejecutar en el camino de "usuario no existe"
 * o "cuenta bloqueada", garantizando tiempos de respuesta indistinguibles (anti-enumeración).
 */
let dummyPasswordHashPromise = argon2.hash(
  crypto.randomBytes(32).toString('hex'),
  ARGON2_OPTIONS,
);

export async function getDummyPasswordHash() {
  return dummyPasswordHashPromise;
}

export async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, plainPassword) {
  const targetHash = hash || (await getDummyPasswordHash());
  const matches = await argon2.verify(targetHash, plainPassword);
  return Boolean(hash) && matches;
}

export function passwordNeedsRehash(hash) {
  if (!hash) return false;
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Carga en memoria del diccionario local de contraseñas filtradas (Top 100k breached passwords)
 * + soporte opcional para k-Anonymity contra Have I Been Pwned (HIBP).
 */
const BREACHED_SET = new Set();
try {
  const breachedPath = path.join(__dirname, 'data', 'breached-top100k.txt');
  if (fs.existsSync(breachedPath)) {
    const content = fs.readFileSync(breachedPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const normalized = line.trim().toLowerCase();
      if (normalized) BREACHED_SET.add(normalized);
    }
  }
} catch {
  // Si el archivo no pudiera leerse, continuamos con la lista base de emergencia.
}

const FALLBACK_COMMON_PASSWORDS = [
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'iloveyou',
  'welcome1',
  'monkey123',
  'letmein1',
  'dragon123',
  'baseball1',
  'sunshine1',
  'princess1',
  'football1',
  'abc12345',
  '11111111',
  '00000000',
];
for (const pwd of FALLBACK_COMMON_PASSWORDS) {
  BREACHED_SET.add(pwd);
}

/**
 * Verifica si una contraseña está en la lista de contraseñas filtradas (local + HIBP k-Anonymity opcional).
 */
export async function isPasswordBreached(password) {
  if (typeof password !== 'string') return true;
  const candidate = password.trim().toLowerCase();
  if (BREACHED_SET.has(candidate)) {
    return true;
  }

  // Patrones triviales repetitivos (ej: "aaaaaaaa", "12121212")
  if (/^(.)\1{7,}$/.test(candidate)) {
    return true;
  }

  if (process.env.HIBP_ONLINE_CHECK === 'true') {
    try {
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const text = await res.text();
        return text.split('\n').some((line) => {
          const [lineSuffix, count] = line.trim().split(':');
          return lineSuffix === suffix && Number.parseInt(count, 10) > 0;
        });
      }
    } catch {
      // Si la red externa no responde, mantenemos la validación del diccionario local de 100k.
    }
  }

  return false;
}

/**
 * Comparación en tiempo constante (Timing-Safe) para tokens CSRF, Refresh y Recuperación.
 * Al hashear ambos operandos con SHA-256 garantizamos longitud idéntica (32 bytes) sin filtrar la longitud real.
 */
export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false;
  }
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

/**
 * Par de claves RSA-2048 para firmar Access Tokens con RS256.
 * Si no se proveen en variables de entorno, se genera un par efímero seguro en memoria al iniciar.
 */
const generatedKeys =
  process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY
    ? null
    : crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || generatedKeys.privateKey;
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || generatedKeys.publicKey;
export const JWT_ISSUER = 'codekids.auth.internal';
export const JWT_AUDIENCE = 'codekids.app.internal';
export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutos (cumple requisito <= 15 min)
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días
export const PASSWORD_RESET_TTL_SECONDS = 15 * 60; // 15 minutos (expiración corta)

export function signAccessToken({ userId, sessionId, role, email, name }) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      role,
      email,
      name,
    },
    JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_PUBLIC_KEY, {
    algorithms: ['RS256'], // Fija estrictamente RS256 (mitiga alg:none y key-confusion HS256)
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

/**
 * Generación de Refresh Token opaco de alta entropía (384 bits).
 */
export function generateOpaqueRefreshToken() {
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = sha256Hex(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Generación de Token de Recuperación de Contraseña de un solo uso con patrón Selector.Verifier.
 * El selector (24 hex chars) permite buscar en DB por índice y el verifier se compara con timingSafeEqual.
 */
export function generatePasswordResetToken() {
  const selector = crypto.randomBytes(12).toString('hex'); // 24 caracteres hex
  const verifier = crypto.randomBytes(32).toString('base64url');
  const verifierSha256 = sha256Hex(verifier);
  return {
    token: `${selector}.${verifier}`,
    selector,
    verifier,
    verifierSha256,
  };
}

/**
 * Prevención estricta de Open-Redirect post-login.
 * Solo acepta rutas relativas internas que inicien con '/' y rechaza '//' o '/\' o esquemas externos.
 */
export function sanitizeRedirectUrl(returnTo, fallback = '/dashboard') {
  if (typeof returnTo !== 'string') return fallback;
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  // Rechazar caracteres de control o intentos de inyección de cabeceras
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }
  try {
    const parsed = new URL(trimmed, 'https://codekids.internal');
    if (parsed.origin !== 'https://codekids.internal') {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * ============================================================================
 * Soporte para 2FA / TOTP (RFC 6238) y cifrado AES-256-GCM del secreto en reposo
 * ============================================================================
 */
const TOTP_MASTER_KEY = crypto
  .createHash('sha256')
  .update(process.env.TOTP_ENCRYPTION_KEY || 'codekids-dev-totp-master-key-change-in-prod')
  .digest();

export function encryptTotpSecret(rawSecretHex) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', TOTP_MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(rawSecretHex, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptTotpSecret(encryptedBuffer) {
  const buf = Buffer.isBuffer(encryptedBuffer)
    ? encryptedBuffer
    : Buffer.from(encryptedBuffer, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', TOTP_MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function generateTotpCode(secretHex, timeStep = Math.floor(Date.now() / 1000 / 30)) {
  const key = Buffer.from(secretHex, 'hex');
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(timeStep));
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secretHex, candidateCode, windowSteps = 1) {
  if (typeof candidateCode !== 'string' || !/^\d{6}$/.test(candidateCode.trim())) {
    return false;
  }
  const cleanCandidate = candidateCode.trim();
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  let matched = false;
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const expected = generateTotpCode(secretHex, currentStep + offset);
    if (timingSafeEqualStr(expected, cleanCandidate)) {
      matched = true;
    }
  }
  return matched;
}
