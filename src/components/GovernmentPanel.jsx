import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, FileText, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

const GovernmentPanel = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifying, setVerifying] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain/records`);
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // Poll every 10 seconds for new records
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (hash) => {
    setVerifying(hash);
    try {
      const response = await fetch(`${API_URL}/blockchain/records/${hash}/verify`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        // Update local state immediately
        setRecords(prev => prev.map(r => 
          r.hash === hash ? { ...r, status: "Verificado por SAREN/MPPRE" } : r
        ));
      }
    } catch (err) {
      console.error("Error verifying document:", err);
      alert("Error al verificar el documento.");
    } finally {
      setVerifying(null);
    }
  };

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [adminMsg, setAdminMsg] = useState('');

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminMsg('Creando...');
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });
      const data = await response.json();
      if (data.success) {
        setAdminMsg('✅ Administrador creado exitosamente.');
        setNewAdmin({ username: '', password: '' });
        setTimeout(() => { setShowAdminModal(false); setAdminMsg(''); }, 2000);
      } else {
        setAdminMsg(`❌ Error: ${data.detail || 'No se pudo crear'}`);
      }
    } catch (err) {
      setAdminMsg('❌ Error de conexión.');
    }
  };

  const filteredRecords = records.filter(r => 
    r.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.cedula.includes(searchTerm) ||
    r.hash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-container">
      <div className="dashboard-header" style={{ borderLeftColor: '#f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2><ShieldCheck size={28} style={{ color: '#f59e0b', marginRight: '10px' }}/> Panel de Auditoría Gubernamental (SAREN / MPPRE)</h2>
          <p>Vista exclusiva para funcionarios. Aquí se listan todos los documentos académicos registrados en la Blockchain por los graduandos. Verifica la autenticidad y aprueba los trámites.</p>
        </div>
        <button 
          onClick={() => setShowAdminModal(true)}
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
        >
          + Añadir Admin
        </button>
      </div>

      {showAdminModal && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#f59e0b' }}>Crear Nuevo Funcionario</h3>
          <form onSubmit={handleCreateAdmin} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Usuario" 
              required
              className="chat-input" 
              value={newAdmin.username}
              onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
              style={{ flex: 1 }}
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              required
              className="chat-input" 
              value={newAdmin.password}
              onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
              style={{ flex: 1 }}
            />
            <button type="submit" className="send-btn" style={{ padding: '0.7rem 1.5rem', background: '#f59e0b' }}>Crear</button>
            <button type="button" onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
          </form>
          {adminMsg && <p style={{ marginTop: '0.8rem', fontSize: '0.9rem', color: adminMsg.includes('✅') ? 'var(--success)' : 'var(--danger)' }}>{adminMsg}</p>}
        </div>
      )}

      <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Buscar por Nombre, Cédula o Hash Blockchain..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando registros blockchain...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Solicitante</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trámite</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hash Blockchain</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado Legal</th>
                <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const isVerified = record.status === "Verificado por SAREN/MPPRE";
                return (
                  <tr key={record.hash} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontWeight: '600', margin: '0 0 0.2rem 0' }}>{record.ownerName}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>C.I: {record.cedula}</p>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                        <FileText size={14} /> {record.documentType}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <a href={`https://sepolia.etherscan.io/tx/${record.txHash}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#a78bfa', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        {record.hash.substring(0, 10)}... <ExternalLink size={12} />
                      </a>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: isVerified ? 'var(--success)' : 'var(--warning)', fontSize: '0.85rem', fontWeight: '600' }}>
                        {isVerified ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        {record.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {!isVerified ? (
                        <button 
                          className="send-btn" 
                          onClick={() => handleVerify(record.hash)}
                          disabled={verifying === record.hash}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'linear-gradient(to right, #f59e0b, #d97706)' }}
                        >
                          {verifying === record.hash ? 'Auditando...' : 'Auditar y Aprobar'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Completado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GovernmentPanel;
