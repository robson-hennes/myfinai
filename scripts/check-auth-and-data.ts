/**
 * Script para verificar autenticação e dados com RLS
 * Execute: npx tsx scripts/check-auth-and-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔐 Verificando configuração...\n');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada'}`);
console.log(`Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Não configurada'}`);
console.log('');

async function checkWithServiceRole() {
  if (!supabaseServiceKey) {
    console.log('⚠️  Service Role Key não configurada. Pulando verificação admin.\n');
    return;
  }

  console.log('👑 Verificando dados com SERVICE ROLE (bypass RLS)...\n');
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verificar clientes (bypass RLS)
    const { data: clients, error: clientsError, count } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, user_id', { count: 'exact' });

    console.log('📊 CLIENTES (Admin):');
    console.log(`   Total: ${count}`);
    if (clientsError) {
      console.error('   Erro:', clientsError);
    } else {
      clients?.slice(0, 5).forEach(c => {
        console.log(`   - ${c.name} (user_id: ${c.user_id})`);
      });
      if ((clients?.length || 0) > 5) {
        console.log(`   ... e mais ${(clients?.length || 0) - 5} clientes`);
      }
    }
    console.log('');

    // Verificar serviços
    const { data: services, error: servicesError } = await supabaseAdmin
      .from('services')
      .select('id, name, amount, is_active, client_id')
      .eq('is_active', true);

    console.log('💼 SERVIÇOS ATIVOS (Admin):');
    console.log(`   Total: ${services?.length || 0}`);
    if (servicesError) {
      console.error('   Erro:', servicesError);
    }
    console.log('');

    // Verificar transações
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, amount, status, due_date, service_id');

    console.log('💰 TRANSAÇÕES (Admin):');
    console.log(`   Total: ${transactions?.length || 0}`);
    if (txError) {
      console.error('   Erro:', txError);
    }
    console.log('');

    // Verificar usuários únicos
    if (clients && clients.length > 0) {
      const uniqueUsers = new Set(clients.map(c => c.user_id));
      console.log('👥 USUÁRIOS COM DADOS:');
      console.log(`   Total de user_ids únicos: ${uniqueUsers.size}`);
      uniqueUsers.forEach(uid => {
        const clientCount = clients.filter(c => c.user_id === uid).length;
        console.log(`   - ${uid}: ${clientCount} clientes`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function checkWithAnonKey() {
  console.log('🔓 Verificando dados com ANON KEY (com RLS)...\n');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Tentar buscar dados sem autenticação
    const { data: clients, error: clientsError, count } = await supabase
      .from('clients')
      .select('*', { count: 'exact' });

    console.log('📊 CLIENTES (Anon):');
    console.log(`   Total: ${count}`);
    if (clientsError) {
      console.error('   Erro:', clientsError.message);
      console.log('   💡 Isso é esperado se RLS estiver ativo e você não estiver autenticado');
    }
    console.log('');

    // Verificar sessão
    const { data: session } = await supabase.auth.getSession();
    console.log('🔐 SESSÃO:');
    if (session.session) {
      console.log(`   ✅ Usuário autenticado: ${session.session.user.email}`);
      console.log(`   User ID: ${session.session.user.id}`);
    } else {
      console.log('   ❌ Nenhum usuário autenticado');
      console.log('   💡 O dashboard precisa de um usuário logado para funcionar com RLS');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function main() {
  await checkWithServiceRole();
  await checkWithAnonKey();

  console.log('\n📋 RESUMO:');
  console.log('1. Se os dados aparecem com Service Role mas não com Anon Key:');
  console.log('   → RLS está funcionando corretamente');
  console.log('   → Você precisa fazer login no app para ver os dados');
  console.log('');
  console.log('2. Se não há dados nem com Service Role:');
  console.log('   → O banco está realmente vazio');
  console.log('   → Você precisa criar clientes, serviços e transações');
  console.log('');
  console.log('3. Para testar o dashboard:');
  console.log('   → Acesse http://localhost:3000/login');
  console.log('   → Faça login com suas credenciais');
  console.log('   → Crie alguns clientes e serviços');
}

main();
