import { FolderOpen, Cloud, CloudOff, Loader2, Check, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useCharts } from '../context/ChartContext';
import { useProjects } from './ProjectsContext';
import UserMenu from '../auth/UserMenu';
import Tooltip from '../components/Tooltip';

const ACCENT = '#c73a3a';

function SyncPill({ status, errorMessage }) {
  let icon, label, color, tooltip;
  switch (status) {
    case 'saving':
      icon = <Loader2 size={11} className="animate-spin" />;
      label = 'Saving…';
      color = '#888888';
      tooltip = 'Saving to Supabase';
      break;
    case 'saved':
      icon = <Check size={11} />;
      label = 'Saved';
      color = '#6bbf6b';
      tooltip = 'All changes synced';
      break;
    case 'error':
      icon = <AlertTriangle size={11} />;
      label = 'Sync error';
      color = ACCENT;
      tooltip = errorMessage || 'Sync failed — see browser console for details';
      break;
    case 'offline':
      icon = <CloudOff size={11} />;
      label = 'Local only';
      color = '#888888';
      tooltip = 'No Supabase credentials configured';
      break;
    default:
      icon = <Cloud size={11} />;
      label = 'Synced';
      color = '#888888';
      tooltip = 'Connected';
  }
  return (
    <Tooltip content={tooltip} accentColor={color}>
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #3d3d3d',
          color,
        }}
      >
        {icon}
        {label}
      </span>
    </Tooltip>
  );
}

export default function ProjectsBar() {
  const { user, supabaseConfigured } = useAuth();
  const { analysisTitle, setAnalysisTitle } = useCharts();
  const { syncStatus, lastError, openModal, dismissError, retryBootstrap } = useProjects();

  const showError = syncStatus === 'error' && lastError;

  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2"
      style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}
    >
      <input
        type="text"
        value={analysisTitle}
        onChange={(e) => setAnalysisTitle(e.target.value)}
        placeholder="Project title"
        className="flex-1 min-w-0 bg-transparent text-sm font-semibold focus:outline-none px-1"
        style={{ color: '#d0d0d0' }}
      />

      {!supabaseConfigured && (
        <Tooltip
          content="VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — set them in your env (and on Netlify) to enable cloud sync."
          accentColor="#888888"
        >
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #3d3d3d', color: '#888888' }}
          >
            <CloudOff size={11} />
            Cloud sync off
          </span>
        </Tooltip>
      )}

      {supabaseConfigured && user && (
        <>
          <SyncPill status={syncStatus} errorMessage={lastError} />
          <Tooltip content="Open projects" accentColor={ACCENT}>
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-black/30"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #3d3d3d',
                color: '#d0d0d0',
              }}
            >
              <FolderOpen size={12} />
              Projects
            </button>
          </Tooltip>
          <UserMenu />
        </>
      )}
    </div>

    {showError && (
      <div
        className="rounded-xl px-3 py-2 flex items-start gap-2"
        style={{
          backgroundColor: '#1a0e0e',
          border: `1px solid ${ACCENT}`,
        }}
      >
        <AlertTriangle size={14} style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: ACCENT }}>
            Cloud sync failed
          </p>
          <p
            className="text-[10px] break-words"
            style={{ color: '#d0d0d0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {lastError}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip content="Retry" accentColor={ACCENT}>
            <button
              type="button"
              onClick={retryBootstrap}
              className="p-1 rounded-md hover:bg-black/30 transition-colors"
              style={{ color: '#d0d0d0' }}
            >
              <RefreshCw size={12} />
            </button>
          </Tooltip>
          <Tooltip content="Dismiss" accentColor={ACCENT}>
            <button
              type="button"
              onClick={dismissError}
              className="p-1 rounded-md hover:bg-black/30 transition-colors"
              style={{ color: '#888888' }}
            >
              <X size={12} />
            </button>
          </Tooltip>
        </div>
      </div>
    )}
    </div>
  );
}
