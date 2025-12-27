import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Building2, Plus, Search, Calendar, Save, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function B2B() {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' ou 'partners'
  const [partners, setPartners] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para formulários
  const [newPartner, setNewPartner] = useState({ name: '', location: '', contact_person: '', email: '', phone: '', start_date: '', default_commission: 0 });
  const [newTrans, setNewTrans] = useState({ 
    partner_id: '', last_delivery_date: '', sku: '', qty_delivered: 0, current_stock: 0, 
    sales_count: 0, total_sales_value: 0, commission_rate: 0, 
    returns_count: 0, payment_deadline: '', payment_status: 'Pendente' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Buscar Parceiros
    const { data: pData } = await supabase.from('b2b_partners').select('*').order('name');
    setPartners(pData || []);

    // Buscar Transações (com dados do parceiro)
    const { data: tData } = await supabase
      .from('b2b_transactions')
      .select('*, b2b_partners(name, location)')
      .order('created_at', { ascending: false });
    setTransactions(tData || []);
    setLoading(false);
  };

  // --- Lógica de Parceiros ---
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('b2b_partners').insert([newPartner]);
    if (!error) {
      alert('Parceiro criado!');
      setShowModal(false);
      fetchData();
      setNewPartner({ name: '', location: '', contact_person: '', email: '', phone: '', start_date: '', default_commission: 0 });
    } else {
      alert(error.message);
    }
  };

  // --- Lógica de Transações ---
  const handleCreateTrans = async (e) => {
    e.preventDefault();
    
    // Cálculos Automáticos
    const commTotal = newTrans.sales_count * newTrans.commission_rate;
    const receivable = newTrans.total_sales_value - commTotal;

    const payload = {
      ...newTrans,
      commission_total: commTotal,
      amount_receivable: receivable
    };

    const { error } = await supabase.from('b2b_transactions').insert([payload]);
    if (!error) {
      alert('Registo B2B criado!');
      setShowModal(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  // Auto-preencher comissão ao selecionar parceiro
  const handlePartnerSelect = (e) => {
    const pid = e.target.value;
    const partner = partners.find(p => p.id === pid);
    setNewTrans({ 
      ...newTrans, 
      partner_id: pid, 
      commission_rate: partner ? partner.default_commission : 0 
    });
  };

  const updateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pendente' ? 'Pago' : 'Pendente';
    await supabase.from('b2b_transactions').update({ payment_status: newStatus }).eq('id', id);
    fetchData();
  };

  const deleteItem = async (table, id) => {
    if(!window.confirm("Tem a certeza?")) return;
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  // Filtros
  const filteredTrans = transactions.filter(t => 
    t.b2b_partners?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      <div className="dashboard-header">
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <h2>Gestão B2B</h2>
          <div className="tab-switcher">
            <button className={`page-btn ${activeTab === 'transactions' ? 'active-tab' : ''}`} onClick={() => setActiveTab('transactions')}>Registos (Excel)</button>
            <button className={`page-btn ${activeTab === 'partners' ? 'active-tab' : ''}`} onClick={() => setActiveTab('partners')}>Parceiros</button>
          </div>
        </div>
        <button className="submit-btn-modern" style={{width: 'auto'}} onClick={() => setShowModal(true)}>
          <Plus size={18} style={{marginRight:5}}/> Novo {activeTab === 'transactions' ? 'Registo' : 'Parceiro'}
        </button>
      </div>

      {/* --- TABELA DE TRANSAÇÕES (O TEU EXCEL) --- */}
      {activeTab === 'transactions' && (
        <div className="list-container">
          <div className="list-header">
            <div style={{position: 'relative', width: '300px'}}>
              <Search size={18} style={{position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b'}}/>
              <input className="search-bar" placeholder="Procurar Estabelecimento ou SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{margin:0, paddingLeft:35}} />
            </div>
          </div>
          <div className="table-wrapper">
            <table style={{minWidth: '1500px'}}> {/* Tabela larga para caber tudo */}
              <thead>
                <tr>
                  <th>Estabelecimento</th>
                  <th>SKU</th>
                  <th>Entrega</th>
                  <th>Qtd Entregue</th>
                  <th>Stock Atual</th>
                  <th>Vendas (Mês)</th>
                  <th>Total Vendas</th>
                  <th>Comissão</th>
                  <th>A Receber</th>
                  <th>Estado</th>
                  <th>Data Limite</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrans.map(t => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.b2b_partners?.name}</strong>
                      <div style={{fontSize:'0.75rem', color:'#64748b'}}>{t.b2b_partners?.location}</div>
                    </td>
                    <td>{t.sku}</td>
                    <td>{new Date(t.last_delivery_date).toLocaleDateString()}</td>
                    <td style={{textAlign:'center'}}>{t.qty_delivered}</td>
                    <td style={{textAlign:'center', fontWeight:'bold'}}>{t.current_stock}</td>
                    <td style={{textAlign:'center'}}>{t.sales_count}</td>
                    <td>€ {t.total_sales_value}</td>
                    <td>
                      <div style={{fontSize:'0.8rem'}}>€ {t.commission_rate}/un</div>
                      <div style={{color:'#ef4444'}}>Total: € {t.commission_total}</div>
                    </td>
                    <td style={{fontWeight:'bold', color: '#10b981', fontSize:'1rem'}}>€ {t.amount_receivable}</td>
                    <td>
                      <span 
                        className={`badge ${t.payment_status === 'Pago' ? 'badge-success' : 'badge-danger'}`}
                        style={{cursor:'pointer'}}
                        onClick={() => updateStatus(t.id, t.payment_status)}
                      >
                        {t.payment_status}
                      </span>
                    </td>
                    <td>{t.payment_deadline ? new Date(t.payment_deadline).toLocaleDateString() : '-'}</td>
                    <td>
                      <button onClick={() => deleteItem('b2b_transactions', t.id)} className="delete-btn"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TABELA DE PARCEIROS --- */}
      {activeTab === 'partners' && (
        <div className="list-container">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nome</th><th>Localização</th><th>Contacto</th><th>Email / Telefone</th><th>Comissão Base</th><th>Ações</th></tr></thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.location}</td>
                    <td>{p.contact_person}</td>
                    <td>{p.email}<br/>{p.phone}</td>
                    <td>€ {p.default_commission} / lata</td>
                    <td><button onClick={() => deleteItem('b2b_partners', p.id)} className="delete-btn"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL (DINÂMICO CONSOANTE A TAB) --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>{activeTab === 'transactions' ? 'Nova Transação B2B' : 'Novo Parceiro'}</h3>
              <button onClick={() => setShowModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            
            {activeTab === 'partners' ? (
              <form onSubmit={handleCreatePartner} className="modern-form">
                <div className="form-row-grid">
                  <input placeholder="Nome do Estabelecimento" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} required />
                  <input placeholder="Localização" value={newPartner.location} onChange={e => setNewPartner({...newPartner, location: e.target.value})} />
                </div>
                <div className="form-row-grid">
                  <input placeholder="Responsável" value={newPartner.contact_person} onChange={e => setNewPartner({...newPartner, contact_person: e.target.value})} />
                  <input placeholder="Telefone" value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})} />
                </div>
                <input placeholder="Email" type="email" value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} />
                <div className="form-row-grid">
                  <div className="input-group">
                    <label>Data Início</label>
                    <input type="date" value={newPartner.start_date} onChange={e => setNewPartner({...newPartner, start_date: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Comissão Base (€)</label>
                    <input type="number" step="0.01" value={newPartner.default_commission} onChange={e => setNewPartner({...newPartner, default_commission: e.target.value})} />
                  </div>
                </div>
                <button className="submit-btn-modern">Guardar Parceiro</button>
              </form>
            ) : (
              <form onSubmit={handleCreateTrans} className="modern-form">
                <div className="input-group">
                  <label>Estabelecimento</label>
                  <select value={newTrans.partner_id} onChange={handlePartnerSelect} required style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}}>
                    <option value="">Selecione...</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div className="form-row-grid">
                  <div className="input-group"><label>Data Entrega</label><input type="date" value={newTrans.last_delivery_date} onChange={e => setNewTrans({...newTrans, last_delivery_date: e.target.value})} required/></div>
                  <div className="input-group"><label>SKU (Produto)</label><input placeholder="Ex: ZYN 10mg" value={newTrans.sku} onChange={e => setNewTrans({...newTrans, sku: e.target.value})} required/></div>
                </div>

                <div className="form-row-grid">
                  <div className="input-group"><label>Qtd Entregue</label><input type="number" value={newTrans.qty_delivered} onChange={e => setNewTrans({...newTrans, qty_delivered: e.target.value})} /></div>
                  <div className="input-group"><label>Stock Atual</label><input type="number" value={newTrans.current_stock} onChange={e => setNewTrans({...newTrans, current_stock: e.target.value})} /></div>
                </div>

                <div style={{borderTop:'1px dashed #e2e8f0', margin:'10px 0'}}></div>
                <h4>Vendas & Finanças</h4>

                <div className="form-row-grid">
                  <div className="input-group"><label>Vendas (Qtd)</label><input type="number" value={newTrans.sales_count} onChange={e => setNewTrans({...newTrans, sales_count: e.target.value})} /></div>
                  <div className="input-group"><label>Valor Total Vendas (€)</label><input type="number" step="0.01" value={newTrans.total_sales_value} onChange={e => setNewTrans({...newTrans, total_sales_value: e.target.value})} /></div>
                </div>

                <div className="form-row-grid">
                  <div className="input-group"><label>Comissão (€/lata)</label><input type="number" step="0.01" value={newTrans.commission_rate} onChange={e => setNewTrans({...newTrans, commission_rate: e.target.value})} /></div>
                  <div className="input-group"><label>Pagamento Limite</label><input type="date" value={newTrans.payment_deadline} onChange={e => setNewTrans({...newTrans, payment_deadline: e.target.value})} /></div>
                </div>

                <div style={{background: '#f0fdf4', padding: '10px', borderRadius:'8px', marginTop:'10px'}}>
                  <p style={{margin:0, fontSize:'0.9rem', color: '#166534'}}>
                    <strong>A Receber (Previsão):</strong> € {(newTrans.total_sales_value - (newTrans.sales_count * newTrans.commission_rate)).toFixed(2)}
                  </p>
                </div>

                <button className="submit-btn-modern">Guardar Registo</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}