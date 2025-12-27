import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, ChevronDown, ChevronRight, Package, Trash2, User, Gift, Globe, Store } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*, clients(name), sale_items(*, products(name))')
      .order('created_at', { ascending: false });

    if (error) console.error('Erro ao buscar vendas:', error);
    else setSales(data || []);
    
    setLoading(false);
  };

  const toggleRow = (saleId) => {
    setExpandedRows(prev => ({ ...prev, [saleId]: !prev[saleId] }));
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm('Tem a certeza que deseja anular esta venda? O stock será reposto.')) return;

    try {
      for (const item of sale.sale_items) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (prod) {
          await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
        }
      }

      const { error } = await supabase.from('sales').delete().eq('id', sale.id);
      if (error) throw error;

      alert('Venda anulada e stock reposto.');
      fetchSales();
    } catch (error) {
      alert('Erro ao anular venda: ' + error.message);
    }
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
        <div className="list-header">
          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b'}}/>
            <input 
              className="search-bar" 
              placeholder="Procurar cliente ou vendedor..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{margin:0, paddingLeft:35}} 
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table style={{minWidth: '950px'}}>
            <thead>
              <tr>
                <th style={{width: '40px'}}></th>
                <th>Data</th>
                <th>Canal</th> {/* NOVA COLUNA */}
                <th>Vendedor</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Lucro</th>
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
                        <br/>
                        <small style={{color: '#94a3b8'}}>
                          {new Date(sale.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </small>
                      </td>
                      
                      {/* COLUNA CANAL */}
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

                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                          <User size={14} color="#64748b"/>
                          <span style={{fontWeight: 500, color: '#334155'}}>
                            {sale.seller_name || 'Admin'}
                          </span>
                        </div>
                      </td>

                      <td>{sale.clients?.name || <span style={{color:'#94a3b8'}}>Cliente Final</span>}</td>
                      
                      <td style={{fontWeight: 'bold'}}>€ {sale.total_amount.toFixed(2)}</td>
                      
                      <td style={{color: sale.total_profit >= 0 ? '#10b981' : '#ef4444'}}>
                        {sale.total_profit >= 0 ? '+' : ''}€ {sale.total_profit.toFixed(2)}
                      </td>
                      
                      <td>
                        <button 
                          className="delete-btn" 
                          title="Anular Venda"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale); }}
                        >
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>

                    {expandedRows[sale.id] && (
                      <tr style={{background: '#f8fafc'}}>
                        <td colSpan="8" style={{padding: '0 20px 20px 20px'}}>
                          <div style={{background: 'white', borderRadius: '8px', padding: '15px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                            <h5 style={{margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color:'#475569'}}>
                              <Package size={16}/> Itens da Venda
                            </h5>
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
                                            marginLeft: '8px', 
                                            fontSize:'0.75rem', 
                                            background:'#dcfce7', 
                                            color:'#166534', 
                                            padding:'2px 8px', 
                                            borderRadius:'4px', 
                                            fontWeight:'bold',
                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                          }}>
                                            <Gift size={12}/> OFERTA
                                          </span>
                                        )}
                                      </td>
                                      <td style={{padding: '8px', textAlign: 'center'}}>{item.quantity}</td>
                                      <td style={{padding: '8px', textAlign: 'right'}}>
                                        {isOffer ? (
                                          <span style={{color: '#166534', fontWeight:'bold'}}>Grátis</span>
                                        ) : (
                                          `€ ${item.unit_price.toFixed(2)}`
                                        )}
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
    </div>
  );
}