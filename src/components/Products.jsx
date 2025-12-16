import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from('products').insert([form]);
    setForm({ name: '', brand: '', buy_price: '', sell_price: '', stock: '' });
    fetchProducts();
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <h2>Gestão de Produtos</h2>
      
      <div className="management-grid">
        <form onSubmit={handleSubmit} className="entry-form">
          <h3>Novo Produto</h3>
          <input placeholder="Nome" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input placeholder="Marca" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
          <div className="row">
            <input type="number" placeholder="Preço Compra" value={form.buy_price} onChange={e => setForm({...form, buy_price: e.target.value})} required />
            <input type="number" placeholder="Preço Venda" value={form.sell_price} onChange={e => setForm({...form, sell_price: e.target.value})} required />
          </div>
          <input type="number" placeholder="Stock Inicial" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          <button type="submit">Adicionar Produto</button>
        </form>

        <div className="list-view">
          <input className="search-bar" placeholder="Pesquisar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          <table>
            <thead><tr><th>Nome</th><th>Marca</th><th>Stock</th><th>Compra</th><th>Venda</th><th>Lucro Un.</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.brand}</td>
                  <td style={{fontWeight: 'bold', color: p.stock < 5 ? 'red' : 'green'}}>{p.stock}</td>
                  <td>€{p.buy_price}</td>
                  <td>€{p.sell_price}</td>
                  <td>€{(p.sell_price - p.buy_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}