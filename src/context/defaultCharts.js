// Seed content used both for the initial in-memory state and for any new
// project the user creates from the Projects modal.

export const DEFAULT_TITLE = 'Untitled Analysis';
export const DEFAULT_DESCRIPTION = 'Character Profile Analysis';

export const DEFAULT_CHARTS = [
  {
    id: 1,
    title: 'Core Layer: Big Five',
    color: '#c73a3a',
    data: [
      { subject: 'Openness', value: 70, fullMark: 100 },
      { subject: 'Conscientiousness', value: 85, fullMark: 100 },
      { subject: 'Extraversion', value: 60, fullMark: 100 },
      { subject: 'Agreeableness', value: 75, fullMark: 100 },
      { subject: 'Neuroticism', value: 40, fullMark: 100 },
    ],
  },
  {
    id: 2,
    title: 'Presentation Layer: Social Dynamics',
    color: '#b8b8b8',
    data: [
      { subject: 'Chaos Potential', value: 80, fullMark: 100 },
      { subject: 'Manipulation', value: 65, fullMark: 100 },
      { subject: 'Secrecy', value: 90, fullMark: 100 },
      { subject: 'Empathy', value: 45, fullMark: 100 },
      { subject: 'Ego/Confidence', value: 85, fullMark: 100 },
    ],
  },
  {
    id: 3,
    title: 'Ayran',
    color: '#538b93',
    data: [
      { subject: 'Tat Dengesi', value: 100, fullMark: 100 },
      { subject: 'Doku', value: 100, fullMark: 100 },
      { subject: 'Ortama Uygunluk', value: 40, fullMark: 100 },
      { subject: 'İçim Kolaylığı', value: 85, fullMark: 100 },
      { subject: 'After Taste', value: 90, fullMark: 100 },
    ],
  },
];

// Returns a fresh deep copy so callers can mutate freely without sharing
// references with the in-memory default state.
export function makeDefaultPayload(title = 'Untitled Project') {
  return {
    doxa_version: '1.0',
    title,
    description: DEFAULT_DESCRIPTION,
    charts: DEFAULT_CHARTS.map(c => ({
      ...c,
      data: c.data.map(t => ({ ...t })),
    })),
    comparisons: [],
    compareSelection: [],
  };
}
