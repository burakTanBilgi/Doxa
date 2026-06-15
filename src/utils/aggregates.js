// Shared registry for stats the user can add as comparison-table columns/rows.
// One entry per aggregate; UI lists and the table renderer both consume this.
//
// Labels are NOT stored here — this is a non-React module. Consumers resolve a
// human-readable label from `key` via i18n: `t('stats.' + agg.key)`.

export const AGGREGATES = [
  { key: 'mean',   compute: vs => vs.reduce((a, b) => a + b, 0) / vs.length },
  { key: 'min',    compute: vs => Math.min(...vs) },
  { key: 'max',    compute: vs => Math.max(...vs) },
  { key: 'sum',    compute: vs => vs.reduce((a, b) => a + b, 0) },
  {
    key: 'median',
    compute: vs => {
      const s = [...vs].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    },
  },
  { key: 'range',  compute: vs => Math.max(...vs) - Math.min(...vs) },
];

export const AGGREGATE_BY_KEY = Object.fromEntries(AGGREGATES.map(a => [a.key, a]));

export function formatAggregate(n) {
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
