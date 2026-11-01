import React from 'react';
import StudentAuth from './StudentAuth';

/**
 * LoginRegister modernizado:
 * Proporciona el flujo completo estudiantil:
 * - Login con Correo y Contraseña
 * - Registro con Cédula Inmutable
 * - Olvidé mi Contraseña
 * - Acceso Passwordless con OTP
 * - Acceso Rápido Modo Jurado (Defensa)
 */
const LoginRegister = ({ onLogin, onSwitchToDemo }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--color-mist-gray)'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <StudentAuth onLogin={onLogin} onSwitchToDemo={onSwitchToDemo} embedded={true} />
      </div>
    </div>
  );
};

export default LoginRegister;
