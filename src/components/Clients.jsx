import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, UserPlus, Phone, MapPin, Mail, Trash2, Pencil, X, User } from 'lucide-react';

// Reutilizamos o CSS global ou de produtos se quiseres, mas as classes do index.css funcionam aqui
import '../index.css'; 

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- CONTROLAR VISIBILIDADE DO FORM ---
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    // BUSCAR CLIENTES E AS SUAS VENDAS PARA SOMAR O TOTAL
    const { data, error } = await supabase
      .from('clients')
      .select('*, sales(total_amount)')
      .order('name');
    
    if (error) console.error(error);
    else setClients(data || []);
    setLoading(false);
  };

  // --- ABRIR FORMULÁRIO (NOVO) ---
  const handleNewClient = () => {
    setFormData({ name: '', email: '', phone: '', location: '' });
    setEditingId(null);
    setShowForm(true);
  };

  // --- ABRIR FORMULÁRIO (EDITAR) ---
  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      location: client.location || ''
    });
    setEditingId(client.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FECHAR FORMULÁRIO ---
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', location: '' });
  };

  // --- GUARDAR ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("O nome é obrigatório.");

    try {
      if (editingId) {
        const { error } = await supabase.from('clients').update(formData).eq('id', editingId);
        if (error) throw error;
        alert("Cliente atualizado!");
      } else {
        const { error } = await supabase.from('clients').insert([formData]);
        if (error) throw error;
        alert("Cliente criado!");
      }
      handleCancel();
      fetchClients();
    } catch (error) {
      alert("Erro: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apagar este cliente?")) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) fetchClients();
  };

  // Função auxiliar para calcular total gasto
  const calculateTotalSpent = (salesList) => {
    if (!salesList || salesList.length === 0) return 0;
    return salesList.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      {/* CABEÇALHO */}
      <div className="dashboard-header" style={{flexDirection: 'row', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Gestão de Clientes <span style={{fontSize:'1rem', color:'#64748b', fontWeight:'normal'}}>({clients.length})</span></h2>
        
        {!showForm && (
          <button onClick={handleNewClient} className="submit-btn-modern" style={{width: 'auto', display:'flex', gap:'5px', alignItems:'center'}}>
            <UserPlus size={18} /> Novo Cliente
          </button>
        )}
      </div>

      {/* LAYOUT GRID (Igual aos Produtos) */}
      <div className="management-grid" style={{ gridTemplateColumns: showForm ? '350px 1fr' : '1fr' }}>
        
        {/* FORMULÁRIO */}
        {showForm && (
          <div className="form-container">
            <form onSubmit={handleSave} className="modern-form">
              <div className="form-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                  <p>{editingId ? 'Atualizar dados' : 'Registar novo cliente'}</p>
                </div>
                <button type="button" onClick={handleCancel} style={{background:'none', border:'none', cursor:'pointer', color:'#64748b'}}>
                  <X size={20} />
                </button>
              </div>

              <div className="input-group">
                <label>Nome Completo</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon"/>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Nome do Cliente" />
                </div>
              </div>

              <div className="input-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon"/>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.com" />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="input-group">
                  <label>Telefone</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon"/>
                    <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="912 345 678" />
                  </div>
                </div>
                <div className="input-group">
                  <label>Localidade</label>
                  <div className="input-wrapper">
                    <MapPin size={16} className="input-icon"/>
                    <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Lisboa" />
                  </div>
                </div>
              </div>

              <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                <button type="submit" className="submit-btn-modern" style={{flex:1}}>
                  {editingId ? 'Atualizar' : 'Guardar'}
                </button>
                <button type="button" onClick={handleCancel} className="submit-btn-modern" style={{width:'auto', background: '#e2e8f0', color: '#64748b'}}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LISTA DE CLIENTES */}
        <div className="list-container">
          <div className="list-header">
            <div style={{position:'relative', width:'300px'}}>
              <Search size={18} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8'}}/>
              <input 
                className="search-bar" 
                placeholder="Pesquisar clientes..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{margin:0, paddingLeft:35}}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contacto</th>
                  <th>Localização</th>
                  <th>Total Gasto</th> {/* NOVA COLUNA */}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>Nenhum cliente encontrado.</td></tr>
                ) : (
                  filteredClients.map(client => {
                    // Calcular Total Gasto
                    const totalSpent = calculateTotalSpent(client.sales);
                    
                    return (
                      <tr key={client.id} style={{background: editingId === client.id ? '#fffbeb' : 'transparent'}}>
                        <td>
                          <strong>{client.name}</strong><br/>
                          <small style={{color:'#64748b'}}>{client.email}</small>
                        </td>
                        <td>{client.phone || '-'}</td>
                        <td>{client.location || '-'}</td>
                        
                        {/* VALOR GASTO */}
                        <td style={{fontWeight:'bold', color: totalSpent > 0 ? '#10b981' : '#64748b'}}>
                          € {totalSpent.toFixed(2)}
                        </td>

                        <td>
                          <div style={{display:'flex', gap:'10px'}}>
                            <button onClick={() => handleEdit(client)} style={{background:'none', border:'none', cursor:'pointer', color:'#64748b'}}>
                              <Pencil size={18}/>
                            </button>
                            <button onClick={() => handleDelete(client.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ef4444'}}>
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}