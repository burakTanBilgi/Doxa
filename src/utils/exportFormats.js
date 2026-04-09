/**
 * Export chart data as a downloadable JSON file.
 */
export function exportAsJson(title, description, charts) {
  const payload = {
    doxa_version: '1.0',
    title,
    description,
    charts: charts.map(c => ({
      title: c.title,
      color: c.color,
      traits: c.data.map(t => ({ name: t.subject, value: t.value })),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${safeName(title)}.json`);
}

/**
 * Export chart data as a human-readable Markdown file.
 */
export function exportAsMarkdown(title, description, charts) {
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

  return {
    title: data.title || 'Imported Analysis',
    description: data.description || '',
    charts,
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
