import type { WorkedExample as WorkedExampleData } from '../lib/worked';
import { InlineText } from './LectureContent';

interface Props {
  example: WorkedExampleData;
  /**
   * Completion mode: hide the final line's value and the result so the learner
   * fills them in (backward fading — the last step is removed first).
   */
  blankLast?: boolean;
}

/**
 * A term-by-term worked computation. In the `worked` stage it shows a fully solved
 * canonical example to study; with `blankLast` it becomes a completion problem —
 * the setup is given and the learner finishes the final step.
 */
export default function WorkedExample({ example, blankLast = false }: Props) {
  const lastIndex = example.lines.length - 1;
  return (
    <div className={`worked ${blankLast ? 'worked-completion' : ''}`} role="note">
      <div className="worked-head">
        <span className="worked-tag">{blankLast ? 'Finish the calculation' : 'Worked example'}</span>
      </div>
      <p className="worked-intro">
        <InlineText text={example.intro} />
      </p>
      <ul className="worked-lines">
        {example.lines.map((line, i) => {
          const blank = blankLast && i === lastIndex;
          return (
            <li className="worked-line" key={i}>
              <span className="worked-line-label">
                <InlineText text={line.label} />
              </span>
              <span className="worked-line-eq" aria-hidden>
                =
              </span>
              <span className={`worked-line-value ${blank ? 'is-blank' : ''}`}>
                {blank ? '?' : line.value}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="worked-result">
        <span className="worked-result-label">{example.resultLabel}</span>
        <span className={`worked-result-value ${blankLast ? 'is-blank' : ''}`}>
          {blankLast ? '?' : example.result}
        </span>
      </div>
    </div>
  );
}
