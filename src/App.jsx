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
import Expenses from './components/Expenses';
import SetPassword from './components/SetPassword';
import './App.css';
import { LayoutDashboard, ShoppingCart, Users, Package, LogOut, Menu, X, History, BarChart2, Briefcase, Loader2, Wallet } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- PASSO CRÍTICO: DETETAR O LINK DO EMAIL IMEDIATAMENTE ---
    const hash = window.location.hash;
    
    // Verifica se é um link de convite (invite) ou recuperação (recovery)
    // O Supabase envia algo como: #access_token=...&refresh_token=...&type=invite
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      console.log("Modo de recuperação/convite detetado via URL");
      setRecoveryMode(true);
      // Não paramos o loading aqui, deixamos o supabase processar a sessão em baixo
    }

    // 1. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      // Se tivermos sessão E estivermos em recovery mode, paramos o loading
      // Se NÃO tivermos sessão, mas for recovery mode, esperamos que o onAuthStateChange trate disso
      if (!hash.includes('type=invite')) {
         setLoading(false);
      }
    });

    // 2. Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Evento Auth:", event);
      setSession(session);

      // O evento PASSWORD_RECOVERY é disparado quando o utilizador clica no link do email
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        // Verificação dupla: se acabámos de entrar e o URL dizia que era convite
        const currentHash = window.location.hash;
        if (currentHash.includes('type=invite') || currentHash.includes('type=recovery') || event === 'PASSWORD_RECOVERY') {
           setRecoveryMode(true);
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRecoveryMode(false);
    setMobileMenuOpen(false);
    setSession(null);
  };

  // --- RENDERIZAÇÃO ---

  // 1. Se detetámos que é um convite, mostramos o SetPassword IMEDIATAMENTE
  // (Ignorando se a sessão ainda está a carregar ou se parece nula momentaneamente)
  if (recoveryMode) {
    return <SetPassword />;
  }

  // 2. Loading normal da aplicação
  if (loading) {
    return (
      <div style={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9'}}>
        <Loader2 className="spin" size={40} color="#2563eb"/>
      </div>
    );
  }

  // 3. Se não tem sessão e não é recuperação -> Login
  if (!session) {
    return <Login />;
  }

  // 4. Aplicação Normal (Dashboard, etc)
  return (
    <Router>
      <div className="app-container">
        
        <aside className="sidebar">
          <div className="sidebar-header-mobile">
            <div className="logo">
              <img src={logoImg} alt="SnusStation" />
            </div>
            <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
          
          <div className={`sidebar-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <nav>
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/products" icon={Package} label="Produtos" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/pos" icon={ShoppingCart} label="Vendas" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/sales" icon={History} label="Histórico" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/clients" icon={Users} label="Clientes" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/analysis" icon={BarChart2} label="Análise" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/expenses" icon={Wallet} label="Despesas" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/b2b" icon={Briefcase} label="B2B" onClick={() => setMobileMenuOpen(false)} />
            </nav>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={20}/> Sair
            </button>
          </div>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analysis" element={<Analytics />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/b2b" element={<B2B />} />
            <Route path="/products" element={<Products />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;