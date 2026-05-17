import { useEffect, useRef, useState } from 'react';

// Inline-editable italic description. Empty state: a faint "+ description" affordance
// the user can click to start typing. Click an existing description to edit it.
//
// Props:
//   value          — current description string (may be empty/undefined)
//   onChange(str)  — called with the new value on blur or Enter
//   accentColor    — color used for the focused border
//   placeholder    — placeholder text in edit mode
//   addLabel       — text shown when there's no value yet (default "+ description")
//   className      — additional classes for the wrapper
export default function EditableDescription({
  value,
  onChange,
  accentColor = '#c73a3a',
  placeholder = 'Description...',
  addLabel = '+ description',
  className = '',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed !== (value || '')) onChange(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          else if (e.key === 'Escape') cancel();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={`w-full text-xs italic px-1.5 py-0.5 rounded focus:outline-none bg-transparent ${className}`}
        style={{ color: '#b8b8b8', border: `1px solid ${accentColor}80` }}
      />
    );
  }

  if (!value) {
    return (
      <button
        onClick={() => setEditing(true)}
        onMouseDown={(e) => e.stopPropagation()}
        className={`text-[10px] italic opacity-40 hover:opacity-80 transition-opacity text-left ${className}`}
        style={{ color: '#888888' }}
        title="Add a description"
      >
        {addLabel}
      </button>
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      onMouseDown={(e) => e.stopPropagation()}
      className={`text-xs italic cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      style={{ color: '#888888' }}
      title="Click to edit description"
    >
      {value}
    </p>
  );
}
