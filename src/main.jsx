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
  if (cleanPath === '/admin') {
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
