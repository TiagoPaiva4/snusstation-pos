import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { TrendingUp, DollarSign, ShoppingBag, Users, Clock, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    sales: 0, 
    profit: 0, 
    count: 0, 
    avgTicket: 0 
  });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Parceiro');

  useEffect(() => {
    fetchUserData();
    fetchDashboardData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
      if (name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        setUserName(name);
      }
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    
    const { data: allSales } = await supabase
      .from('sales')
      .select('total_amount, total_profit');

    const { data: lastSales } = await supabase
      .from('sales')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allSales) {
      const totalSales = allSales.reduce((acc, curr) => acc + curr.total_amount, 0);
      const totalProfit = allSales.reduce((acc, curr) => acc + curr.total_profit, 0);
      const salesCount = allSales.length;
      const avg = salesCount > 0 ? totalSales / salesCount : 0;
      
      setStats({ 
        sales: totalSales, 
        profit: totalProfit,
        count: salesCount,
        avgTicket: avg
      });
    }

    if (lastSales) {
      setRecentSales(lastSales);
    }
    
    setLoading(false);
  };

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass }) => (
    <div className="stat-card">
      <div className="stat-header">
        <div className={`icon-wrapper ${colorClass}`}>
          <Icon size={24} />
        </div>
        <span className="trend positive">
          <ArrowUpRight size={16} /> +2.5%
        </span>
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <h3 className="stat-value">{value}</h3>
        {subValue && <p className="stat-sub">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header">
        {/* 1. DATA NO CANTO SUPERIOR DIREITO */}
        <div className="header-top-right">
          <p className="date-display">
            <Clock size={16} /> {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* 2. MENSAGEM DE BOAS-VINDAS EM BAIXO */}
        <div className="header-greeting">
          <h2>
            Olá <span style={{ color: '#2563eb' }}>{userName}</span>, bem-vindo ao POS da SnusStation
          </h2>
        </div>
      </div>

      {/* Grid de Estatísticas */}
      <div className="stats-grid">
        <StatCard 
          title="Faturação Total" 
          value={`€ ${stats.sales.toFixed(2)}`} 
          subValue="Receita bruta acumulada"
          icon={DollarSign} 
          colorClass="blue"
        />
        <StatCard 
          title="Lucro Líquido" 
          value={`€ ${stats.profit.toFixed(2)}`} 
          subValue={`Margem global: ${stats.sales > 0 ? ((stats.profit / stats.sales) * 100).toFixed(1) : 0}%`}
          icon={TrendingUp} 
          colorClass="green"
        />
        <StatCard 
          title="Vendas Realizadas" 
          value={stats.count} 
          subValue="Total de pedidos processados"
          icon={ShoppingBag} 
          colorClass="purple"
        />
        <StatCard 
          title="Ticket Médio" 
          value={`€ ${stats.avgTicket.toFixed(2)}`} 
          subValue="Valor médio por venda"
          icon={Users} 
          colorClass="orange"
        />
      </div>

      {/* Tabela de Vendas Recentes */}
      <div className="recent-sales-section">
        <div className="section-header">
          <h3>Últimas 10 Vendas</h3>
          <button className="view-all-btn">Ver Histórico Completo</button>
        </div>
        
        <div className="table-wrapper card-table">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Lucro</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>A carregar dados...</td></tr>
              ) : recentSales.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>Nenhuma venda registada.</td></tr>
              ) : (
                recentSales.map(sale => (
                  <tr key={sale.id}>
                    <td>
                      <span style={{fontWeight: 500}}>
                        {new Date(sale.created_at).toLocaleDateString()}
                      </span>
                      <br/>
                      <small style={{color: '#94a3b8'}}>
                        {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </small>
                    </td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div className="avatar-circle">
                          {sale.clients?.name?.charAt(0) || '?'}
                        </div>
                        {sale.clients?.name || 'Cliente Removido'}
                      </div>
                    </td>
                    <td style={{fontWeight: 'bold'}}>€ {sale.total_amount.toFixed(2)}</td>
                    <td style={{color: '#10b981'}}>+€ {sale.total_profit.toFixed(2)}</td>
                    <td><span className="badge badge-success-light">Concluído</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}