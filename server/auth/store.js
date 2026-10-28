import crypto from 'node:crypto';
import { Pool } from 'pg';
import { sha256Hex, timingSafeEqualStr } from './crypto.js';

/**
 * Calcula la duración del bloqueo temporal progresivo en minutos según los intentos fallidos acumulados:
 * - < 5 intentos: 0 min (sin bloqueo de cuenta aún)
 * - 5 a 9 intentos: 5 min
 * - 10 a 14 intentos: 15 min
 * - >= 15 intentos: 60 min
 */
export function computeProgressiveLockMinutes(failedAttempts) {
  if (failedAttempts >= 15) return 60;
  if (failedAttempts >= 10) return 15;
  if (failedAttempts >= 5) return 5;
  return 0;
}

/**
 * Sanitiza metadatos de auditoría para garantizar que NUNCA se registren contraseñas ni tokens completos.
 */
const FORBIDDEN_AUDIT_KEYS = /password|pass|token|secret|verifier|authorization|cookie|jwt/i;

export function sanitizeAuditMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_AUDIT_KEYS.test(key)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 160) {
      clean[key] = `${value.slice(0, 160)}...`;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Almacén híbrido:
 * - Si DATABASE_URL está definido y AUTH_FORCE_MEMORY_STORE !== '1', usa PostgreSQL (`pg.Pool`) con consultas parametrizadas.
 * - En desarrollo local o pruebas sin servidor PostgreSQL externo, usa un motor relacional en memoria con la misma semántica exacta.
 */
class AuthStore {
  constructor() {
    this.usePostgres = Boolean(
      process.env.DATABASE_URL && process.env.AUTH_FORCE_MEMORY_STORE !== '1',
    );
    this.pool = this.usePostgres
      ? new Pool({ connectionString: process.env.DATABASE_URL })
      : null;

    this.resetMemoryState();
  }

  resetMemoryState() {
    this.users = new Map(); // id -> user
    this.usersByEmail = new Map(); // normalizedEmail -> id
    this.oauthAccounts = new Map(); // `${provider}:${providerUserId}` -> record
    this.sessions = new Map(); // id -> session
    this.sessionsByRefreshHash = new Map(); // refresh_token_hash -> id
    this.passwordResetTokens = new Map(); // selector -> tokenRecord
    this.auditLogs = []; // array of audit log objects
    this.rateLimits = new Map(); // key -> { count, expiresAt }
    this.backoffs = new Map(); // key -> { expiresAt }
    this.revokedSessionIds = new Map(); // sessionId -> expiresAt (ms)
    this.mfaChallenges = new Map(); // challengeId -> { userId, expiresAt }
  }

  _normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  // ===========================================================================
  // Rate Limiting (máx 5 intentos por IP+usuario cada 15 min + Backoff progresivo)
  // ===========================================================================
  async getRateLimitStatus(ip, emailHash, nowMs = Date.now()) {
    const backoffKey = `rl:backoff:${ip}:${emailHash}`;
    const backoffEntry = this.backoffs.get(backoffKey);
    if (backoffEntry && backoffEntry.expiresAt > nowMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((backoffEntry.expiresAt - nowMs) / 1000));
      return { blocked: true, retryAfterSeconds };
    }
    if (backoffEntry) {
      this.backoffs.delete(backoffKey);
    }
    return { blocked: false, retryAfterSeconds: 0 };
  }

  async recordRateLimitAttempt(ip, emailHash, nowMs = Date.now()) {
    const rlKey = `rl:login:${ip}:${emailHash}`;
    const backoffKey = `rl:backoff:${ip}:${emailHash}`;
    const windowMs = 15 * 60 * 1000; // 15 minutos

    let entry = this.rateLimits.get(rlKey);
    if (!entry || entry.expiresAt <= nowMs) {
      entry = { count: 0, expiresAt: nowMs + windowMs };
    }
    entry.count += 1;
    this.rateLimits.set(rlKey, entry);

    if (entry.count > 5) {
      // Backoff exponencial: 2^(intentos - 5) * 15 segundos, con tope en 900s (15 min)
      const backoffSeconds = Math.min(900, Math.pow(2, entry.count - 5) * 15);
      this.backoffs.set(backoffKey, { expiresAt: nowMs + backoffSeconds * 1000 });
      return {
        exceeded: true,
        attemptsInWindow: entry.count,
        retryAfterSeconds: backoffSeconds,
      };
    }

    return {
      exceeded: false,
      attemptsInWindow: entry.count,
      retryAfterSeconds: 0,
    };
  }

  async clearRateLimit(ip, emailHash) {
    this.rateLimits.delete(`rl:login:${ip}:${emailHash}`);
    this.backoffs.delete(`rl:backoff:${ip}:${emailHash}`);
  }

  // ===========================================================================
  // Usuarios
  // ===========================================================================
  async findUserByEmail(email) {
    const cleanEmail = this._normalizeEmail(email);
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `SELECT id, email, name, role, password_hash, failed_login_attempts, locked_until,
                totp_enabled, totp_secret_enc, totp_backup_codes_hash, is_active, last_login_at, created_at
         FROM users
         WHERE email = $1`,
        [cleanEmail],
      );
      return rows[0] || null;
    }

    const id = this.usersByEmail.get(cleanEmail);
    if (!id) return null;
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async findUserById(userId) {
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `SELECT id, email, name, role, password_hash, failed_login_attempts, locked_until,
                totp_enabled, totp_secret_enc, totp_backup_codes_hash, is_active, last_login_at, created_at
         FROM users
         WHERE id = $1`,
        [userId],
      );
      return rows[0] || null;
    }

    const u = this.users.get(userId);
    return u ? { ...u } : null;
  }

  async createUser({ email, passwordHash, name = 'Explorador', role = 'student' }) {
    const cleanEmail = this._normalizeEmail(email);
    const safeRole = ['student', 'teacher', 'admin'].includes(role) ? role : 'student';
    const safeName = String(name || 'Explorador').trim().slice(0, 120) || 'Explorador';

    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `INSERT INTO users (email, name, role, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role, totp_enabled, is_active, created_at`,
        [cleanEmail, safeName, safeRole, passwordHash],
      );
      return rows[0];
    }

    if (this.usersByEmail.has(cleanEmail)) {
      const err = new Error('El correo ya está registrado.');
      err.code = '23505';
      throw err;
    }

    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      name: safeName,
      role: safeRole,
      password_hash: passwordHash,
      failed_login_attempts: 0,
      locked_until: null,
      totp_enabled: false,
      totp_secret_enc: null,
      totp_backup_codes_hash: [],
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(cleanEmail, user.id);
    return { ...user };
  }

  async incrementFailedLoginAttempts(userId, nowMs = Date.now()) {
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `SELECT failed_login_attempts FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (!rows[0]) return null;
      const newCount = (rows[0].failed_login_attempts || 0) + 1;
      const lockMinutes = computeProgressiveLockMinutes(newCount);
      const { rows: updated } = await this.pool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = CASE
               WHEN $2 > 0 THEN GREATEST(COALESCE(locked_until, NOW()), NOW() + ($2 || ' minutes')::interval)
               ELSE locked_until
             END,
             updated_at = NOW()
         WHERE id = $3
         RETURNING failed_login_attempts, locked_until`,
        [newCount, lockMinutes, userId],
      );
      return updated[0];
    }

    const user = this.users.get(userId);
    if (!user) return null;
    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
    const lockMinutes = computeProgressiveLockMinutes(user.failed_login_attempts);
    if (lockMinutes > 0) {
      const candidateLock = nowMs + lockMinutes * 60 * 1000;
      const currentLock = user.locked_until ? new Date(user.locked_until).getTime() : 0;
      user.locked_until = new Date(Math.max(currentLock, candidateLock)).toISOString();
    }
    user.updated_at = new Date(nowMs).toISOString();
    return {
      failed_login_attempts: user.failed_login_attempts,
      locked_until: user.locked_until,
    };
  }

  async resetFailedLoginAttempts(userId, nowMs = Date.now()) {
    if (this.usePostgres) {
      await this.pool.query(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_login_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [userId],
      );
      return;
    }

    const user = this.users.get(userId);
    if (!user) return;
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = new Date(nowMs).toISOString();
    user.updated_at = new Date(nowMs).toISOString();
  }

  async updatePasswordHash(userId, newPasswordHash) {
    if (this.usePostgres) {
      await this.pool.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newPasswordHash, userId],
      );
      return;
    }
    const user = this.users.get(userId);
    if (user) {
      user.password_hash = newPasswordHash;
      user.updated_at = new Date().toISOString();
    }
  }

  async enableUserTotp(userId, encryptedSecretBuffer, backupCodesHashes = []) {
    if (this.usePostgres) {
      await this.pool.query(
        `UPDATE users
         SET totp_enabled = TRUE,
             totp_secret_enc = $1,
             totp_backup_codes_hash = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [encryptedSecretBuffer, backupCodesHashes, userId],
      );
      return;
    }
    const user = this.users.get(userId);
    if (user) {
      user.totp_enabled = true;
      user.totp_secret_enc = encryptedSecretBuffer;
      user.totp_backup_codes_hash = backupCodesHashes;
      user.updated_at = new Date().toISOString();
    }
  }

  // ===========================================================================
  // Desafíos MFA efímeros (5 minutos, un solo uso)
  // ===========================================================================
  async createMfaChallenge(userId, ttlSeconds = 300) {
    const challengeId = crypto.randomBytes(32).toString('base64url');
    this.mfaChallenges.set(challengeId, {
      userId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return challengeId;
  }

  async consumeMfaChallenge(challengeId) {
    if (!challengeId) return null;
    const entry = this.mfaChallenges.get(challengeId);
    this.mfaChallenges.delete(challengeId); // Un solo uso
    if (!entry || entry.expiresAt < Date.now()) {
      return null;
    }
    return entry.userId;
  }

  // ===========================================================================
  // Sesiones y Refresh Tokens Rotativos
  // ===========================================================================
  async createSession({
    sessionId = crypto.randomUUID(),
    userId,
    tokenFamilyId = crypto.randomUUID(),
    refreshTokenHash,
    ipAddress,
    userAgent,
    ttlSeconds,
  }) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `INSERT INTO user_sessions (id, user_id, token_family_id, refresh_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, token_family_id, refresh_token_hash, expires_at, revoked_at`,
        [
          sessionId,
          userId,
          tokenFamilyId,
          refreshTokenHash,
          ipAddress,
          String(userAgent || 'unknown').slice(0, 512),
          expiresAt,
        ],
      );
      return rows[0];
    }

    const record = {
      id: sessionId,
      user_id: userId,
      token_family_id: tokenFamilyId,
      refresh_token_hash: refreshTokenHash,
      replaced_by_session_id: null,
      ip_address: ipAddress,
      user_agent: String(userAgent || 'unknown').slice(0, 512),
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      revoked_at: null,
      revocation_reason: null,
    };

    this.sessions.set(sessionId, record);
    this.sessionsByRefreshHash.set(refreshTokenHash, sessionId);
    return { ...record };
  }

  async findSessionByRefreshHash(refreshTokenHash) {
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `SELECT id, user_id, token_family_id, refresh_token_hash, replaced_by_session_id,
                ip_address, user_agent, created_at, expires_at, revoked_at, revocation_reason
         FROM user_sessions
         WHERE refresh_token_hash = $1`,
        [refreshTokenHash],
      );
      return rows[0] || null;
    }

    const sessionId = this.sessionsByRefreshHash.get(refreshTokenHash);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : null;
  }

  async rotateSession({
    currentSessionId,
    newSessionId = crypto.randomUUID(),
    newRefreshTokenHash,
    ipAddress,
    userAgent,
    ttlSeconds,
  }) {
    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `SELECT id, user_id, token_family_id FROM user_sessions WHERE id = $1 FOR UPDATE`,
          [currentSessionId],
        );
        const current = rows[0];
        if (!current) {
          await client.query('ROLLBACK');
          return null;
        }
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        const { rows: inserted } = await client.query(
          `INSERT INTO user_sessions (id, user_id, token_family_id, refresh_token_hash, ip_address, user_agent, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, user_id, token_family_id, refresh_token_hash, expires_at`,
          [
            newSessionId,
            current.user_id,
            current.token_family_id,
            newRefreshTokenHash,
            ipAddress,
            String(userAgent || 'unknown').slice(0, 512),
            expiresAt,
          ],
        );
        await client.query(
          `UPDATE user_sessions
           SET revoked_at = NOW(),
               revocation_reason = 'TOKEN_ROTATED',
               replaced_by_session_id = $1
           WHERE id = $2`,
          [newSessionId, currentSessionId],
        );
        await client.query('COMMIT');
        this.markAccessSessionRevoked(currentSessionId, 15 * 60);
        return inserted[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const current = this.sessions.get(currentSessionId);
    if (!current) return null;

    const newSession = await this.createSession({
      sessionId: newSessionId,
      userId: current.user_id,
      tokenFamilyId: current.token_family_id,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress,
      userAgent,
      ttlSeconds,
    });

    current.revoked_at = new Date().toISOString();
    current.revocation_reason = 'TOKEN_ROTATED';
    current.replaced_by_session_id = newSession.id;
    this.markAccessSessionRevoked(currentSessionId, 15 * 60);

    return newSession;
  }

  /**
   * Revoca TODA una familia de tokens cuando se detecta el reuso de un Refresh Token ya rotado (robo de sesión).
   */
  async revokeSessionFamily(tokenFamilyId, reason = 'REUSE_DETECTED') {
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `UPDATE user_sessions
         SET revoked_at = COALESCE(revoked_at, NOW()),
             revocation_reason = $1
         WHERE token_family_id = $2
         RETURNING id`,
        [reason, tokenFamilyId],
      );
      for (const row of rows) {
        this.markAccessSessionRevoked(row.id, 15 * 60);
      }
      return rows.length;
    }

    let count = 0;
    const nowIso = new Date().toISOString();
    for (const session of this.sessions.values()) {
      if (session.token_family_id === tokenFamilyId) {
        if (!session.revoked_at) {
          session.revoked_at = nowIso;
        }
        session.revocation_reason = reason;
        this.markAccessSessionRevoked(session.id, 15 * 60);
        count += 1;
      }
    }
    return count;
  }

  async revokeSessionByRefreshHash(refreshTokenHash, reason = 'USER_LOGOUT') {
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `UPDATE user_sessions
         SET revoked_at = NOW(),
             revocation_reason = $1
         WHERE refresh_token_hash = $2 AND revoked_at IS NULL
         RETURNING id, user_id`,
        [reason, refreshTokenHash],
      );
      if (rows[0]) {
        this.markAccessSessionRevoked(rows[0].id, 15 * 60);
      }
      return rows[0] || null;
    }

    const sessionId = this.sessionsByRefreshHash.get(refreshTokenHash);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (!session.revoked_at) {
      session.revoked_at = new Date().toISOString();
      session.revocation_reason = reason;
    }
    this.markAccessSessionRevoked(session.id, 15 * 60);
    return { id: session.id, user_id: session.user_id };
  }

  async revokeAllUserSessions(userId, reason = 'PASSWORD_RESET') {
    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `UPDATE user_sessions
         SET revoked_at = NOW(),
             revocation_reason = $1
         WHERE user_id = $2 AND revoked_at IS NULL
         RETURNING id`,
        [reason, userId],
      );
      for (const row of rows) {
        this.markAccessSessionRevoked(row.id, 15 * 60);
      }
      return rows.length;
    }

    let count = 0;
    const nowIso = new Date().toISOString();
    for (const session of this.sessions.values()) {
      if (session.user_id === userId && !session.revoked_at) {
        session.revoked_at = nowIso;
        session.revocation_reason = reason;
        this.markAccessSessionRevoked(session.id, 15 * 60);
        count += 1;
      }
    }
    return count;
  }

  markAccessSessionRevoked(sessionId, ttlSeconds = 900) {
    if (!sessionId) return;
    this.revokedSessionIds.set(sessionId, Date.now() + ttlSeconds * 1000);
  }

  async isAccessSessionRevoked(sessionId) {
    if (!sessionId) return true;
    const revokedUntil = this.revokedSessionIds.get(sessionId);
    if (revokedUntil && revokedUntil > Date.now()) {
      return true;
    }
    if (revokedUntil) {
      this.revokedSessionIds.delete(sessionId);
    }

    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `SELECT revoked_at, expires_at FROM user_sessions WHERE id = $1`,
        [sessionId],
      );
      const sess = rows[0];
      if (!sess) return true;
      return Boolean(sess.revoked_at) || new Date(sess.expires_at).getTime() <= Date.now();
    }

    const sess = this.sessions.get(sessionId);
    if (!sess) return true;
    return Boolean(sess.revoked_at) || new Date(sess.expires_at).getTime() <= Date.now();
  }

  // ===========================================================================
  // Recuperación de Contraseña (Token de un solo uso y expiración corta <= 15m)
  // ===========================================================================
  async createPasswordResetToken({
    userId,
    selector,
    verifierSha256,
    requestedIp,
    ttlSeconds = 900,
  }) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    if (this.usePostgres) {
      const { rows } = await this.pool.query(
        `INSERT INTO password_reset_tokens (user_id, selector, verifier_sha256, requested_ip, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, selector, expires_at`,
        [userId, selector, verifierSha256, requestedIp, expiresAt],
      );
      return rows[0];
    }

    const record = {
      id: crypto.randomUUID(),
      user_id: userId,
      selector,
      verifier_sha256: verifierSha256,
      requested_ip: requestedIp,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString(),
    };
    this.passwordResetTokens.set(selector, record);
    return { ...record };
  }

  async consumePasswordResetToken({ selector, rawVerifier, newPasswordHash, nowMs = Date.now() }) {
    const candidateHash = sha256Hex(rawVerifier);

    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `SELECT id, user_id, verifier_sha256, expires_at, used_at
           FROM password_reset_tokens
           WHERE selector = $1 FOR UPDATE`,
          [selector],
        );
        const record = rows[0];
        if (
          !record ||
          record.used_at !== null ||
          new Date(record.expires_at).getTime() <= nowMs ||
          !timingSafeEqualStr(record.verifier_sha256, candidateHash)
        ) {
          await client.query('ROLLBACK');
          return { ok: false };
        }

        await client.query(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
          [record.id],
        );
        await client.query(
          `UPDATE users
           SET password_hash = $1,
               failed_login_attempts = 0,
               locked_until = NULL,
               updated_at = NOW()
           WHERE id = $2`,
          [newPasswordHash, record.user_id],
        );
        const { rows: revokedSessions } = await client.query(
          `UPDATE user_sessions
           SET revoked_at = NOW(),
               revocation_reason = 'PASSWORD_RESET'
           WHERE user_id = $1 AND revoked_at IS NULL
           RETURNING id`,
          [record.user_id],
        );
        await client.query('COMMIT');
        for (const row of revokedSessions) {
          this.markAccessSessionRevoked(row.id, 15 * 60);
        }
        return { ok: true, userId: record.user_id };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const record = this.passwordResetTokens.get(selector);
    const dummyVerifierHash = sha256Hex('dummy-verifier-constant-time');
    const storedHash = record?.verifier_sha256 || dummyVerifierHash;
    const hashMatches = timingSafeEqualStr(storedHash, candidateHash);

    if (
      !record ||
      record.used_at !== null ||
      new Date(record.expires_at).getTime() <= nowMs ||
      !hashMatches
    ) {
      return { ok: false };
    }

    record.used_at = new Date(nowMs).toISOString();
    await this.updatePasswordHash(record.user_id, newPasswordHash);
    await this.resetFailedLoginAttempts(record.user_id, nowMs);
    await this.revokeAllUserSessions(record.user_id, 'PASSWORD_RESET');

    return { ok: true, userId: record.user_id };
  }

  // ===========================================================================
  // Auditoría de Seguridad (sin contraseñas ni tokens completos)
  // ===========================================================================
  async writeAuditLog({
    userId = null,
    emailHash,
    eventType,
    ipAddress = '0.0.0.0',
    userAgent = 'unknown',
    sessionId = null,
    metadata = {},
  }) {
    const safeMetadata = sanitizeAuditMetadata(metadata);
    const safeUserAgent = String(userAgent || 'unknown').slice(0, 512);

    if (this.usePostgres) {
      await this.pool.query(
        `INSERT INTO auth_audit_logs (user_id, email_sha256, event_type, ip_address, user_agent, session_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          emailHash,
          eventType,
          ipAddress,
          safeUserAgent,
          sessionId,
          JSON.stringify(safeMetadata),
        ],
      );
    }

    const entry = {
      id: this.auditLogs.length + 1,
      user_id: userId,
      email_sha256: emailHash,
      event_type: eventType,
      ip_address: ipAddress,
      user_agent: safeUserAgent,
      session_id: sessionId,
      metadata: safeMetadata,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.push(entry);
    return entry;
  }

  getAuditLogs() {
    return [...this.auditLogs];
  }
}

export const authStore = new AuthStore();
export { AuthStore };
