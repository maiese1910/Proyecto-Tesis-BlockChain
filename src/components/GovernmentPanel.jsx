import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, FileText, CheckCircle, XCircle, AlertTriangle, ExternalLink, Eye, Download, CheckSquare, Square, Filter, FileSpreadsheet, Printer, X, ShieldAlert, Sparkles, Clock, Users, Shield } from 'lucide-react';
import { blockchainAPI, authAPI } from '../services/api';
import DigitalCertificate from './DigitalCertificate';
import html2pdf from 'html2pdf.js';

const GovernmentPanel = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED'
  const [verifying, setVerifying] = useState(null);
  const [selectedHashes, setSelectedHashes] = useState([]);
  const [batchVerifying, setBatchVerifying] = useState(false);

  // Modales de previsualización
  const [activePUBRecord, setActivePUBRecord] = useState(null);
  const [activeCertHash, setActiveCertHash] = useState(null);

  // Modal para añadir administrador nuevo
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', cargo: 'Inspector Gubernamental', ente: 'SAREN', pin_institucional: 'GOV-8942-SAREN' });
  const [adminMsg, setAdminMsg] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const fetchRecords = async () => {
    try {
      const data = await blockchainAPI.getAllRecords();
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
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (hash) => {
    setVerifying(hash);
    try {
      const data = await blockchainAPI.verifyRecord(hash);
      if (data.success) {
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

  // Selección en lote (Batch Selection)
  const toggleSelectHash = (hash) => {
    setSelectedHashes(prev => 
      prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]
    );
  };

  const toggleSelectAll = () => {
    if (selectedHashes.length === filteredRecords.length) {
      setSelectedHashes([]);
    } else {
      setSelectedHashes(filteredRecords.map(r => r.hash));
    }
  };

  const handleBatchVerify = async () => {
    if (selectedHashes.length === 0) return;
    setBatchVerifying(true);
    try {
      for (const hash of selectedHashes) {
        await blockchainAPI.verifyRecord(hash);
      }
      setRecords(prev => prev.map(r => 
        selectedHashes.includes(r.hash) ? { ...r, status: "Verificado por SAREN/MPPRE" } : r
      ));
      setSelectedHashes([]);
    } catch (err) {
      alert("Error al verificar documentos en lote.");
    } finally {
      setBatchVerifying(false);
    }
  };

  // Exportar Reporte de Auditoría a CSV / Excel
  const handleExportCSV = () => {
    const headers = ["Solicitante", "Cedula", "Tramite", "Hash Blockchain", "Estado Legal", "TxHash"];
    const rows = filteredRecords.map(r => [
      `"${r.ownerName || ''}"`,
      `"${r.cedula || ''}"`,
      `"${r.documentType || ''}"`,
      `"${r.hash || ''}"`,
      `"${r.status || ''}"`,
      `"${r.txHash || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Auditoria_SAREN_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminMsg('Registrando auditor...');
    setAdminLoading(true);
    try {
      const data = await authAPI.registerAdmin(newAdmin);
      if (data.success) {
        setAdminMsg('✅ Funcionario auditor creado exitosamente.');
        setNewAdmin({ username: '', password: '', cargo: 'Inspector Gubernamental', ente: 'SAREN', pin_institucional: `GOV-${Math.floor(1000 + Math.random() * 9000)}-SAREN` });
        setTimeout(() => { setShowAdminModal(false); setAdminMsg(''); }, 2000);
      } else {
        setAdminMsg(`❌ Error: ${data.detail || 'No se pudo crear'}`);
      }
    } catch (err) {
      setAdminMsg(`❌ Error: ${err.message || 'Error de conexión.'}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // Filtrado de registros
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      (r.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.cedula || '').includes(searchTerm) ||
      (r.hash || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isVerified = (r.status || '').includes('Verificado');
    if (filterStatus === 'PENDING') return matchesSearch && !isVerified;
    if (filterStatus === 'VERIFIED') return matchesSearch && isVerified;
    return matchesSearch;
  });

  // Métricas calculadas
  const totalCount = records.length;
  const verifiedCount = records.filter(r => (r.status || '').includes('Verificado')).length;
  const pendingCount = totalCount - verifiedCount;
  const efficiencyRate = totalCount > 0 ? ((verifiedCount / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <div className="view-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* ─── ENCABEZADO CON MÉTRICAS DE AUDITORÍA EN TIEMPO REAL ─── */}
      <div className="dashboard-header" style={{ borderLeftColor: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.2rem', background: 'rgba(15,23,42,0.8)', padding: '1.8rem', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1.8rem' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff' }}>Panel de Auditoría Gubernamental (SAREN / MPPRE)</h2>
              <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 'bold' }}>Módulo de Verificación e Inmutabilidad Criptográfica de Títulos</span>
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0.6rem 0 0 0', lineHeight: '1.5' }}>
            Inspección de expedientes académicos firmados por la Universidad Santa María. Verifica las huellas Hashes SHA-256 e inscribe la aprobación en la Blockchain de Ethereum.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button 
            onClick={handleExportCSV}
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', padding: '0.65rem 1.1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
          >
            <FileSpreadsheet size={16} /> Exportar Reporte (CSV/Excel)
          </button>

          <button 
            onClick={() => setShowAdminModal(true)}
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#ffffff', border: 'none', padding: '0.65rem 1.1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
          >
            <Shield size={16} /> + Añadir Auditor
          </button>
        </div>
      </div>

      {/* ─── TARJETAS DE RESUMEN EJECUTIVO (MÉTRICAS) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.2rem', marginBottom: '1.8rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '3px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span>Expedientes Recibidos</span>
            <FileText size={18} color="#38bdf8" />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#fff' }}>{totalCount}</h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span>Pendientes por Auditar</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#f59e0b' }}>{pendingCount}</h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span>Auditados y Verificados</span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#10b981' }}>{verifiedCount}</h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', borderTop: '3px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span>Eficiencia de Respuesta</span>
            <Sparkles size={18} color="#a855f7" />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#a855f7' }}>{efficiencyRate}%</h3>
        </div>
      </div>

      {/* ─── MODAL PARA CREAR NUEVO AUDITOR GUBERNAMENTAL ─── */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: '16px', background: '#09090b', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 20px 50px rgba(239,68,68,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield color="#ef4444" size={22} /> Registro de Funcionario Auditor
                </h3>
                <button onClick={() => setShowAdminModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Usuario Funcionario</label>
                  <input 
                    type="text" 
                    placeholder="Ej: auditor_saren" 
                    required
                    className="chat-input" 
                    value={newAdmin.username}
                    onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Contraseña</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required
                    className="chat-input" 
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Ente</label>
                    <select
                      className="chat-input"
                      value={newAdmin.ente}
                      onChange={e => setNewAdmin({ ...newAdmin, ente: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="SAREN">SAREN</option>
                      <option value="MPPRE">MPPRE</option>
                      <option value="GTU">GTU</option>
                      <option value="USM">USM Secretarías</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', display: 'block' }}>Cargo Oficial</label>
                    <input 
                      type="text" 
                      placeholder="Registrador Principal" 
                      required
                      className="chat-input" 
                      value={newAdmin.cargo}
                      onChange={e => setNewAdmin({...newAdmin, cargo: e.target.value})}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#f87171', marginBottom: '0.3rem', display: 'block', fontWeight: 'bold' }}>🔑 PIN Institucional Generado</label>
                  <input 
                    type="text" 
                    readOnly
                    className="chat-input" 
                    value={newAdmin.pin_institucional}
                    style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 'bold' }}
                  />
                </div>

                {adminMsg && <p style={{ fontSize: '0.82rem', margin: 0, color: adminMsg.includes('✅') ? '#10b981' : '#ef4444' }}>{adminMsg}</p>}

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button type="submit" disabled={adminLoading} className="send-btn" style={{ flex: 1, padding: '0.8rem', background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
                    {adminLoading ? 'Registrando...' : 'Crear Auditor Autorizado'}
                  </button>
                  <button type="button" onClick={() => setShowAdminModal(false)} style={{ padding: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ─── FILTROS Y BÚSQUEDA ─── */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', padding: '1rem 1.2rem' }}>
        
        {/* Buscador */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Buscar por Nombre, Cédula o Hash..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filtro por Estado */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.4)', padding: '0.2rem', borderRadius: '10px' }}>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PENDING', label: '⏳ Pendientes' },
            { id: 'VERIFIED', label: '✅ Verificados' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '0.45rem 0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.78rem', transition: 'all 0.2s',
                background: filterStatus === f.id ? '#0ea5e9' : 'transparent',
                color: filterStatus === f.id ? '#fff' : '#94a3b8'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Botón de Auditoría Masiva en Lote */}
        {selectedHashes.length > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleBatchVerify}
            disabled={batchVerifying}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CheckSquare size={16} /> {batchVerifying ? 'Auditando...' : `Aprobar (${selectedHashes.length}) Seleccionados`}
          </motion.button>
        )}

      </div>


      {/* ─── VISTA DESKTOP: TABLA CON PREVISUALIZADOR DE EXPEDIENTES Y CERTIFICADOS ─── */}
      <div className="glass-panel gov-table-desktop" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando expedientes académicos en la Blockchain...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron trámites con los criterios seleccionados.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 0.8rem', width: '40px', textAlign: 'center' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    {selectedHashes.length === filteredRecords.length ? <CheckSquare size={18} color="#0ea5e9" /> : <Square size={18} />}
                  </button>
                </th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Solicitante</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trámite</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hash Blockchain</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado Legal</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Acciones & Previsualización</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const isVerified = (record.status || '').includes('Verificado');
                const isSelected = selectedHashes.includes(record.hash);

                return (
                  <tr key={record.hash} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(14,165,233,0.06)' : 'transparent' }}>
                    
                    {/* Checkbox Selección */}
                    <td style={{ padding: '1rem 0.8rem', textAlign: 'center' }}>
                      <button onClick={() => toggleSelectHash(record.hash)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        {isSelected ? <CheckSquare size={18} color="#0ea5e9" /> : <Square size={18} />}
                      </button>
                    </td>

                    {/* Solicitante */}
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontWeight: '700', margin: '0 0 0.2rem 0', color: '#ffffff', fontSize: '0.92rem' }}>{record.ownerName}</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>C.I: {record.cedula}</p>
                    </td>

                    {/* Trámite */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700' }}>
                        <FileText size={14} /> {record.documentType || 'Registro de Título USM'}
                      </span>
                    </td>

                    {/* Hash */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.76rem', fontFamily: 'monospace', color: '#a78bfa' }}>
                          {record.hash ? `${record.hash.substring(0, 14)}...` : 'N/A'}
                        </code>
                        <a href={`https://sepolia.etherscan.io/tx/${record.txHash || ''}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          Sepolia Explorer <ExternalLink size={10} />
                        </a>
                      </div>
                    </td>

                    {/* Estado Legal */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: isVerified ? '#10b981' : '#f59e0b', fontSize: '0.82rem', fontWeight: '700', background: isVerified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', padding: '0.35rem 0.8rem', borderRadius: '20px' }}>
                        {isVerified ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {isVerified ? 'Verificado SAREN/MPPRE' : 'Pendiente de Auditoría'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        
                        {/* Botón Previsualizar Expediente / PUB */}
                        <button
                          onClick={() => setActivePUBRecord(record)}
                          style={{ padding: '0.45rem 0.8rem', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)', color: '#38bdf8', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Ver Planilla PUB y Expediente Escaneado"
                        >
                          <Eye size={14} /> Ver Expediente
                        </button>

                        {/* Botón Certificado Digital */}
                        <button
                          onClick={() => setActiveCertHash(record.hash)}
                          style={{ padding: '0.45rem 0.8rem', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Ver Certificado de Inmutabilidad Criptográfica"
                        >
                          <ShieldCheck size={14} /> Certificado
                        </button>

                        {/* Botón Auditar */}
                        {!isVerified ? (
                          <button 
                            className="send-btn" 
                            onClick={() => handleVerify(record.hash)}
                            disabled={verifying === record.hash}
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                          >
                            {verifying === record.hash ? 'Auditando...' : 'Auditar ➔'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '800', background: 'rgba(16,185,129,0.12)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>✓ Aprobado</span>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── MODAL PREVISUALIZADOR DEL EXPEDIENTE DIGITAL & PUB ─── */}
      <AnimatePresence>
        {activePUBRecord && (
          <div className="cert-modal-overlay" style={{ zIndex: 1200, padding: '1rem', backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              style={{
                background: '#09090b', borderRadius: '16px', maxWidth: '840px', width: '100%', maxHeight: '92vh',
                overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.8)', border: '1px solid rgba(14,165,233,0.4)', display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ padding: '1rem 1.4rem', background: '#0c0e17', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye color="#0ea5e9" size={20} /> Expediente Digital del Graduando — {activePUBRecord.ownerName}
                </h3>
                <button onClick={() => setActivePUBRecord(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', padding: '1.2rem', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Solicitante:</span>
                    <h4 style={{ margin: '0.2rem 0', color: '#fff', fontSize: '1.1rem' }}>{activePUBRecord.ownerName}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#38bdf8' }}>C.I: {activePUBRecord.cedula}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Trámite Registrado:</span>
                    <h4 style={{ margin: '0.2rem 0', color: '#fff', fontSize: '1rem' }}>{activePUBRecord.documentType || 'Registro de Título USM'}</h4>
                    <span style={{ fontSize: '0.78rem', color: (activePUBRecord.status || '').includes('Verificado') ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                      Estado: {activePUBRecord.status}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#fff', color: '#000', padding: '1.5rem', borderRadius: '8px', fontFamily: 'serif', lineHeight: '1.4' }} id="gov-pub-preview-print">
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
                    <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold' }}>REPÚBLICA BOLIVARIANA DE VENEZUELA</p>
                    <p style={{ margin: 0, fontSize: '8pt' }}>SERVICIO AUTÓNOMO DE REGISTROS Y NOTARÍAS (SAREN)</p>
                    <h3 style={{ margin: '6px 0', fontSize: '11pt', textDecoration: 'underline' }}>PLANILLA ÚNICA BANCARIA (PUB) — VISTA AUDITORÍA</h3>
                  </div>
                  <p style={{ fontSize: '9pt' }}><strong>Nombre Solicitante:</strong> {activePUBRecord.ownerName}</p>
                  <p style={{ fontSize: '9pt' }}><strong>Cédula:</strong> {activePUBRecord.cedula}</p>
                  <p style={{ fontSize: '9pt' }}><strong>Hash Blockchain SHA-256:</strong> <span style={{ fontFamily: 'monospace', fontSize: '8pt' }}>{activePUBRecord.hash}</span></p>
                  <p style={{ fontSize: '9pt' }}><strong>Monto Liquidado SAREN:</strong> Bs. 210,00 (0.70 UT)</p>
                </div>

              </div>

              <div style={{ padding: '1rem', background: '#0c0e17', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                {!(activePUBRecord.status || '').includes('Verificado') && (
                  <button
                    onClick={() => { handleVerify(activePUBRecord.hash); setActivePUBRecord(null); }}
                    style={{ padding: '0.65rem 1.2rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    ✓ Aprobar y Verificar en Blockchain
                  </button>
                )}
                <button
                  onClick={() => setActivePUBRecord(null)}
                  style={{ padding: '0.65rem 1.2rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                >
                  Cerrar Ventana ✕
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL CERTIFICADO DIGITAL DE INMUTABILIDAD ─── */}
      {activeCertHash && (
        <DigitalCertificate
          hash={activeCertHash}
          onClose={() => setActiveCertHash(null)}
        />
      )}

    </div>
  );
};

export default GovernmentPanel;
