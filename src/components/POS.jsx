import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: pData } = await supabase.from('products').select('*').gt('stock', 0);
      const { data: cData } = await supabase.from('clients').select('*');
      setProducts(pData || []);
      setClients(cData || []);
    };
    fetchData();
  }, []);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty < product.stock) {
        setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      } else {
        alert("Stock insuficiente!");
      }
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getTotal = () => cart.reduce((acc, item) => acc + (item.sell_price * item.qty), 0);
  const getTotalProfit = () => cart.reduce((acc, item) => acc + ((item.sell_price - item.buy_price) * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedClient) return alert("Selecione produtos e um cliente.");

    const total = getTotal();
    const profit = getTotalProfit();

    // 1. Criar Venda
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{ client_id: selectedClient, total_amount: total, total_profit: profit }])
      .select();

    if (saleError) return alert("Erro ao criar venda");

    const saleId = saleData[0].id;

    // 2. Criar Itens e Atualizar Stock
    for (const item of cart) {
      await supabase.from('sale_items').insert([{
        sale_id: saleId, product_id: item.id, quantity: item.qty, unit_price: item.sell_price, unit_profit: item.sell_price - item.buy_price
      }]);
      
      // Atualizar stock (Idealmente usar RPC, aqui simplificado)
      const currentProduct = products.find(p => p.id === item.id);
      await supabase.from('products').update({ stock: currentProduct.stock - item.qty }).eq('id', item.id);
    }

    alert("Venda realizada com sucesso!");
    setCart([]);
    window.location.reload(); // Recarregar para atualizar stocks
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pos-container">
      <div className="products-panel">
        <input className="search-bar" placeholder="Procurar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <div className="products-grid">
          {filteredProducts.map(p => (
            <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
              <h4>{p.name}</h4>
              <p>{p.brand}</p>
              <div className="price">€ {p.sell_price}</div>
              <small>Stock: {p.stock}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="cart-panel">
        <h3>Carrinho Atual</h3>
        <select onChange={e => setSelectedClient(e.target.value)} value={selectedClient} className="client-select">
          <option value="">Selecione o Cliente</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <div className="cart-items">
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <span>{item.name} (x{item.qty})</span>
              <span>€ {(item.sell_price * item.qty).toFixed(2)}</span>
              <button onClick={() => removeFromCart(item.id)} className="remove-btn">X</button>
            </div>
          ))}
        </div>

        <div className="cart-total">
          <h3>Total: € {getTotal().toFixed(2)}</h3>
          <p className="profit-preview">Lucro previsto: € {getTotalProfit().toFixed(2)}</p>
          <button className="checkout-btn" onClick={handleCheckout}>Finalizar Venda</button>
        </div>
      </div>
    </div>
  );
}