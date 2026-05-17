/**
 * Export chart data as a downloadable JSON file.
 */
export function exportAsJson(title, description, charts, comparisons = []) {
  const idToIndex = new Map(charts.map((c, i) => [c.id, i]));
  const payload = {
    doxa_version: '1.0',
    title,
    description,
    charts: charts.map(c => ({
      title: c.title,
      color: c.color,
      traits: c.data.map(t => ({ name: t.subject, value: t.value })),
    })),
    comparisons: comparisons.map(c => ({
      chartIndices: c.chartIds
        .map(id => idToIndex.get(id))
        .filter(idx => idx !== undefined),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${safeName(title)}.json`);
}

/**
 * Export chart data as a human-readable Markdown file.
 */
export function exportAsMarkdown(title, description, charts, comparisons = []) {
  let md = `# ${title}\n`;
  if (description) md += `> ${description}\n`;
  md += '\n';

  for (const chart of charts) {
    md += `## ${chart.title}\n`;
    md += '| Trait | Value |\n';
    md += '|-------|-------|\n';
    for (const trait of chart.data) {
      md += `| ${trait.subject} | ${trait.value} |\n`;
    }
    md += '\n';
  }

  for (const cmp of comparisons) {
    const sel = cmp.chartIds
      .map(id => charts.find(c => c.id === id))
      .filter(Boolean);
    if (sel.length < 2) continue;

    const traitOrder = sel[0].data.map(t => t.subject);
    md += `## Comparison\n`;
    md += `| Trait | ${sel.map(c => c.title).join(' | ')}${sel.length === 2 ? ' | Δ' : ''} |\n`;
    md += `|-------|${sel.map(() => '------').join('|')}${sel.length === 2 ? '|------' : ''}|\n`;
    for (const trait of traitOrder) {
      const values = sel.map(c => {
        const t = c.data.find(x => x.subject === trait);
        return t ? t.value : '';
      });
      let row = `| ${trait} | ${values.join(' | ')}`;
      if (sel.length === 2) {
        const d = (values[1] ?? 0) - (values[0] ?? 0);
        row += ` | ${d > 0 ? `+${d}` : d}`;
      }
      md += row + ' |\n';
    }
    md += '\n';
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  triggerDownload(blob, `${safeName(title)}.md`);
}

/**
 * Parse and validate a Doxa JSON import file.
 * Returns { title, description, charts } in internal format or throws.
 */
export function parseImportJson(text) {
  const data = JSON.parse(text);

  if (!data || !Array.isArray(data.charts)) {
    throw new Error('Invalid Doxa file: missing charts array');
  }

  const charts = data.charts.map((c, i) => {
    if (!c.title || !Array.isArray(c.traits)) {
      throw new Error(`Invalid chart at index ${i}`);
    }
    return {
      id: Date.now() + i,
      title: c.title,
      color: c.color || '#888888',
      data: c.traits.map(t => ({
        subject: t.name,
        value: typeof t.value === 'number' ? Math.min(100, Math.max(0, t.value)) : 50,
        fullMark: 100,
      })),
    };
  });

  const comparisons = Array.isArray(data.comparisons)
    ? data.comparisons
        .map(c => ({
          chartIds: (c.chartIndices || [])
            .map(idx => charts[idx]?.id)
            .filter(id => id !== undefined),
        }))
        .filter(c => c.chartIds.length >= 2)
    : [];

  return {
    title: data.title || 'Imported Analysis',
    description: data.description || '',
    charts,
    comparisons,
  };
}

// --- helpers ---

function safeName(title) {
  return (title || 'doxa-export').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
