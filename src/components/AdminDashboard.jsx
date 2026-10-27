import React, { useState, useEffect } from 'react';
import { Settings, FileText, CheckSquare, Map, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { authAPI, dynamicDataAPI, adminAPI } from '../services/api';

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
        const data = await dynamicDataAPI.getChecklist();
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
      await adminAPI.createChecklistItem(newChecklist, adminData.token);
      setNewChecklist({ title: '', description: '', icon: 'FileText' });
      fetchData();
    } catch (err) {
      setError('Error al crear item');
    }
  };

  const handleDeleteChecklist = async (id) => {
    try {
      await adminAPI.deleteChecklistItem(id, adminData.token);
      fetchData();
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const handleAddPlanilla = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createPlanilla(newPlanilla, adminData.token);
      setNewPlanilla({ nombre: '', url: '' });
      fetchData();
    } catch (err) {
      setError('Error al crear planilla');
    }
  };

  return (
    <div className="view-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-cards)',
        padding: '1.75rem 2rem',
        marginBottom: '1.75rem',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'var(--color-fog-white)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-ink-black)'
        }}>
          <Settings size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: '0 0 0.25rem 0',
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: '1.5rem',
            color: 'var(--color-ink-black)'
          }}>
            Configuración de Datos Dinámicos
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-slate-gray)' }}>
            Administra los checklists, planillas y guías logísticas del bot universitario.
          </p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '0.35rem',
        marginBottom: '1.75rem',
        background: '#ffffff',
        padding: '0.35rem',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-subtle)',
        overflowX: 'auto'
      }}>
        <button 
          onClick={() => setActiveTab('checklist')}
          style={{ 
            background: activeTab === 'checklist' ? 'var(--color-ink-black)' : 'transparent', 
            color: activeTab === 'checklist' ? '#ffffff' : 'var(--color-slate-gray)',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.84rem',
            transition: 'all 0.2s ease'
          }}
        >
          <CheckSquare size={16} /> Checklist SAREN
        </button>
        <button 
          onClick={() => setActiveTab('planillas')}
          style={{ 
            background: activeTab === 'planillas' ? 'var(--color-ink-black)' : 'transparent', 
            color: activeTab === 'planillas' ? '#ffffff' : 'var(--color-slate-gray)',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.84rem',
            transition: 'all 0.2s ease'
          }}
        >
          <FileText size={16} /> Planillas Universitarias
        </button>
        <button 
          onClick={() => setActiveTab('guias')}
          style={{ 
            background: activeTab === 'guias' ? 'var(--color-ink-black)' : 'transparent', 
            color: activeTab === 'guias' ? '#ffffff' : 'var(--color-slate-gray)',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.84rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Map size={16} /> Guías Logísticas
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.8rem 1.2rem', background: 'var(--color-blush-peach)', color: 'var(--color-sienna-brown)', border: '1px solid rgba(93, 42, 26, 0.2)', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.84rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Tab: Checklist */}
      {activeTab === 'checklist' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-cards)',
          padding: '2rem',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.25rem', color: 'var(--color-ink-black)' }}>
            Agregar Requisito SAREN
          </h3>
          <form onSubmit={handleAddChecklist} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" required placeholder="Título del Requisito" 
              style={{
                flex: 1, minWidth: '200px',
                padding: '0.65rem 1rem',
                background: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)',
                color: 'var(--color-ink-black)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
              value={newChecklist.title} onChange={e => setNewChecklist({...newChecklist, title: e.target.value})}
            />
            <input 
              type="text" required placeholder="Descripción breve" 
              style={{
                flex: 2, minWidth: '250px',
                padding: '0.65rem 1rem',
                background: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)',
                color: 'var(--color-ink-black)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
              value={newChecklist.description} onChange={e => setNewChecklist({...newChecklist, description: e.target.value})}
            />
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--color-ink-black)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.86rem',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <Plus size={16} /> Agregar
            </button>
          </form>

          <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem', color: 'var(--color-ink-black)' }}>
            Requisitos Actuales
          </h3>
          {loading ? <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem' }}>Cargando requisitos...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-fog-white)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-ink-black)', fontWeight: 600, fontSize: '0.94rem' }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}>{item.description}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteChecklist(item.id)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#b91c1c',
                      padding: '0.45rem',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {checklist.length === 0 && <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem' }}>No hay requisitos configurados.</p>}
            </div>
          )}
        </div>
      )}

      {/* Tab: Planillas */}
      {activeTab === 'planillas' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-cards)',
          padding: '2rem',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.25rem', color: 'var(--color-ink-black)' }}>
            Agregar Nueva Planilla
          </h3>
          <form onSubmit={handleAddPlanilla} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" required placeholder="Nombre (Ej: Planilla de Grado)" 
              style={{
                flex: 1, minWidth: '200px',
                padding: '0.65rem 1rem',
                background: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)',
                color: 'var(--color-ink-black)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
              value={newPlanilla.nombre} onChange={e => setNewPlanilla({...newPlanilla, nombre: e.target.value})}
            />
            <input 
              type="url" required placeholder="URL de descarga (PDF)" 
              style={{
                flex: 2, minWidth: '250px',
                padding: '0.65rem 1rem',
                background: 'var(--color-fog-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-inputs)',
                color: 'var(--color-ink-black)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
              value={newPlanilla.url} onChange={e => setNewPlanilla({...newPlanilla, url: e.target.value})}
            />
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--color-ink-black)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.86rem',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <Plus size={16} /> Agregar
            </button>
          </form>

          <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem', color: 'var(--color-ink-black)' }}>
            Planillas Actuales
          </h3>
          {loading ? <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem' }}>Cargando planillas...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {planillas.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-fog-white)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-ink-black)', fontWeight: 600, fontSize: '0.94rem' }}>{item.nombre}</h4>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: 'var(--color-ink-black)', textDecoration: 'underline' }}>{item.url}</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Guías */}
      {activeTab === 'guias' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-cards)',
          padding: '2rem',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.25rem', color: 'var(--color-ink-black)' }}>
            Gestión de Guías Logísticas
          </h3>
          <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
            La creación de guías complejas (con pasos y mapas) se sincroniza directamente con la base de datos Supabase debido a su estructura relacional y geoespacial.
          </p>
          
          <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.2rem', color: 'var(--color-ink-black)' }}>
            Guías Registradas
          </h3>
          {loading ? <p style={{ color: 'var(--color-slate-gray)', fontSize: '0.88rem' }}>Cargando guías...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {guias.map(item => (
                <div key={item.id} style={{ background: 'var(--color-fog-white)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--color-ink-black)', fontWeight: 600, fontSize: '0.96rem' }}>{item.ente}</h4>
                  <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.84rem', color: 'var(--color-slate-gray)' }}><strong>Ubicación:</strong> {item.location}</p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-sienna-brown)' }}><strong>Advertencia:</strong> {item.warning}</p>
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
