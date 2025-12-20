import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// IMPORTA ANCHE LA VERSIONE DEV
// import App from './App.tsx';
import AppDev from './AppDev';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDev />   {/* usa la nuova dashboard */}
  </StrictMode>,
);
