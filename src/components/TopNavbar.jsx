import { FolderOpen, Cloud, CloudOff, Loader2, Check, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useCharts } from '../context/ChartContext';
import { useProjects } from '../projects/ProjectsContext';
import UserMenu from '../auth/UserMenu';
import Tooltip from './Tooltip';

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

export default function TopNavbar({ canvasHovered, onLogoHover, mobileTab, onMobileTabChange }) {
  const { user, supabaseConfigured } = useAuth();
  const { analysisTitle, setAnalysisTitle } = useCharts();
  const { syncStatus, lastError, openModal, dismissError, retryBootstrap } = useProjects();

  const showError = syncStatus === 'error' && lastError;

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #2d2d2d',
      }}
    >
      <header
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2"
        data-html2canvas-ignore="true"
      >
        {/* Left: logo + wordmark */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/logo.png"
            alt="Doxa"
            className="h-7 w-auto rounded-lg logo-main transition-all duration-300"
            style={{
              filter: canvasHovered ? 'drop-shadow(0 4px 12px rgba(199, 58, 58, 0.6))' : 'none',
              transform: canvasHovered ? 'translateY(-2px)' : 'none',
            }}
            onMouseEnter={() => onLogoHover?.(true)}
            onMouseLeave={() => onLogoHover?.(false)}
          />
          <span
            className="text-base font-bold tracking-tight font-cinzel hidden sm:inline"
            style={{ color: '#d0d0d0' }}
          >
            Doxa
          </span>
        </div>

        {/* Centre: project title (always visible, editable) */}
        <input
          type="text"
          value={analysisTitle}
          onChange={(e) => setAnalysisTitle(e.target.value)}
          placeholder="Project title"
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold focus:outline-none px-2 py-1 rounded-md transition-colors"
          style={{ color: '#d0d0d0' }}
          onFocus={(e) => { e.currentTarget.style.backgroundColor = '#2d2d2d'; }}
          onBlur={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        />

        {/* Mobile tab switcher tucks into the navbar instead of a separate row. */}
        {onMobileTabChange && (
          <div className="flex gap-1 lg:hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => onMobileTabChange('control')}
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all duration-200"
              style={{
                backgroundColor: mobileTab === 'control' ? '#2d2d2d' : 'transparent',
                color: mobileTab === 'control' ? '#d0d0d0' : '#666666',
              }}
            >
              Control
            </button>
            <button
              type="button"
              onClick={() => onMobileTabChange('view')}
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all duration-200"
              style={{
                backgroundColor: mobileTab === 'view' ? '#2d2d2d' : 'transparent',
                color: mobileTab === 'view' ? '#d0d0d0' : '#666666',
              }}
            >
              View
            </button>
          </div>
        )}

        {/* Right: sync state + projects + account */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
                <span className="hidden sm:inline">Cloud sync off</span>
              </span>
            </Tooltip>
          )}

          {supabaseConfigured && user && (
            <>
              <span className="hidden sm:inline-flex">
                <SyncPill status={syncStatus} errorMessage={lastError} />
              </span>
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
                  <span className="hidden sm:inline">Projects</span>
                </button>
              </Tooltip>
              <UserMenu />
            </>
          )}
        </div>
      </header>

      {showError && (
        <div
          className="mx-3 sm:mx-4 mb-2 rounded-xl px-3 py-2 flex items-start gap-2"
          style={{
            backgroundColor: '#1a0e0e',
            border: `1px solid ${ACCENT}`,
          }}
          data-html2canvas-ignore="true"
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
