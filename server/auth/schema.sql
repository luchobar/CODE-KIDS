-- =============================================================================
-- CodeKids - Esquema de Autenticación "Security by Design" (PostgreSQL 16+)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL,
    name VARCHAR(120) NOT NULL DEFAULT 'Explorador',
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    email_verified_at TIMESTAMPTZ NULL,

    -- Hash Argon2id. NULL permitido solo si la cuenta se creó exclusivamente con OAuth2.
    password_hash TEXT NULL,

    -- Bloqueo temporal progresivo ante intentos fallidos
    failed_login_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until TIMESTAMPTZ NULL,

    -- Preparado para 2FA / TOTP opcional
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret_enc BYTEA NULL,          -- Secreto TOTP cifrado con AES-256-GCM
    totp_backup_codes_hash TEXT[] NULL,  -- Hashes SHA-256 de códigos de respaldo de un solo uso

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_locked_until
    ON users (locked_until)
    WHERE locked_until IS NOT NULL;

-- 2. Cuentas OAuth2 / OIDC vinculadas (método alternativo de autenticación)
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,          -- 'google', 'github', 'microsoft'
    provider_user_id VARCHAR(255) NOT NULL, -- 'sub' único del proveedor OAuth2/OIDC
    provider_email CITEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_oauth_provider_subject UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id
    ON oauth_accounts (user_id);

-- 3. Sesiones de Usuario y Refresh Tokens Rotativos
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_family_id UUID NOT NULL,          -- Identificador de familia para detectar robo/reuso de refresh token
    refresh_token_hash CHAR(64) NOT NULL,   -- SHA-256 hex del refresh token opaco (jamás se guarda en claro)
    replaced_by_session_id UUID NULL REFERENCES user_sessions(id),
    ip_address INET NOT NULL,
    user_agent VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    revocation_reason VARCHAR(64) NULL,     -- 'USER_LOGOUT', 'TOKEN_ROTATED', 'REUSE_DETECTED', 'PASSWORD_RESET'

    CONSTRAINT uq_sessions_refresh_hash UNIQUE (refresh_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active
    ON user_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_family_id
    ON user_sessions (token_family_id);

-- 4. Tokens de Recuperación de Contraseña (Un solo uso y expiración corta <= 15m)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selector CHAR(24) NOT NULL,             -- Selector público indexado para búsqueda O(1)
    verifier_sha256 CHAR(64) NOT NULL,      -- Hash SHA-256 del verificador secreto (comparado en tiempo constante)
    requested_ip INET NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_password_reset_selector UNIQUE (selector)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_active
    ON password_reset_tokens (user_id, expires_at)
    WHERE used_at IS NULL;

-- 5. Log de Auditoría de Seguridad (SIN contraseñas ni tokens completos)
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    email_sha256 CHAR(64) NOT NULL,         -- Hash SHA-256 del email normalizado
    event_type VARCHAR(64) NOT NULL,        -- 'REGISTER_SUCCESS', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT_SUCCESS', etc.
    ip_address INET NOT NULL,
    user_agent VARCHAR(512) NOT NULL,
    session_id UUID NULL,                   -- Solo el UUID de sesión, nunca el JWT ni el refresh token
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
    ON auth_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_created
    ON auth_audit_logs (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_created
    ON auth_audit_logs (event_type, created_at DESC);
