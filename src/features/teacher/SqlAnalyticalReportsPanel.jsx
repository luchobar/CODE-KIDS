import { useEffect, useState } from 'react';
import { Code, Coins, Lightning, Sparkle, Trophy, WarningCircle } from '@phosphor-icons/react';
import StatCard from '../../components/layout/StatCard.jsx';
import { getAllAnalyticalReports, getClassroomRanking } from '../../data/reportsRepository.js';

/**
 * Visor docente de informes analíticos SQL (riesgo pedagógico, reintentos, economía y ranking).
 */
export default function SqlAnalyticalReportsPanel({ group }) {
  const [activeTab, setActiveTab] = useState('risk');
  const [showSql, setShowSql] = useState(false);
  const [reports, setReports] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [repData, rankData] = await Promise.all([
        getAllAnalyticalReports({ aulaCodigo: null, threshold: 3.0 }),
        getClassroomRanking({ codigoGrupo: group || '5° A' }),
      ]);
      setReports(repData);
      setRanking(rankData?.ranking || []);
    } catch (err) {
      setError(err?.message || 'No fue posible cargar los informes analíticos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshReports();
  }, [group]);

  const riskRows = reports?.atRiskStudents?.rows || [];
  const retryRows = reports?.highRetryMissions?.rows || [];
  const econRows = reports?.gamifiedEconomy?.rows || [];
  const econSummary = reports?.gamifiedEconomy?.summary || {};

  const activeSql =
    activeTab === 'risk'
      ? reports?.atRiskStudents?.sql
      : activeTab === 'retry'
        ? reports?.highRetryMissions?.sql
        : reports?.gamifiedEconomy?.sql;

  const tabs = [
    { id: 'risk', label: `1. Riesgo Pedagógico HAVING AVG < 3.0 (${riskRows.length})` },
    { id: 'retry', label: `2. Mayor Tasa de Reintentos (${retryRows.length})` },
    { id: 'economy', label: `3. Economía Gamificada y Tienda (${econRows.length})` },
    { id: 'ranking', label: `4. Ranking del Curso ${group} (${ranking.length})` },
  ];

  return (
    <section className="store-utility-card mt-lg">
      <div className="card-header-row card-header-wrap">
        <div>
          <span className="hero-eyebrow">MÓDULO DE INFORMES ANALÍTICOS SQL (TAREA 4 · 3FN)</span>
          <h3>Consultas Complejas con JOIN, GROUP BY, HAVING y Agregación</h3>
          <p>
            Informes consumidos vía API REST (<code>/api/v1/reports</code>) y ejecutados por{' '}
            <code>reports.service.js</code> sobre el modelo relacional de 14 tablas.
          </p>
        </div>
        <div className="inline-actions-row">
          <button
            type="button"
            className="button-secondary-pill"
            onClick={() => setShowSql((v) => !v)}
          >
            <Code size={15} weight="bold" />
            <span>{showSql ? 'Ocultar sentencia SQL' : 'Ver sentencia SQL'}</span>
          </button>
          <button type="button" className="button-primary" onClick={refreshReports} disabled={loading}>
            <Sparkle size={15} weight="fill" />
            <span>{loading ? 'Consultando SQL...' : 'Actualizar consultas SQL'}</span>
          </button>
        </div>
      </div>

      <div className="challenge-skill-tabs my-md" role="tablist">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id ? 'configurator-option-chip selected' : 'configurator-option-chip'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {showSql && activeSql && (
        <pre className="sql-code-preview">
          <code>{activeSql}</code>
        </pre>
      )}

      {error && (
        <div className="auth-alert-box error mb-md" role="alert">
          <WarningCircle size={16} weight="fill" />
          <span>{error}</span>
          <button type="button" className="button-secondary-pill" onClick={refreshReports}>
            Reintentar
          </button>
        </div>
      )}

      {loading && !reports ? (
        <div className="empty-state-card" role="status">
          <Sparkle size={24} weight="duotone" />
          <h3>Ejecutando consultas analíticas...</h3>
          <p>Recopilando métricas del modelo relacional para el curso {group}.</p>
        </div>
      ) : null}

      {!loading && activeTab === 'risk' && (
        riskRows.length === 0 ? (
          <div className="empty-state-card" role="status">
            <Trophy size={24} weight="duotone" />
            <h3>Sin estudiantes en riesgo pedagógico</h3>
            <p>Ningún estudiante registra promedio inferior a 3.0 en las entregas evaluadas.</p>
          </div>
        ) : (
          <div className="result-list">
            {riskRows.map((row) => (
              <article className="submission-item-card" key={`${row.aula_id}-${row.estudiante_id}`}>
                <div className="submission-item-top">
                  <span className="student-initial-badge">
                    {String(row.estudiante_nombre || 'E').charAt(0)}
                  </span>
                  <div className="submission-item-meta">
                    <strong>
                      {row.estudiante_nombre}
                      {row.estudiante_correo ? ` (${row.estudiante_correo})` : ''}
                    </strong>
                    <small>
                      Aula {row.codigo_aula} · {row.nombre_aula} · Entregas evaluadas: {row.total_entregas_evaluadas}
                    </small>
                  </div>
                  <b className="score-pill">
                    Promedio: {row.promedio_puntuacion} / 5.0 ({row.promedio_porcentaje}%)
                  </b>
                </div>
                <div className="teacher-recommendation-box mt-xs">
                  <b>{row.nivel_alerta_pedagogica}:</b>
                  <span>
                    {' '}
                    Intentos en retos: {row.intentos_en_retos} | Promedio de intentos en mapa: {row.promedio_intentos_mapa}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {!loading && activeTab === 'retry' && (
        retryRows.length === 0 ? (
          <div className="empty-state-card" role="status">
            <Code size={24} weight="duotone" />
            <h3>Sin registros de reintentos todavía</h3>
            <p>Cuando los estudiantes resuelvan misiones, aparecerán aquí las tasas de reintento.</p>
          </div>
        ) : (
          <div className="result-list">
            {retryRows.map((row) => (
              <article className="submission-item-card" key={row.mision_id}>
                <div className="submission-item-top">
                  <div className="submission-item-meta">
                    <strong>
                      {row.titulo_ejercicio} ({row.mision_id})
                    </strong>
                    <small>
                      {row.mundo_titulo} · Habilidad: {row.habilidad} · Nivel: {row.nivel_dificultad}
                    </small>
                  </div>
                  <b className="score-pill">
                    Promedio: {row.promedio_intentos} intentos (Máx: {row.maximo_intentos_registrado})
                  </b>
                </div>
                <p className="submission-evidence">
                  Estudiantes que intentaron: <b>{row.estudiantes_que_intentaron}</b> · Intentos acumulados:{' '}
                  <b>{row.total_intentos_acumulados}</b> · Tasa de reintentos/alumno:{' '}
                  <b>{row.tasa_reintentos_por_estudiante}</b>
                </p>
              </article>
            ))}
          </div>
        )
      )}

      {!loading && activeTab === 'economy' && (
        <div>
          <div className="metrics-bento-grid mb-md">
            <StatCard
              icon={<Coins size={20} weight="duotone" />}
              label="Monedas en circulación (SUM)"
              value={econSummary.masa_monetaria_en_circulacion ?? 0}
              note={`Promedio: ${econSummary.promedio_monedas_por_estudiante ?? 0} monedas/alumno`}
              tone="yellow"
            />
            <StatCard
              icon={<Trophy size={20} weight="duotone" />}
              label="Avatares desbloqueados (COUNT)"
              value={econSummary.total_desbloqueos_tienda ?? 0}
              note={`Inversión en tienda: ${econSummary.monedas_gastadas_en_tienda ?? 0} monedas`}
              tone="mint"
            />
            <StatCard
              icon={<Lightning size={20} weight="duotone" />}
              label="XP Total del Ecosistema"
              value={econSummary.xp_total_ecosistema ?? 0}
              note={`${econSummary.total_estudiantes_activos ?? 0} estudiantes analizados`}
              tone="blue"
            />
          </div>
          {econRows.length === 0 ? (
            <div className="empty-state-card" role="status">
              <Coins size={24} weight="duotone" />
              <h3>Sin movimientos económicos registrados</h3>
              <p>Aún no hay balances ni compras en la tienda de avatares.</p>
            </div>
          ) : (
            <div className="result-list">
              {econRows.map((row) => (
                <article className="submission-item-card" key={row.usuario_id}>
                  <div className="submission-item-top">
                    <span className="student-initial-badge">{String(row.estudiante || 'E').charAt(0)}</span>
                    <div className="submission-item-meta">
                      <strong>
                        {row.estudiante} (Nvl. {row.nivel_actual})
                      </strong>
                      <small>
                        {row.correo} · {row.puntos_xp} XP · Racha: {row.dias_racha} días
                      </small>
                    </div>
                    <b className="score-pill high">
                      Saldo: {row.saldo_monedas_actual} 🪙 | Avatares: {row.total_avatares_desbloqueados}
                    </b>
                  </div>
                  <p className="submission-evidence">
                    Monedas invertidas en tienda: <b>{row.monedas_invertidas_en_tienda}</b> · Riqueza total generada:{' '}
                    <b>{row.riqueza_total_generada}</b> · Insignias: <b>{row.total_insignias_ganadas}</b>
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'ranking' && (
        ranking.length === 0 ? (
          <div className="empty-state-card" role="status">
            <Trophy size={24} weight="duotone" />
            <h3>Sin estudiantes en el ranking de {group}</h3>
            <p>Inscribe estudiantes en este curso para visualizar la tabla de clasificación.</p>
          </div>
        ) : (
          <div className="result-list">
            {ranking.map((row) => (
              <article className="submission-item-card" key={row.estudiante_id}>
                <div className="submission-item-top">
                  <span className="student-initial-badge">#{row.posicion}</span>
                  <div className="submission-item-meta">
                    <strong>{row.nombre}</strong>
                    <small>
                      {row.correo} · Nivel {row.nivel_actual} · {row.misiones_completadas} misiones completadas
                    </small>
                  </div>
                  <b className="score-pill high">
                    {row.puntos_xp} XP · {row.saldo_monedas} 🪙
                  </b>
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}
