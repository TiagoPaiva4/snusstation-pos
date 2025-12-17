import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, UserPlus, Calendar, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Nova função para atualizar quantidade (+ ou -)
  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        
        // Impede quantidade menor que 1 (usa o botão de remover para isso)
        if (newQty < 1) return item;

        // Verifica stock se estiver a aumentar
        if (delta > 0 && newQty > item.stock) {
          alert("Limite de stock atingido!");
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClient.name) return alert("O nome é obrigatório.");

    const { data, error } = await supabase.from('clients').insert([newClient]).select();

    if (error) {
      alert("Erro ao criar cliente: " + error.message);
    } else {
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
      .insert([{ 
        client_id: selectedClient, 
        total_amount: total, 
        total_profit: profit,
        created_at: saleDate 
      }])
      .select();

    if (saleError) return alert("Erro ao criar venda: " + saleError.message);

    const saleId = saleData[0].id;

    for (const item of cart) {
      await supabase.from('sale_items').insert([{
        sale_id: saleId, product_id: item.id, quantity: item.qty, unit_price: item.sell_price, unit_profit: item.sell_price - item.buy_price
      }]);
      const currentProduct = products.find(p => p.id === item.id);
      await supabase.from('products').update({ stock: currentProduct.stock - item.qty }).eq('id', item.id);
    }

    alert("Venda registada com sucesso!");
    setCart([]);
    window.location.reload(); 
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pos-container">
      {/* Painel de Produtos */}
      <div className="products-panel">
        <div className="pos-header">
          <input className="search-bar" placeholder="🔍 Procurar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="products-grid">
          {filteredProducts.map(p => (
            <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
              <div className="card-image-container">
                {p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="no-image">Sem Foto</div>}
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

      {/* Painel do Carrinho (Renovado) */}
      <div className="cart-panel">
        <div className="cart-header-main">
          <h3><ShoppingCart size={20}/> Carrinho ({cart.length})</h3>
          <div className="date-picker-wrapper">
             <Calendar size={16} className="calendar-icon"/>
             <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
          </div>
        </div>

        <div className="client-selector-area">
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="client-select-main">
            <option value="">Selecione o Cliente...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-icon-only" onClick={() => setShowModal(true)} title="Novo Cliente">
            <UserPlus size={20} />
          </button>
        </div>
        
        <div className="cart-items-list">
          {cart.length === 0 ? (
            <div className="empty-cart-state">
              <ShoppingCart size={48} opacity={0.2} />
              <p>O carrinho está vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item-modern">
                <div className="cart-item-image">
                  {item.image_url ? <img src={item.image_url} alt="" /> : <div className="no-img-placeholder">img</div>}
                </div>
                
                <div className="cart-item-details">
                  <div className="item-name">{item.name}</div>
                  <div className="item-price-unit">€ {item.sell_price} / un</div>
                </div>

                <div className="cart-item-controls">
                  <div className="qty-selector">
                    <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={14}/></button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn"><Plus size={14}/></button>
                  </div>
                  <div className="item-total-price">
                    € {(item.sell_price * item.qty).toFixed(2)}
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="delete-btn">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer-modern">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>€ {getTotal().toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total a Pagar</span>
            <span>€ {getTotal().toFixed(2)}</span>
          </div>
          <button className="checkout-btn-modern" onClick={handleCheckout}>
            Confirmar Venda
          </button>
        </div>
      </div>

      {/* Modal Novo Cliente (Mantido igual) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Novo Cliente</h3>
              <button onClick={() => setShowModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateClient}>
              <input placeholder="Nome" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required />
              <input placeholder="Email" type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
              <input placeholder="Telefone" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
              <input placeholder="Localidade" value={newClient.location} onChange={e => setNewClient({...newClient, location: e.target.value})} />
              <button type="submit" className="save-btn">Criar Cliente</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}