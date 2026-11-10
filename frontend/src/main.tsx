import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// PWA service worker (production only, so local development never serves stale files).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker registration failed:', err));
  });
}

// If a new deployment removed old JS chunks, reload once to pick up the new version.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('levix_chunk_reload')) {
    sessionStorage.setItem('levix_chunk_reload', '1');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
