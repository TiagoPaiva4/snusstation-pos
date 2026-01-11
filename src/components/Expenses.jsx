import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Search, Trash2, Edit, X, Save, TrendingDown, Calendar, Filter, DollarSign } from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros de Data
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // KPIs
  const [totalMonth, setTotalMonth] = useState(0);

  // Modal e Formulário
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: 'Operacional',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar despesas:', error);
    } else {
      setExpenses(data || []);
      calculateTotals(data || []);
    }
    setLoading(false);
  };

  const calculateTotals = (data) => {
    // Calcular total apenas dos registos visíveis ou do mês atual se não houver filtro
    const total = data.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    setTotalMonth(total);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      description: formData.description,
      category: formData.category,
      amount: parseFloat(formData.amount),
      expense_date: formData.expense_date
    };

    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingExpense(null);
      setFormData({ description: '', category: 'Operacional', amount: '', expense_date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch (error) {
      alert("Erro ao guardar: " + error.message);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      expense_date: expense.expense_date
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apagar esta despesa?")) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) fetchExpenses();
  };

  const filteredExpenses = expenses.filter(ex => 
    ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      <div className="dashboard-header">
        <h2>Controlo de Despesas</h2>
        <button 
          className="submit-btn-modern" 
          style={{width: 'auto', display:'flex', gap:'5px', alignItems:'center', background:'#ef4444'}}
          onClick={() => {
            setEditingExpense(null);
            setFormData({ description: '', category: 'Operacional', amount: '', expense_date: new Date().toISOString().split('T')[0] });
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Registar Despesa
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="stats-grid" style={{marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
        <div className="stat-card">
          <div className="stat-header">
            <div className="icon-wrapper red" style={{background: '#fee2e2', color:'#ef4444'}}>
                <TrendingDown size={24} />
            </div>
            <span className="stat-label">Total Gasto (Seleção)</span>
          </div>
          <div className="stat-value" style={{color: '#ef4444'}}>€ {totalMonth.toFixed(2)}</div>
        </div>
      </div>

      {/* FILTROS E LISTA */}
      <div className="list-container">
        <div className="list-header" style={{display:'flex', gap:'15px', alignItems:'center', flexWrap:'wrap', justifyContent: 'space-between'}}>
          
          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b'}}/>
            <input 
              className="search-bar" 
              placeholder="Procurar despesa..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{margin:0, paddingLeft:35, width: '100%'}} 
            />
          </div>

          <div style={{display:'flex', alignItems:'center', gap:'5px', background:'white', padding:'6px 10px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{border:'none', outline:'none', color:'#475569'}} />
            <span style={{color:'#cbd5e1'}}>-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{border:'none', outline:'none', color:'#475569'}} />
          </div>
        </div>

        <div className="table-wrapper">
          <table style={{minWidth: '800px'}}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th style={{textAlign:'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>A carregar...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>Nenhuma despesa encontrada.</td></tr>
              ) : (
                filteredExpenses.map(item => (
                  <tr key={item.id}>
                    <td><span style={{fontWeight:500, color:'#64748b'}}>{new Date(item.expense_date).toLocaleDateString()}</span></td>
                    <td><strong>{item.description}</strong></td>
                    <td>
                        <span className="badge" style={{background: '#f1f5f9', color: '#475569'}}>
                            {item.category}
                        </span>
                    </td>
                    <td style={{fontWeight:'bold', color: '#ef4444'}}>- € {item.amount.toFixed(2)}</td>
                    <td>
                      <div className="table-actions" style={{justifyContent: 'flex-end'}}>
                        <button className="action-btn btn-edit" onClick={() => handleEdit(item)}><Edit size={18}/></button>
                        <button className="action-btn btn-delete" onClick={() => handleDelete(item.id)}><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '450px'}}>
            <div className="modal-header">
              <h3>{editingExpense ? 'Editar Despesa' : 'Registar Despesa'}</h3>
              <button onClick={() => setShowModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modern-form">
              <div className="input-group">
                <label>Descrição</label>
                <input 
                    className="modern-input" 
                    placeholder="Ex: Shopify, Advogados..." 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required
                />
              </div>

              <div className="form-row">
                <div className="input-group">
                    <label>Categoria</label>
                    <select 
                        className="modern-input"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                        <option value="Operacional">Operacional</option>
                        <option value="Stock">Compra de Stock</option>
                        <option value="Pessoal">Pessoal / Ordenados</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Data</label>
                    <input 
                        type="date" 
                        className="modern-input"
                        value={formData.expense_date}
                        onChange={e => setFormData({...formData, expense_date: e.target.value})}
                        required
                    />
                </div>
              </div>

              <div className="input-group">
                <label>Valor (€)</label>
                <div className="input-wrapper">
                    <DollarSign size={16} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#64748b'}}/>
                    <input 
                        type="number" 
                        step="0.01" 
                        className="modern-input" 
                        style={{paddingLeft: '35px'}}
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        required
                    />
                </div>
              </div>

              <button type="submit" className="save-btn" style={{marginTop:'20px'}}>
                <Save size={18}/> Guardar Despesa
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}