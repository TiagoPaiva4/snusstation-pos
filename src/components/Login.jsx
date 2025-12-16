import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h1>SnusStation</h1>
        <p>Acesso Restrito a Sócios</p>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}