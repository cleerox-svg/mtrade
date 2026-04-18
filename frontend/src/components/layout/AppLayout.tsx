import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';

const COLLAPSED_KEY = 'mtrade.sidebar.collapsed';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)', color: 'var(--muted)' }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '2px',
          }}
        >
          LOADING…
        </span>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-primary)' }}
    >
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleMobile={() => setMobileOpen((v) => !v)}
          user={user}
        />
        <main
          className="flex-1 overflow-y-auto p-[14px] md:p-5"
          style={{ background: 'var(--bg-primary)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
