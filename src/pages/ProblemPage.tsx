import ProblemOfTheDay from '../components/ProblemOfTheDay';
import { navigate } from '../lib/router';

export default function ProblemPage() {
  return (
    <div className="page daily-page">
      <button type="button" className="back-link" onClick={() => navigate('/')}>
        ← Home
      </button>
      <ProblemOfTheDay />
    </div>
  );
}
