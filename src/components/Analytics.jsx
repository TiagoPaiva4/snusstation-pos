import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, DollarSign, TrendingUp, Package, Filter, Store, Globe } from 'lucide-react';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('month'); // default: este mês
  const [loading, setLoading] = useState(false);
  
  // Estatísticas Gerais (KPIs)
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    salesCount: 0,
    bestDay: '-'
  });

  // Lista de Top Produtos
  const [topProducts, setTopProducts] = useState([]);

  // Estatísticas Mensais (Físico vs Online)
  const [monthlyStats, setMonthlyStats] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  useEffect(() => {
    fetchMonthlyStats();
  }, []);

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
      // 1. Buscar Vendas no intervalo selecionado
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate);

      if (salesError) throw salesError;

      // Calcular Totais
      const revenue = salesData.reduce((acc, curr) => acc + curr.total_amount, 0);
      const profit = salesData.reduce((acc, curr) => acc + curr.total_profit, 0);
      
      // Calcular Melhor Dia
      const salesByDate = {};
      salesData.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString();
        salesByDate[date] = (salesByDate[date] || 0) + sale.total_amount;
      });
      const bestDay = Object.keys(salesByDate).reduce((a, b) => salesByDate[a] > salesByDate[b] ? a : b, '-');

      setStats({ revenue, profit, salesCount: salesData.length, bestDay });

      // 2. Buscar Top Produtos
      if (salesData.length > 0) {
        const saleIds = salesData.map(s => s.id);
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select('quantity, unit_price, unit_profit, products(name, brand)')
          .in('sale_id', saleIds);

        if (itemsError) throw itemsError;

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

        const sortedProducts = Object.values(productMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10);

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

  // --- BUSCAR DADOS MENSAIS (Apenas Últimos 12 Meses) ---
  const fetchMonthlyStats = async () => {
    try {
      const { data: allSales, error } = await supabase
        .from('sales')
        .select('created_at, total_amount, sale_channel')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const grouped = {};

      allSales.forEach(sale => {
        const date = new Date(sale.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            key: monthKey, // Usado para ordenar
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            physical: 0,
            online: 0,
            total: 0
          };
        }

        const amount = sale.total_amount;
        grouped[monthKey].total += amount;

        if (sale.sale_channel === 'Shopify') {
          grouped[monthKey].online += amount;
        } else {
          grouped[monthKey].physical += amount;
        }
      });

      // 1. Converter para array
      let result = Object.values(grouped);
      
      // 2. Ordenar por Data (Decrescente: mais recente primeiro)
      result.sort((a, b) => b.key.localeCompare(a.key));

      // 3. Pegar apenas os últimos 12 meses
      result = result.slice(0, 12);

      setMonthlyStats(result);

    } catch (err) {
      console.error("Erro ao buscar stats mensais:", err);
    }
  };

  return (
    <div className="page">
      <div className="dashboard-header" style={{marginBottom: '20px'}}>
        <h2>Análise de Performance</h2>
        
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

      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '30px'}}>
        
        {/* Tabela Top Produtos */}
        <div className="list-container" style={{flex: 1, minWidth: '400px'}}>
          <div className="list-header">
            <h3>🏆 Top Produtos (Qtd)</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produto</th>
                  <th style={{textAlign:'center'}}>Qtd</th>
                  <th style={{textAlign:'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>A analisar...</td></tr>
                ) : topProducts.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Sem dados.</td></tr>
                ) : (
                  topProducts.map((prod, index) => (
                    <tr key={index}>
                      <td><span className={`badge ${index === 0 ? 'badge-success' : 'badge-neutral'}`}>{index + 1}</span></td>
                      <td>
                        <span style={{fontWeight:500}}>{prod.name}</span>
                        <div style={{fontSize:'0.75rem', color:'#64748b'}}>{prod.brand}</div>
                      </td>
                      <td style={{fontWeight: 'bold', textAlign:'center'}}>{prod.qty}</td>
                      <td style={{textAlign:'right'}}>€ {prod.revenue.toFixed(0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela Faturação Mensal */}
        <div className="list-container" style={{flex: 1, minWidth: '400px'}}>
          <div className="list-header">
            <h3>📅 Faturação Mensal (Últimos 12 Meses)</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{textAlign:'right'}}>🏢 Física</th>
                  <th style={{textAlign:'right'}}>🌐 Online</th>
                  <th style={{textAlign:'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Sem histórico recente.</td></tr>
                ) : (
                  monthlyStats.map((stat) => (
                    <tr key={stat.key}>
                      <td style={{fontWeight: 500, color: '#334155'}}>{stat.name}</td>
                      
                      <td style={{textAlign:'right', color: '#64748b'}}>
                        € {stat.physical.toFixed(2)}
                      </td>
                      
                      <td style={{textAlign:'right', color: '#9333ea', fontWeight: 500}}>
                        € {stat.online.toFixed(2)}
                      </td>
                      
                      <td style={{textAlign:'right', fontWeight: 'bold'}}>
                        € {stat.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}