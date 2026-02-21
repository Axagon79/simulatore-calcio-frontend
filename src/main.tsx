import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import { AuthProvider } from './contexts/AuthContext';
import AppDev from './AppDev';
import TuningMixer from './pages/TuningMixer';
import TrackRecord from './pages/TrackRecord';
import PredictionsMixer from './pages/PredictionsMixer';
import Bankroll from './pages/Bankroll';
import MoneyManagement from './pages/MoneyManagement';
import SistemaC from './pages/SistemaC';
import UnifiedPredictions from './UnifiedPredictions';
import MoneyTracker from './pages/MoneyTracker';
import StepSystem from './pages/StepSystem';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
  <BrowserRouter>
    <Routes>
      {import.meta.env.DEV && (
        <Route path="/mixer" element={<TuningMixer />} />
      )}
      {import.meta.env.DEV && (
        <Route path="/track-record" element={<TrackRecord onBack={() => window.history.back()} />} />
      )}
      {import.meta.env.DEV && (
        <Route path="/predictions-mixer" element={<PredictionsMixer />} />
      )}
      <Route path="/bankroll" element={<Bankroll onBack={() => window.history.back()} />} />
      <Route path="/money-management" element={<MoneyManagement onBack={() => window.history.back()} />} />
      <Route path="/money-tracker" element={<MoneyTracker onBack={() => window.history.back()} />} />
      <Route path="/step-system" element={<StepSystem onBack={() => window.history.back()} />} />
      <Route path="/sistema-c" element={<SistemaC />} />
      <Route path="/best-picks" element={<UnifiedPredictions onBack={() => window.history.back()} />} />
      <Route path="/*" element={<AppDev />} />
    </Routes>
  </BrowserRouter>
  </AuthProvider>
);