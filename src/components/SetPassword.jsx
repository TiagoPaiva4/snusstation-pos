import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Save, Loader2, CheckCircle } from 'lucide-react';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false); // <--- NOVO CONTROLO
  const [statusMessage, setStatusMessage] = useState('A validar o teu convite...');

  useEffect(() => {
    // 1. Tenta obter a sessão imediatamente
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
    };

    checkSession();

    // 2. Fica à escuta se a sessão entrar uns segundos depois
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return alert("A password deve ter pelo menos 6 caracteres.");

    setLoading(true);
    
    // Dupla verificação de segurança antes de enviar
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Sessão perdida. Por favor, clica no link do email novamente.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      alert("Password definida com sucesso! A entrar...");
      // Limpa a URL e recarrega para entrar na Dashboard limpa
      window.location.hash = '';
      window.location.reload(); 
    }
    setLoading(false);
  };

  // Se a sessão ainda não estiver pronta, mostra Loading em vez do formulário
  if (!sessionReady) {
    return (
      <div className="login-container">
        <div className="login-card" style={{textAlign:'center', padding:'40px'}}>
          <Loader2 className="spin" size={40} color="#2563eb" style={{margin:'0 auto 20px auto'}}/>
          <h3>A validar acesso...</h3>
          <p style={{color:'#64748b'}}>Aguarde enquanto confirmamos o seu convite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div style={{display:'flex', justifyContent:'center', marginBottom:'15px'}}>
            <CheckCircle size={48} color="#10b981" />
          </div>
          <h1>Definir Password</h1>
          <p>Convite aceite! Escolhe a tua password para concluir.</p>
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
              autoFocus
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'A guardar...' : <><Save size={20} /> Concluir Registo</>}
          </button>
        </form>
      </div>
    </div>
  );
}