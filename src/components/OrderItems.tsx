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
 * Rank-by-likelihood input. Outcomes are reordered with up/down controls (fully
 * touch-friendly and accessible, unlike HTML5 drag) into a most→least-likely
 * list. Items are numeric ids; pass `labels` to show words instead of numbers.
 */
export default function OrderItems({ items, onChange, disabled, answer, labels }: Props) {
  const text = (val: number) => labels?.[val] ?? String(val);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <ol className="order-list">
      {items.map((val, i) => {
        const verdict = answer ? (answer[i] === val ? 'ok' : 'no') : '';
        return (
          <li key={val} className={`order-row ${verdict}`}>
            <span className="order-rank">{i + 1}</span>
            <span className="order-val">{text(val)}</span>
            {!answer && (
              <span className="order-moves">
                <button
                  type="button"
                  className="order-move"
                  disabled={disabled || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${text(val)} up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="order-move"
                  disabled={disabled || i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${text(val)} down`}
                >
                  ▼
                </button>
              </span>
            )}
            {answer && <span className="order-verdict">{verdict === 'ok' ? '✓' : '✕'}</span>}
          </li>
        );
      })}
    </ol>
  );
}
