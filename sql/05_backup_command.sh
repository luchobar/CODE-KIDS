#!/usr/bin/env bash
# =============================================================================
# CODEKIDS — TAREA 5: Script de Respaldo (Backup) y Restauración PostgreSQL 16+
# Archivo: /sql/05_backup_command.sh
# =============================================================================

# Variables de conexión (ajustar o exportar desde .env)
PG_HOST="${PG_HOST:-db.supabase.co}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-postgres}"
BACKUP_FILE="${BACKUP_FILE:-backup.sql}"

echo "[CodeKids Backup] Generando volcado completo de PostgreSQL en ${BACKUP_FILE}..."

# Comando oficial pg_dump para respaldo lógico completo (DDL + DML + Roles/Políticas)
pg_dump -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d "${PG_DB}" \
        --schema=public \
        --clean \
        --if-exists \
        --no-owner \
        --inserts \
        --column-inserts \
        -f "${BACKUP_FILE}"

echo "[CodeKids Backup] Respaldo completado exitosamente: ${BACKUP_FILE}"

# Para restaurar en una instancia limpia de PostgreSQL / Supabase:
# psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" -f "${BACKUP_FILE}"
