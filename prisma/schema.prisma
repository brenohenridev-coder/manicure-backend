import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminTeam.css';
import PhotoUpload from '../components/PhotoUpload';

const COLORS = ['#F48FB1','#F8BBD9','#CE93D8','#80CBC4','#A5D6A7','#FFE082','#FFCC80','#EF9A9A'];

export default function AdminTeam() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [promoting, setPromoting] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'PROFESSIONAL', avatarColor: '#F48FB1' });

  useEffect(() => {
    if (!isAdmin) { navigate('/admin'); return; }
    fetchTeam();
  }, [isAdmin]);

  const uploadPhoto = async (id, base64) => {
    setPhotoLoading(id);
    try {
      await api.patch(`/api/professionals/${id}/photo`, { photo: base64 });
      setProfessionals(prev => prev.map(p => p.id === id ? {...p, photo: base64} : p));
      setSuccess('Foto atualizada com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    } catch(e) {
      setError(e.response?.data?.error || 'Erro ao salvar foto');
    } finally {
      setPhotoLoading(null);
    }
  };

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/professionals/all');
      setProfessionals(res.data);
    } catch(e) {} finally { setLoading(false); }
  };

  const toggleActive = async (id, active) => {
    try {
      await api.patch(`/api/professionals/${id}/toggle`);
      setProfessionals(prev => prev.map(p => p.id === id ? {...p, active: !active} : p));
      setSuccess(`Profissional ${active ? 'desativada' : 'ativada'} com sucesso`);
      setTimeout(() => setSuccess(''), 3000);
    } catch(e) { setError('Erro ao atualizar'); }
  };

  const handleRole = async (id, currentRole, name) => {
    const newRole = currentRole === 'ADMIN' ? 'PROFESSIONAL' : 'ADMIN';
    const msg = newRole === 'ADMIN'
      ? `Promover "${name}" para Administradora? Ela terá acesso total ao sistema.`
      : `Rebaixar "${name}" para Profissional? Ela perderá o acesso de administradora.`;
    if (!confirm(msg)) return;
    setPromoting(id);
    setError('');
    try {
      const res = await api.patch(`/api/professionals/${id}/role`, { role: newRole });
      setProfessionals(prev => prev.map(p => p.id === id ? {...p, role: res.data.role} : p));
      setSuccess(newRole === 'ADMIN' ? `${name} agora é Administradora 👑` : `${name} agora é Profissional 💅`);
      setTimeout(() => setSuccess(''), 3000);
    } catch(e) {
      setError(e.response?.data?.error || 'Erro ao atualizar perfil');
    } finally { setPromoting(null); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    setError('');
    try {
      await api.delete(`/api/professionals/${id}`);
      setProfessionals(prev => prev.filter(p => p.id !== id));
      setSuccess(`${name} foi excluída com sucesso`);
      setTimeout(() => setSuccess(''), 3000);
    } catch(e) {
      setError(e.response?.data?.error || 'Erro ao excluir profissional');
    } finally { setDeleting(null); }
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name || !form.username || !form.password) { setError('Preencha todos os campos'); return; }
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }
    setSaving(true);
    try {
      const res = await api.post('/api/professionals', form);
      setProfessionals(prev => [...prev, res.data]);
      setShowForm(false);
      setForm({ name: '', username: '', password: '', role: 'PROFESSIONAL', avatarColor: '#F48FB1' });
      setSuccess('Profissional adicionada com sucesso! 🎉');
      setTimeout(() => setSuccess(''), 3000);
    } catch(e) { setError(e.response?.data?.error || 'Erro ao criar'); }
    finally { setSaving(false); }
  };

  const isSelf = (id) => user?.id === id;

  const active = professionals.filter(p => p.active);
  const inactive = professionals.filter(p => !p.active);

  const ProfCard = ({ p }) => (
    <div className={`team-card animate-fade ${!p.active ? 'inactive' : ''}`}>
      <PhotoUpload currentPhoto={p.photo} name={p.name} size={48} onUpload={(b64) => uploadPhoto(p.id, b64)} loading={photoLoading === p.id} />
      <div className="team-info">
        <span className="team-name">{p.name}</span>
        <span className="team-email">@{p.username}</span>
        <span className={`team-role ${p.active ? p.role : 'inactive-role'}`}>
          {!p.active ? 'Desativada' : p.role === 'ADMIN' ? '👑 Admin' : '💅 Profissional'}
        </span>
      </div>

      {!isSelf(p.id) && (
        <div className="team-card-actions">
          {/* Ativar / Desativar */}
          <button
            className={p.active ? 'deactivate-btn' : 'activate-btn'}
            onClick={() => toggleActive(p.id, p.active)}>
            {p.active ? 'Desativar' : 'Reativar'}
          </button>

          {/* Promover / Rebaixar */}
          <button
            className={p.role === 'ADMIN' ? 'demote-btn' : 'promote-btn'}
            onClick={() => handleRole(p.id, p.role, p.name)}
            disabled={promoting === p.id}
            title={p.role === 'ADMIN' ? 'Rebaixar para Profissional' : 'Promover para Admin'}>
            {promoting === p.id ? '...' : p.role === 'ADMIN' ? '👑 Rebaixar' : '⬆ Admin'}
          </button>

          {/* Excluir */}
          <button
            className="delete-btn"
            onClick={() => handleDelete(p.id, p.name)}
            disabled={deleting === p.id}
            title="Excluir permanentemente">
            {deleting === p.id ? '...' : '🗑'}
          </button>
        </div>
      )}

      {isSelf(p.id) && (
        <div className="team-card-actions">
          <span className="self-badge">Você</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="team animate-fade">
      <div className="team-header">
        <div>
          <h1>Equipe</h1>
          <p>Gerencie sua equipe de profissionais</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancelar' : '+ Adicionar profissional'}
        </button>
      </div>

      {success && <div className="success-msg">✓ {success}</div>}
      {error && <div className="error-msg2">⚠ {error}</div>}

      {showForm && (
        <div className="add-form animate-fade">
          <h3>Nova Profissional</h3>
          <div className="add-form-grid">
            <div className="add-field">
              <label>Nome completo</label>
              <input placeholder="Ex: Ana Paula" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="add-field">
              <label>Usuário para login</label>
              <input placeholder="Ex: ana" value={form.username}
                onChange={e => setForm({...form, username: e.target.value.toLowerCase()})} />
            </div>
            <div className="add-field">
              <label>Senha inicial</label>
              <input type="password" placeholder="Mínimo 6 caracteres" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div className="add-field">
              <label>Perfil</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="PROFESSIONAL">Profissional</option>
                <option value="ADMIN">Administradora</option>
              </select>
            </div>
            <div className="add-field full">
              <label>Cor do avatar</label>
              <div className="color-grid">
                {COLORS.map(c => (
                  <button key={c} className={`color-dot ${form.avatarColor === c ? 'selected' : ''}`}
                    style={{ background: c }} onClick={() => setForm({...form, avatarColor: c})} />
                ))}
              </div>
            </div>
          </div>
          <div className="add-form-actions">
            <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="save-btn" onClick={handleCreate} disabled={saving}>
              {saving ? <span className="spinner" /> : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{height:90,marginBottom:12}} />)}</div>
      ) : (
        <>
          <h2 className="team-section-title">Ativas ({active.length})</h2>
          <div className="team-grid">
            {active.map(p => <ProfCard key={p.id} p={p} />)}
          </div>

          {inactive.length > 0 && (
            <>
              <h2 className="team-section-title inactive-title">Inativas ({inactive.length})</h2>
              <div className="team-grid">
                {inactive.map(p => <ProfCard key={p.id} p={p} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}