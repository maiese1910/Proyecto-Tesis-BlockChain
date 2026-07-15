import React, { useState, useEffect } from 'react';
import { Settings, FileText, CheckSquare, Map, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { authAPI, dynamicDataAPI } from '../services/api';

const AdminDashboard = ({ adminData }) => {
  const [activeTab, setActiveTab] = useState('checklist');
  
  // States for data
  const [checklist, setChecklist] = useState([]);
  const [planillas, setPlanillas] = useState([]);
  const [guias, setGuias] = useState([]);
  
  // States for loading/errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states for new items
  const [newChecklist, setNewChecklist] = useState({ title: '', description: '', icon: 'FileText' });
  const [newPlanilla, setNewPlanilla] = useState({ nombre: '', url: '' });
  const [newGuia, setNewGuia] = useState({ ente: '', location: '', warning: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = adminData.token;
      
      if (activeTab === 'checklist') {
        const data = await fetch(import.meta.env.VITE_API_URL + '/admin/checklist', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());
        if (data.items) setChecklist(data.items);
      } 
      else if (activeTab === 'planillas') {
        const data = await dynamicDataAPI.getPlanillas();
        if (data.planillas) setPlanillas(data.planillas);
      }
      else if (activeTab === 'guias') {
        const data = await dynamicDataAPI.getGuias();
        if (data.guias) setGuias(data.guias);
      }
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    try {
      await fetch(import.meta.env.VITE_API_URL + '/admin/checklist', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newChecklist)
      });
      setNewChecklist({ title: '', description: '', icon: 'FileText' });
      fetchData();
    } catch (err) {
      setError('Error al crear item');
    }
  };

  const handleDeleteChecklist = async (id) => {
    try {
      await fetch(import.meta.env.VITE_API_URL + `/admin/checklist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminData.token}` }
      });
      fetchData();
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const handleAddPlanilla = async (e) => {
    e.preventDefault();
    try {
      await fetch(import.meta.env.VITE_API_URL + '/admin/planillas', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPlanilla)
      });
      setNewPlanilla({ nombre: '', url: '' });
      fetchData();
    } catch (err) {
      setError('Error al crear planilla');
    }
  };

  return (
    <div className="view-container">
      <div className="dashboard-header" style={{ borderLeftColor: '#3b82f6', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2><Settings size={28} style={{ color: '#3b82f6', marginRight: '10px' }}/> Configuración de Datos Dinámicos</h2>
          <p>Administra los checklists, planillas y guías logísticas del bot.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('checklist')}
          style={{ 
            background: activeTab === 'checklist' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
            color: activeTab === 'checklist' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'
          }}
        >
          <CheckSquare size={18} /> Checklist SAREN
        </button>
        <button 
          onClick={() => setActiveTab('planillas')}
          style={{ 
            background: activeTab === 'planillas' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
            color: activeTab === 'planillas' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'
          }}
        >
          <FileText size={18} /> Planillas Universitarias
        </button>
        <button 
          onClick={() => setActiveTab('guias')}
          style={{ 
            background: activeTab === 'guias' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
            color: activeTab === 'guias' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'
          }}
        >
          <Map size={18} /> Guías Logísticas
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tab: Checklist */}
      {activeTab === 'checklist' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Agregar Requisito SAREN</h3>
          <form onSubmit={handleAddChecklist} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" required placeholder="Título del Requisito" 
              className="chat-input" style={{ flex: 1, minWidth: '200px' }}
              value={newChecklist.title} onChange={e => setNewChecklist({...newChecklist, title: e.target.value})}
            />
            <input 
              type="text" required placeholder="Descripción breve" 
              className="chat-input" style={{ flex: 2, minWidth: '250px' }}
              value={newChecklist.description} onChange={e => setNewChecklist({...newChecklist, description: e.target.value})}
            />
            <button type="submit" className="send-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Agregar
            </button>
          </form>

          <h3 style={{ marginBottom: '1rem' }}>Requisitos Actuales</h3>
          {loading ? <p>Cargando...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0' }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.description}</p>
                  </div>
                  <button onClick={() => handleDeleteChecklist(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {checklist.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay requisitos configurados.</p>}
            </div>
          )}
        </div>
      )}

      {/* Tab: Planillas */}
      {activeTab === 'planillas' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Agregar Nueva Planilla</h3>
          <form onSubmit={handleAddPlanilla} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" required placeholder="Nombre (Ej: Planilla de Grado)" 
              className="chat-input" style={{ flex: 1, minWidth: '200px' }}
              value={newPlanilla.nombre} onChange={e => setNewPlanilla({...newPlanilla, nombre: e.target.value})}
            />
            <input 
              type="url" required placeholder="URL de descarga (PDF)" 
              className="chat-input" style={{ flex: 2, minWidth: '250px' }}
              value={newPlanilla.url} onChange={e => setNewPlanilla({...newPlanilla, url: e.target.value})}
            />
            <button type="submit" className="send-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Agregar
            </button>
          </form>

          <h3 style={{ marginBottom: '1rem' }}>Planillas Actuales</h3>
          {loading ? <p>Cargando...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {planillas.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0' }}>{item.nombre}</h4>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>{item.url}</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Guías */}
      {activeTab === 'guias' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Gestión de Guías Logísticas</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>La creación de guías complejas (con pasos y mapas) requiere configurarse directamente en la base de datos Supabase debido a su estructura JSON anidada.</p>
          
          <h3 style={{ marginBottom: '1rem' }}>Guías Registradas</h3>
          {loading ? <p>Cargando...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {guias.map(item => (
                <div key={item.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <h4 style={{ margin: '0 0 0.3rem 0', color: '#f59e0b' }}>{item.ente}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}><strong>Ubicación:</strong> {item.location}</p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--danger)' }}><strong>Advertencia:</strong> {item.warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
