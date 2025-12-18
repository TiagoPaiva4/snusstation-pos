import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Plus, Minus, Trash2, UserPlus, ShoppingCart, X } from 'lucide-react';
import '../styles/POS.css';

export default function POS() {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Estado para o Modal de Novo Cliente
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', location: '' });

  const searchRef = useRef(null);

  // --- EFEITOS ---
  useEffect(() => {
    fetchData();
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    const { data: pData } = await supabase.from('products').select('*').gt('stock', 0);
    const { data: cData } = await supabase.from('clients').select('*').order('name');
    setProducts(pData || []);
    setClients(cData || []);
  };

  // --- LÓGICA DO CARRINHO ---
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
    setSearchTerm('');
    setShowResults(false);
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty < 1) return item;
        if (delta > 0 && newQty > item.stock) {
          alert("Limite de stock atingido!");
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  // --- CÁLCULOS ---
  const getTotal = () => cart.reduce((acc, item) => acc + (item.sell_price * item.qty), 0);
  const getTotalProfit = () => cart.reduce((acc, item) => acc + ((item.sell_price - item.buy_price) * item.qty), 0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- AÇÕES DE BASE DE DADOS ---

  // Criar Novo Cliente
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

  // Finalizar Venda (Checkout)
  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedClient) return alert("Selecione produtos e um cliente.");

    const total = getTotal();
    const profit = getTotalProfit();

    // 1. Inserir a Venda
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

    // 2. Inserir Itens e Atualizar Stock
    for (const item of cart) {
      await supabase.from('sale_items').insert([{
        sale_id: saleId, 
        product_id: item.id, 
        quantity: item.qty, 
        unit_price: item.sell_price, 
        unit_profit: item.sell_price - item.buy_price
      }]);

      const currentProduct = products.find(p => p.id === item.id);
      await supabase.from('products').update({ stock: currentProduct.stock - item.qty }).eq('id', item.id);
    }

    alert("Venda registada com sucesso!");
    setCart([]);
    window.location.reload(); 
  };

  return (
    <div className="pos-wrapper">
      
      {/* SELETOR DE CLIENTE (Grid Area: client) */}
      <div className="pos-area-client">
        <div className="sidebar-card client-card">
          <label>Cliente da Venda</label>
          <div className="client-input-group">
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="add-client-btn" onClick={() => setShowModal(true)}>
              <UserPlus size={18}/>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE PESQUISA E CARRINHO (Grid Area: main) */}
      <div className="pos-area-main">
        <div className="search-container" ref={searchRef}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar produto..." 
              value={searchTerm}
              onFocus={() => setShowResults(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {showResults && searchTerm.length > 0 && (
            <div className="results-dropdown">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => (
                  <div key={p.id} className="result-item" onClick={() => addToCart(p)}>
                    <div className="result-main-info">
                      <div className="product-img-tiny">
                        {p.image_url ? <img src={p.image_url} alt="" /> : <div className="no-img-placeholder"></div>}
                      </div>
                      <div className="result-info">
                        <span className="result-name">{p.name}</span>
                        <span className="result-stock">Stock: {p.stock} un</span>
                      </div>
                    </div>
                    <span className="result-price">€{p.sell_price.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="no-results">Nenhum produto encontrado</div>
              )}
            </div>
          )}
        </div>

        <div className="cart-section">
          <div className="section-header">
            <h2><ShoppingCart size={20} /> Carrinho</h2>
            <span className="item-count">{cart.length} itens</span>
          </div>
          
          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-state">O carrinho está vazio</div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-card">
                  <div className="cart-card-main">
                    <div className="product-img-small">
                      {item.image_url ? <img src={item.image_url} alt="" /> : <div className="no-img-placeholder"></div>}
                    </div>
                    <div className="cart-card-info">
                      <span className="product-name">{item.name}</span>
                      <span className="product-unit-price">€{item.sell_price.toFixed(2)} / un</span>
                    </div>
                  </div>
                  <div className="cart-card-controls">
                    <div className="qty-picker">
                      <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button>
                    </div>
                    <span className="item-total">€{(item.sell_price * item.qty).toFixed(2)}</span>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DE RESUMO (Grid Area: summary) */}
      <div className="pos-area-summary">
        <div className="sidebar-card summary-card">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>€{getTotal().toFixed(2)}</span>
          </div>
          <div className="summary-row profit">
            <span>Lucro da Venda</span>
            <span>€{getTotalProfit().toFixed(2)}</span>
          </div>
          <div className="summary-total">
            <label>Total a Pagar</label>
            <div className="total-amount">€{getTotal().toFixed(2)}</div>
          </div>
          <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>
            Confirmar Venda
          </button>
        </div>
      </div>

      {/* MODAL NOVO CLIENTE */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Novo Cliente</h3>
              <button onClick={() => setShowModal(false)} className="close-modal"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateClient} className="modern-form">
              <input placeholder="Nome" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required />
              <input placeholder="Email" type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
              <input placeholder="Telefone" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
              <input placeholder="Localidade" value={newClient.location} onChange={e => setNewClient({...newClient, location: e.target.value})} />
              <button type="submit" className="save-btn">Criar e Selecionar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}