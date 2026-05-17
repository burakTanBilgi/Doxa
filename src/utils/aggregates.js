// Shared registry for stats the user can add as comparison-table columns/rows.
// One entry per aggregate; UI lists and the table renderer both consume this.

export const AGGREGATES = [
  { key: 'mean',   label: 'Mean',   compute: vs => vs.reduce((a, b) => a + b, 0) / vs.length },
  { key: 'min',    label: 'Min',    compute: vs => Math.min(...vs) },
  { key: 'max',    label: 'Max',    compute: vs => Math.max(...vs) },
  { key: 'sum',    label: 'Sum',    compute: vs => vs.reduce((a, b) => a + b, 0) },
  {
    key: 'median',
    label: 'Median',
    compute: vs => {
      const s = [...vs].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    },
  },
  { key: 'range',  label: 'Range',  compute: vs => Math.max(...vs) - Math.min(...vs) },
];

export const AGGREGATE_BY_KEY = Object.fromEntries(AGGREGATES.map(a => [a.key, a]));

export function formatAggregate(n) {
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
