// Curated starter templates surfaced in the Projects modal under "Templates".
//
// Templates are LANGUAGE-NEUTRAL. Structure (ids, colors, numeric values,
// comparison wiring) is stored here directly; every human-readable field
// (name, description, chart title, trait subject, comparison title) holds an
// i18n KEY string — not text. `localizeTemplatePayload(tmpl, t)` resolves those
// keys at the moment the user picks a template, producing a frozen project in
// the language that is active right then. Once fabricated, the project's text
// is plain user data and is never retranslated. See docs/TRANSLATIONS.md.

const VERSION = '1.0';

function template({ id, name, description, payload }) {
  return {
    id,
    name,
    description,
    payload: {
      doxa_version: VERSION,
      title: name,
      description: payload.description || description,
      charts: payload.charts.map((c, idx) => ({
        id: idx + 1,
        title: c.title,
        color: c.color,
        data: c.data.map(t => ({ subject: t.subject, value: t.value, fullMark: t.fullMark ?? 100 })),
      })),
      comparisons: payload.comparisons || [],
      compareSelection: payload.compareSelection || [],
    },
  };
}

export const TEMPLATES = [
  template({
    id: 'character-profile',
    name: 'templates.character-profile.name',
    description: 'templates.character-profile.description',
    payload: {
      charts: [
        {
          title: 'templates.character-profile.c1.title',
          color: '#c73a3a',
          data: [
            { subject: 'templates.character-profile.c1.t1', value: 70 },
            { subject: 'templates.character-profile.c1.t2', value: 85 },
            { subject: 'templates.character-profile.c1.t3', value: 60 },
            { subject: 'templates.character-profile.c1.t4', value: 75 },
            { subject: 'templates.character-profile.c1.t5', value: 40 },
          ],
        },
        {
          title: 'templates.character-profile.c2.title',
          color: '#b8b8b8',
          data: [
            { subject: 'templates.character-profile.c2.t1', value: 80 },
            { subject: 'templates.character-profile.c2.t2', value: 65 },
            { subject: 'templates.character-profile.c2.t3', value: 90 },
            { subject: 'templates.character-profile.c2.t4', value: 45 },
            { subject: 'templates.character-profile.c2.t5', value: 85 },
          ],
        },
        {
          title: 'templates.character-profile.c3.title',
          color: '#538b93',
          data: [
            { subject: 'templates.character-profile.c3.t1', value: 100 },
            { subject: 'templates.character-profile.c3.t2', value: 100 },
            { subject: 'templates.character-profile.c3.t3', value: 40 },
            { subject: 'templates.character-profile.c3.t4', value: 85 },
            { subject: 'templates.character-profile.c3.t5', value: 90 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'product-review',
    name: 'templates.product-review.name',
    description: 'templates.product-review.description',
    payload: {
      charts: [
        {
          title: 'templates.product-review.c1.title',
          color: '#8a6f4d',
          data: [
            { subject: 'templates.product-review.c1.t1', value: 70 },
            { subject: 'templates.product-review.c1.t2', value: 60 },
            { subject: 'templates.product-review.c1.t3', value: 75 },
            { subject: 'templates.product-review.c1.t4', value: 65 },
            { subject: 'templates.product-review.c1.t5', value: 50 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'team-skills',
    name: 'templates.team-skills.name',
    description: 'templates.team-skills.description',
    payload: {
      charts: [
        {
          title: 'templates.team-skills.c1.title',
          color: '#6b7a8f',
          data: [
            { subject: 'templates.team-skills.c1.t1', value: 70 },
            { subject: 'templates.team-skills.c1.t2', value: 55 },
            { subject: 'templates.team-skills.c1.t3', value: 60 },
            { subject: 'templates.team-skills.c1.t4', value: 45 },
            { subject: 'templates.team-skills.c1.t5', value: 65 },
          ],
        },
        {
          title: 'templates.team-skills.c2.title',
          color: '#9a6b6b',
          // Trait subjects reuse chart 1's keys so the two charts always share
          // identical trait names — that is what makes them comparison-compatible.
          data: [
            { subject: 'templates.team-skills.c1.t1', value: 80 },
            { subject: 'templates.team-skills.c1.t2', value: 75 },
            { subject: 'templates.team-skills.c1.t3', value: 80 },
            { subject: 'templates.team-skills.c1.t4', value: 70 },
            { subject: 'templates.team-skills.c1.t5', value: 85 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'two-axis',
    name: 'templates.two-axis.name',
    description: 'templates.two-axis.description',
    payload: {
      charts: [
        {
          title: 'templates.two-axis.c1.title',
          color: '#7a8f6b',
          data: [
            { subject: 'templates.two-axis.c1.t1', value: 40 },
            { subject: 'templates.two-axis.c1.t2', value: 70 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'dnd-character',
    name: 'templates.dnd-character.name',
    description: 'templates.dnd-character.description',
    payload: {
      charts: [
        {
          title: 'templates.dnd-character.c1.title',
          color: '#8b5a3c',
          data: [
            { subject: 'templates.dnd-character.c1.t1', value: 14 * 5 },
            { subject: 'templates.dnd-character.c1.t2', value: 16 * 5 },
            { subject: 'templates.dnd-character.c1.t3', value: 13 * 5 },
            { subject: 'templates.dnd-character.c1.t4', value: 10 * 5 },
            { subject: 'templates.dnd-character.c1.t5', value: 12 * 5 },
            { subject: 'templates.dnd-character.c1.t6', value: 18 * 5 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'hero-villain',
    name: 'templates.hero-villain.name',
    description: 'templates.hero-villain.description',
    payload: {
      charts: [
        {
          title: 'templates.hero-villain.c1.title',
          color: '#c73a3a',
          data: [
            { subject: 'templates.hero-villain.c1.t1', value: 90 },
            { subject: 'templates.hero-villain.c1.t2', value: 80 },
            { subject: 'templates.hero-villain.c1.t3', value: 65 },
            { subject: 'templates.hero-villain.c1.t4', value: 75 },
            { subject: 'templates.hero-villain.c1.t5', value: 50 },
          ],
        },
        {
          title: 'templates.hero-villain.c2.title',
          color: '#3d5a80',
          // Trait subjects reuse chart 1's keys (see team-skills above).
          data: [
            { subject: 'templates.hero-villain.c1.t1', value: 60 },
            { subject: 'templates.hero-villain.c1.t2', value: 20 },
            { subject: 'templates.hero-villain.c1.t3', value: 80 },
            { subject: 'templates.hero-villain.c1.t4', value: 70 },
            { subject: 'templates.hero-villain.c1.t5', value: 95 },
          ],
        },
      ],
      comparisons: [
        {
          id: 1,
          title: 'templates.hero-villain.cmp1.title',
          description: '',
          color: '#b8860b',
          chartIds: [1, 2],
          slotSortMode: 'custom',
          rowSortMode: 'custom',
          showDelta: true,
          aggregateColumns: [],
          aggregateRows: [],
        },
      ],
      compareSelection: [1, 2],
    },
  }),
];

export function findTemplate(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}

// Deep-clones a template payload AND resolves every i18n key string to text in
// the language `t` is currently bound to. The result is plain frozen project
// data — switching the app language later must not change it. Callers can
// mutate the returned object freely.
export function localizeTemplatePayload(tmpl, t) {
  const p = tmpl.payload;
  return {
    ...p,
    title: t(p.title),
    description: p.description ? t(p.description) : p.description,
    charts: p.charts.map(c => ({
      ...c,
      title: t(c.title),
      data: c.data.map(trait => ({ ...trait, subject: t(trait.subject) })),
    })),
    comparisons: (p.comparisons || []).map(c => ({
      ...c,
      title: c.title ? t(c.title) : c.title,
      description: c.description ? t(c.description) : c.description,
      chartIds: [...(c.chartIds || [])],
      aggregateColumns: [...(c.aggregateColumns || [])],
      aggregateRows: [...(c.aggregateRows || [])],
    })),
    compareSelection: [...(p.compareSelection || [])],
  };
}
