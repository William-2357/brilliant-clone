import katex from 'katex';
import type { LessonStep } from '../types/lesson';

interface Props {
  step: LessonStep | undefined;
  /** Hide the lead paragraph (e.g. when the body is already shown elsewhere). */
  hideLead?: boolean;
}

function renderTeX(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    output: 'html',
  });
}

/** Render a paragraph, turning inline `$...$` spans into KaTeX math. */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderTeX(part, false) }} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Renders a concept step's lecture: a lead paragraph plus structured sections. */
export default function LectureContent({ step, hideLead }: Props) {
  if (!step) return null;
  return (
    <div className="lecture">
      {!hideLead && step.body && (
        <p className="lecture-lead">
          <InlineText text={step.body} />
        </p>
      )}
      {step.lecture?.map((section, i) => (
        <section className="lecture-section" key={i}>
          {section.heading && <h3 className="lecture-heading">{section.heading}</h3>}
          {section.text.split('\n\n').map((para, j) => (
            <p className="lecture-text" key={j}>
              <InlineText text={para} />
            </p>
          ))}
          {section.formula && (
            <div
              className="lecture-formula"
              dangerouslySetInnerHTML={{ __html: renderTeX(section.formula, true) }}
            />
          )}
        </section>
      ))}
    </div>
  );
}
