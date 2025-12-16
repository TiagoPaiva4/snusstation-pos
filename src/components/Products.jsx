import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, X, Image as ImageIcon, Package, DollarSign, Tag, Pencil } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  // Adicionei o ID ao form para controlar a edição
  const [editingId, setEditingId] = useState(null); 
  const [form, setForm] = useState({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, sale_items(quantity)') 
      .order('name');
    
    if (error) {
      console.error("Erro ao buscar produtos:", error);
    } else {
      setProducts(data || []);
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

  // Função para preparar o formulário para edição
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
    setImage(null); // Resetar o ficheiro novo, pois já temos o URL antigo
    
    // Scroll suave até ao topo para ver o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancelar edição e limpar form
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    let imageUrl = imagePreview; // Por defeito, mantém a imagem atual (ou null)

    // 1. Se houver um NOVO ficheiro de imagem, fazer upload
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

    // 2. Decidir se é UPDATE ou INSERT
    if (editingId) {
      // Atualizar existente
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingId);
      error = updateError;
    } else {
      // Criar novo
      const { error: insertError } = await supabase
        .from('products')
        .insert([productData]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar produto: ' + error.message);
    } else {
      handleCancelEdit(); // Limpa tudo
      fetchProducts();    // Recarrega a lista
    }
    setUploading(false);
  };

  const calculateTotalSold = (saleItems) => {
    if (!saleItems || saleItems.length === 0) return 0;
    return saleItems.reduce((acc, item) => acc + item.quantity, 0);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <h2>Gestão de Produtos</h2>
      
      <div className="management-grid">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="modern-form">
            <div className="form-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <h3>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
                <p>{editingId ? 'Altere os dados abaixo' : 'Preencha os detalhes do item'}</p>
              </div>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="badge badge-danger" style={{border: 'none', cursor: 'pointer'}}>
                  Cancelar Edição
                </button>
              )}
            </div>
            
            <div className="image-upload-wrapper">
              <label className={`image-upload-box ${imagePreview ? 'has-image' : ''}`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  hidden 
                />
                
                {imagePreview ? (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" />
                    <button onClick={removeImage} className="remove-image-btn" title="Remover imagem">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="icon-circle">
                      <Upload size={24} />
                    </div>
                    <span>Carregar Foto</span>
                    <small>PNG, JPG até 5MB</small>
                  </div>
                )}
              </label>
            </div>

            <div className="input-group">
              <label>Nome do Produto</label>
              <div className="input-wrapper">
                <Tag size={18} className="input-icon" />
                <input 
              
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div className="input-group">
                <label>Marca</label>
                <input 
               
                  value={form.brand} 
                  onChange={e => setForm({...form, brand: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label>Stock Atual</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={form.stock} 
                    onChange={e => setForm({...form, stock: e.target.value})} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="form-row-grid">
              <div className="input-group">
                <label>Preço Compra (€)</label>
                <div className="input-wrapper">
                  <DollarSign size={18} className="input-icon" />
                  <input 
                    type="number" 
                    step="0.01"
                  
                    value={form.buy_price} 
                    onChange={e => setForm({...form, buy_price: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Preço Venda (€)</label>
                <div className="input-wrapper">
                  <DollarSign size={18} className="input-icon" />
                  <input 
                    type="number" 
                    step="0.01"
                    
                    value={form.sell_price} 
                    onChange={e => setForm({...form, sell_price: e.target.value})} 
                    required 
                  />
                </div>
              </div>
            </div>
            
            <button type="submit" disabled={uploading} className="submit-btn-modern" style={{background: editingId ? '#f59e0b' : 'var(--dark)'}}>
              {uploading ? 'A guardar...' : (editingId ? 'Atualizar Produto' : 'Adicionar ao Catálogo')}
            </button>
          </form>
        </div>

        <div className="list-container">
          <div className="list-header">
            <input className="search-bar" placeholder="🔍 Pesquisar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Img</th>
                  <th>Nome</th>
                  <th>Marca</th>
                  <th>Stock</th>
                  <th>Vendidos</th>
                  <th>Compra</th>
                  <th>Venda</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                  <th>Ações</th> {/* Nova coluna */}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const totalSold = calculateTotalSold(p.sale_items);
                  const profit = p.sell_price - p.buy_price;
                  const margin = p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(0) : 0;

                  return (
                    <tr key={p.id} style={{background: editingId === p.id ? '#fffbeb' : 'transparent'}}>
                      <td>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="product-thumb" />
                        ) : (
                          <div className="no-thumb"><ImageIcon size={16}/></div>
                        )}
                      </td>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.brand}</td>
                      <td><span className={`badge ${p.stock < 5 ? 'badge-danger' : 'badge-success'}`}>{p.stock}</span></td>
                      <td><span className="badge badge-neutral">{totalSold}</span></td>
                      <td className="text-muted">€{p.buy_price}</td>
                      <td><strong>€{p.sell_price}</strong></td>
                      <td style={{color: '#10b981'}}>+€{profit.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${margin > 30 ? 'badge-success-light' : 'badge-danger-light'}`}>
                          {margin}%
                        </span>
                      </td>
                      {/* Botão de Editar */}
                      <td>
                        <button 
                          onClick={() => handleEditClick(p)}
                          style={{
                            border: 'none', 
                            background: 'none', 
                            cursor: 'pointer', 
                            color: '#64748b',
                            padding: '5px'
                          }}
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}