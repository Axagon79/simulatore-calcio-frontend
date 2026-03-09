import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import { getThemeMode } from './AppDev/costanti';
import { AuthProvider } from './contexts/AuthContext';

// Setta data-theme sul body per regole CSS globali (es. stemmi drop-shadow)
document.body.dataset.theme = getThemeMode();
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
import Settings from './pages/Settings';
import AnalisiStorica from './pages/AnalisiStorica';
import SimulazioneRapida from './pages/SimulazioneRapida';
import Prezzi from './pages/Prezzi';
import ContactPage from './pages/ContactPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookieBanner from './components/ConsentBanner';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoot() {
  const [showSettings, setShowSettings] = useState(() => {
    const wasOpen = sessionStorage.getItem('settings_open');
    if (wasOpen) {
      sessionStorage.removeItem('settings_open');
      return true;
    }
    return false;
  });

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {import.meta.env.DEV && (
            <Route path="/mixer" element={<TuningMixer />} />
          )}
          <Route path="/track-record" element={<ProtectedRoute><TrackRecord onBack={() => window.history.back()} /></ProtectedRoute>} />
          {import.meta.env.DEV && (
            <Route path="/predictions-mixer" element={<PredictionsMixer />} />
          )}
          <Route path="/bankroll" element={<ProtectedRoute><Bankroll onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/money-management" element={<ProtectedRoute><MoneyManagement onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/money-tracker" element={<ProtectedRoute><MoneyTracker onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/step-system" element={<ProtectedRoute><StepSystem onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/sistema-c" element={<ProtectedRoute><SistemaC /></ProtectedRoute>} />
          <Route path="/best-picks" element={<ProtectedRoute><UnifiedPredictions onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/analisi-storica" element={<ProtectedRoute><AnalisiStorica onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/simulate" element={<ProtectedRoute><SimulazioneRapida onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/prezzi" element={<Prezzi onBack={() => window.history.back()} />} />
          <Route path="/contatti" element={<ContactPage onBack={() => window.history.back()} />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy onBack={() => window.history.back()} />} />
          <Route path="/*" element={<AppDev />} />
        </Routes>
      </BrowserRouter>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      <CookieBanner />
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(<AppRoot />);
