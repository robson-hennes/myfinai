/**
 * Script para gerar transações do mês atual
 * Execute: npx tsx scripts/generate-transactions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type RecurrenceType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'one_time';

function calculateNextBillingDate(currentDate: Date, recurrence: RecurrenceType): Date {
  const nextDate = new Date(currentDate);
  
  switch (recurrence) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semiannual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'one_time':
      return currentDate;
  }
  
  return nextDate;
}

async function generateMonthlyTransactions() {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    console.log('🔄 Gerando transações para o período:');
    console.log(`   Início: ${firstDayOfMonth.toISOString().split('T')[0]}`);
    console.log(`   Fim: ${lastDayOfMonth.toISOString().split('T')[0]}`);
    console.log('');

    // Buscar serviços ativos com vencimento no mês atual
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .gte('next_billing_date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('next_billing_date', lastDayOfMonth.toISOString().split('T')[0]);

    if (servicesError) {
      console.error('❌ Erro ao buscar serviços:', servicesError);
      return;
    }

    if (!services || services.length === 0) {
      console.log('✅ Nenhum serviço com vencimento no mês atual');
      return;
    }

    console.log(`📋 Encontrados ${services.length} serviços com vencimento no mês\n`);

    let created = 0;
    let skipped = 0;

    // Para cada serviço, verificar se já existe transação
    for (const service of services) {
      // Verificar se já existe transação para este serviço nesta data
      const { data: existingTx, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('service_id', service.id)
        .eq('due_date', service.next_billing_date)
        .maybeSingle();

      if (txError) {
        console.error(`❌ Erro ao verificar transação para serviço ${service.id}:`, txError);
        continue;
      }

      // Se já existe, pular
      if (existingTx) {
        console.log(`⏭️  Transação já existe: ${service.name} (${service.id})`);
        skipped++;
        continue;
      }

      // Criar nova transação
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          service_id: service.id,
          amount: service.amount,
          status: 'pending',
          due_date: service.next_billing_date
        });

      if (insertError) {
        console.error(`❌ Erro ao criar transação para serviço ${service.id}:`, insertError);
        continue;
      }

      console.log(`✅ Transação criada: ${service.name} - R$ ${service.amount}`);
      created++;
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO:');
    console.log(`   ✅ Transações criadas: ${created}`);
    console.log(`   ⏭️  Transações já existentes: ${skipped}`);
    console.log(`   📋 Total de serviços: ${services.length}`);
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Erro ao gerar transações:', error);
  }
}

console.log('🚀 Iniciando geração de transações...\n');
generateMonthlyTransactions();
