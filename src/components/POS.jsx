import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, UserPlus } from 'lucide-react';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para o Modal de Novo Cliente
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', location: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: pData } = await supabase.from('products').select('*').gt('stock', 0);
    const { data: cData } = await supabase.from('clients').select('*').order('name');
    setProducts(pData || []);
    setClients(cData || []);
  };

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

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClient.name) return alert("O nome é obrigatório.");

    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select();

    if (error) {
      alert("Erro ao criar cliente: " + error.message);
    } else {
      // Adiciona o novo cliente à lista local, seleciona-o e fecha o modal
      const createdClient = data[0];
      setClients([...clients, createdClient].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedClient(createdClient.id);
      setShowModal(false);
      setNewClient({ name: '', email: '', phone: '', location: '' });
    }
  };

  const getTotal = () => cart.reduce((acc, item) => acc + (item.sell_price * item.qty), 0);
  const getTotalProfit = () => cart.reduce((acc, item) => acc + ((item.sell_price - item.buy_price) * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedClient) return alert("Selecione produtos e um cliente.");

    const total = getTotal();
    const profit = getTotalProfit();

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{ client_id: selectedClient, total_amount: total, total_profit: profit }])
      .select();

    if (saleError) return alert("Erro ao criar venda");

    const saleId = saleData[0].id;

    for (const item of cart) {
      await supabase.from('sale_items').insert([{
        sale_id: saleId, product_id: item.id, quantity: item.qty, unit_price: item.sell_price, unit_profit: item.sell_price - item.buy_price
      }]);
      
      const currentProduct = products.find(p => p.id === item.id);
      await supabase.from('products').update({ stock: currentProduct.stock - item.qty }).eq('id', item.id);
    }

    alert("Venda realizada com sucesso!");
    setCart([]);
    window.location.reload(); 
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pos-container">
      {/* Área de Produtos */}
      <div className="products-panel">
        <div className="pos-header">
          <input 
            className="search-bar" 
            placeholder="🔍 Procurar produto..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        
        <div className="products-grid">
          {filteredProducts.map(p => (
            <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
              <div className="card-image-container">
                {p.image_url ? (
                   <img src={p.image_url} alt={p.name} />
                ) : (
                   <div className="no-image">Sem Foto</div>
                )}
                <div className="stock-badge">{p.stock} un</div>
              </div>
              <div className="card-info">
                <h4>{p.name}</h4>
                <p className="brand">{p.brand}</p>
                <div className="price">€ {p.sell_price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área do Carrinho */}
      <div className="cart-panel">
        <div className="client-section">
          <h3>Cliente</h3>
          <div className="client-controls">
            <select 
              onChange={e => setSelectedClient(e.target.value)} 
              value={selectedClient} 
              className="client-select"
            >
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              className="add-client-btn" 
              onClick={() => setShowModal(true)}
              title="Novo Cliente"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </div>
        
        <div className="cart-items-container">
          {cart.length === 0 ? (
            <div className="empty-cart">Carrinho vazio</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <strong>{item.name}</strong>
                  <small>x{item.qty} un</small>
                </div>
                <div className="item-total">
                  <span>€ {(item.sell_price * item.qty).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="remove-btn"><X size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="totals">
            <div className="total-row">
              <span>Total</span>
              <span className="amount">€ {getTotal().toFixed(2)}</span>
            </div>
          </div>
          <button className="checkout-btn" onClick={handleCheckout}>
            Finalizar Venda
          </button>
        </div>
      </div>

      {/* Modal de Novo Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Novo Cliente</h3>
              <button onClick={() => setShowModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateClient}>
              <input 
                placeholder="Nome Completo" 
                value={newClient.name} 
                onChange={e => setNewClient({...newClient, name: e.target.value})} 
                required 
              />
              <input 
                placeholder="Email" 
                type="email"
                value={newClient.email} 
                onChange={e => setNewClient({...newClient, email: e.target.value})} 
              />
              <input 
                placeholder="Telefone" 
                value={newClient.phone} 
                onChange={e => setNewClient({...newClient, phone: e.target.value})} 
              />
              <input 
                placeholder="Localidade" 
                value={newClient.location} 
                onChange={e => setNewClient({...newClient, location: e.target.value})} 
              />
              <button type="submit" className="save-btn">Criar Cliente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}