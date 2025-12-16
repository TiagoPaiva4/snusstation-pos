import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '' });
  const [search, setSearch] = useState('');
  const [viewHistory, setViewHistory] = useState(null); // ID do cliente para ver histórico
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    setClients(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('clients').insert([form]);
    if (error) {
      alert('Erro ao adicionar cliente: ' + error.message);
    } else {
      setForm({ name: '', email: '', phone: '', location: '' });
      fetchClients();
    }
  };

  const handleViewHistory = async (clientId) => {
    if (viewHistory === clientId) {
      setViewHistory(null); // Fechar se já estiver aberto
      setHistory([]);
      return;
    }
    
    setViewHistory(clientId);
    // Buscar histórico de vendas deste cliente
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    setHistory(data || []);
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page">
      <h2>Gestão de Clientes</h2>
      
      <div className="management-grid">
        {/* Formulário de Adição */}
        <form onSubmit={handleSubmit} className="entry-form">
          <h3>Novo Cliente</h3>
          <input 
            placeholder="Nome" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            required 
          />
          <input 
            type="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
          />
          <div className="row">
            <input 
              placeholder="Telefone" 
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value})} 
            />
            <input 
              placeholder="Localidade" 
              value={form.location} 
              onChange={e => setForm({...form, location: e.target.value})} 
            />
          </div>
          <button type="submit">Adicionar Cliente</button>
        </form>

        {/* Lista de Clientes */}
        <div className="list-view">
          <input 
            className="search-bar" 
            placeholder="Pesquisar cliente (nome ou email)..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contacto</th>
                <th>Localidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <React.Fragment key={client.id}>
                  <tr>
                    <td>{client.name}</td>
                    <td>
                      {client.email}<br/>
                      <small>{client.phone}</small>
                    </td>
                    <td>{client.location}</td>
                    <td>
                      <button 
                        onClick={() => handleViewHistory(client.id)}
                        style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                      >
                        {viewHistory === client.id ? 'Fechar' : 'Histórico'}
                      </button>
                    </td>
                  </tr>
                  {/* Linha expandida para mostrar histórico */}
                  {viewHistory === client.id && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="4">
                        <div style={{ padding: '10px' }}>
                          <strong>Histórico de Compras:</strong>
                          {history.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
                              {history.map(sale => (
                                <li key={sale.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '5px 0' }}>
                                  Data: {new Date(sale.created_at).toLocaleDateString()} — 
                                  Total: <strong>€ {sale.total_amount.toFixed(2)}</strong> 
                                  (Lucro: € {sale.total_profit.toFixed(2)})
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ color: '#64748b' }}>Nenhuma compra registada.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}