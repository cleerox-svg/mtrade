import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Settings from './pages/Settings';
import Journal from './pages/Journal';
import JournalEntry from './pages/JournalEntry';
import Strategy from './pages/Strategy';
import Charts from './pages/Charts';

export default function App() {
  return (
    <Routes>
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="learn" element={<Learn />} />
        <Route path="settings" element={<Settings />} />
        <Route path="journal" element={<Journal />} />
        <Route path="journal/:id" element={<JournalEntry />} />
        <Route path="strategy" element={<Strategy />} />
        <Route path="charts" element={<Charts />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
