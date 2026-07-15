import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import AdminApp from './AdminApp.jsx'

const renderApp = () => {
  if (window.location.pathname === '/admin') {
    return <AdminApp />
  }
  return <App />
}

import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {renderApp()}
    <Analytics />
  </React.StrictMode>,
)
