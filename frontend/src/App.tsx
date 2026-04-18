import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Settings from './pages/Settings';
import Journal from './pages/Journal';
import Strategy from './pages/Strategy';
import Charts from './pages/Charts';

export default function App() {
  return (
    <Routes>
      <Route path="/app" element={<Dashboard />} />
      <Route path="/app/learn" element={<Learn />} />
      <Route path="/app/settings" element={<Settings />} />
      <Route path="/app/journal" element={<Journal />} />
      <Route path="/app/strategy" element={<Strategy />} />
      <Route path="/app/charts" element={<Charts />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
