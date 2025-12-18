const { createClient } = require('@supabase/supabase-js');

// 👇 COLA AS TUAS CHAVES AQUI
const SUPABASE_URL = "https://ezezrjgflvkgyphupzqu.supabase.co"; 
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZXpyamdmbHZrZ3lwaHVwenF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkxMzgzMCwiZXhwIjoyMDgxNDg5ODMwfQ.XfVEJdN6W5WUxt6SfbHFp5FHOErR09fQ7zklgzAMYhs"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearSales() {
  console.log('🗑️ A apagar todo o histórico de vendas para importar de novo...');
  
  // Apaga itens primeiro (devido às ligações)
  const { error: errorItems } = await supabase.from('sale_items').delete().neq('id', 0);
  if (errorItems) console.error('Erro itens:', errorItems);
  
  // Apaga vendas
  const { error: errorSales } = await supabase.from('sales').delete().neq('id', 0);
  if (errorSales) console.error('Erro vendas:', errorSales);

  console.log('✅ Base de dados de vendas limpa! Podes importar agora.');
}

clearSales();