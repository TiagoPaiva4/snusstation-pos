import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, ChevronDown, ChevronRight, Package, Trash2, User, Globe, Store, Edit, X, Save, Download } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  // --- Estados: Filtro de Data ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados para Edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Buscar Vendas
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*, clients(id, name), sale_items(*, products(name))')
      .order('created_at', { ascending: false });

    if (salesData) setSales(salesData);
    if (salesError) console.error('Erro ao buscar vendas:', salesError);

    // 2. Buscar Clientes
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    
    if (clientsData) setClients(clientsData);
    setLoading(false);
  };

  const toggleRow = (saleId) => {
    setExpandedRows(prev => ({ ...prev, [saleId]: !prev[saleId] }));
  };

  // --- ALTERAR ESTADO DE PAGAMENTO ---
  const handleTogglePaid = async (sale, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('sales')
        .update({ is_paid: newStatus })
        .eq('id', sale.id);

      if (error) throw error;

      setSales(prevSales => 
        prevSales.map(s => s.id === sale.id ? { ...s, is_paid: newStatus } : s)
      );

    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert('Erro ao atualizar estado de pagamento.');
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm('Tem a certeza que deseja anular esta venda? O stock será reposto.')) return;

    try {
      // 1. Repor Stock
      for (const item of sale.sale_items) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (prod) {
          await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
        }
      }

      // 2. Apagar itens
      const { error: itemsError } = await supabase.from('sale_items').delete().eq('sale_id', sale.id);
      if (itemsError) throw itemsError;

      // 3. Apagar venda
      const { error } = await supabase.from('sales').delete().eq('id', sale.id);
      if (error) throw error;

      alert('Venda anulada e stock reposto.');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao anular venda: ' + error.message);
    }
  };

  const handleEditClick = (sale, e) => {
    e.stopPropagation(); 
    setEditingSale({
      id: sale.id,
      created_at: sale.created_at.split('T')[0], 
      client_id: sale.client_id || '',
      sale_channel: sale.sale_channel || 'Fisica',
      is_paid: sale.is_paid
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          created_at: editingSale.created_at,
          client_id: editingSale.client_id === '' ? null : editingSale.client_id,
          sale_channel: editingSale.sale_channel,
          is_paid: editingSale.is_paid
        })
        .eq('id', editingSale.id);

      if (error) throw error;
      alert("Venda atualizada!");
      setShowEditModal(false);
      fetchData(); 
    } catch (error) {
      alert("Erro: " + error.message);
    }
  };

  // --- EXPORTAR CSV ---
  const handleExportCSV = () => {
    const salesToExport = sales.filter(sale => {
      if (!startDate && !endDate) return true;
      const saleDate = new Date(sale.created_at);
      const start = startDate ? new Date(startDate) : new Date('2000-01-01');
      start.setHours(0,0,0,0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23,59,59,999);
      return saleDate >= start && saleDate <= end;
    });

    if (salesToExport.length === 0) {
      alert("Não existem vendas no período selecionado.");
      return;
    }

    const headers = [
      "Data",
      "Vendedor", 
      "Nome do Cliente",
      "Produto",
      "Quantidade",
      "Preço Unitário",
      "Total",
      "Pago?" 
    ];

    const csvRows = [headers.join(';')];

    for (const sale of salesToExport) {
      const dateObj = new Date(sale.created_at);
      const dateStr = dateObj.toLocaleDateString('pt-PT');
      const clientName = sale.clients?.name || 'Cliente Final';
      const sellerName = sale.seller_name || 'Admin';
      const isPaidStr = sale.is_paid ? 'Sim' : 'Não';

      if (sale.sale_items && sale.sale_items.length > 0) {
        for (const item of sale.sale_items) {
          const productName = item.products?.name || 'Produto Removido';
          const lineTotal = item.quantity * item.unit_price;

          const row = [
            dateStr,
            `"${sellerName}"`,
            `"${clientName}"`, 
            `"${productName}"`,
            item.quantity,
            item.unit_price.toFixed(2).replace('.', ','),
            lineTotal.toFixed(2).replace('.', ','),
            isPaidStr
          ];
          csvRows.push(row.join(';'));
        }
      }
    }

    const csvString = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vendas_Detalhado_${startDate || 'inicio'}_ate_${endDate || 'hoje'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredSales = sales.filter(sale => 
    (sale.clients?.name || 'Cliente Final').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.seller_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      <div className="dashboard-header">
        <h2>Histórico de Vendas</h2>
      </div>

      <div className="list-container">
        <div className="list-header" style={{display:'flex', gap:'15px', alignItems:'center', flexWrap:'wrap', justifyContent: 'space-between'}}>
          
          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b'}}/>
            <input 
              className="search-bar" 
              placeholder="Procurar cliente ou vendedor..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{margin:0, paddingLeft:35, width: '100%'}} 
            />
          </div>

          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'5px', background:'white', padding:'6px 10px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                style={{border:'none', outline:'none', color:'#475569', fontFamily:'inherit'}}
                title="Data Inicial"
              />
              <span style={{color:'#cbd5e1'}}>-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                style={{border:'none', outline:'none', color:'#475569', fontFamily:'inherit'}}
                title="Data Final"
              />
            </div>

            <button 
              onClick={handleExportCSV}
              className="action-btn"
              style={{
                background: '#10b981', 
                color: 'white', 
                width: 'auto', 
                padding: '0 15px', 
                height: '38px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                borderRadius: '8px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Download size={18} />
              <span>CSV Detalhado</span>
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table style={{minWidth: '1000px'}}>
            <thead>
              <tr>
                <th style={{width: '40px'}}></th>
                <th>Data</th>
                <th>Canal</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Lucro</th>
                <th style={{textAlign: 'center', width: '60px'}}>Pago</th> {/* HEADER CENTRADO */}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{textAlign: 'center', padding: '30px'}}>A carregar histórico...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign: 'center', padding: '30px'}}>Nenhuma venda encontrada.</td></tr>
              ) : (
                filteredSales.map(sale => (
                  <React.Fragment key={sale.id}>
                    <tr 
                      onClick={() => toggleRow(sale.id)} 
                      style={{cursor: 'pointer', background: expandedRows[sale.id] ? '#f8fafc' : 'white'}}
                    >
                      <td style={{textAlign: 'center'}}>
                        {expandedRows[sale.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                      </td>
                      
                      <td>
                        <span style={{fontWeight: 500}}>
                          {new Date(sale.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      
                      <td>
                        {sale.sale_channel === 'Shopify' ? (
                          <span style={{display:'inline-flex', alignItems:'center', gap:'4px', background:'#f3e8ff', color:'#9333ea', padding:'4px 8px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:'bold'}}>
                            <Globe size={12}/> Shopify
                          </span>
                        ) : (
                          <span style={{display:'inline-flex', alignItems:'center', gap:'4px', background:'#f1f5f9', color:'#64748b', padding:'4px 8px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:'bold'}}>
                            <Store size={12}/> Física
                          </span>
                        )}
                      </td>

                      <td>{sale.clients?.name || <span style={{color:'#94a3b8'}}>Cliente Final</span>}</td>
                      
                      <td style={{fontWeight: 'bold'}}>€ {sale.total_amount.toFixed(2)}</td>
                      
                      <td style={{color: sale.total_profit >= 0 ? '#10b981' : '#ef4444'}}>
                        {sale.total_profit >= 0 ? '+' : ''}€ {sale.total_profit.toFixed(2)}
                      </td>

                      {/* CHECKBOX CENTRADA */}
                      <td style={{textAlign: 'center', verticalAlign: 'middle'}} onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={sale.is_paid || false} 
                          onChange={() => handleTogglePaid(sale, sale.is_paid)}
                          style={{width:'16px', height:'16px', cursor:'pointer', verticalAlign: 'middle'}}
                          title="Marcar como Pago/Não Pago"
                        />
                      </td>
                      
                      <td>
                        <div className="table-actions">
                          <button 
                            className="action-btn btn-edit" 
                            title="Editar Detalhes"
                            onClick={(e) => handleEditClick(sale, e)}
                          >
                            <Edit size={18}/>
                          </button>
                          
                          <button 
                            className="action-btn btn-delete" 
                            title="Anular Venda"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale); }}
                          >
                            <Trash2 size={18}/>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedRows[sale.id] && (
                      <tr style={{background: '#f8fafc'}}>
                        <td colSpan="8" style={{padding: '0 20px 20px 20px'}}>
                          <div style={{background: 'white', borderRadius: '8px', padding: '15px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                            
                            {/* HEADER DOS DETALHES (COM VENDEDOR) */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                              <h5 style={{margin: '0', display: 'flex', alignItems: 'center', gap: '8px', color:'#475569'}}>
                                <Package size={16}/> Itens da Venda
                              </h5>
                              <div style={{fontSize: '0.9rem', color: '#64748b', display:'flex', alignItems:'center', gap:'5px'}}>
                                <User size={14}/>
                                Vendedor: <span style={{color: '#334155', fontWeight: '600'}}>{sale.seller_name || 'Admin'}</span>
                              </div>
                            </div>

                            <table style={{width: '100%', fontSize: '0.9rem'}}>
                              <thead>
                                <tr style={{background: '#f1f5f9'}}>
                                  <th style={{padding: '8px', textAlign:'left'}}>Produto</th>
                                  <th style={{padding: '8px', textAlign: 'center'}}>Qtd</th>
                                  <th style={{padding: '8px', textAlign: 'right'}}>Preço Un.</th>
                                  <th style={{padding: '8px', textAlign: 'right'}}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.sale_items.map(item => {
                                  const isOffer = item.unit_price === 0;
                                  return (
                                    <tr key={item.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                                      <td style={{padding: '8px'}}>
                                        {item.products?.name || 'Produto Removido'}
                                        {isOffer && (
                                          <span style={{
                                            marginLeft: '8px', fontSize:'0.75rem', background:'#dcfce7', color:'#166534', 
                                            padding:'2px 8px', borderRadius:'4px', fontWeight:'bold'
                                          }}>
                                            OFERTA
                                          </span>
                                        )}
                                      </td>
                                      <td style={{padding: '8px', textAlign: 'center'}}>{item.quantity}</td>
                                      <td style={{padding: '8px', textAlign: 'right'}}>
                                        {isOffer ? <span style={{color: '#166534', fontWeight:'bold'}}>Grátis</span> : `€ ${item.unit_price.toFixed(2)}`}
                                      </td>
                                      <td style={{padding: '8px', textAlign: 'right', fontWeight: '500'}}>
                                        € {(item.quantity * item.unit_price).toFixed(2)}
                                      </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <h3>Editar Venda</h3>
              <button onClick={() => setShowEditModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="modern-form">
              <div className="input-group">
                <label>Data da Venda</label>
                <input 
                  type="date" 
                  value={editingSale.created_at} 
                  onChange={e => setEditingSale({...editingSale, created_at: e.target.value})} 
                  required
                />
              </div>

              <div className="input-group" style={{marginTop:'15px'}}>
                <label>Cliente</label>
                <select 
                  value={editingSale.client_id || ''} 
                  onChange={e => setEditingSale({...editingSale, client_id: e.target.value})}
                  className="modern-input"
                  style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0'}}
                >
                  <option value="">Cliente Final (Sem Registo)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{marginTop:'15px'}}>
                <label>Canal de Venda</label>
                <select 
                  value={editingSale.sale_channel} 
                  onChange={e => setEditingSale({...editingSale, sale_channel: e.target.value})}
                  className="modern-input"
                  style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0'}}
                >
                  <option value="Fisica">🏢 Loja Física</option>
                  <option value="Shopify">🌐 Shopify</option>
                </select>
              </div>
              
              <div className="input-group" style={{marginTop:'15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <input 
                  type="checkbox" 
                  id="modal-paid"
                  checked={editingSale.is_paid || false} 
                  onChange={e => setEditingSale({...editingSale, is_paid: e.target.checked})}
                  style={{width:'18px', height:'18px'}}
                />
                <label htmlFor="modal-paid" style={{margin:0, cursor:'pointer'}}>Marcar como Pago</label>
              </div>

              <button type="submit" className="save-btn" style={{marginTop:'20px'}}>
                <Save size={18}/> Atualizar Venda
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}