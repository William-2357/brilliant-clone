interface Props {
  text: string;
  onDismiss: () => void;
}

export default function MilestoneBanner({ text, onDismiss }: Props) {
  return (
    <div className="milestone" role="alert">
      <span className="milestone-spark" aria-hidden>
        {'\u2728'}
      </span>
      <span className="milestone-text">{text}</span>
      <button type="button" className="milestone-close" onClick={onDismiss} aria-label="Dismiss">
        {'\u00d7'}
      </button>
    </div>
  );
}
