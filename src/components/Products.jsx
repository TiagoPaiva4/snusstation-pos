import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, X, Image as ImageIcon, Package, DollarSign, Tag, Pencil, ChevronLeft, ChevronRight, Plus, FileText, Save, Trash2 } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  // --- CONTROLAR VISIBILIDADE DO FORM ---
  const [showForm, setShowForm] = useState(false);

  // Estados de Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- NOVOS ESTADOS: FATURA (ENTRADA DE STOCK) ---
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    reference: '',
    supplier: '',
    items: [] // { product_id, quantity, cost_price }
  });

  useEffect(() => { 
    fetchProducts(); 
  }, [page, search]);

  const fetchProducts = async () => {
    let query = supabase
      .from('products')
      .select('*, sale_items(quantity)', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, count, error } = await query
      .order('name')
      .range(from, to);
    
    if (error) {
      console.error("Erro ao buscar produtos:", error);
    } else {
      setProducts(data || []);
      if (count) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = (e) => {
    e.preventDefault();
    setImage(null);
    setImagePreview(null);
  };

  const handleNewProduct = () => {
    setEditingId(null);
    setForm({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
    setImage(null);
    setImagePreview(null);
    setShowForm(true); 
  };

  const handleEditClick = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      brand: product.brand || '',
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      stock: product.stock
    });
    setImagePreview(product.image_url);
    setImage(null);
    setShowForm(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
    setImage(null);
    setImagePreview(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    let imageUrl = imagePreview;

    if (image) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, image);

      if (uploadError) {
        alert('Erro no upload da imagem!');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      
      imageUrl = publicUrl;
    }

    const productData = { ...form, image_url: imageUrl };
    let error;

    if (editingId) {
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('products')
        .insert([productData]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      handleCancelEdit();
      fetchProducts();
    }
    setUploading(false);
  };

  const calculateTotalSold = (saleItems) => {
    if (!saleItems || saleItems.length === 0) return 0;
    return saleItems.reduce((acc, item) => acc + item.quantity, 0);
  };

  const nextPage = () => { if (page < totalPages) setPage(page + 1); };
  const prevPage = () => { if (page > 1) setPage(page - 1); };


  // --- FUNÇÕES DA FATURA (NOVO) ---
  const addInvoiceRow = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, cost_price: 0 }]
    }));
  };

  const removeInvoiceRow = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (invoiceData.items.length === 0) return alert("Adicione produtos à fatura.");
    if (invoiceData.items.some(item => !item.product_id)) return alert("Selecione os produtos.");

    try {
      setUploading(true);
      // 1. Criar Cabeçalho da Fatura
      const { data: entry, error: entryError } = await supabase
        .from('stock_entries')
        .insert([{ reference: invoiceData.reference, supplier: invoiceData.supplier }])
        .select()
        .single();

      if (entryError) throw entryError;

      // 2. Inserir Itens e Atualizar Stock
      for (const item of invoiceData.items) {
        await supabase.from('stock_entry_items').insert([{
          entry_id: entry.id,
          product_id: item.product_id,
          quantity: parseInt(item.quantity),
          cost_price: parseFloat(item.cost_price || 0)
        }]);

        // Atualizar stock do produto individualmente
        const currentProd = products.find(p => p.id == item.product_id);
        if (currentProd) {
            await supabase.from('products')
            .update({ stock: (parseInt(currentProd.stock) || 0) + parseInt(item.quantity) })
            .eq('id', item.product_id);
        }
      }

      alert("Fatura registada e stock atualizado!");
      setShowInvoiceModal(false);
      setInvoiceData({ reference: '', supplier: '', items: [] });
      fetchProducts();
    } catch (error) {
      alert("Erro ao gravar fatura: " + error.message);
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="page">
      <div className="dashboard-header" style={{flexDirection: 'row', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Gestão de Produtos</h2>
        
        <div style={{display:'flex', gap:'10px'}}>
            {/* --- NOVO BOTÃO DE FATURA --- */}
            {!showForm && !showInvoiceModal && (
                <button 
                onClick={() => { setShowInvoiceModal(true); addInvoiceRow(); }} 
                className="submit-btn-modern" 
                style={{width: 'auto', display:'flex', gap:'5px', alignItems:'center', background: '#4f46e5', color: 'white'}}
                >
                <FileText size={18} /> Adicionar Fatura
                </button>
            )}

            {!showForm && (
            <button onClick={handleNewProduct} className="submit-btn-modern" style={{width: 'auto', display:'flex', gap:'5px', alignItems:'center'}}>
                <Plus size={18} /> Novo Produto
            </button>
            )}
        </div>
      </div>
      
      <div className="management-grid" style={{ gridTemplateColumns: showForm ? '350px 1fr' : '1fr' }}>
        
        {showForm && (
          <div className="form-container">
            <form onSubmit={handleSubmit} className="modern-form">
              <div className="form-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
                  <p>{editingId ? 'Altere os dados abaixo' : 'Adicionar ao inventário'}</p>
                </div>
                <button type="button" onClick={handleCancelEdit} style={{background:'none', border:'none', cursor:'pointer', color:'#64748b'}}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="image-upload-wrapper">
                <label className={`image-upload-box ${imagePreview ? 'has-image' : ''}`}>
                  <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" />
                      <button onClick={removeImage} className="remove-image-btn"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <Upload size={24} color="#2563eb"/>
                      <span>Carregar Foto</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="input-group">
                <label>Nome</label>
                <div className="input-wrapper">
                  <Tag className="input-icon" />
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="input-group">
                  <label>Marca</label>
                  <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Stock</label>
                  <div className="input-wrapper">
                    <Package className="input-icon" />
                    <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
                  </div>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="input-group">
                  <label>Compra (€)</label>
                  <div className="input-wrapper">
                    <DollarSign className="input-icon" />
                    <input type="number" step="0.01" value={form.buy_price} onChange={e => setForm({...form, buy_price: e.target.value})} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Venda (€)</label>
                  <div className="input-wrapper">
                    <DollarSign className="input-icon" />
                    <input type="number" step="0.01" value={form.sell_price} onChange={e => setForm({...form, sell_price: e.target.value})} required />
                  </div>
                </div>
              </div>
              
              <div style={{display:'flex', gap:'10px'}}>
                <button type="submit" disabled={uploading} className="submit-btn-modern" style={{flex:1, background: editingId ? '#f59e0b' : 'var(--dark)'}}>
                  {uploading ? 'A guardar...' : (editingId ? 'Atualizar' : 'Adicionar')}
                </button>
                <button type="button" onClick={handleCancelEdit} className="submit-btn-modern" style={{width:'auto', background: '#e2e8f0', color: '#64748b'}}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="list-container">
          <div className="list-header">
            <input 
              className="search-bar" 
              placeholder="🔍 Pesquisar..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              style={{maxWidth: '300px', margin: 0}}
            />
            <div className="pagination-controls">
              <span>Página {page} de {totalPages}</span>
              <button onClick={prevPage} disabled={page === 1} className="page-btn"><ChevronLeft size={16}/></button>
              <button onClick={nextPage} disabled={page === totalPages} className="page-btn"><ChevronRight size={16}/></button>
            </div>
          </div>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Img</th>
                  <th>Nome</th>
                  <th>Stock</th>
                  <th>Vendidos</th>
                  <th>Venda</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan="8" style={{textAlign:'center', padding:'20px'}}>Nenhum produto encontrado.</td></tr>
                ) : (
                  products.map(p => {
                    const totalSold = calculateTotalSold(p.sale_items);
                    const profit = p.sell_price - p.buy_price;
                    const margin = p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(0) : 0;

                    return (
                      <tr key={p.id} style={{background: editingId === p.id ? '#fffbeb' : 'transparent'}}>
                        <td>
                          {p.image_url ? <img src={p.image_url} alt="" className="product-thumb" /> : <div className="no-thumb"><ImageIcon size={16}/></div>}
                        </td>
                        <td>
                          <strong>{p.name}</strong><br/>
                          <small style={{color:'#64748b'}}>{p.brand}</small>
                        </td>
                        <td><span className={`badge ${p.stock < 5 ? 'badge-danger' : 'badge-success'}`}>{p.stock}</span></td>
                        <td><span className="badge badge-neutral">{totalSold}</span></td>
                        <td><strong>€{p.sell_price}</strong></td>
                        <td style={{color: '#10b981'}}>+€{profit.toFixed(2)}</td>
                        <td><span className={`badge ${margin > 30 ? 'badge-success-light' : 'badge-danger-light'}`}>{margin}%</span></td>
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => handleEditClick(p)} style={{border: 'none', background: 'none', cursor: 'pointer', color: '#64748b'}}>
                            <Pencil size={18} />
                          </button>
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

      {/* --- MODAL DA FATURA (ADICIONADO) --- */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '800px'}}>
            <div className="modal-header">
              <h3>📥 Adicionar Fatura (Stock)</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="close-modal"><X size={20}/></button>
            </div>

            <form onSubmit={handleSaveInvoice} className="modern-form">
              <div className="form-row" style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', display:'flex', gap:'15px'}}>
                <div className="input-group" style={{flex:1}}>
                  <label>Ref. Fatura</label>
                  <input 
                    className="modern-input" 
                    placeholder="Ex: FT 001"
                    value={invoiceData.reference}
                    onChange={e => setInvoiceData({...invoiceData, reference: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group" style={{flex:1}}>
                  <label>Fornecedor</label>
                  <input 
                    className="modern-input" 
                    placeholder="Nome do Fornecedor"
                    value={invoiceData.supplier}
                    onChange={e => setInvoiceData({...invoiceData, supplier: e.target.value})}
                  />
                </div>
              </div>

              <h4 style={{marginBottom: '10px', color: '#475569'}}>Itens</h4>
              <div style={{maxHeight: '300px', overflowY: 'auto', marginBottom: '15px'}}>
                <table style={{width: '100%', fontSize: '0.9rem'}}>
                  <thead>
                    <tr style={{background: '#f1f5f9', textAlign: 'left'}}>
                      <th style={{padding: '8px'}}>Produto</th>
                      <th style={{padding: '8px', width: '80px'}}>Qtd</th>
                      <th style={{padding: '8px', width: '100px'}}>Custo (€)</th>
                      <th style={{width: '40px'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, index) => (
                      <tr key={index} style={{borderBottom: '1px solid #e2e8f0'}}>
                        <td style={{padding: '5px'}}>
                          <select 
                            className="modern-input" 
                            style={{margin: 0, padding: '8px'}}
                            value={item.product_id}
                            onChange={e => updateInvoiceItem(index, 'product_id', e.target.value)}
                            required
                          >
                            <option value="">Selecione...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                            ))}
                          </select>
                        </td>
                        <td style={{padding: '5px'}}>
                          <input 
                            type="number" min="1" className="modern-input" style={{margin: 0, padding: '8px'}}
                            value={item.quantity} onChange={e => updateInvoiceItem(index, 'quantity', e.target.value)} required
                          />
                        </td>
                        <td style={{padding: '5px'}}>
                          <input 
                            type="number" step="0.01" className="modern-input" style={{margin: 0, padding: '8px'}}
                            value={item.cost_price} onChange={e => updateInvoiceItem(index, 'cost_price', e.target.value)}
                          />
                        </td>
                        <td style={{textAlign: 'center'}}>
                            <button type="button" onClick={() => removeInvoiceRow(index)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444'}}>
                                <Trash2 size={18} />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={addInvoiceRow} style={{background: '#f1f5f9', color: '#334155', border: '1px dashed #cbd5e1', padding: '8px', width: '100%', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                <Plus size={16} /> Adicionar Linha
              </button>

              <div style={{marginTop: '25px', borderTop: '1px solid #e2e8f0', paddingTop: '15px'}}>
                <button type="submit" className="save-btn" style={{width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display:'flex', gap:'8px', alignItems:'center'}}>
                    <Save size={20}/> Confirmar Fatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}