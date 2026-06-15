// Browser-local persistence for the signed-out (local-first) workspace.
//
// When no user is signed in, the single in-editor project is mirrored to
// localStorage so a refresh keeps the work. Signing in switches to cloud
// storage (cloud-storage.js); this file is never used in cloud mode.
//
// All access is wrapped in try/catch: localStorage can throw in private-mode
// browsers or when the quota is exceeded, and a persistence failure must never
// take down the editor.

const LOCAL_PROJECT_KEY = 'doxa_local_project';

// Returns the saved project payload, or null if there's nothing valid stored.
export function loadLocalProject() {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Persists a project payload. Best-effort — swallows storage errors.
export function saveLocalProject(payload) {
  try {
    localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota exceeded — ignore */
  }
}

// Clears the stored local project.
export function clearLocalProject() {
  try {
    localStorage.removeItem(LOCAL_PROJECT_KEY);
  } catch {
    /* ignore */
  }
}
