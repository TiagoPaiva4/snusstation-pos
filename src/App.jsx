import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Clients from './components/Clients';
import POS from './components/POS';
import SalesHistory from './components/SalesHistory';
import Analytics from './components/Analytics';
import B2B from './components/B2B';
import SetPassword from './components/SetPassword';
import './App.css';
import { LayoutDashboard, ShoppingCart, Users, Package, LogOut, Menu, X, History, BarChart2, Briefcase, Loader2 } from 'lucide-react';
import logoImg from './assets/logo-navbar.png';

const NavItem = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <Icon size={20} /> {label}
    </Link>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(true); // Novo estado de carregamento

  useEffect(() => {
    // 1. Verificar se é um link de Convite ou Recuperação logo ao iniciar
    // Isto impede que o site mostre o Login erradamente
    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      setRecoveryMode(true);
    }

    // 2. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 3. Escutar mudanças (Login, Logout, Links de Email)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRecoveryMode(false);
    setMobileMenuOpen(false);
  };

  // --- RENDERIZAÇÃO ---

  // 1. Mostrar Loading enquanto verifica a sessão (Evita piscar o login)
  if (loading) {
    return (
      <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9'}}>
        <Loader2 className="spin" size={40} color="#2563eb"/>
      </div>
    );
  }

  // 2. Se for link de convite/recuperação, mostra definir password
  if (recoveryMode) {
    return <SetPassword />;
  }

  // 3. Se não tiver sessão, mostra Login
  if (!session) {
    return <Login />;
  }

  // 4. Se tiver sessão, mostra a App
  return (
    <Router>
      <div className="app-container">
        
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header-mobile">
            <div className="logo">
              <img src={logoImg} alt="SnusStation" />
            </div>

            <button 
              className="mobile-menu-toggle" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
          
          <div className={`sidebar-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <nav>
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/analysis" icon={BarChart2} label="Análise" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/pos" icon={ShoppingCart} label="Vendas (POS)" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/sales" icon={History} label="Histórico" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/b2b" icon={Briefcase} label="B2B (Excel)" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/products" icon={Package} label="Produtos" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/clients" icon={Users} label="Clientes" onClick={() => setMobileMenuOpen(false)} />
            </nav>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={20}/> Sair
            </button>
          </div>
        </aside>

        {/* CONTEÚDO */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analysis" element={<Analytics />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/b2b" element={<B2B />} />
            <Route path="/products" element={<Products />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;