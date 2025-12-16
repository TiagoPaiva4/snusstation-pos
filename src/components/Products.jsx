import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    // Agora buscamos também os sale_items para contar as vendas
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    let imageUrl = null;

    // 1. Upload da Imagem
    if (image) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, image);

      if (uploadError) {
        console.error("Erro upload:", uploadError);
        alert('Erro no upload da imagem!');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      
      imageUrl = publicUrl;
    }

    // 2. Salvar Produto
    const productData = { ...form, image_url: imageUrl };
    const { error } = await supabase.from('products').insert([productData]);

    if (error) {
      alert('Erro ao criar produto: ' + error.message);
    } else {
      setForm({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
      setImage(null);
      document.getElementById('fileInput').value = "";
      fetchProducts();
    }
    setUploading(false);
  };

  // Função auxiliar para calcular total vendido
  const calculateTotalSold = (saleItems) => {
    if (!saleItems || saleItems.length === 0) return 0;
    return saleItems.reduce((acc, item) => acc + item.quantity, 0);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <h2>Gestão de Produtos</h2>
      
      <div className="management-grid">
        <form onSubmit={handleSubmit} className="entry-form">
          <h3>Novo Produto</h3>
          
          <div className="image-upload-section" style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Imagem</label>
            <input 
              id="fileInput"
              type="file" 
              accept="image/*" 
              onChange={e => setImage(e.target.files[0])} 
            />
          </div>

          <input placeholder="Nome" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input placeholder="Marca" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
          <div className="row">
            <input type="number" placeholder="Preço Compra" value={form.buy_price} onChange={e => setForm({...form, buy_price: e.target.value})} required />
            <input type="number" placeholder="Preço Venda" value={form.sell_price} onChange={e => setForm({...form, sell_price: e.target.value})} required />
          </div>
          <input type="number" placeholder="Stock Inicial" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          
          <button type="submit" disabled={uploading}>
            {uploading ? 'A enviar...' : 'Adicionar Produto'}
          </button>
        </form>

        <div className="list-view">
          <input className="search-bar" placeholder="Pesquisar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          <table>
            <thead>
              <tr>
                <th>Img</th>
                <th>Nome</th>
                <th>Marca</th>
                <th>Stock</th>
                <th>Vendidos</th> {/* Nova Coluna */}
                <th>Compra</th>
                <th>Venda</th>
                <th>Lucro</th>
                <th>Margem</th> {/* Nova Coluna */}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const totalSold = calculateTotalSold(p.sale_items);
                const profit = p.sell_price - p.buy_price;
                const margin = p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(0) : 0;

                return (
                  <tr key={p.id}>
                    <td>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px'}} />
                      ) : (
                        <span style={{fontSize: '0.8rem', color: '#ccc'}}>—</span>
                      )}
                    </td>
                    <td>{p.name}</td>
                    <td>{p.brand}</td>
                    <td style={{fontWeight: 'bold', color: p.stock < 5 ? 'red' : 'green'}}>{p.stock}</td>
                    {/* Exibe o total vendido */}
                    <td style={{fontWeight: 'bold', color: '#2563eb'}}>{totalSold}</td>
                    <td>€{p.buy_price}</td>
                    <td>€{p.sell_price}</td>
                    <td>€{profit.toFixed(2)}</td>
                    {/* Exibe a margem em % */}
                    <td>
                      <span style={{
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        background: margin > 30 ? '#dcfce7' : '#fee2e2',
                        color: margin > 30 ? '#166534' : '#991b1b',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>
                        {margin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}