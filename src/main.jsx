import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import AdminApp from './AdminApp.jsx'
import QRScanner from './components/QRScanner.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { Analytics } from '@vercel/analytics/react'

const renderApp = () => {
  const cleanPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const portalParam = (params.get('portal') || '').toLowerCase();

  if (
    cleanPath === '/admin' ||
    cleanPath === '/gobierno' ||
    cleanPath.startsWith('/admin/') ||
    portalParam === 'admin' ||
    portalParam === 'gobierno'
  ) {
    return <AdminApp />
  }
  if (cleanPath === '/scanner') {
    return <QRScanner />
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {renderApp()}
      <Analytics />
    </ErrorBoundary>
  </React.StrictMode>,
)
