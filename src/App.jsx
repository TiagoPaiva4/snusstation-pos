import React, { useState, useEffect } from 'react';
// Em vez de BrowserRouter as Router, usa HashRouter
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Clients from './components/Clients';
import POS from './components/POS';
import SalesHistory from './components/SalesHistory';
import Analytics from './components/Analytics';
import './App.css';
import B2B from './components/B2B';
import { LayoutDashboard, ShoppingCart, Users, Package, LogOut, Menu, X, History, BarChart2, Briefcase } from 'lucide-react'; // Adiciona Briefcase

// --- IMPORTA O LOGO AQUI ---
import logoImg from './assets/logo-navbar.png'; // <--- Confirma se o nome do ficheiro está igual!

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header-mobile">
            
            {/* --- SUBSTITUIÇÃO DO TEXTO PELA IMAGEM --- */}
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
              <NavItem to="/products" icon={Package} label="Produtos" onClick={() => setMobileMenuOpen(false)} />
              <NavItem to="/clients" icon={Users} label="Clientes" onClick={() => setMobileMenuOpen(false)} />
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
            <Route path="/products" element={<Products />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/b2b" element={<B2B />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;