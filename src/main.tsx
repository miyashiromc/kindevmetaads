import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { captureAndStoreFbclid } from './lib/meta-tracker';
import './index.css';

// Capturar parámetros de Meta Ads (?fbclid=...) inmediatamente al cargar
captureAndStoreFbclid();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento root');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
