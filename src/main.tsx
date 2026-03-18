import { useState, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './index.css';

import { getThemeMode } from './AppDev/costanti';
import { AuthProvider } from './contexts/AuthContext';

// Setta data-theme sul body per regole CSS globali (es. stemmi drop-shadow)
document.body.dataset.theme = getThemeMode();

// Componenti sempre caricati (layout globale)
import WalletBadge from './components/WalletBadge';
import CookieBanner from './components/ConsentBanner';
import ProtectedRoute from './components/ProtectedRoute';
import TermsConsentModal from './components/TermsConsentModal';
import { useAuth } from './contexts/AuthContext';

// Pagine lazy — caricate on-demand quando l'utente naviga
const AppDev = lazy(() => import('./AppDev'));
const TuningMixer = lazy(() => import('./pages/TuningMixer'));
const TrackRecord = lazy(() => import('./pages/TrackRecord'));
const PredictionsMixer = lazy(() => import('./pages/PredictionsMixer'));
const Bankroll = lazy(() => import('./pages/Bankroll'));
const MoneyManagement = lazy(() => import('./pages/MoneyManagement'));
const SistemaC = lazy(() => import('./pages/SistemaC'));
const UnifiedPredictions = lazy(() => import('./UnifiedPredictions'));
const MoneyTracker = lazy(() => import('./pages/MoneyTracker'));
const StepSystem = lazy(() => import('./pages/StepSystem'));
const Settings = lazy(() => import('./pages/Settings'));
const AnalisiStorica = lazy(() => import('./pages/AnalisiStorica'));
const SimulazioneRapida = lazy(() => import('./pages/SimulazioneRapida'));
const Prezzi = lazy(() => import('./pages/Prezzi'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Bollette = lazy(() => import('./pages/Bollette'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

import ErrorBoundary from './components/ErrorBoundary';
import OnboardingTour from './components/OnboardingTour';

const LEGAL_PATHS = ['/termini', '/privacy', '/disclaimer', '/privacy-policy'];

function ConsentGate({ children }: { children: React.ReactNode }) {
  const { user, needsConsent, markConsentGiven } = useAuth();
  const location = useLocation();
  const isLegalPage = LEGAL_PATHS.includes(location.pathname);
  return (
    <>
      {children}
      <TermsConsentModal isOpen={!!user && needsConsent && !isLegalPage} onAccepted={markConsentGiven} />
    </>
  );
}

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
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
      <ConsentGate>
        <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#0a0e17',color:'#fff',fontSize:'1.1rem'}}>Caricamento...</div>}>
        <Routes>
          {import.meta.env.DEV && (
            <Route path="/mixer" element={<TuningMixer />} />
          )}
          <Route path="/track-record" element={<TrackRecord onBack={() => window.history.back()} />} />
          {import.meta.env.DEV && (
            <Route path="/predictions-mixer" element={<PredictionsMixer />} />
          )}
          <Route path="/bankroll" element={<Bankroll onBack={() => window.history.back()} />} />
          <Route path="/money-management" element={<MoneyManagement onBack={() => window.history.back()} />} />
          <Route path="/money-tracker" element={<MoneyTracker onBack={() => window.history.back()} />} />
          <Route path="/step-system" element={<ProtectedRoute><StepSystem onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/sistema-c" element={<SistemaC />} />
          <Route path="/best-picks" element={<ProtectedRoute><UnifiedPredictions onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/analisi-storica" element={<AnalisiStorica onBack={() => window.history.back()} />} />
          <Route path="/simulate" element={<SimulazioneRapida onBack={() => window.history.back()} />} />
          <Route path="/prezzi" element={<Prezzi onBack={() => window.history.back()} />} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/ticket-ai" element={<ProtectedRoute><Bollette onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/contatti" element={<ContactPage onBack={() => window.history.back()} />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy onBack={() => window.history.back()} />} />
          <Route path="/termini" element={<TermsPage />} />
          <Route path="/privacy" element={<TermsPage />} />
          <Route path="/disclaimer" element={<TermsPage />} />
          <Route path="/*" element={<AppDev />} />
        </Routes>
        </Suspense>
      {showSettings && <Suspense fallback={null}><Settings onClose={() => setShowSettings(false)} /></Suspense>}
      <OnboardingTour />
      <WalletBadge />
      <CookieBanner />
      </ConsentGate>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<AppRoot />);
