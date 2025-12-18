import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';

// --- IMPORTA O LOGO AQUI ---
// (Certifica-te que o nome do ficheiro corresponde ao que tens na pasta assets)
import logoImg from '../assets/logo-login.png'; 
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setError('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          {/* --- LOGO ADICIONADO AQUI --- */}
          <img src={logoImg} alt="SnusStation" className="login-logo" />
          
          <h1>Bem-vindo</h1>
          <p>Aceda à sua conta SnusStation</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group-login">
            <Mail className="input-icon-login" size={20} />
            <input 
              type="email" 
              placeholder="Email de acesso" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group-login">
            <Lock className="input-icon-login" size={20} />
            <input 
              type="password" 
              placeholder="Palavra-passe" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <><Loader2 className="spin" size={20} /> A entrar...</>
            ) : (
              <><LogIn size={20} /> Entrar no Sistema</>
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} SnusStation POS</p>
        </div>
      </div>
    </div>
  );
}