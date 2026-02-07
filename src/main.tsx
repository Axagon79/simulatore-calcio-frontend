import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import AppDev from './AppDev';
import TuningMixer from './pages/TuningMixer';
import TrackRecord from './pages/TrackRecord';
import PredictionsMixer from './pages/PredictionsMixer';

createRoot(document.getElementById('root')!).render(
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
      <Route path="/*" element={<AppDev />} />
    </Routes>
  </BrowserRouter>
);