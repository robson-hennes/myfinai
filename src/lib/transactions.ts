/**
 * Biblioteca para gerenciamento de transações
 */

import { supabase } from './supabase';

export type RecurrenceType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'one_time';

/**
 * Calcula a próxima data de cobrança com base na recorrência
 */
export function calculateNextBillingDate(currentDate: Date, recurrence: RecurrenceType): Date {
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
      // Pagamentos únicos não têm próxima data
      return currentDate;
  }
  
  return nextDate;
}

/**
 * Gera transações para serviços com vencimento no mês atual
 * que ainda não possuem transação criada
 */
export async function generateMonthlyTransactions() {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    console.log('🔄 Gerando transações para o período:', {
      inicio: firstDayOfMonth.toISOString().split('T')[0],
      fim: lastDayOfMonth.toISOString().split('T')[0]
    });

    // Buscar serviços ativos com vencimento no mês atual
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .gte('next_billing_date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('next_billing_date', lastDayOfMonth.toISOString().split('T')[0]);

    if (servicesError) {
      console.error('Erro ao buscar serviços:', servicesError);
      return { success: false, error: servicesError.message };
    }

    if (!services || services.length === 0) {
      console.log('✅ Nenhum serviço com vencimento no mês atual');
      return { success: true, created: 0, message: 'Nenhum serviço com vencimento no mês atual' };
    }

    console.log(`📋 Encontrados ${services.length} serviços com vencimento no mês`);

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
        console.error(`Erro ao verificar transação para serviço ${service.id}:`, txError);
        continue;
      }

      // Se já existe, pular
      if (existingTx) {
        console.log(`⏭️  Transação já existe para serviço ${service.name} (${service.id})`);
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
        console.error(`Erro ao criar transação para serviço ${service.id}:`, insertError);
        continue;
      }

      console.log(`✅ Transação criada para ${service.name} - R$ ${service.amount}`);
      created++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Transações criadas: ${created}`);
    console.log(`   Transações já existentes: ${skipped}`);

    return {
      success: true,
      created,
      skipped,
      total: services.length,
      message: `${created} transações criadas, ${skipped} já existiam`
    };

  } catch (error: any) {
    console.error('❌ Erro ao gerar transações:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marca uma transação como paga e atualiza o next_billing_date do serviço
 */
export async function markTransactionAsPaid(transactionId: string) {
  try {
    // 1. Buscar a transação
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*, services(*)')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      return { success: false, error: 'Transação não encontrada' };
    }

    // 2. Atualizar status da transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Atualizar next_billing_date do serviço (se não for one_time)
    const service = transaction.services;
    if (service && service.recurrence !== 'one_time') {
      const currentBillingDate = new Date(service.next_billing_date);
      const nextBillingDate = calculateNextBillingDate(currentBillingDate, service.recurrence);

      const { error: serviceError } = await supabase
        .from('services')
        .update({
          next_billing_date: nextBillingDate.toISOString().split('T')[0]
        })
        .eq('id', service.id);

      if (serviceError) {
        console.error('Erro ao atualizar next_billing_date:', serviceError);
        // Não retorna erro pois a transação já foi marcada como paga
      }
    }

    return { success: true, message: 'Transação marcada como paga' };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Gera transações para um serviço específico
 */
export async function generateTransactionForService(serviceId: string) {
  try {
    // Buscar o serviço
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return { success: false, error: 'Serviço não encontrado' };
    }

    if (!service.is_active) {
      return { success: false, error: 'Serviço inativo' };
    }

    // Verificar se já existe transação para esta data
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('service_id', serviceId)
      .eq('due_date', service.next_billing_date)
      .maybeSingle();

    if (existingTx) {
      return { success: false, error: 'Transação já existe para esta data' };
    }

    // Criar transação
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        service_id: serviceId,
        amount: service.amount,
        status: 'pending',
        due_date: service.next_billing_date
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, message: 'Transação criada com sucesso' };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
