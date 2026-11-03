import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: 'var(--color-fog-white, #f8fafc)',
          color: 'var(--color-ink-black, #0f172a)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(185, 28, 28, 0.2)',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b91c1c'
              }}>
                <AlertTriangle size={26} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#b91c1c', fontWeight: 600 }}>
                  Se produjo un error visual inesperado
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                  La plataforma protegió tu sesión. Puedes recargar o regresar al panel principal.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#991b1b',
                wordBreak: 'break-word',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'var(--color-ink-black, #0f172a)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Recargar Página
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Home size={16} /> Ir al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

