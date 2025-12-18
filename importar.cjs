const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// ==================================================================
// LISTA DE CORREÇÕES
// ==================================================================
const CORRECOES_NOMES = {
  "CUBA White Forest Berries Medium": "CUBA Forest Berries Medium",
  "CUBA Black Blueberry Strong": "CUBA Blueberry Strong",
  "CUBA Black Cherry Strong": "CUBA Cherry Strong",
  "CUBA Black Grape Strong": "CUBA Grape Strong",
  "CUBA White Peach Medium": "CUBA Peach Medium",
  "CUBA White Banana Hit Medium": "CUBA Banana Hit Medium",
  "CUBA White Apple Juice Medium": "CUBA Apple Juice Medium",
  "CUBA White Watermelon Medium": "CUBA Watermelon Medium",
  "CUBA White Cola Medium": "CUBA Cola Medium",
  "CUBA White Pineapple Medium": "CUBA Pineapple Medium",
  "CUBA White Blueberry Medium": "CUBA Blueberry Medium",
  "CUBA White Grape Medium": "CUBA Grape Medium",
  "CUBA White Ice Spearmint Medium": "CUBA Ice Spearmint Medium",
  "CUBA White Cherry Medium": "CUBA Cherry Medium",
  "CUBA White Double Fresh Medium": "CUBA Double Fresh Medium",
  "CUBA Black Peach Strong": "CUBA Peach Strong",
  "CUBA Black Watermelon Strong": "CUBA Watermelon Strong",
  "CUBA Black Banana Hit": "CUBA Banana Hit Strong",
  "CUBA Black Apple Juice Strong": "CUBA Apple Juice Strong",
  "CUBA Black Double Fresh Slim": "CUBA Double Fresh Slim",
  
  "77 VB Edition Mini Liquorice & Citrus": "77 VB Edition Mini Liquorice & Citrus Extra Strong",
  "77 Ghost Mini Cola": "77 Ghost Mini Cola Ice",
  "77 VB Edition Citrus Extra Strong": "77 VB Liquorice Citrus Medium",
  "77 Ghost Freeze Mint": "77 Ghost Mini Cola Ice",
  
  "RUSH Berry Ice": "RUSH Berry Ice Light",
  "RUSH Mango Freeze Light": "RUSH Mango Ice Light",
  
  "K#RWA - Purple Grape": "K#RWA Collection Blackcurrant - Purple Grape",
  "K#RWA Fresh Cola - Vanilla Cherry": "K#RWA Collection Fresh Cola - Vanilla Cherry",
  
  "FEDRS Ice Cool 9 Cola Vanilla Hard": "FEDRS Ice Cool 9 Cola Vanilla Hard X-Strong",
  "FEDRS Ice Cool 9 Cola Vanilla": "FEDRS Ice Cool 9 Cola Vanilla Hard X-Strong",
  
  "Greatest Cold Dry": "Greatest Cold Dry 16",
  "RUSH Cherry": "RUSH Cherry Burnout",
  "77 Watermelon": "77 Watermelon Ice",
  "Pablo Banana Ice": "PABLO Exclusive Banana Ice",
  "Pablo Grape Ice": "PABLO Exclusive Grape Ice",
  "Pablo Mini Ice": "PABLO Mini Ice Cold",
  "Velo Peppermint": "VELO Mighty Peppermint",
  "Cuba Ninja Coconut": "CUBA Ninja Coconut Strong",
  "Iceberg Strawberry Banana": "Iceberg Strawberry Banana Gum",
  "Pablo Dark Cherry": "PABLO Exclusive Dark Cherry",
  "GOAT Crystal Ice": "GOAT Crystal Ice Strong",
  "K#RWA Collection Blackcurrant": "K#RWA Collection Blackcurrant - Purple Grape",
  
  "ZEUS Bubble Gum": "ZEUS Bubblegum Strong",
  "ZEUS Arctic Freeze": "ZEUS Arctic Freeze Strong"
};

// ==================================================================
// CHAVES DO UTILIZADOR
// ==================================================================
const SUPABASE_URL = "https://ezezrjgflvkgyphupzqu.supabase.co"; 
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZXpyamdmbHZrZ3lwaHVwenF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkxMzgzMCwiZXhwIjoyMDgxNDg5ODMwfQ.XfVEJdN6W5WUxt6SfbHFp5FHOErR09fQ7zklgzAMYhs"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CSV_FILE = 'vendas.csv';
const clientsMap = new Map();
const productsMap = new Map();

// --- FUNÇÃO INTELIGENTE PARA CORRIGIR DATAS ---
function corrigirData(dataStr) {
  if (!dataStr) return null;
  
  // Troca barras por traços para padronizar (13/01/2025 -> 13-01-2025)
  let limpa = dataStr.replace(/\//g, '-'); 
  let partes = limpa.split('-');

  if (partes.length !== 3) return dataStr;

  let p0 = parseInt(partes[0]);
  let p1 = parseInt(partes[1]);
  let p2 = parseInt(partes[2]);

  // CASO 1: Formato DD-MM-YYYY (Ex: 27-09-2024) -> O último é o ano
  if (p2 > 2000) {
    // Retorna YYYY-MM-DD
    return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
  }
  
  // CASO 2: Formato YYYY-??-?? (Ex: 2024-27-09 ou 2024-09-27)
  if (p0 > 2000) {
    // Se o do meio for maior que 12, é o DIA! Temos de trocar com o último.
    if (p1 > 12) {
      // Devolve YYYY-MM-DD (Trocando o p1 com o p2)
      return `${p0}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Se estiver tudo bem
    return `${p0}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }

  return dataStr;
}

async function importData() {
  const rawRows = [];
  console.log('📂 A ler o CSV...');
  
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => rawRows.push(data))
    .on('end', async () => {
      await processRows(rawRows);
    });
}

async function processRows(rows) {
  // 1. Carregar produtos
  console.log('🔄 A carregar produtos...');
  const { data: allProducts, error } = await supabase.from('products').select('id, name, buy_price');
  
  if (error || !allProducts) { console.error("Erro BD", error); return; }

  allProducts.forEach(p => {
    productsMap.set(p.name.trim().toLowerCase(), { id: p.id, buy_price: p.buy_price });
  });
  console.log(`✅ ${allProducts.length} produtos em sistema.`);

  // 2. Processar Clientes
  console.log('👥 A garantir clientes...');
  const uniqueClients = [...new Set(rows.map(r => r['Nome do Cliente']?.trim()).filter(Boolean))];

  for (const clientName of uniqueClients) {
    let { data: existing } = await supabase.from('clients').select('id').eq('name', clientName).single();
    if (existing) {
      clientsMap.set(clientName, existing.id);
    } else {
      const { data: newClient } = await supabase.from('clients').insert([{ name: clientName, location: 'Importado' }]).select().single();
      if (newClient) clientsMap.set(clientName, newClient.id);
    }
  }

  // 3. Agrupar Vendas
  console.log('💰 A preparar dados e corrigir DATAS...');
  const salesGrouped = {};

  for (const row of rows) {
    let rawDate = row['Data'];
    const client = row['Nome do Cliente']?.trim();
    let originalName = row['Produto']?.trim();
    
    if (!rawDate || !client || !originalName) continue;

    // --- APLICA A CORREÇÃO DE DATA ---
    const date = corrigirData(rawDate);
    // ---------------------------------

    if (CORRECOES_NOMES[originalName]) {
      originalName = CORRECOES_NOMES[originalName];
    }

    const productName = originalName.toLowerCase();
    const productSystem = productsMap.get(productName);

    if (!productSystem) continue; 

    const key = `${date}|${client}`; 
    if (!salesGrouped[key]) {
      salesGrouped[key] = { date, clientName: client, items: [] };
    }

    const priceCSV = parseFloat(row['Preço Unitário'].replace(',', '.')) || 0;
    const qty = parseInt(row['Quantidade']) || 1;
    const estimatedProfit = (priceCSV - (productSystem.buy_price || 0)) * qty;

    const existingItem = salesGrouped[key].items.find(i => i.productId === productSystem.id);
    if (existingItem) {
      existingItem.qty += qty;
      existingItem.itemProfit += estimatedProfit;
    } else {
      salesGrouped[key].items.push({
        productId: productSystem.id,
        qty: qty,
        unitPrice: priceCSV,
        itemProfit: estimatedProfit
      });
    }
  }

  // 4. INSERIR TUDO
  const salesKeys = Object.keys(salesGrouped);
  console.log(`🚀 A FORÇAR importação de ${salesKeys.length} vendas...`);

  let importedCount = 0;
  
  for (const key of salesKeys) {
    const saleData = salesGrouped[key];
    const clientId = clientsMap.get(saleData.clientName);
    
    if (!clientId) {
      console.error(`❌ ERRO: Cliente não encontrado ID para "${saleData.clientName}"`);
      continue;
    }

    const totalAmount = saleData.items.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);
    const totalProfit = saleData.items.reduce((acc, item) => acc + item.itemProfit, 0);
    
    const { data: newSale, error } = await supabase.from('sales').insert([{
      client_id: clientId,
      total_amount: totalAmount,
      total_profit: totalProfit,
      created_at: saleData.date
    }]).select().single();

    if (error) {
      console.error(`❌ Falha venda ${saleData.date}|${saleData.clientName}:`, error.message);
    } else if (newSale) {
      const saleItems = saleData.items.map(item => ({
        sale_id: newSale.id,
        product_id: item.productId,
        quantity: item.qty,
        unit_price: item.unitPrice,
        unit_profit: (item.itemProfit / item.qty)
      }));
      
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) {
        console.error(`❌ Falha itens:`, itemsError.message);
      } else {
        importedCount++;
      }
    }
    
    if (importedCount % 20 === 0) process.stdout.write('.');
  }

  console.log('\n\n🏁 PROCESSO TERMINADO!');
  console.log(`✅ Vendas importadas: ${importedCount} de ${salesKeys.length}`);
}

importData();