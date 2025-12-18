import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, DollarSign, TrendingUp, Package, Filter, ArrowRight } from 'lucide-react';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('month'); // default: este mês
  const [loading, setLoading] = useState(false);
  
  // Estatísticas Gerais
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    salesCount: 0,
    bestDay: '-'
  });

  // Lista de Top Produtos
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const getStartDate = () => {
    const now = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week': // Últimos 7 dias
        start.setDate(now.getDate() - 7);
        break;
      case 'month': // Desde dia 1 do mês atual
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year': // Desde 1 de Jan
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(1);
    }
    return start.toISOString();
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const startDate = getStartDate();

    try {
      // 1. Buscar Vendas no intervalo
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate);

      if (salesError) throw salesError;

      // Calcular Totais
      const revenue = salesData.reduce((acc, curr) => acc + curr.total_amount, 0);
      const profit = salesData.reduce((acc, curr) => acc + curr.total_profit, 0);
      
      // Calcular Melhor Dia (Simples)
      const salesByDate = {};
      salesData.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString();
        salesByDate[date] = (salesByDate[date] || 0) + sale.total_amount;
      });
      const bestDay = Object.keys(salesByDate).reduce((a, b) => salesByDate[a] > salesByDate[b] ? a : b, '-');

      setStats({ revenue, profit, salesCount: salesData.length, bestDay });

      // 2. Buscar Top Produtos (Requer os IDs das vendas filtradas)
      if (salesData.length > 0) {
        const saleIds = salesData.map(s => s.id);
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('quantity, unit_price, unit_profit, products(name, brand)')
          .in('sale_id', saleIds);

        if (itemsError) throw itemsError;

        // Agrupar por nome do produto
        const productMap = {};
        itemsData.forEach(item => {
          const name = item.products?.name || 'Desconhecido';
          const brand = item.products?.brand || '';
          const key = `${name}-${brand}`;
          
          if (!productMap[key]) {
            productMap[key] = { name, brand, qty: 0, revenue: 0, profit: 0 };
          }
          productMap[key].qty += item.quantity;
          productMap[key].revenue += (item.unit_price * item.quantity);
          productMap[key].profit += (item.unit_profit * item.quantity);
        });

        // Converter para array e ordenar
        const sortedProducts = Object.values(productMap)
          .sort((a, b) => b.qty - a.qty) // Ordenar por quantidade vendida
          .slice(0, 10); // Pegar top 10

        setTopProducts(sortedProducts);
      } else {
        setTopProducts([]);
      }

    } catch (error) {
      console.error("Erro na análise:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="dashboard-header" style={{marginBottom: '20px'}}>
        <h2>Análise de Performance</h2>
        
        {/* Filtro de Tempo */}
        <div className="time-filter-container">
          <Filter size={16} style={{marginRight: 8, color: '#64748b'}}/>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)} 
            className="time-select"
          >
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 Dias</option>
            <option value="month">Este Mês</option>
            <option value="year">Este Ano</option>
          </select>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="icon-wrapper blue"><DollarSign size={24} /></div>
            <span className="stat-label">Faturação</span>
          </div>
          <div className="stat-value">€ {stats.revenue.toFixed(2)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="icon-wrapper green"><TrendingUp size={24} /></div>
            <span className="stat-label">Lucro Líquido</span>
          </div>
          <div className="stat-value">€ {stats.profit.toFixed(2)}</div>
          <div className="stat-sub" style={{color: '#166534'}}>
            Margem: {stats.revenue ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="icon-wrapper purple"><Package size={24} /></div>
            <span className="stat-label">Total Vendas</span>
          </div>
          <div className="stat-value">{stats.salesCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="icon-wrapper orange"><Calendar size={24} /></div>
            <span className="stat-label">Melhor Dia</span>
          </div>
          <div className="stat-value" style={{fontSize: '1.4rem'}}>{stats.bestDay}</div>
        </div>
      </div>

      {/* Tabela de Top Produtos */}
      <div className="list-container" style={{marginTop: '30px'}}>
        <div className="list-header">
          <h3>🏆 Top Produtos (Por Quantidade)</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ranking</th>
                <th>Produto</th>
                <th>Qtd Vendida</th>
                <th>Faturação Gerada</th>
                <th>Lucro Gerado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px'}}>A analisar dados...</td></tr>
              ) : topProducts.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px'}}>Sem dados para este período.</td></tr>
              ) : (
                topProducts.map((prod, index) => (
                  <tr key={index}>
                    <td>
                      <span className={`badge ${index === 0 ? 'badge-success' : 'badge-neutral'}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td>
                      <strong>{prod.name}</strong>
                      <br/><small style={{color: '#64748b'}}>{prod.brand}</small>
                    </td>
                    <td style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{prod.qty}</td>
                    <td>€ {prod.revenue.toFixed(2)}</td>
                    <td style={{color: '#10b981'}}>€ {prod.profit.toFixed(2)}</td>
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