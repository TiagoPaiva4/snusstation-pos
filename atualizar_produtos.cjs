const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// ==================================================================
// AS TUAS CHAVES (Já preenchidas)
// ==================================================================
const SUPABASE_URL = "https://ezezrjgflvkgyphupzqu.supabase.co"; 
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZXpyamdmbHZrZ3lwaHVwenF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkxMzgzMCwiZXhwIjoyMDgxNDg5ODMwfQ.XfVEJdN6W5WUxt6SfbHFp5FHOErR09fQ7zklgzAMYhs"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CSV_FILE = 'stock.csv'; // O nome do teu ficheiro novo

async function updateStock() {
  const rows = [];
  console.log('📂 A ler o ficheiro de atualização...');
  
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => rows.push(data))
    .on('end', async () => {
      await processUpdates(rows);
    });
}

async function processUpdates(rows) {
  console.log(`🔄 A iniciar atualização de ${rows.length} produtos...`);
  
  let successCount = 0;
  let notFoundCount = 0;
  const notFoundList = [];

  for (const row of rows) {
    // 1. Ler as colunas do CSV (Tenta adaptar a vários nomes de colunas comuns)
    // O Excel às vezes muda os nomes, por isso verificamos várias hipóteses
    const name = row['Produto'] || row['produto'] || row['Name']; 
    
    // Tratamento de Preço (trocar vírgula por ponto se necessário)
    let priceRaw = row['Preço'] || row['Preco'] || row['Price'] || '0';
    if (typeof priceRaw === 'string') priceRaw = priceRaw.replace(',', '.');
    const price = parseFloat(priceRaw);

    // Tratamento de Stock
    const stock = parseInt(row['Stock'] || row['stock'] || row['Quantidade'] || '0');

    if (!name) continue;

    // 2. Procurar o produto na BD (Case Insensitive)
    const { data: products, error: searchError } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', name.trim()); // ilike ignora maiúsculas/minúsculas

    if (searchError) {
      console.error(`❌ Erro ao procurar ${name}:`, searchError.message);
      continue;
    }

    if (!products || products.length === 0) {
      // Se não encontrou, guarda na lista de erros
      notFoundList.push(name);
      notFoundCount++;
      process.stdout.write('X'); // Marca visual de erro
      continue;
    }

    // Se encontrou mais que um (ex: nomes parecidos), usa o primeiro
    const productToUpdate = products[0];

    // 3. Atualizar na BD
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        stock: stock,
        sell_price: price 
        // Nota: Não estou a mexer no buy_price, apenas no preço de venda ao público
      })
      .eq('id', productToUpdate.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar ${name}:`, updateError.message);
    } else {
      successCount++;
      process.stdout.write('.'); // Marca visual de sucesso
    }
  }

  console.log('\n\n🏁 ATUALIZAÇÃO CONCLUÍDA!');
  console.log(`✅ Produtos atualizados: ${successCount}`);
  console.log(`❌ Produtos não encontrados: ${notFoundCount}`);

  if (notFoundList.length > 0) {
    console.log('\n⚠️ Estes nomes no Excel não bateram certo com a BD:');
    notFoundList.forEach(n => console.log(`- ${n}`));
  }
}

updateStock();