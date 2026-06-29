import type { WorkedExample as WorkedExampleData } from '../lib/worked';
import { InlineText } from './LectureContent';

interface Props {
  example: WorkedExampleData;
  /**
   * Completion mode: hide the final line's value (and the result) so the learner
   * fills them in — the setup is given, they finish the last step.
   */
  blankLast?: boolean;
}

/**
 * A term-by-term worked computation. As a lecture study card it shows the concrete
 * `question`, the method, the steps, and the answer; with `blankLast` it becomes a
 * completion — the final value is blanked for the learner to finish.
 *
 * Single-step computations (a ratio or plug-in) collapse the redundant "answer"
 * row into the one step and caption it with the result label, so the value is never
 * shown twice. Multi-step computations show each term, then a highlighted total.
 */
export default function WorkedExample({ example, blankLast = false }: Props) {
  const { question, intro, lines, result, resultLabel } = example;
  const lastIndex = lines.length - 1;
  const single = lines.length <= 1;
  return (
    <div className={`worked ${blankLast ? 'worked-completion' : ''}`} role="note">
      <div className="worked-head">
        <span className="worked-tag">{blankLast ? 'Finish the calculation' : 'Worked example'}</span>
      </div>
      {question && (
        <p className="worked-question">
          <InlineText text={question} />
        </p>
      )}
      {intro && (
        <p className="worked-intro">
          <InlineText text={intro} />
        </p>
      )}
      <div className="worked-calc">
        {lines.map((line, i) => {
          const blank = blankLast && i === lastIndex;
          return (
            <div className="worked-line" key={i}>
              <span className="worked-line-label">
                <InlineText text={line.label} />
              </span>
              <span className="worked-line-eq" aria-hidden>
                =
              </span>
              <span className={`worked-line-value ${single ? 'worked-result-value' : ''} ${blank ? 'is-blank' : ''}`}>
                {blank ? '?' : line.value}
              </span>
            </div>
          );
        })}
        {!single && (
          <div className="worked-line worked-line--result">
            <span className="worked-line-label">{resultLabel}</span>
            <span className="worked-line-eq" aria-hidden>
              =
            </span>
            <span className={`worked-line-value worked-result-value ${blankLast ? 'is-blank' : ''}`}>
              {blankLast ? '?' : result}
            </span>
          </div>
        )}
      </div>
      {single && <span className="worked-caption">{resultLabel}</span>}
    </div>
  );
}
