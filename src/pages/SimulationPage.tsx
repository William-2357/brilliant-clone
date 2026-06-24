import SandboxSpotlight from '../components/SandboxSpotlight';
import { navigate } from '../lib/router';

export default function SimulationPage() {
  return (
    <div className="page daily-page">
      <button type="button" className="back-link" onClick={() => navigate('/')}>
        ← Home
      </button>
      <SandboxSpotlight />
    </div>
  );
}
