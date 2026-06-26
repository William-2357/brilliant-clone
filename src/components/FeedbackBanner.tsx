interface Props {
  correct: boolean;
  message: string;
  truth?: string;
  /** Optional badge when the message is an AI explanation ('ai') or still loading. */
  source?: 'ai' | 'loading';
}

export default function FeedbackBanner({ correct, message, truth, source }: Props) {
  return (
    <div className={`feedback ${correct ? 'feedback-correct' : 'feedback-incorrect'}`} role="status">
      <div className="feedback-head">
        <span className="feedback-icon" aria-hidden>
          {correct ? '\u2713' : '\u2717'}
        </span>
        <strong>{correct ? 'Correct' : 'Not quite'}</strong>
        {source && (
          <span className={`feedback-src src-${source}`}>
            {source === 'ai' ? 'AI' : 'thinking…'}
          </span>
        )}
      </div>
      <p>{message}</p>
      {truth && <p className="feedback-truth">{truth}</p>}
    </div>
  );
}
