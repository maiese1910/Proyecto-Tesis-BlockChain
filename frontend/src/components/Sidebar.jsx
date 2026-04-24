import React from 'react';
import { LayoutDashboard, MessageSquare, ShieldCheck, Map, FileText, ClipboardList, Link, LogOut, User } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: <LayoutDashboard className="icon" /> },
    { id: 'chat', label: 'Asistente IA', icon: <MessageSquare className="icon" /> },
    { id: 'prevalidation', label: 'Pre-validación', icon: <ShieldCheck className="icon" /> },
    { id: 'survival', label: 'Guía de Supervivencia', icon: <Map className="icon" /> },
    { id: 'pub', label: 'Llenar Planilla PUB', icon: <ClipboardList className="icon" /> },
    { id: 'blockchain', label: 'Verificar Blockchain', icon: <Link className="icon" /> },
    { id: 'forms', label: 'Planillas Oficiales', icon: <FileText className="icon" /> },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h1>USM Validation<br />Platform</h1>
        <p>Decentralized Administrative Procedures</p>
      </div>

      {/* Perfil del usuario */}
      {user && (
        <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} color="white" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.nombre.split(' ')[0]} {user.nombre.split(' ').slice(-1)[0]}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user.carrera?.split(' ').slice(-1)[0]}</p>
            </div>
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
          style={{ color: 'var(--danger)', marginTop: '1rem' }}
        >
          <LogOut className="icon" />
          <span>Cerrar Sesión</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
