import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import AppDev from './AppDev';
import TuningMixer from './pages/TuningMixer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/mixer" element={<TuningMixer />} />
        <Route path="/*" element={<AppDev />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);