import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, User, Search, Trash2, Edit, Eye, X, Save, AlertCircle } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(''); // Pesquisa por nome do cliente
  const ITEMS_PER_PAGE = 10;

  // Estados para Modais
  const [viewSale, setViewSale] = useState(null); // Venda selecionada para ver itens
  const [editingSale, setEditingSale] = useState(null); // Venda selecionada para editar
  const [clients, setClients] = useState([]); // Lista de clientes para o edit

  useEffect(() => {
    fetchSales();
    fetchClients();
  }, [page, search]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setClients(data || []);
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      // Query base
      let query = supabase
        .from('sales')
        .select('*, clients(name), sale_items(quantity)', { count: 'exact' });

      // Se tiver pesquisa, filtrar pelo nome do cliente (requer join filter)
      if (search) {
        // Nota: Filtrar por relação no Supabase é um pouco mais complexo, 
        // por simplicidade vamos filtrar clientes que correspondam e depois as vendas
        const { data: foundClients } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', `%${search}%`);
        
        if (foundClients && foundClients.length > 0) {
          const clientIds = foundClients.map(c => c.id);
          query = query.in('client_id', clientIds);
        } else {
          // Se pesquisou algo que não deu match em clientes, não retorna nada
          setSales([]);
          setLoading(false);
          return;
        }
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setSales(data || []);
      if (count) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));

    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar detalhes completos (itens) para visualização
  const handleViewDetails = async (sale) => {
    const { data: items, error } = await supabase
      .from('sale_items')
      .select('*, products(name, brand)')
      .eq('sale_id', sale.id);
    
    if (!error) {
      setViewSale({ ...sale, items });
    }
  };

  // Abrir modal de edição
  const handleEditClick = (sale) => {
    // Formata a data para o input type="date" (YYYY-MM-DD)
    const formattedDate = new Date(sale.created_at).toISOString().split('T')[0];
    setEditingSale({ ...sale, date: formattedDate });
  };

  // Salvar Edição (Data e Cliente)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSale) return;

    const { error } = await supabase
      .from('sales')
      .update({
        client_id: editingSale.client_id,
        created_at: editingSale.date // Atualiza data
      })
      .eq('id', editingSale.id);

    if (error) {
      alert("Erro ao atualizar venda: " + error.message);
    } else {
      setEditingSale(null);
      fetchSales();
    }
  };

  // Apagar Venda (Devolver Stock)
  const handleDeleteSale = async (saleId) => {
    if (!window.confirm("Tem a certeza? Isto irá apagar a venda e DEVOLVER O STOCK dos produtos.")) return;

    try {
      // 1. Buscar itens para saber o que devolver
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);

      // 2. Devolver stock produto a produto
      for (const item of items) {
        // Buscar stock atual
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock + item.quantity })
            .eq('id', item.product_id);
        }
      }

      // 3. Apagar itens da venda
      await supabase.from('sale_items').delete().eq('sale_id', saleId);

      // 4. Apagar a venda (cabeçalho)
      await supabase.from('sales').delete().eq('id', saleId);

      alert("Venda anulada e stock reposto.");
      fetchSales();

    } catch (error) {
      alert("Erro ao anular venda: " + error.message);
    }
  };

  return (
    <div className="page">
      <h2>Histórico de Vendas</h2>

      <div className="list-container">
        {/* Header da Tabela com Pesquisa */}
        <div className="list-header">
          <div style={{position: 'relative', width: '100%', maxWidth: '300px'}}>
            <Search size={18} style={{position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b'}}/>
            <input 
              className="search-bar" 
              placeholder="Pesquisar por cliente..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              style={{margin: 0, paddingLeft: 35}}
            />
          </div>
          
          <div className="pagination-controls">
            <span>Página {page} de {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="page-btn">Anterior</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="page-btn">Seguinte</button>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Qtd Itens</th>
                <th>Total</th>
                <th>Lucro</th>
                <th style={{textAlign: 'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px'}}>A carregar...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px'}}>Nenhuma venda encontrada.</td></tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.created_at).toLocaleDateString()} <small style={{color: '#94a3b8'}}>{new Date(sale.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small></td>
                    <td style={{fontWeight: 500}}>{sale.clients?.name || '—'}</td>
                    <td><span className="badge badge-neutral">{sale.sale_items?.length || 0}</span></td>
                    <td style={{fontWeight: 'bold'}}>€ {sale.total_amount.toFixed(2)}</td>
                    <td style={{color: '#10b981'}}>+€ {sale.total_profit.toFixed(2)}</td>
                    <td style={{textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                      <button className="page-btn" title="Ver Itens" onClick={() => handleViewDetails(sale)}><Eye size={16}/></button>
                      <button className="page-btn" title="Editar" onClick={() => handleEditClick(sale)}><Edit size={16}/></button>
                      <button className="page-btn" title="Anular Venda" style={{borderColor: '#fee2e2', color: '#ef4444'}} onClick={() => handleDeleteSale(sale.id)}><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DE ITENS */}
      {viewSale && (
        <div className="modal-overlay" onClick={() => setViewSale(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h3>Detalhes da Venda #{viewSale.id}</h3>
              <button className="close-modal" onClick={() => setViewSale(null)}><X size={20}/></button>
            </div>
            <div style={{marginBottom: '20px', fontSize: '0.9rem', color: '#64748b'}}>
              <p><strong>Cliente:</strong> {viewSale.clients?.name}</p>
              <p><strong>Data:</strong> {new Date(viewSale.created_at).toLocaleString()}</p>
            </div>
            <div className="list-container" style={{boxShadow: 'none', border: '1px solid #e2e8f0'}}>
              <table>
                <thead><tr><th>Produto</th><th>Qtd</th><th>Preço Un.</th><th>Total</th></tr></thead>
                <tbody>
                  {viewSale.items?.map(item => (
                    <tr key={item.id}>
                      <td>{item.products?.name}</td>
                      <td><b>{item.quantity}</b></td>
                      <td>€{item.unit_price}</td>
                      <td>€{(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-header" style={{marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px'}}>
              <h3>Total: €{viewSale.total_amount.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingSale && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Editar Venda #{editingSale.id}</h3>
              <button className="close-modal" onClick={() => setEditingSale(null)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveEdit} className="modern-form" style={{padding: 0}}>
              <div className="input-group">
                <label>Data da Venda</label>
                <div className="input-wrapper">
                  <Calendar className="input-icon" size={18}/>
                  <input 
                    type="date" 
                    value={editingSale.date} 
                    onChange={e => setEditingSale({...editingSale, date: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Cliente</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18}/>
                  <select 
                    value={editingSale.client_id} 
                    onChange={e => setEditingSale({...editingSale, client_id: e.target.value})}
                    style={{width: '100%', padding: '10px 10px 10px 34px', border: '1px solid #e2e8f0', borderRadius: '8px'}}
                  >
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{background: '#fffbeb', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', color: '#b45309', display: 'flex', gap: '10px'}}>
                <AlertCircle size={32} />
                <p style={{margin:0}}>Para alterar os produtos, anule esta venda (o stock será reposto) e registe uma nova.</p>
              </div>

              <button type="submit" className="submit-btn-modern"><Save size={18} style={{marginRight: 5}}/> Guardar Alterações</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}