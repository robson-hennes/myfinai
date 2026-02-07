/**
 * Script para mostrar TODOS os dados do banco (com Service Role)
 * Execute: npx tsx scripts/show-all-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function calculateMRR(amount: number, recurrence: string): number {
  switch (recurrence) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'semiannual': return amount / 6;
    case 'annual': return amount / 12;
    case 'one_time': return 0;
    default: return 0;
  }
}

async function showAllData() {
  console.log('🔍 DADOS COMPLETOS DO BANCO (Service Role - Bypass RLS)\n');
  console.log('='.repeat(80));

  try {
    // 1. Clientes
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('\n👥 CLIENTES (Total: ' + (clients?.length || 0) + ')');
    console.log('-'.repeat(80));
    if (clientsError) {
      console.error('Erro:', clientsError);
    } else {
      clients?.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.name}`);
        console.log(`   Email: ${c.email || 'N/A'}`);
        console.log(`   Phone: ${c.phone || 'N/A'}`);
        console.log(`   Contact: ${c.contact_name || 'N/A'}`);
        console.log(`   User ID: ${c.user_id}`);
        console.log(`   Criado: ${new Date(c.created_at).toLocaleString('pt-BR')}`);
      });
    }

    // 2. Serviços
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        *,
        clients ( id, name )
      `)
      .order('created_at', { ascending: false });

    console.log('\n\n💼 SERVIÇOS (Total: ' + (services?.length || 0) + ')');
    console.log('-'.repeat(80));
    if (servicesError) {
      console.error('Erro:', servicesError);
    } else {
      let totalMRR = 0;
      const activeServices = services?.filter(s => s.is_active) || [];
      
      services?.forEach((s, i) => {
        const mrr = calculateMRR(Number(s.amount), s.recurrence);
        if (s.is_active) totalMRR += mrr;
        
        console.log(`\n${i + 1}. ${s.name} ${s.is_active ? '✅' : '❌'}`);
        console.log(`   Cliente: ${s.clients?.name || 'N/A'}`);
        console.log(`   Valor: R$ ${Number(s.amount).toFixed(2)}`);
        console.log(`   Recorrência: ${s.recurrence}`);
        console.log(`   MRR: R$ ${mrr.toFixed(2)}`);
        console.log(`   Próximo vencimento: ${s.next_billing_date}`);
        console.log(`   Parcelas: ${s.installment_count || 'N/A'} (restam: ${s.installments_left || 'N/A'})`);
      });

      console.log('\n' + '='.repeat(80));
      console.log(`📊 RESUMO DE SERVIÇOS:`);
      console.log(`   Total de serviços: ${services?.length || 0}`);
      console.log(`   Serviços ativos: ${activeServices.length}`);
      console.log(`   MRR TOTAL: R$ ${totalMRR.toFixed(2)}`);
    }

    // 3. Transações
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        *,
        services ( 
          name, 
          clients ( name ) 
        )
      `)
      .order('created_at', { ascending: false });

    console.log('\n\n💰 TRANSAÇÕES (Total: ' + (transactions?.length || 0) + ')');
    console.log('-'.repeat(80));
    if (transactionsError) {
      console.error('Erro:', transactionsError);
    } else {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const monthTransactions = transactions?.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate >= firstDayOfMonth && dueDate <= lastDayOfMonth;
      }) || [];

      let totalReceived = 0;
      let totalPending = 0;
      let receivedMonth = 0;
      let pendingMonth = 0;

      transactions?.forEach((t, i) => {
        const amount = Number(t.amount);
        const isCurrentMonth = monthTransactions.includes(t);
        const isPaid = t.status === 'pago' || t.status === 'paid';
        
        if (isPaid) {
          totalReceived += amount;
          if (isCurrentMonth) receivedMonth += amount;
        } else {
          totalPending += amount;
          if (isCurrentMonth) pendingMonth += amount;
        }

        const statusIcon = isPaid ? '✅' : '⏳';
        const monthIcon = isCurrentMonth ? '📅' : '';
        
        console.log(`\n${i + 1}. ${statusIcon} ${monthIcon} R$ ${amount.toFixed(2)} - ${t.status.toUpperCase()}`);
        console.log(`   Cliente: ${t.services?.clients?.name || 'N/A'}`);
        console.log(`   Serviço: ${t.services?.name || 'N/A'}`);
        console.log(`   Vencimento: ${t.due_date}`);
        console.log(`   Pago em: ${t.paid_at || 'N/A'}`);
        console.log(`   Criado: ${new Date(t.created_at).toLocaleString('pt-BR')}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log(`📊 RESUMO DE TRANSAÇÕES:`);
      console.log(`   Total de transações: ${transactions?.length || 0}`);
      console.log(`   Transações do mês atual: ${monthTransactions.length}`);
      console.log(`\n   💰 GERAL:`);
      console.log(`   Total recebido: R$ ${totalReceived.toFixed(2)}`);
      console.log(`   Total pendente: R$ ${totalPending.toFixed(2)}`);
      console.log(`\n   📅 MÊS ATUAL (${today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}):`);
      console.log(`   Receita realizada: R$ ${receivedMonth.toFixed(2)}`);
      console.log(`   A receber: R$ ${pendingMonth.toFixed(2)}`);
    }

    // 4. Análise de Clientes em Dia/Atraso
    console.log('\n\n⚠️  ANÁLISE DE STATUS DOS CLIENTES');
    console.log('-'.repeat(80));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const clientStatusMap = new Map<string, { name: string; status: 'on-time' | 'overdue'; services: any[] }>();
    
    services?.filter(s => s.is_active).forEach(service => {
      const clientId = service.clients.id;
      const clientName = service.clients.name;
      
      if (!clientStatusMap.has(clientId)) {
        clientStatusMap.set(clientId, { name: clientName, status: 'on-time', services: [] });
      }
      
      const billingDate = new Date(service.next_billing_date);
      billingDate.setHours(0, 0, 0, 0);
      
      const client = clientStatusMap.get(clientId)!;
      
      if (billingDate < today) {
        const hasPaid = (transactions || []).some(t => {
          if (t.service_id !== service.id) return false;
          if (t.status !== 'pago' && t.status !== 'paid') return false;
          
          const txDate = new Date(t.due_date);
          return txDate.getMonth() === billingDate.getMonth() 
            && txDate.getFullYear() === billingDate.getFullYear();
        });
        
        if (!hasPaid) {
          client.status = 'overdue';
        }
        
        client.services.push({
          name: service.name,
          billingDate: service.next_billing_date,
          hasPaid,
          isOverdue: !hasPaid
        });
      }
    });
    
    const onTimeClients = Array.from(clientStatusMap.values()).filter(c => c.status === 'on-time');
    const overdueClients = Array.from(clientStatusMap.values()).filter(c => c.status === 'overdue');
    
    console.log(`\n✅ CLIENTES EM DIA (${onTimeClients.length}):`);
    onTimeClients.forEach(c => {
      console.log(`   - ${c.name}`);
    });
    
    console.log(`\n❌ CLIENTES EM ATRASO (${overdueClients.length}):`);
    overdueClients.forEach(c => {
      console.log(`   - ${c.name}`);
      c.services.forEach(s => {
        if (s.isOverdue) {
          console.log(`     └─ ${s.name} (vencimento: ${s.billingDate})`);
        }
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Análise completa!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

showAllData();
