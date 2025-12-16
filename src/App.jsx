import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Clients from './components/Clients';
import POS from './components/POS';
import './App.css';
import { LayoutDashboard, ShoppingCart, Users, Package, LogOut } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);

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
          <div className="logo">SnusStation POS</div>
          <nav>
            <Link to="/" className="nav-item"><LayoutDashboard size={20}/> Dashboard</Link>
            <Link to="/pos" className="nav-item"><ShoppingCart size={20}/> Vendas (POS)</Link>
            <Link to="/products" className="nav-item"><Package size={20}/> Produtos</Link>
            <Link to="/clients" className="nav-item"><Users size={20}/> Clientes</Link>
          </nav>
          <button onClick={handleLogout} className="logout-btn"><LogOut size={20}/> Sair</button>
        </aside>
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
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