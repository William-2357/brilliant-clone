interface Props {
  correct: boolean;
  message: string;
  truth?: string;
}

export default function FeedbackBanner({ correct, message, truth }: Props) {
  return (
    <div className={`feedback ${correct ? 'feedback-correct' : 'feedback-incorrect'}`} role="status">
      <div className="feedback-head">
        <span className="feedback-icon" aria-hidden>
          {correct ? '\u2713' : '\u2717'}
        </span>
        <strong>{correct ? 'Correct' : 'Not quite'}</strong>
      </div>
      <p>{message}</p>
      {truth && <p className="feedback-truth">{truth}</p>}
    </div>
  );
}
