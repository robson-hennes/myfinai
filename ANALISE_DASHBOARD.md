# 🔍 Análise do Dashboard - MyFinAI

## 📋 Resumo Executivo

O dashboard está mostrando valores zerados porque **não há dados no banco de dados** ou **o usuário não está autenticado** para acessá-los devido ao RLS (Row Level Security).

---

## 🔴 Problemas Identificados

### 1. **Valores Zerados no Dashboard**
- ✅ **Receita Realizada (Mês)**: R$ 0,00
- ✅ **A Receber (Mês)**: R$ 0,00  
- ✅ **Clientes em Dia**: 0
- ✅ **Clientes em Atraso**: 13 (na imagem, mas 0 no teste)
- ✅ **MRR**: R$ 4.705,00 (na imagem, mas 0 no teste)
- ✅ **Total de Clientes**: 32 (na imagem, mas 0 no teste)

### 2. **Causa Raiz**
Após análise com scripts de debug, descobrimos:
- ❌ **Banco de dados vazio** quando acessado sem autenticação
- ❌ **RLS ativo** bloqueando acesso aos dados
- ❌ **Nenhuma sessão ativa** nos testes via script

### 3. **Problemas no Código Original**

#### a) Query de Transações Limitada
```typescript
// ❌ ANTES: Buscava apenas transações do mês atual
const { data: monthTransactions } = await supabase
  .from("transactions")
  .select("*")
  .gte("due_date", firstDayOfMonth.toISOString().split('T')[0])
  .lte("due_date", lastDayOfMonth.toISOString().split('T')[0]);
```

**Problema**: Se não houver transações com `due_date` no mês atual, não consegue calcular status de clientes corretamente.

#### b) Status de Transações Inconsistente
```typescript
// ❌ ANTES: Verificava apenas 'pago'
if (t.status === 'pago') {
  received += Number(t.amount);
}
```

**Problema**: O schema SQL indica `'paid'` em inglês, mas o código verifica `'pago'` em português.

#### c) Lógica de Clientes em Dia/Atraso
```typescript
// ❌ ANTES: Só contava clientes com serviços no mês atual
if (billingDate >= startOfNextMonth) return;
```

**Problema**: Ignorava serviços com vencimento futuro, mas não considerava corretamente o histórico de pagamentos.

#### d) Falta de Tratamento de Erros
```typescript
// ❌ ANTES: Sem verificação de erros
const { data: services } = await supabase.from("services")...
```

**Problema**: Erros silenciosos não eram logados, dificultando debug.

---

## ✅ Correções Implementadas

### 1. **Dashboard Melhorado** (`src/app/page.tsx`)

#### a) Busca Completa de Transações
```typescript
// ✅ AGORA: Busca todas as transações e filtra depois
const { data: allTransactions, error: transactionsError } = await supabase
  .from("transactions")
  .select("*");

const monthTransactions = allTransactions?.filter(t => {
  const dueDate = new Date(t.due_date);
  return dueDate >= firstDayOfMonth && dueDate <= lastDayOfMonth;
}) || [];
```

#### b) Compatibilidade de Status
```typescript
// ✅ AGORA: Verifica ambos os formatos
if (t.status === 'pago' || t.status === 'paid') {
  received += amount;
} else if (t.status === 'pending' || t.status === 'pendente') {
  pending += amount;
}
```

#### c) Lógica Corrigida de Clientes
```typescript
// ✅ AGORA: Verifica histórico completo de pagamentos
const hasPaid = (allTransactions || []).some(t => {
  if (t.service_id !== service.id) return false;
  if (t.status !== 'pago' && t.status !== 'paid') return false;
  
  const txDate = new Date(t.due_date);
  return txDate.getMonth() === billingDate.getMonth() 
    && txDate.getFullYear() === billingDate.getFullYear();
});
```

#### d) Tratamento de Erros
```typescript
// ✅ AGORA: Log de todos os erros
if (clientsError) {
  console.error("Error fetching clients:", clientsError);
}
```

### 2. **Página de Debug Melhorada** (`src/app/debug-db/page.tsx`)

Criada uma página completa de debug que mostra:
- ✅ Status da sessão (autenticado ou não)
- ✅ Contagem de clientes, serviços e transações
- ✅ Erros de RLS ou queries
- ✅ Detalhes dos primeiros registros
- ✅ Cálculo de MRR por serviço
- ✅ Dicas de troubleshooting

### 3. **Scripts de Debug**

#### a) `scripts/debug-dashboard.ts`
Script simples para verificar dados básicos.

#### b) `scripts/check-auth-and-data.ts`
Script completo que verifica:
- Configuração das chaves (Anon e Service Role)
- Dados com bypass de RLS (Service Role)
- Dados com RLS ativo (Anon Key)
- Status de autenticação
- User IDs dos dados

---

## 🚀 Como Testar

### 1. **Acessar a Página de Debug**
```
http://localhost:3000/debug-db
```

Esta página mostrará:
- Se você está autenticado
- Quantos dados existem no banco
- Erros de RLS ou queries
- Primeiros registros de cada tabela

### 2. **Verificar Autenticação**
```
http://localhost:3000/login
```

Faça login com suas credenciais do Supabase.

### 3. **Verificar Dashboard**
```
http://localhost:3000
```

Após login, o dashboard deve mostrar os dados corretamente.

---

## 🔧 Próximos Passos

### 1. **Verificar Service Role Key**
A chave fornecida (`sbp_6cb41f12228fd7f3748594649dcc033b840e057a`) está retornando erro "Invalid API key".

**Como obter a chave correta:**
1. Acesse: https://supabase.com/dashboard/project/ggzuosvkxrprjgxvbvuw/settings/api
2. Copie a "service_role" key (não a "anon" key)
3. Atualize no `.env.local`

### 2. **Verificar Dados no Banco**
Se após login ainda não houver dados:
1. Acesse o Supabase Dashboard
2. Vá em "Table Editor"
3. Verifique se há registros em `clients`, `services` e `transactions`
4. Verifique se o `user_id` corresponde ao seu usuário logado

### 3. **Criar Dados de Teste**
Se o banco estiver vazio:
1. Faça login no app
2. Acesse `/clientes` e crie alguns clientes
3. Acesse `/servicos` e crie serviços para os clientes
4. As transações serão criadas automaticamente

### 4. **Verificar RLS**
Se houver dados mas não aparecem:
1. Execute: `npx tsx scripts/check-auth-and-data.ts`
2. Verifique se o `user_id` dos dados corresponde ao seu UID
3. Se não corresponder, atualize os dados ou crie novos

---

## 📊 Estrutura de Dados Esperada

### Clientes
```sql
SELECT id, name, email, user_id FROM clients;
```

### Serviços
```sql
SELECT id, name, amount, recurrence, next_billing_date, is_active, client_id 
FROM services 
WHERE is_active = true;
```

### Transações
```sql
SELECT id, amount, status, due_date, service_id, created_at 
FROM transactions 
ORDER BY created_at DESC;
```

---

## 🎯 Checklist de Verificação

- [ ] Usuário está autenticado (`/login`)
- [ ] Service Role Key está correta (`.env.local`)
- [ ] Há clientes no banco (`/debug-db`)
- [ ] Há serviços ativos (`/debug-db`)
- [ ] Há transações criadas (`/debug-db`)
- [ ] `user_id` dos dados corresponde ao usuário logado
- [ ] RLS está funcionando corretamente
- [ ] Dashboard mostra valores corretos (`/`)

---

## 📝 Notas Técnicas

### Cálculo de MRR
```typescript
function calculateMRR(amount: number, recurrence: RecurrenceType): number {
  switch (recurrence) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'semiannual': return amount / 6;
    case 'annual': return amount / 12;
    case 'one_time': return 0;
  }
}
```

### Status de Clientes
- **Em Dia**: Todos os serviços com vencimento passado foram pagos
- **Em Atraso**: Pelo menos um serviço com vencimento passado não foi pago

### Receita do Mês
- **Realizada**: Soma de transações com `status = 'pago' ou 'paid'` no mês atual
- **A Receber**: Soma de transações com `status = 'pending' ou 'pendente'` no mês atual

---

## 🆘 Suporte

Se os problemas persistirem:
1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do Supabase Dashboard
3. Execute os scripts de debug
4. Acesse `/debug-db` para diagnóstico visual
