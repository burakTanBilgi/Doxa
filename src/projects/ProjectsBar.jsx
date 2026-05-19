import { FolderOpen, Cloud, CloudOff, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useCharts } from '../context/ChartContext';
import { useProjects } from './ProjectsContext';
import UserMenu from '../auth/UserMenu';
import Tooltip from '../components/Tooltip';

const ACCENT = '#c73a3a';

function SyncPill({ status }) {
  let icon, label, color;
  switch (status) {
    case 'saving':
      icon = <Loader2 size={11} className="animate-spin" />;
      label = 'Saving…';
      color = '#888888';
      break;
    case 'saved':
      icon = <Check size={11} />;
      label = 'Saved';
      color = '#6bbf6b';
      break;
    case 'error':
      icon = <AlertTriangle size={11} />;
      label = 'Sync error';
      color = ACCENT;
      break;
    case 'offline':
      icon = <CloudOff size={11} />;
      label = 'Local only';
      color = '#888888';
      break;
    default:
      icon = <Cloud size={11} />;
      label = 'Synced';
      color = '#888888';
  }
  return (
    <Tooltip content={label} accentColor={color}>
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
  const { syncStatus, openModal } = useProjects();

  const cloudActive = supabaseConfigured && user;

  return (
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2 flex-shrink-0"
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

      {cloudActive && (
        <>
          <SyncPill status={syncStatus} />
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
  );
}
