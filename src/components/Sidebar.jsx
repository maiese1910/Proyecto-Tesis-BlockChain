import React from 'react';
import { LayoutDashboard, MessageSquare, ShieldCheck, Map, FileText, ClipboardList, Link, LogOut, User, History, Brain } from 'lucide-react';
import WalletConnect from './WalletConnect';

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: <LayoutDashboard className="icon" /> },
    { id: 'ocr', label: 'Escaneo de Documentos (OCR)', icon: <Brain className="icon" /> },
    { id: 'chat', label: 'Asistente Institucional', icon: <MessageSquare className="icon" /> },
    { id: 'prevalidation', label: 'Pre-validación Documental', icon: <ShieldCheck className="icon" /> },
    { id: 'pub', label: 'Planilla Única Bancaria (PUB)', icon: <ClipboardList className="icon" /> },
    { id: 'history', label: 'Historial de Trámites', icon: <History className="icon" /> },
    { id: 'blockchain', label: 'Verificar Blockchain', icon: <Link className="icon" /> },
    { id: 'survival', label: 'Guía de Trámites SAREN / MPPRE', icon: <Map className="icon" /> },
    { id: 'forms', label: 'Planillas Oficiales', icon: <FileText className="icon" /> },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h1>Universidad Santa María<br /><span style={{ fontSize: '0.86rem', color: 'var(--color-slate-gray)', fontWeight: 400 }}>Plataforma de Apostilla</span></h1>
        <p>Sistema Distribuido de Verificación Blockchain</p>
      </div>

      {/* Perfil del usuario */}
      {user && (
        <div className="user-profile" style={{ padding: '0 1rem', marginBottom: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-cards)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ffffff' }}>
              <User size={16} color="#ffffff" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-ink-black)', margin: 0 }}>
                {user.nombre.split(' ')[0]} {user.nombre.split(' ').slice(-1)[0]}
              </p>
              <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.75rem', margin: '0.15rem 0 0 0' }}>{user.carrera?.split(' ').slice(-1)[0]}</p>
            </div>
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'center' }}>
            <WalletConnect />
          </div>
        </div>
      )}

      <div className="nav-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Cerrar sesión */}
        <div
          className="nav-item"
          onClick={onLogout}
          style={{ color: 'var(--danger)', marginTop: '0', flexShrink: 0 }}
        >
          <LogOut className="icon" />
          <span>Cerrar Sesión</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
