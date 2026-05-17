import { useLayoutEffect, useRef } from 'react';

// FLIP animation for list reorder. Returns a `register(key)` factory that yields
// a ref callback; attach it to each list item. When `deps` changes, the hook
// measures every element's new position, compares to the previous render's
// position, and uses the Web Animations API to slide each element from old
// to new in 260ms.
//
// - First render: no animation (no previous positions yet).
// - Items that didn't move: no animation (zero delta).
// - Items that appear/disappear: no animation (only one of old/new exists).
export default function useFlipReorder(deps) {
  const refs = useRef(new Map());
  const prev = useRef(new Map());

  useLayoutEffect(() => {
    const next = new Map();
    refs.current.forEach((el, key) => {
      if (el) next.set(key, el.getBoundingClientRect());
    });
    refs.current.forEach((el, key) => {
      if (!el) return;
      const o = prev.current.get(key);
      const n = next.get(key);
      if (!o || !n) return;
      const dx = o.left - n.left;
      const dy = o.top - n.top;
      if (dx === 0 && dy === 0) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
      );
    });
    prev.current = next;
  }, deps);

  return (key) => (el) => {
    if (el) refs.current.set(key, el);
    else refs.current.delete(key);
  };
}
