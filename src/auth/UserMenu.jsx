import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';
import Tooltip from '../components/Tooltip';

const ACCENT = '#c73a3a';

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    // Important: also exempt clicks landing inside the portal popover —
    // otherwise the mousedown fires first, unmounts the portal, and the
    // "Sign out" button never receives its click event.
    const onDocClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.email || '?').slice(0, 1).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url;
  const label = user.email || 'Signed in';

  const handleOpen = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - 220),
      });
    }
    setOpen(o => !o);
  };

  const shortEmail = label.length > 18 ? `${label.slice(0, 16)}…` : label;

  return (
    <>
      <Tooltip content={`Signed in as ${label} — click to sign out`} accentColor={ACCENT}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full transition-transform hover:scale-[1.02]"
          style={{
            backgroundColor: '#1a1a1a',
            border: `1px solid ${open ? ACCENT : '#3d3d3d'}`,
          }}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#3d3d3d' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-semibold" style={{ color: '#d0d0d0' }}>
                {initial}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium hidden sm:inline" style={{ color: '#d0d0d0' }}>
            {shortEmail}
          </span>
        </button>
      </Tooltip>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] rounded-xl py-2 shadow-xl"
          style={{
            top: coords.top,
            left: coords.left,
            width: 220,
            backgroundColor: '#2d2d2d',
            border: '1px solid #3d3d3d',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          role="menu"
        >
          <div className="px-3 pb-2 mb-1 border-b" style={{ borderColor: '#3d3d3d' }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#666666' }}>
              Signed in as
            </p>
            <p className="text-xs truncate" style={{ color: '#d0d0d0' }} title={label}>
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/30 transition-colors"
            style={{ color: '#d0d0d0' }}
            role="menuitem"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
