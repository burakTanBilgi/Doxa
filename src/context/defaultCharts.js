// Seed content for fresh projects and the initial in-memory state.
//
// A brand-new project starts empty by design — the user chooses content via
// the Projects modal (either "New blank project" or a template). The example
// charts that used to be hardcoded here now live in `src/projects/templates.js`
// under the "Character Profile" template.

export const DEFAULT_TITLE = 'Untitled Project';
export const DEFAULT_DESCRIPTION = '';

// Returns a fresh, empty payload. Callers can mutate the returned object freely.
export function makeDefaultPayload(title = DEFAULT_TITLE) {
  return {
    doxa_version: '1.0',
    title,
    description: DEFAULT_DESCRIPTION,
    charts: [],
    comparisons: [],
    compareSelection: [],
  };
}
