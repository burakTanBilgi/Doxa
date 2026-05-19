import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Pencil, Copy, Check } from 'lucide-react';
import { useProjects } from './ProjectsContext';
import Tooltip from '../components/Tooltip';

const ACCENT = '#c73a3a';

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function ProjectsModal() {
  const {
    modalOpen, closeModal, projectList, activeId,
    openProject, newProject, deleteProject, renameProject,
  } = useProjects();

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          maxHeight: '80vh',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#3d3d3d' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
            Projects
          </h2>
          <Tooltip content="Close" accentColor={ACCENT}>
            <button
              type="button"
              onClick={closeModal}
              className="p-1 rounded-md hover:bg-black/30 transition-colors"
              style={{ color: '#888888' }}
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {projectList.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: '#888888' }}>
              No projects yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {projectList.map(p => {
                const isActive = p.id === activeId;
                const isRenaming = renamingId === p.id;
                const isConfirming = confirmDeleteId === p.id;
                return (
                  <li
                    key={p.id}
                    className="group rounded-lg flex items-center gap-2 px-3 py-2 transition-colors"
                    style={{
                      backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                      border: `1px solid ${isActive ? ACCENT : 'transparent'}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => !isRenaming && !isConfirming && openProject(p.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      {isRenaming ? (
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                          }}
                          className="w-full px-2 py-1 rounded text-sm bg-transparent border focus:outline-none"
                          style={{ color: '#d0d0d0', borderColor: ACCENT }}
                        />
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate" style={{ color: '#d0d0d0' }}>
                            {p.title || 'Untitled Project'}
                          </p>
                          <p className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: '#666666' }}>
                            <span>edited {timeAgo(p.updated_at)}</span>
                            <span className="font-mono opacity-70">{String(p.id).slice(0, 8)}</span>
                          </p>
                        </>
                      )}
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { deleteProject(p.id); setConfirmDeleteId(null); }}
                          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold"
                          style={{ backgroundColor: ACCENT, color: '#ffffff' }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded"
                          style={{ color: '#888888' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip content={copiedId === p.id ? 'Copied!' : 'Copy project ID'} accentColor={ACCENT}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCopyId(p.id); }}
                            className="p-1.5 rounded-md hover:bg-black/30 transition-colors"
                            style={{ color: copiedId === p.id ? '#6bbf6b' : '#888888' }}
                          >
                            {copiedId === p.id ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </Tooltip>
                        <Tooltip content="Rename" accentColor={ACCENT}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startRename(p); }}
                            className="p-1.5 rounded-md hover:bg-black/30 transition-colors"
                            style={{ color: '#888888' }}
                          >
                            <Pencil size={13} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete" accentColor={ACCENT}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                            className="p-1.5 rounded-md hover:bg-black/30 transition-colors"
                            style={{ color: '#888888' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: '#3d3d3d' }}>
          <button
            type="button"
            onClick={newProject}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT, color: '#ffffff' }}
          >
            <Plus size={13} />
            New project
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
