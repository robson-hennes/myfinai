/**
 * Script de debug para verificar dados do dashboard
 * Execute: npx tsx scripts/debug-dashboard.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDashboard() {
  console.log('🔍 Iniciando debug do dashboard...\n');

  try {
    // 1. Verificar clientes
    const { data: clients, error: clientsError, count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact' });

    console.log('📊 CLIENTES:');
    console.log(`   Total: ${clientsCount}`);
    if (clientsError) console.error('   Erro:', clientsError);
    else console.log(`   Dados: ${clients?.length} registros retornados`);
    console.log('');

    // 2. Verificar serviços
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        *,
        clients ( id, name )
      `)
      .eq('is_active', true);

    console.log('💼 SERVIÇOS ATIVOS:');
    console.log(`   Total: ${services?.length || 0}`);
    if (servicesError) console.error('   Erro:', servicesError);
    else {
      services?.forEach(s => {
        console.log(`   - ${s.name}: R$ ${s.amount} (${s.recurrence})`);
        console.log(`     Cliente: ${s.clients?.name}`);
        console.log(`     Próximo vencimento: ${s.next_billing_date}`);
      });
    }
    console.log('');

    // 3. Verificar transações
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('💰 TRANSAÇÕES:');
    console.log(`   Total: ${transactions?.length || 0}`);
    if (transactionsError) console.error('   Erro:', transactionsError);
    else {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const monthTransactions = transactions?.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate >= firstDayOfMonth && dueDate <= lastDayOfMonth;
      }) || [];

      console.log(`   Transações do mês atual: ${monthTransactions.length}`);
      
      let received = 0;
      let pending = 0;
      
      monthTransactions.forEach(t => {
        const amount = Number(t.amount);
        console.log(`   - R$ ${amount} | Status: ${t.status} | Vencimento: ${t.due_date}`);
        
        if (t.status === 'pago' || t.status === 'paid') {
          received += amount;
        } else {
          pending += amount;
        }
      });

      console.log(`\n   📈 Receita Realizada (Mês): R$ ${received.toFixed(2)}`);
      console.log(`   📉 A Receber (Mês): R$ ${pending.toFixed(2)}`);
    }
    console.log('');

    // 4. Verificar transações recentes com joins
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select(`
        *,
        services ( 
          name, 
          clients ( name ) 
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('🕐 TRANSAÇÕES RECENTES (últimas 5):');
    if (recentError) {
      console.error('   Erro:', recentError);
    } else if (!recentTx || recentTx.length === 0) {
      console.log('   Nenhuma transação encontrada');
    } else {
      recentTx.forEach(tx => {
        console.log(`   - ${tx.services?.clients?.name || 'N/A'}`);
        console.log(`     Serviço: ${tx.services?.name || 'N/A'}`);
        console.log(`     Valor: R$ ${tx.amount} | Status: ${tx.status}`);
      });
    }
    console.log('');

    // 5. Verificar possíveis problemas de status
    console.log('⚠️  VERIFICAÇÃO DE STATUS:');
    const statusSet = new Set(transactions?.map(t => t.status) || []);
    console.log(`   Status encontrados: ${Array.from(statusSet).join(', ')}`);
    console.log('   Status esperados: pago, paid, pending, pendente, cancelled');
    console.log('');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugDashboard();
