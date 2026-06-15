import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  X, Plus, Trash2, Pencil, Copy, Check,
  FileBox, Sparkles,
} from 'lucide-react';
import { useProjects } from './ProjectsContext';
import { TEMPLATES, localizeTemplatePayload } from './templates';
import { cloudLoadProject } from './cloud-storage';
import Tooltip from '../components/Tooltip';

const ACCENT = '#c73a3a';

function timeAgo(iso, t) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return t('projects.timeAgo.seconds', { n: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t('projects.timeAgo.minutes', { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('projects.timeAgo.hours', { n: hr });
  const day = Math.floor(hr / 24);
  return t('projects.timeAgo.days', { n: day });
}

// ---- Mini chart preview (SVG, no recharts) ---------------------------------
// Keeps the preview cheap to render in a grid — no chart library, no layout
// thrash. 2-trait charts render as a scatter dot; 3+ as a radar polygon.
function MiniChart({ chart, size = 56 }) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length < 2) return null;
  const cx = size / 2;
  const cy = size / 2;
  const pad = size * 0.1;
  const r = size * 0.42;
  const color = chart.color || '#888888';

  if (chart.data.length === 2) {
    const [a, b] = chart.data;
    const xv = (a.value || 0) / (a.fullMark || 100);
    const yv = (b.value || 0) / (b.fullMark || 100);
    const x = pad + xv * (size - pad * 2);
    const y = size - pad - yv * (size - pad * 2);
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect
          x={pad} y={pad} width={size - pad * 2} height={size - pad * 2}
          fill="none" stroke="#3d3d3d" strokeWidth="0.6"
        />
        <circle cx={x} cy={y} r={3} fill={color} stroke="#1a1a1a" strokeWidth="1" />
      </svg>
    );
  }

  const n = chart.data.length;
  const points = chart.data.map((trait, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const distance = ((trait.value || 0) / (trait.fullMark || 100)) * r;
    return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3d3d3d" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke="#2d2d2d" strokeWidth="0.4" />
      {chart.data.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="#3d3d3d" strokeWidth="0.4"
          />
        );
      })}
      <polygon
        points={points.map(p => p.join(',')).join(' ')}
        fill={color} fillOpacity="0.35"
        stroke={color} strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Comparison mini-preview: overlay every referenced chart's polygon in one SVG
// so the card communicates "this is multiple charts compared", not just one.
function MiniComparison({ comparison, charts, size = 56 }) {
  const referenced = (comparison.chartIds || [])
    .map(id => charts.find(c => c.id === id))
    .filter(Boolean);
  if (referenced.length === 0) return null;
  const base = referenced[0];
  if (!Array.isArray(base.data) || base.data.length < 2) return null;

  const cx = size / 2;
  const cy = size / 2;
  const pad = size * 0.1;
  const r = size * 0.42;
  const n = base.data.length;

  if (n === 2) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect
          x={pad} y={pad} width={size - pad * 2} height={size - pad * 2}
          fill="none" stroke="#3d3d3d" strokeWidth="0.6"
        />
        {referenced.map((chart, i) => {
          const [a, b] = chart.data;
          const xv = (a.value || 0) / (a.fullMark || 100);
          const yv = (b.value || 0) / (b.fullMark || 100);
          const x = pad + xv * (size - pad * 2);
          const y = size - pad - yv * (size - pad * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill={chart.color || '#888'} stroke="#1a1a1a" strokeWidth="1" />;
        })}
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3d3d3d" strokeWidth="0.6" />
      {base.data.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="#3d3d3d" strokeWidth="0.4"
          />
        );
      })}
      {referenced.map((chart, i) => {
        const data = chart.data.slice(0, n);
        const points = data.map((trait, j) => {
          const angle = (Math.PI * 2 * j) / n - Math.PI / 2;
          const distance = ((trait.value || 0) / (trait.fullMark || 100)) * r;
          return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
        });
        return (
          <polygon
            key={i}
            points={points.map(p => p.join(',')).join(' ')}
            fill={chart.color || '#888'} fillOpacity="0.22"
            stroke={chart.color || '#888'} strokeWidth="1"
            strokeOpacity="0.85"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

// Horizontal carousel of charts + comparisons. Hidden scrollbar, peripheral
// items fade + scale down so the centre item draws the eye. Drag-to-pan;
// if the user actually dragged we swallow the trailing click so the card
// doesn't open the project.
function PreviewScroller({ items }) {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const dragRef = useRef({ dragging: false, startX: 0, scrollLeft: 0, moved: false });
  const [overflowing, setOverflowing] = useState(false);

  const updateStyles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const isOver = container.scrollWidth > container.clientWidth + 1;
    setOverflowing(isOver);
    const cRect = container.getBoundingClientRect();
    const cCenter = cRect.left + cRect.width / 2;
    const halfWidth = cRect.width / 2;
    for (const el of itemRefs.current) {
      if (!el) continue;
      if (!isOver) {
        el.style.transform = '';
        el.style.opacity = '';
        continue;
      }
      const r = el.getBoundingClientRect();
      const itemCenter = r.left + r.width / 2;
      const dist = Math.abs(itemCenter - cCenter);
      const ratio = Math.min(1, dist / halfWidth);
      const scale = 1 - 0.18 * ratio;
      const opacity = 1 - 0.65 * ratio;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = `${opacity}`;
    }
  }, []);

  useEffect(() => {
    updateStyles();
    const onResize = () => updateStyles();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [items, updateStyles]);

  const onScroll = () => updateStyles();

  const onMouseDown = (e) => {
    const c = containerRef.current;
    if (!c || c.scrollWidth <= c.clientWidth) return;
    dragRef.current = {
      dragging: true,
      startX: e.pageX,
      scrollLeft: c.scrollLeft,
      moved: false,
    };
  };
  const onMouseMove = (e) => {
    const s = dragRef.current;
    if (!s.dragging) return;
    const dx = e.pageX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    if (s.moved) {
      e.preventDefault();
      containerRef.current.scrollLeft = s.scrollLeft - dx;
    }
  };
  const endDrag = () => { dragRef.current.dragging = false; };
  // Capture-phase click swallow: if a drag occurred, stop the card's onClick
  // (which opens the project) before it fires.
  const onClickCapture = (e) => {
    if (dragRef.current.moved) {
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  const mask = overflowing
    ? 'linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)'
    : undefined;

  return (
    <div
      ref={containerRef}
      className="h-[72px] flex items-center gap-2 px-3 overflow-x-auto hide-scrollbar select-none"
      style={{
        cursor: overflowing ? 'grab' : 'default',
        WebkitMaskImage: mask,
        maskImage: mask,
        justifyContent: overflowing ? 'flex-start' : 'center',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClickCapture={onClickCapture}
      onScroll={onScroll}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          ref={(el) => { itemRefs.current[i] = el; }}
          className="flex-shrink-0 transition-[transform,opacity] duration-200 ease-out"
          style={{ willChange: 'transform, opacity' }}
        >
          {item.node}
        </div>
      ))}
    </div>
  );
}

function PreviewArea({ payload, loading }) {
  const { t } = useTranslation();
  // A missing preview entry (undefined) is treated as still loading so the
  // card doesn't flash an "Empty" state during the lazy fetch.
  const items = useMemo(() => {
    if (!payload) return [];
    const charts = Array.isArray(payload.charts) ? payload.charts : [];
    const comparisons = Array.isArray(payload.comparisons) ? payload.comparisons : [];
    return [
      ...charts.map(c => ({
        key: `chart-${c.id ?? `${c.title}-${c.color}`}`,
        node: <MiniChart chart={c} size={56} />,
      })),
      // Drop comparisons that don't reference any extant chart — they'd
      // render as null and waste a slot in the scroller.
      ...comparisons
        .filter(cmp => Array.isArray(cmp.chartIds) && cmp.chartIds.some(id =>
          charts.some(c => c.id === id)
        ))
        .map(cmp => ({
          key: `cmp-${cmp.id}`,
          node: <MiniComparison comparison={cmp} charts={charts} size={56} />,
        })),
    ];
  }, [payload]);

  if (loading || payload === undefined) {
    return <div className="h-[72px] rounded-lg bg-black/20 animate-pulse" />;
  }
  if (items.length === 0) {
    return (
      <div className="h-[72px] flex items-center justify-center" style={{ color: '#555555' }}>
        <span className="text-[10px] uppercase tracking-wider">{t('projects.previewEmpty')}</span>
      </div>
    );
  }
  return <PreviewScroller items={items} />;
}

// ---- Project card ----------------------------------------------------------
function ProjectCard({
  project, isActive, preview,
  isRenaming, renameValue, onRenameChange, onCommitRename, onCancelRename,
  isConfirmingDelete, onConfirmDelete, onCancelConfirmDelete,
  onOpen, onStartRename, onStartConfirmDelete, onCopyId,
  copied,
}) {
  const { t } = useTranslation();
  const interactive = !isRenaming && !isConfirmingDelete;
  return (
    <div
      className={`group relative rounded-xl flex flex-col overflow-hidden transition-all duration-150 ${
        interactive ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
      style={{
        backgroundColor: '#1a1a1a',
        border: `1px solid ${isActive ? ACCENT : '#3d3d3d'}`,
        boxShadow: isActive ? `0 0 0 1px ${ACCENT}` : 'none',
      }}
      onClick={() => interactive && onOpen(project.id)}
    >
      <div
        className="px-3 pt-3 pb-1 border-b"
        style={{ borderColor: '#2d2d2d', backgroundColor: '#161616' }}
      >
        <PreviewArea payload={preview?.payload} loading={preview?.loading} />
      </div>
      <div className="px-3 py-2 flex flex-col gap-0.5 min-w-0">
        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            className="w-full px-2 py-1 rounded text-sm bg-transparent border focus:outline-none"
            style={{ color: '#d0d0d0', borderColor: ACCENT }}
          />
        ) : (
          <p className="text-sm font-medium truncate" style={{ color: '#d0d0d0' }}>
            {project.title || t('common.untitledProject')}
          </p>
        )}
        <p className="text-[10px] flex items-center gap-2 truncate" style={{ color: '#666666' }}>
          <span>{t('projects.editedAgo', { time: timeAgo(project.updated_at, t) })}</span>
          <span className="font-mono opacity-70">{String(project.id).slice(0, 8)}</span>
        </p>
      </div>

      {isConfirmingDelete && (
        <div className="px-3 pb-3 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onConfirmDelete(project.id); }}
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold"
            style={{ backgroundColor: ACCENT, color: '#ffffff' }}
          >
            {t('common.delete')}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCancelConfirmDelete(); }}
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded"
            style={{ color: '#888888' }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {interactive && (
        <div
          className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip content={copied ? t('projects.copied') : t('projects.copyId')} accentColor={ACCENT}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCopyId(project.id); }}
              className="p-1 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              style={{ color: copied ? '#6bbf6b' : '#d0d0d0' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </Tooltip>
          <Tooltip content={t('projects.rename')} accentColor={ACCENT}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStartRename(project); }}
              className="p-1 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              style={{ color: '#d0d0d0' }}
            >
              <Pencil size={12} />
            </button>
          </Tooltip>
          <Tooltip content={t('common.delete')} accentColor={ACCENT}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStartConfirmDelete(project.id); }}
              className="p-1 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              style={{ color: '#d0d0d0' }}
            >
              <Trash2 size={12} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, onUse }) {
  const { t } = useTranslation();
  const chartCount = template.payload.charts.length;
  // Resolve the template's i18n keys to text in the active language so the
  // mini-preview renders real chart/trait names, not raw keys.
  const localizedPayload = useMemo(() => localizeTemplatePayload(template, t), [template, t]);
  return (
    <div
      className="group rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #3d3d3d',
      }}
      onClick={() => onUse(template)}
    >
      <div
        className="px-3 pt-3 pb-1 border-b"
        style={{ borderColor: '#2d2d2d', backgroundColor: '#161616' }}
      >
        <PreviewArea payload={localizedPayload} loading={false} />
      </div>
      <div className="px-3 py-2 flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} style={{ color: ACCENT, flexShrink: 0 }} />
          <p className="text-sm font-medium truncate" style={{ color: '#d0d0d0' }}>
            {t(template.name)}
          </p>
        </div>
        <p
          className="text-[10px] leading-snug"
          style={{
            color: '#888888',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {t(template.description)}
        </p>
        <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: '#555555' }}>
          {t('projects.chartCount', { count: chartCount })}
        </p>
      </div>
    </div>
  );
}

// ---- Modal ------------------------------------------------------------------
export default function ProjectsModal() {
  const { t } = useTranslation();
  const {
    modalOpen, closeModal, projectList, activeId,
    openProject, newProject, newProjectFromTemplate,
    deleteProject, renameProject,
  } = useProjects();

  const [tab, setTab] = useState('projects'); // 'projects' | 'templates'
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  // Per-project preview cache, persists across modal opens for the session.
  // Keyed by project id; values are { loading, payload }.
  const [previews, setPreviews] = useState({});

  // Lazy-load project payloads so each card can render its mini preview.
  // A card whose id isn't in `previews` yet renders as "loading" — that lets
  // us avoid a synchronous setState-in-effect to mark them upfront.
  useEffect(() => {
    if (!modalOpen || tab !== 'projects') return;
    const toFetch = projectList.filter(p => !previews[p.id]);
    if (toFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      // Bounded concurrency: 4 at a time keeps the modal responsive even on
      // accounts with many projects.
      const queue = [...toFetch];
      const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (queue.length > 0 && !cancelled) {
          const p = queue.shift();
          try {
            const full = await cloudLoadProject(p.id);
            if (cancelled) return;
            setPreviews(prev => ({ ...prev, [p.id]: { loading: false, payload: full?.payload || null } }));
          } catch (err) {
            if (cancelled) return;
            console.error('Project preview load failed', err);
            setPreviews(prev => ({ ...prev, [p.id]: { loading: false, payload: null } }));
          }
        }
      });
      await Promise.all(workers);
    })();
    return () => { cancelled = true; };
  }, [modalOpen, tab, projectList, previews]);

  useEffect(() => {
    if (!modalOpen) return;
    const onEsc = (e) => e.key === 'Escape' && closeModal();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), 1200);
    return () => clearTimeout(t);
  }, [copiedId]);

  if (!modalOpen) return null;

  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const startRename = (project) => {
    setRenamingId(project.id);
    setRenameValue(project.title || '');
    setConfirmDeleteId(null);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const startConfirmDelete = (id) => {
    setConfirmDeleteId(id);
    setRenamingId(null);
  };

  const confirmDelete = (id) => {
    deleteProject(id);
    setConfirmDeleteId(null);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div
        className="w-full max-w-5xl rounded-2xl flex flex-col"
        style={{
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          maxHeight: '85vh',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b"
          style={{ borderColor: '#3d3d3d' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="hidden sm:block text-sm font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: ACCENT }}>
              {t('projects.title')}
            </h2>
            <div className="flex items-center gap-1 sm:ml-3 min-w-0 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                onClick={() => setTab('projects')}
                className="flex-shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: tab === 'projects' ? '#1a1a1a' : 'transparent',
                  color: tab === 'projects' ? '#d0d0d0' : '#888888',
                  border: `1px solid ${tab === 'projects' ? '#3d3d3d' : 'transparent'}`,
                }}
              >
                <FileBox size={12} />
                {t('projects.yourProjects')}
                <span
                  className="ml-1 px-1.5 rounded-full text-[9px]"
                  style={{ backgroundColor: '#2d2d2d', color: '#888888' }}
                >
                  {projectList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('templates')}
                className="flex-shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: tab === 'templates' ? '#1a1a1a' : 'transparent',
                  color: tab === 'templates' ? '#d0d0d0' : '#888888',
                  border: `1px solid ${tab === 'templates' ? '#3d3d3d' : 'transparent'}`,
                }}
              >
                <Sparkles size={12} />
                {t('projects.templates')}
                <span
                  className="ml-1 px-1.5 rounded-full text-[9px]"
                  style={{ backgroundColor: '#2d2d2d', color: '#888888' }}
                >
                  {TEMPLATES.length}
                </span>
              </button>
            </div>
          </div>
          <Tooltip content={t('common.close')} accentColor={ACCENT}>
            <button
              type="button"
              onClick={closeModal}
              className="flex-shrink-0 p-1 rounded-md hover:bg-black/30 transition-colors"
              style={{ color: '#888888' }}
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'projects' ? (
            projectList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-sm" style={{ color: '#888888' }}>{t('projects.emptyTitle')}</p>
                <p className="text-xs" style={{ color: '#666666' }}>
                  {t('projects.emptyHint')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {projectList.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isActive={p.id === activeId}
                    preview={previews[p.id]}
                    isRenaming={renamingId === p.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onCommitRename={commitRename}
                    onCancelRename={cancelRename}
                    isConfirmingDelete={confirmDeleteId === p.id}
                    onConfirmDelete={confirmDelete}
                    onCancelConfirmDelete={() => setConfirmDeleteId(null)}
                    onOpen={openProject}
                    onStartRename={startRename}
                    onStartConfirmDelete={startConfirmDelete}
                    onCopyId={handleCopyId}
                    copied={copiedId === p.id}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onUse={newProjectFromTemplate}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: '#3d3d3d' }}
        >
          <p className="text-[10px]" style={{ color: '#666666' }}>
            {tab === 'projects'
              ? t('projects.footerProjects')
              : t('projects.footerTemplates')}
          </p>
          <button
            type="button"
            onClick={newProject}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT, color: '#ffffff' }}
          >
            <Plus size={13} />
            {t('projects.newBlank')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
