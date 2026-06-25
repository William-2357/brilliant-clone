import { useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';

interface Props {
  /** Current ranking, top (index 0) = most likely. */
  items: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  /** Optional check marks: the correct ranking, shown once graded. */
  answer?: number[];
  /** Optional display text per item id (otherwise the number is shown). */
  labels?: Record<number, string>;
}

/**
 * Rank-by-likelihood input. Rows are dragged (mouse or touch) into a
 * most→least-likely order; the grabbed row follows the pointer while the list
 * reorders live. Arrow keys provide a keyboard-accessible fallback. Items are
 * numeric ids; pass `labels` to show words instead of numbers.
 */
export default function OrderItems({ items, onChange, disabled, answer, labels }: Props) {
  const text = (val: number) => labels?.[val] ?? String(val);
  const listRef = useRef<HTMLOListElement>(null);
  const startY = useRef(0);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dy, setDy] = useState(0);

  const interactive = !answer && !disabled;

  function moveTo(id: number, target: number) {
    const from = items.indexOf(id);
    const to = Math.max(0, Math.min(items.length - 1, target));
    if (from === -1 || to === from) return;
    const next = items.slice();
    next.splice(from, 1);
    next.splice(to, 0, id);
    onChange(next);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLLIElement>, id: number) {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDragId(id);
    setDy(0);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLLIElement>) {
    if (dragId === null || !listRef.current) return;
    const from = items.indexOf(dragId);
    if (from === -1) return;
    const rows = listRef.current.children;
    let delta = e.clientY - startY.current;
    // Swap with a neighbor once the grabbed row's center crosses the neighbor's.
    if (delta < 0 && from > 0) {
      const step = rows[from].getBoundingClientRect().top - rows[from - 1].getBoundingClientRect().top;
      if (-delta > step / 2) {
        moveTo(dragId, from - 1);
        startY.current -= step;
        delta += step;
      }
    } else if (delta > 0 && from < items.length - 1) {
      const step = rows[from + 1].getBoundingClientRect().top - rows[from].getBoundingClientRect().top;
      if (delta > step / 2) {
        moveTo(dragId, from + 1);
        startY.current += step;
        delta -= step;
      }
    }
    setDy(delta);
  }

  function endDrag(e: ReactPointerEvent<HTMLLIElement>) {
    if (dragId === null) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    setDragId(null);
    setDy(0);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLLIElement>, id: number, i: number) {
    if (!interactive) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveTo(id, i - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveTo(id, i + 1);
    }
  }

  return (
    <ol className="order-list" ref={listRef}>
      {items.map((val, i) => {
        const verdict = answer ? (answer[i] === val ? 'ok' : 'no') : '';
        const isDragging = dragId === val;
        return (
          <li
            key={val}
            className={`order-row ${verdict} ${interactive ? 'draggable' : ''} ${isDragging ? 'dragging' : ''}`}
            style={isDragging ? { transform: `translateY(${dy}px)` } : undefined}
            onPointerDown={interactive ? (e) => onPointerDown(e, val) : undefined}
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={interactive ? endDrag : undefined}
            onPointerCancel={interactive ? endDrag : undefined}
            onKeyDown={interactive ? (e) => onKeyDown(e, val, i) : undefined}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? 'button' : undefined}
            aria-label={
              interactive
                ? `${text(val)} — rank ${i + 1} of ${items.length}. Drag, or use the arrow keys, to reorder.`
                : undefined
            }
          >
            <span className="order-rank">{i + 1}</span>
            <span className="order-val">{text(val)}</span>
            {interactive && (
              <svg className="order-grip" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <circle cx="6" cy="4" r="1.35" />
                <circle cx="10" cy="4" r="1.35" />
                <circle cx="6" cy="8" r="1.35" />
                <circle cx="10" cy="8" r="1.35" />
                <circle cx="6" cy="12" r="1.35" />
                <circle cx="10" cy="12" r="1.35" />
              </svg>
            )}
            {answer && <span className="order-verdict">{verdict === 'ok' ? '✓' : '✕'}</span>}
          </li>
        );
      })}
    </ol>
  );
}
