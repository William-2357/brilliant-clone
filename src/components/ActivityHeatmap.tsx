import { useState } from 'react';
import { dayKey } from '../store/progress';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Map a day's resolved-problem count to one of five green intensities. */
function level(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

type Cell = {
  key: string;
  count: number;
  future: boolean;
  isToday: boolean;
  label: string;
} | null;

interface Props {
  /** Problems resolved per day (YYYY-MM-DD → count) for the grid intensity. */
  activity: Record<string, number>;
  /** Consecutive days the Problem of the Day was completed. */
  currentStreak: number;
}

/**
 * Month-calendar activity heatmap: a 7-wide grid (one column per weekday) with a
 * row per week of the displayed month, darker greens for more problems resolved
 * that day. The header switches months; hovering a day shows its solved count.
 */
export default function ActivityHeatmap({ activity, currentStreak }: Props) {
  // 0 = current month; negative values step into the past.
  const [offset, setOffset] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(today.getTime());
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  const cells: Cell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  let monthTotal = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const time = new Date(year, month, d).getTime();
    const future = time > today.getTime();
    const key = dayKey(time);
    const count = future ? 0 : activity[key] ?? 0;
    if (!future) monthTotal += count;
    cells.push({ key, count, future, isToday: key === todayKey, label: fmt.format(time) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  // No future months — there's nothing to show past today.
  const canNext = offset < 0;

  return (
    <div className="panel heatmap-card">
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="cal-month">{monthLabel}</span>
        <button
          type="button"
          className="cal-nav"
          onClick={() => canNext && setOffset((o) => o + 1)}
          disabled={!canNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="cal-weekdays" aria-hidden>
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="cal-wd">
            {w}
          </span>
        ))}
      </div>

      <div
        className="cal-grid"
        role="img"
        aria-label={`${monthTotal} problems solved in ${monthLabel}`}
      >
        {cells.map((c, i) =>
          c === null ? (
            <span key={i} className="cal-cell cal-blank" />
          ) : (
            <span
              key={i}
              className={`cal-cell lvl-${level(c.count)}${c.future ? ' future' : ''}${c.isToday ? ' today' : ''}`}
              title={c.future ? undefined : `${c.count} problem${c.count === 1 ? '' : 's'} · ${c.label}`}
            />
          ),
        )}
      </div>

      <div className="cal-foot">
        <span className="cal-streak" title="Problem-of-the-day streak">
          <svg className="heatmap-flame" width="13" height="13" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M13 2c.4 3-1.3 4.4-2.6 6C9 9.7 8 11.2 8 13.2a4.2 4.2 0 0 0 8.4.3c.1-1.6-.6-2.9-1.5-4.1-.2 1-.9 1.7-1.7 2 .6-2.1-.2-4.3-1.2-6.4-.3-.6-.6-1.3-1-3Z"
            />
          </svg>
          {currentStreak} day streak
        </span>
        <span className="heatmap-legend">
          <span>Less</span>
          <span className="cal-cell lvl-0" />
          <span className="cal-cell lvl-1" />
          <span className="cal-cell lvl-2" />
          <span className="cal-cell lvl-3" />
          <span className="cal-cell lvl-4" />
          <span>More</span>
        </span>
      </div>
    </div>
  );
}
