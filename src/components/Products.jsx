import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, X, Image as ImageIcon, Package, DollarSign, Tag, Pencil, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

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

  return (
    <div className="page">
      <div className="dashboard-header" style={{flexDirection: 'row', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Gestão de Produtos</h2>
        
        {!showForm && (
          <button onClick={handleNewProduct} className="submit-btn-modern" style={{width: 'auto', display:'flex', gap:'5px', alignItems:'center'}}>
            <Plus size={18} /> Novo Produto
          </button>
        )}
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
    </div>
  );
}