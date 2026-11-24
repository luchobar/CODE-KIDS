/**
 * Tarjeta compacta de métrica KPI reutilizable en paneles de estudiante, docente y reportes SQL.
 */
export default function StatCard({ icon, label, value, note, tone = 'blue' }) {
  return (
    <article className={`store-utility-card stat-utility-card tone-${tone}`}>
      <div className={`stat-utility-icon tone-${tone}`}>{icon}</div>
      <div className="stat-utility-body">
        <span className="stat-utility-label">{label}</span>
        <strong className="stat-utility-value">{value}</strong>
        <small className="stat-utility-note">{note}</small>
      </div>
    </article>
  );
}
