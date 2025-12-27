import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Save, AlertCircle } from 'lucide-react';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return alert("A password deve ter pelo menos 6 caracteres.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      alert("Password definida com sucesso! Vais ser redirecionado para a Dashboard.");
      // Recarrega a página para limpar o evento de recuperação e entrar na app normal
      window.location.hash = '';
      window.location.reload(); 
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <h1>Definir Password</h1>
          <p>Para concluir o registo, escolha uma senha segura.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="login-form">
          <div className="input-group-login">
            <Lock className="input-icon-login" size={20} />
            <input 
              type="password" 
              placeholder="Nova Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'A guardar...' : <><Save size={20} /> Guardar Password</>}
          </button>
        </form>
      </div>
    </div>
  );
}