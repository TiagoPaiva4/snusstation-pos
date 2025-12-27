import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Plus, Minus, Trash2, UserPlus, ShoppingCart, X, Gift, Globe, Store } from 'lucide-react';
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
  
  // NOVO ESTADO: Canal de Venda (Fisica ou Shopify)
  const [saleChannel, setSaleChannel] = useState('Fisica');
   
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
      setCart([...cart, { ...product, qty: 1, is_offer: false }]);
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

  const toggleOffer = (id) => {
    setCart(cart.map(item => 
      item.id === id ? { ...item, is_offer: !item.is_offer } : item
    ));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  // --- CÁLCULOS ---
  const getTotal = () => {
    return cart.reduce((acc, item) => {
      const price = item.is_offer ? 0 : item.sell_price;
      return acc + (price * item.qty);
    }, 0);
  };

  const getTotalProfit = () => {
    return cart.reduce((acc, item) => {
      const revenue = item.is_offer ? 0 : item.sell_price;
      return acc + ((revenue - item.buy_price) * item.qty);
    }, 0);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- AÇÕES DE BASE DE DADOS ---
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

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedClient) return alert("Selecione produtos e um cliente.");

    const { data: { user } } = await supabase.auth.getUser();
    let sellerName = 'Desconhecido';
    if (user) {
       sellerName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
    }

    const total = getTotal();
    const profit = getTotalProfit();

    // 1. Inserir a Venda (Incluindo o sale_channel)
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{ 
        client_id: selectedClient, 
        total_amount: total, 
        total_profit: profit,
        created_at: saleDate,
        user_id: user?.id,
        seller_name: sellerName,
        sale_channel: saleChannel // <--- NOVO CAMPO
      }])
      .select();

    if (saleError) return alert("Erro ao criar venda: " + saleError.message);

    const saleId = saleData[0].id;

    // 2. Inserir Itens
    for (const item of cart) {
      const finalPrice = item.is_offer ? 0 : item.sell_price;
      const finalProfit = finalPrice - item.buy_price;

      await supabase.from('sale_items').insert([{
        sale_id: saleId, 
        product_id: item.id, 
        quantity: item.qty, 
        unit_price: finalPrice, 
        unit_profit: finalProfit
      }]);

      const currentProduct = products.find(p => p.id === item.id);
      await supabase.from('products').update({ stock: currentProduct.stock - item.qty }).eq('id', item.id);
    }

    alert(`Venda (${saleChannel}) registada com sucesso!`);
    setCart([]);
    setSaleChannel('Fisica'); // Reset para Fisica por defeito
    window.location.reload(); 
  };

  return (
    <div className="pos-wrapper">
       
      {/* SELETOR DE CLIENTE */}
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

      {/* ÁREA DE PESQUISA */}
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

        {/* CARRINHO */}
        <div className="cart-section">
          <div className="section-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <h2><ShoppingCart size={20} /> Carrinho</h2>
              <span className="item-count">{cart.length} itens</span>
            </div>

            {/* --- SELETOR DE CANAL (FISICA vs SHOPIFY) --- */}
            <div style={{background:'#f1f5f9', padding:'3px', borderRadius:'8px', display:'flex', gap:'5px'}}>
              <button 
                onClick={() => setSaleChannel('Fisica')}
                style={{
                  border:'none', 
                  background: saleChannel === 'Fisica' ? 'white' : 'transparent',
                  color: saleChannel === 'Fisica' ? '#0f172a' : '#64748b',
                  padding: '5px 10px', borderRadius:'6px', cursor:'pointer', fontWeight:600,
                  boxShadow: saleChannel === 'Fisica' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem'
                }}
              >
                <Store size={14}/> Física
              </button>
              <button 
                onClick={() => setSaleChannel('Shopify')}
                style={{
                  border:'none', 
                  background: saleChannel === 'Shopify' ? '#9333ea' : 'transparent', // Roxo para Shopify
                  color: saleChannel === 'Shopify' ? 'white' : '#64748b',
                  padding: '5px 10px', borderRadius:'6px', cursor:'pointer', fontWeight:600,
                  boxShadow: saleChannel === 'Shopify' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem'
                }}
              >
                <Globe size={14}/> Shopify
              </button>
            </div>
            {/* ------------------------------------------- */}

          </div>
           
          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-state">O carrinho está vazio</div>
            ) : (
              cart.map(item => (
                <div key={item.id} className={`cart-card ${item.is_offer ? 'is-offer-card' : ''}`}>
                  <div className="cart-card-main">
                    <div className="product-img-small">
                      {item.image_url ? <img src={item.image_url} alt="" /> : <div className="no-img-placeholder"></div>}
                    </div>
                    <div className="cart-card-info">
                      <span className="product-name">
                        {item.name} 
                        {item.is_offer && <span style={{marginLeft: '8px', fontSize:'0.7rem', background:'#dcfce7', color:'#166534', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>OFERTA 🎁</span>}
                      </span>
                      
                      <span className="product-unit-price">
                        {item.is_offer ? (
                          <>
                            <span style={{textDecoration: 'line-through', color:'#94a3b8', marginRight:'5px'}}>€{item.sell_price.toFixed(2)}</span>
                            <span style={{color:'#166534', fontWeight:'bold'}}>€0.00</span>
                          </>
                        ) : (
                          `€${item.sell_price.toFixed(2)} / un`
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="cart-card-controls">
                    <div className="qty-picker">
                      <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button>
                    </div>

                    <span className="item-total">
                      €{(item.is_offer ? 0 : item.sell_price * item.qty).toFixed(2)}
                    </span>

                    <button 
                      className="action-btn offer-btn" 
                      onClick={() => toggleOffer(item.id)}
                      title={item.is_offer ? "Remover Oferta" : "Marcar como Oferta"}
                      style={{ color: item.is_offer ? '#166534' : '#94a3b8', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      <Gift size={18} fill={item.is_offer ? "#dcfce7" : "none"} />
                    </button>

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

      {/* ÁREA DE RESUMO */}
      <div className="pos-area-summary">
        <div className="sidebar-card summary-card">
          <div className="summary-row">
            <span>Canal</span>
            <span style={{
              fontWeight: 'bold', 
              color: saleChannel === 'Shopify' ? '#9333ea' : '#0f172a'
            }}>
              {saleChannel === 'Shopify' ? '🌐 Shopify' : '🏢 Loja Física'}
            </span>
          </div>
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