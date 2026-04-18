import { useEffect, useState } from 'react';

export interface AuthUser {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/';
          return null;
        }
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        setUser(data as AuthUser);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error };
}
