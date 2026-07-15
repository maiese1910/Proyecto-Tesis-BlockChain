import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import AdminApp from './AdminApp.jsx'
import QRScanner from './components/QRScanner.jsx'
import { Analytics } from '@vercel/analytics/react';

const renderApp = () => {
  if (window.location.pathname === '/admin') {
    return <AdminApp />
  }
  if (window.location.pathname === '/scanner') {
    return <QRScanner />
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {renderApp()}
    <Analytics />
  </React.StrictMode>,
)
