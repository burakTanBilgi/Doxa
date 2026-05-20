// Curated starter templates surfaced in the Projects modal under "Templates".
// Each template is a fully-formed Doxa project payload — picking one creates a
// new project pre-filled with its charts/comparisons so the user starts on
// something concrete instead of an empty canvas.

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
    name: 'Character Profile',
    description: 'Three-layer character analysis: traits, social dynamics, and a flavour wildcard.',
    payload: {
      charts: [
        {
          title: 'Core Layer: Big Five',
          color: '#c73a3a',
          data: [
            { subject: 'Openness', value: 70 },
            { subject: 'Conscientiousness', value: 85 },
            { subject: 'Extraversion', value: 60 },
            { subject: 'Agreeableness', value: 75 },
            { subject: 'Neuroticism', value: 40 },
          ],
        },
        {
          title: 'Presentation Layer: Social Dynamics',
          color: '#b8b8b8',
          data: [
            { subject: 'Chaos Potential', value: 80 },
            { subject: 'Manipulation', value: 65 },
            { subject: 'Secrecy', value: 90 },
            { subject: 'Empathy', value: 45 },
            { subject: 'Ego/Confidence', value: 85 },
          ],
        },
        {
          title: 'Ayran',
          color: '#538b93',
          data: [
            { subject: 'Tat Dengesi', value: 100 },
            { subject: 'Doku', value: 100 },
            { subject: 'Ortama Uygunluk', value: 40 },
            { subject: 'İçim Kolaylığı', value: 85 },
            { subject: 'After Taste', value: 90 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'product-review',
    name: 'Product Review',
    description: 'Score a product across build quality, value, ergonomics, and longevity.',
    payload: {
      charts: [
        {
          title: 'Overall Assessment',
          color: '#8a6f4d',
          data: [
            { subject: 'Build Quality', value: 70 },
            { subject: 'Value for Money', value: 60 },
            { subject: 'Ergonomics', value: 75 },
            { subject: 'Longevity', value: 65 },
            { subject: 'Wow Factor', value: 50 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'team-skills',
    name: 'Team Skills Audit',
    description: 'Two charts for comparing where a teammate stands today vs. where they want to be.',
    payload: {
      charts: [
        {
          title: 'Current Skill Level',
          color: '#6b7a8f',
          data: [
            { subject: 'Engineering', value: 70 },
            { subject: 'Product Sense', value: 55 },
            { subject: 'Communication', value: 60 },
            { subject: 'Leadership', value: 45 },
            { subject: 'Domain Knowledge', value: 65 },
          ],
        },
        {
          title: 'Target Skill Level',
          color: '#9a6b6b',
          data: [
            { subject: 'Engineering', value: 80 },
            { subject: 'Product Sense', value: 75 },
            { subject: 'Communication', value: 80 },
            { subject: 'Leadership', value: 70 },
            { subject: 'Domain Knowledge', value: 85 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'two-axis',
    name: 'Two-Axis Plot',
    description: 'Minimal scatter template — two traits render as a 2D plot instead of a radar.',
    payload: {
      charts: [
        {
          title: 'Effort vs Impact',
          color: '#7a8f6b',
          data: [
            { subject: 'Effort', value: 40 },
            { subject: 'Impact', value: 70 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'dnd-character',
    name: 'D&D Character Build',
    description: 'Six classic ability scores plotted as a radar — a familiar shape for tabletop builds.',
    payload: {
      charts: [
        {
          title: 'Ability Scores',
          color: '#8b5a3c',
          data: [
            { subject: 'STR', value: 14 * 5 },
            { subject: 'DEX', value: 16 * 5 },
            { subject: 'CON', value: 13 * 5 },
            { subject: 'INT', value: 10 * 5 },
            { subject: 'WIS', value: 12 * 5 },
            { subject: 'CHA', value: 18 * 5 },
          ],
        },
      ],
    },
  }),
  template({
    id: 'hero-villain',
    name: 'Hero vs Villain',
    description: 'Two trait-compatible charts plus a pre-configured comparison so you can see the comparison feature head-to-head.',
    payload: {
      charts: [
        {
          title: 'Hero',
          color: '#c73a3a',
          data: [
            { subject: 'Courage', value: 90 },
            { subject: 'Empathy', value: 80 },
            { subject: 'Wisdom', value: 65 },
            { subject: 'Strength', value: 75 },
            { subject: 'Cunning', value: 50 },
          ],
        },
        {
          title: 'Villain',
          color: '#3d5a80',
          data: [
            { subject: 'Courage', value: 60 },
            { subject: 'Empathy', value: 20 },
            { subject: 'Wisdom', value: 80 },
            { subject: 'Strength', value: 70 },
            { subject: 'Cunning', value: 95 },
          ],
        },
      ],
      comparisons: [
        {
          id: 1,
          title: 'Showdown',
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

// Deep-clones a template payload so callers can mutate freely.
export function cloneTemplatePayload(tmpl) {
  return {
    ...tmpl.payload,
    charts: tmpl.payload.charts.map(c => ({
      ...c,
      data: c.data.map(t => ({ ...t })),
    })),
    comparisons: tmpl.payload.comparisons.map(c => ({ ...c, chartIds: [...(c.chartIds || [])] })),
    compareSelection: [...(tmpl.payload.compareSelection || [])],
  };
}
