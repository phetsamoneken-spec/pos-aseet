import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { announceAppUpdate, startAppUpdateChecks } from './services/appUpdates';
import { AppUpdateNotice } from './components/AppUpdateNotice';

registerSW({
  immediate: true,
  onNeedReload: announceAppUpdate,
  onRegisteredSW: (_url, registration) => {
    if (registration) startAppUpdateChecks(registration);
  },
  onRegisterError: error => console.warn('App offline registration failed:', error)
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AppUpdateNotice />
    <App />
  </ErrorBoundary>
);
