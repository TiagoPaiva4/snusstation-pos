import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Search, Trash2, X, ChevronDown, ChevronRight, Package, DollarSign } from 'lucide-react';

export default function B2B() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [partners, setPartners] = useState([]);
  const [deliveries, setDeliveries] = useState([]); // Agora chamamos deliveries
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para expandir linhas da tabela
  const [expandedRows, setExpandedRows] = useState({});

  // Formulário Parceiro
  const [newPartner, setNewPartner] = useState({ name: '', location: '', contact_person: '', email: '', phone: '', start_date: '', default_commission: 0 });

  // --- ESTADOS PARA O NOVO FORMULÁRIO COMPLEXO ---
  // 1. Dados Gerais da Entrega
  const [deliveryHeader, setDeliveryHeader] = useState({
    partner_id: '', delivery_date: '', payment_deadline: '', payment_status: 'Pendente'
  });

  // 2. Item que está a ser escrito agora
  const [currentItem, setCurrentItem] = useState({
    sku: '', qty_delivered: 0, current_stock: 0, 
    sales_count: 0, total_sales_value: 0, commission_rate: 0
  });

  // 3. Lista de itens já adicionados (carrinho temporário)
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Buscar Parceiros
    const { data: pData } = await supabase.from('b2b_partners').select('*').order('name');
    setPartners(pData || []);

    // Buscar Entregas com os Itens aninhados
    const { data: dData, error } = await supabase
      .from('b2b_deliveries')
      .select(`
        *,
        b2b_partners (name, location),
        b2b_delivery_items (*)
      `)
      .order('created_at', { ascending: false });

    if(error) console.error(error);
    setDeliveries(dData || []);
    setLoading(false);
  };

  // --- LÓGICA DE ITENS ---
  const addItemToCart = (e) => {
    e.preventDefault(); // Previne submit do form principal
    if (!currentItem.sku) return alert("Preencha o SKU");

    // Calcular comissões deste item
    const commTotal = currentItem.sales_count * currentItem.commission_rate;
    
    const itemToAdd = {
      ...currentItem,
      commission_total: commTotal,
      receivable_part: currentItem.total_sales_value - commTotal
    };

    setCartItems([...cartItems, itemToAdd]);
    
    // Limpar campos do item, mantendo a comissão base para facilitar
    setCurrentItem({
      sku: '', qty_delivered: 0, current_stock: 0, 
      sales_count: 0, total_sales_value: 0, 
      commission_rate: currentItem.commission_rate 
    });
  };

  const removeItemFromCart = (index) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
  };

  // --- SUBMIT FINAL ---
  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return alert("Adicione pelo menos um produto (SKU) à lista.");

    // 1. Calcular Total Geral a Receber
    const totalReceivable = cartItems.reduce((acc, item) => acc + item.receivable_part, 0);

    try {
      // 2. Inserir a Entrega (Cabeçalho)
      const { data: delData, error: delError } = await supabase
        .from('b2b_deliveries')
        .insert([{
          ...deliveryHeader,
          total_receivable: totalReceivable
        }])
        .select()
        .single();

      if (delError) throw delError;

      // 3. Preparar itens com o ID da entrega
      const itemsToInsert = cartItems.map(item => ({
        delivery_id: delData.id,
        sku: item.sku,
        qty_delivered: item.qty_delivered,
        current_stock: item.current_stock,
        sales_count: item.sales_count,
        total_sales_value: item.total_sales_value,
        commission_rate: item.commission_rate,
        commission_total: item.commission_total
      }));

      // 4. Inserir Itens
      const { error: itemsError } = await supabase
        .from('b2b_delivery_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert("Registo B2B criado com sucesso!");
      setShowModal(false);
      setCartItems([]);
      setDeliveryHeader({ partner_id: '', delivery_date: '', payment_deadline: '', payment_status: 'Pendente' });
      fetchData();

    } catch (error) {
      console.error(error);
      alert("Erro ao gravar: " + error.message);
    }
  };

  // --- OUTRAS FUNÇÕES ---
  const handlePartnerSelect = (e) => {
    const pid = e.target.value;
    const partner = partners.find(p => p.id === pid);
    setDeliveryHeader({ ...deliveryHeader, partner_id: pid });
    // Define comissão base para o primeiro item
    if(partner) setCurrentItem(prev => ({ ...prev, commission_rate: partner.default_commission }));
  };

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('b2b_partners').insert([newPartner]);
    if (!error) {
      alert('Parceiro criado!');
      setShowModal(false);
      fetchData();
    }
  };

  const updateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pendente' ? 'Pago' : 'Pendente';
    await supabase.from('b2b_deliveries').update({ payment_status: newStatus }).eq('id', id);
    fetchData();
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteDelivery = async (id) => {
    if(!window.confirm("Apagar este registo e todos os itens associados?")) return;
    await supabase.from('b2b_deliveries').delete().eq('id', id);
    fetchData();
  };

  // Filtros
  const filteredDeliveries = deliveries.filter(d => 
    d.b2b_partners?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      <div className="dashboard-header">
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <h2>Gestão B2B</h2>
          <div className="tab-switcher">
            <button className={`page-btn ${activeTab === 'transactions' ? 'active-tab' : ''}`} onClick={() => setActiveTab('transactions')}>Entregas/Registos</button>
            <button className={`page-btn ${activeTab === 'partners' ? 'active-tab' : ''}`} onClick={() => setActiveTab('partners')}>Parceiros</button>
          </div>
        </div>
        <button className="submit-btn-modern" style={{width: 'auto'}} onClick={() => setShowModal(true)}>
          <Plus size={18} style={{marginRight:5}}/> Novo {activeTab === 'transactions' ? 'Registo' : 'Parceiro'}
        </button>
      </div>

      {/* --- TABELA DE ENTREGAS (EXPANSÍVEL) --- */}
      {activeTab === 'transactions' && (
        <div className="list-container">
          <div className="list-header">
            <div style={{position: 'relative', width: '300px'}}>
              <Search size={18} style={{position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b'}}/>
              <input className="search-bar" placeholder="Procurar Estabelecimento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{margin:0, paddingLeft:35}} />
            </div>
          </div>
          <div className="table-wrapper">
            <table style={{minWidth: '1000px'}}>
              <thead>
                <tr>
                  <th style={{width:'40px'}}></th>
                  <th>Estabelecimento</th>
                  <th>Data Entrega</th>
                  <th>Resumo SKUs</th>
                  <th>Total a Receber</th>
                  <th>Estado</th>
                  <th>Data Limite</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map(d => (
                  <React.Fragment key={d.id}>
                    <tr style={{background: expandedRows[d.id] ? '#f8fafc' : 'white', cursor: 'pointer'}} onClick={() => toggleRow(d.id)}>
                      <td style={{textAlign:'center'}}>
                        {expandedRows[d.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                      </td>
                      <td>
                        <strong>{d.b2b_partners?.name}</strong>
                      </td>
                      <td>{new Date(d.delivery_date).toLocaleDateString()}</td>
                      <td>
                        {/* Mostra um resumo rápido dos SKUs */}
                        <div style={{fontSize:'0.85rem', color:'#64748b'}}>
                          {d.b2b_delivery_items.length} produto(s): {d.b2b_delivery_items.map(i => i.sku).join(', ')}
                        </div>
                      </td>
                      <td style={{fontWeight:'bold', color: '#10b981', fontSize:'1rem'}}>€ {d.total_receivable.toFixed(2)}</td>
                      <td>
                        <span 
                          className={`badge ${d.payment_status === 'Pago' ? 'badge-success' : 'badge-danger'}`}
                          onClick={(e) => { e.stopPropagation(); updateStatus(d.id, d.payment_status); }}
                        >
                          {d.payment_status}
                        </span>
                      </td>
                      <td>{d.payment_deadline ? new Date(d.payment_deadline).toLocaleDateString() : '-'}</td>
                      <td>
                        <button onClick={(e) => { e.stopPropagation(); deleteDelivery(d.id); }} className="delete-btn"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                    
                    {/* LINHA EXPANDIDA COM OS ITENS */}
                    {expandedRows[d.id] && (
                      <tr style={{background: '#f1f5f9'}}>
                        <td colSpan="8" style={{padding: '10px 20px'}}>
                          <div style={{background: 'white', borderRadius: '8px', padding: '15px', border:'1px solid #e2e8f0'}}>
                            <h5 style={{margin:'0 0 10px 0', display:'flex', alignItems:'center', gap:'5px'}}><Package size={16}/> Detalhes dos Produtos</h5>
                            <table style={{width:'100%', fontSize:'0.9rem'}}>
                              <thead>
                                <tr style={{background:'#f8fafc'}}>
                                  <th style={{padding:'8px'}}>SKU</th>
                                  <th style={{padding:'8px'}}>Entregue</th>
                                  <th style={{padding:'8px'}}>Stock Atual</th>
                                  <th style={{padding:'8px'}}>Vendas</th>
                                  <th style={{padding:'8px'}}>Faturação</th>
                                  <th style={{padding:'8px'}}>Comissão (Total)</th>
                                  <th style={{padding:'8px'}}>Líquido Item</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.b2b_delivery_items.map(item => {
                                  const itemNet = item.total_sales_value - item.commission_total;
                                  return (
                                    <tr key={item.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                      <td style={{padding:'8px', fontWeight:500}}>{item.sku}</td>
                                      <td style={{padding:'8px'}}>{item.qty_delivered}</td>
                                      <td style={{padding:'8px'}}>{item.current_stock}</td>
                                      <td style={{padding:'8px'}}>{item.sales_count}</td>
                                      <td style={{padding:'8px'}}>€ {item.total_sales_value}</td>
                                      <td style={{padding:'8px', color:'#ef4444'}}>€ {item.commission_total}</td>
                                      <td style={{padding:'8px', fontWeight:'bold', color:'#10b981'}}>€ {itemNet.toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
      )}

      {/* --- TABELA PARCEIROS --- */}
      {activeTab === 'partners' && (
        <div className="list-container">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nome</th><th>Localização</th><th>Comissão Base</th><th>Ações</th></tr></thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.location}</td>
                    <td>€ {p.default_commission} / lata</td>
                    <td><button className="delete-btn"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '800px', width: '95%'}}> {/* Modal mais largo */}
            <div className="modal-header">
              <h3>{activeTab === 'transactions' ? 'Nova Entrega B2B' : 'Novo Parceiro'}</h3>
              <button onClick={() => setShowModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            
            {activeTab === 'partners' ? (
              // FORMULÁRIO SIMPLES DE PARCEIRO
              <form onSubmit={handleCreatePartner} className="modern-form">
                <input placeholder="Nome Estabelecimento" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} required />
                <input placeholder="Localização" value={newPartner.location} onChange={e => setNewPartner({...newPartner, location: e.target.value})} />
                <input placeholder="Comissão Base (€)" type="number" step="0.01" value={newPartner.default_commission} onChange={e => setNewPartner({...newPartner, default_commission: e.target.value})} />
                <button className="submit-btn-modern">Guardar</button>
              </form>
            ) : (
              // --- FORMULÁRIO COMPLEXO DE ENTREGA ---
              <div className="modern-form" style={{maxHeight:'80vh', overflowY:'auto'}}>
                
                {/* 1. CABEÇALHO DA ENTREGA */}
                <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'15px'}}>
                  <h4 style={{marginTop:0}}>1. Dados da Entrega</h4>
                  <div className="form-row-grid">
                    <div className="input-group">
                      <label>Estabelecimento</label>
                      <select value={deliveryHeader.partner_id} onChange={handlePartnerSelect} className="modern-input" style={{width:'100%', padding:'10px'}}>
                        <option value="">Selecione...</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Data Entrega</label>
                      <input type="date" value={deliveryHeader.delivery_date} onChange={e => setDeliveryHeader({...deliveryHeader, delivery_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="input-group" style={{marginTop:'10px'}}>
                    <label>Data Limite Pagamento</label>
                    <input type="date" value={deliveryHeader.payment_deadline} onChange={e => setDeliveryHeader({...deliveryHeader, payment_deadline: e.target.value})} />
                  </div>
                </div>

                {/* 2. ADICIONAR ITENS */}
                <div style={{border:'1px solid #e2e8f0', padding:'15px', borderRadius:'8px', marginBottom:'15px'}}>
                  <h4 style={{marginTop:0}}>2. Adicionar Produtos (SKUs)</h4>
                  
                  <div className="form-row-grid">
                    <div className="input-group"><label>SKU (Nome Produto)</label><input placeholder="Ex: ZYN 10mg" value={currentItem.sku} onChange={e => setCurrentItem({...currentItem, sku: e.target.value})} /></div>
                    <div className="input-group"><label>Comissão Un. (€)</label><input type="number" step="0.01" value={currentItem.commission_rate} onChange={e => setCurrentItem({...currentItem, commission_rate: e.target.value})} /></div>
                  </div>
                  
                  <div className="form-row-grid" style={{marginTop:'10px'}}>
                    <div className="input-group"><label>Qtd Entregue</label><input type="number" value={currentItem.qty_delivered} onChange={e => setCurrentItem({...currentItem, qty_delivered: e.target.value})} /></div>
                    <div className="input-group"><label>Stock Atual</label><input type="number" value={currentItem.current_stock} onChange={e => setCurrentItem({...currentItem, current_stock: e.target.value})} /></div>
                  </div>

                  <div className="form-row-grid" style={{marginTop:'10px'}}>
                    <div className="input-group"><label>Vendas (Qtd)</label><input type="number" value={currentItem.sales_count} onChange={e => setCurrentItem({...currentItem, sales_count: e.target.value})} /></div>
                    <div className="input-group"><label>Total Vendas (€)</label><input type="number" step="0.01" value={currentItem.total_sales_value} onChange={e => setCurrentItem({...currentItem, total_sales_value: e.target.value})} /></div>
                  </div>

                  <button onClick={addItemToCart} className="page-btn" style={{width:'100%', marginTop:'15px', justifyContent:'center', background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb'}}>
                    <Plus size={16}/> Adicionar Produto à Lista
                  </button>
                </div>

                {/* 3. LISTA DE ITENS (CARRINHO) */}
                {cartItems.length > 0 && (
                  <div style={{marginBottom:'20px'}}>
                    <h4 style={{marginTop:0}}>Resumo da Entrega</h4>
                    <table style={{width:'100%', fontSize:'0.85rem', borderCollapse:'collapse'}}>
                      <thead style={{background:'#f1f5f9'}}>
                        <tr>
                          <th style={{padding:5, textAlign:'left'}}>SKU</th>
                          <th style={{padding:5}}>Vendas</th>
                          <th style={{padding:5}}>Líquido</th>
                          <th style={{padding:5}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item, idx) => (
                          <tr key={idx} style={{borderBottom:'1px solid #f1f5f9'}}>
                            <td style={{padding:5}}>{item.sku}</td>
                            <td style={{padding:5, textAlign:'center'}}>{item.sales_count}</td>
                            <td style={{padding:5, textAlign:'center', fontWeight:'bold'}}>€ {item.receivable_part.toFixed(2)}</td>
                            <td style={{padding:5, textAlign:'right'}}>
                              <button onClick={() => removeItemFromCart(idx)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}>X</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div style={{textAlign:'right', marginTop:'10px', fontSize:'1.1rem', fontWeight:'bold', color:'#166534'}}>
                      Total a Receber: € {cartItems.reduce((acc, i) => acc + i.receivable_part, 0).toFixed(2)}
                    </div>
                  </div>
                )}

                <button onClick={handleCreateDelivery} className="submit-btn-modern">Gravar Registo Completo</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}