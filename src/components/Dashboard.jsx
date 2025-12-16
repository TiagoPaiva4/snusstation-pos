import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({ sales: 0, profit: 0, topProduct: '-', topClient: '-' });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Busca simples de dados (para produção, usar Supabase Functions para agregação é melhor)
    const { data: sales } = await supabase.from('sales').select('*');
    
    if (sales) {
      const totalSales = sales.reduce((acc, curr) => acc + curr.total_amount, 0);
      const totalProfit = sales.reduce((acc, curr) => acc + curr.total_profit, 0);
      
      setStats({ 
        sales: totalSales.toFixed(2), 
        profit: totalProfit.toFixed(2),
        topProduct: 'Carregando...', // Implementar lógica complexa se necessário
        topClient: 'Carregando...' 
      });
    }
  };

  return (
    <div className="page">
      <h2>Dashboard Geral</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Vendas</h3>
          <p>€ {stats.sales}</p>
        </div>
        <div className="stat-card profit">
          <h3>Lucro Total</h3>
          <p>€ {stats.profit}</p>
        </div>
        <div className="stat-card">
          <h3>Produtos Ativos</h3>
          <p>Ver Inventário</p>
        </div>
      </div>
    </div>
  );
}