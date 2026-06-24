import { useAuth } from '../hooks/useAuth';
import { navigate, useRoute } from '../lib/router';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Topbar avatar — opens the dedicated profile page (stats + preferences). */
export default function ProfileMenu() {
  const { user } = useAuth();
  const path = useRoute();
  const name = user?.name || 'Learner';
  const active = path === '/profile';

  return (
    <div className="profile">
      <button
        type="button"
        className={`profile-trigger ${active ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
        aria-label="Open your profile"
        aria-current={active ? 'page' : undefined}
      >
        <span className="avatar" aria-hidden>
          {initials(name)}
        </span>
      </button>
    </div>
  );
}
