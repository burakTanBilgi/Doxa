import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Tooltip from './Tooltip';

// Italic-text description with a controlled inline editor.
//
// Empty + not editing → renders nothing (the parent owns the "Add description"
// trigger button and decides where it lives).
// Set + not editing   → italic gray line. Click to edit.
// Editing             → input. Save on blur/Enter. Cancel on Escape.
//
// Props:
//   value             — current description (may be undefined/empty)
//   onChange(str)     — fires with trimmed value on save
//   editing           — controlled flag; parent owns it
//   onEditingChange(b)— fires when the editor opens/closes from inside
//   accentColor       — border tint of the input
//   placeholder       — input placeholder
//   className         — passed through to wrapper
export default function EditableDescription({
  value,
  onChange,
  editing,
  onEditingChange,
  accentColor = '#c73a3a',
  placeholder = 'Description...',
  className = '',
}) {
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // place caret at end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  // Auto-grow the textarea to fit content as the user types or content changes.
  useLayoutEffect(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  }, [draft, editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed !== (value || '')) onChange(trimmed);
    onEditingChange(false);
  };

  const cancel = () => {
    setDraft(value || '');
    onEditingChange(false);
  };

  if (editing) {
    return (
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
          else if (e.key === 'Escape') cancel();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        rows={1}
        className={`w-full text-xs italic px-1.5 py-0.5 rounded focus:outline-none bg-transparent resize-none overflow-hidden ${className}`}
        style={{
          color: '#b8b8b8',
          border: `1px solid ${accentColor}80`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'inherit',
          lineHeight: 1.4,
        }}
      />
    );
  }

  if (!value) return null;

  return (
    <Tooltip content="Click to edit description" accentColor={accentColor}>
      <p
        onClick={() => onEditingChange(true)}
        onMouseDown={(e) => e.stopPropagation()}
        className={`text-xs italic cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        style={{ color: '#888888', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {value}
      </p>
    </Tooltip>
  );
}
