import { test, expect } from '@playwright/test';
import { supabase } from '../../src/lib/supabase';

test.describe('Gestão Financeira - Exclusão', () => {
    let testClientId: string;

    test.beforeAll(async () => {
        // Garantir um cliente para as transações de teste
        const { data } = await supabase
            .from('clients')
            .insert([{
                name: 'Cliente Teste Delete Financeiro',
                user_id: '00000000-0000-0000-0000-000000000000'
            }])
            .select()
            .single();

        if (data) testClientId = data.id;
    });

    test.afterAll(async () => {
        // Limpar dados de teste
        if (testClientId) {
            await supabase.from('transactions').delete().eq('client_id', testClientId);
            await supabase.from('clients').delete().eq('id', testClientId);
        }
    });

    async function waitForTransactions(page: any, description: string) {
        // Recarrega a página se necessário para garantir que os dados do Supabase foram sincronizados
        await page.reload();
        await page.waitForLoadState('networkidle');
        const row = page.locator('tr').filter({ hasText: description });
        try {
            await expect(row).toBeVisible({ timeout: 10000 });
            return row;
        } catch (e) {
            console.log('Transação não encontrada, tentando mais uma vez...');
            await page.reload();
            await page.waitForLoadState('networkidle');
            await expect(row).toBeVisible({ timeout: 20000 });
            return row;
        }
    }

    test('deve permitir excluir uma transação individualmente', async ({ page }) => {
        // 1. Criar transação de teste via Supabase
        const description = `Transação Teste Individual ${Date.now()}`;
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        await supabase.from('transactions').insert([{
            description,
            amount: 100.50,
            type: 'income',
            status: 'paid',
            client_id: testClientId,
            created_at: now.toISOString()
        }]);

        await page.goto('/financeiro');

        // Garante que o filtro de mês está no mês atual
        await page.fill('input[type="month"]', currentMonth);

        // Aguarda a transação aparecer na lista
        console.log('Filtrando por descrição:', description);
        const rows = page.locator('tr');
        const rowCount = await rows.count();
        console.log('Total de linhas na tabela:', rowCount);

        for (let i = 0; i < rowCount; i++) {
            const text = await rows.nth(i).innerText();
            console.log(`Linha ${i}:`, text.substring(0, 50));
        }

        const row = page.locator('tr').filter({ hasText: description });
        await expect(row).toBeVisible({ timeout: 15000 });

        // 2. Clicar no botão de ações (o que abre o modal de edição)
        // O botão de ações é o último na linha
        await row.locator('button').first().click();

        // 3. Clicar em excluir no modal
        const deleteButton = page.locator('button:has-text("Excluir")');
        await expect(deleteButton).toBeVisible();

        // Setup dialog handler before clicking
        page.once('dialog', dialog => dialog.accept());
        await deleteButton.click();

        // 4. Verificar se sumiu da lista
        await expect(page.locator(`text=${description}`)).not.toBeVisible();
    });

    test('deve permitir excluir múltiplas transações (Exclusão em Massa)', async ({ page }) => {
        // 1. Criar 3 transações de teste
        const batchId = Date.now();
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        const descriptions = [
            `Bulk 1 ${batchId}`,
            `Bulk 2 ${batchId}`,
            `Bulk 3 ${batchId}`
        ];

        await supabase.from('transactions').insert(descriptions.map(desc => ({
            description: desc,
            amount: 50,
            type: 'expense',
            status: 'paid',
            client_id: testClientId,
            created_at: now.toISOString()
        })));

        await page.goto('/financeiro');

        // Garante que o filtro de mês está no mês atual
        await page.fill('input[type="month"]', currentMonth);

        // 2. Selecionar as transações pelos checkboxes
        for (const desc of descriptions) {
            const row = page.locator('tr').filter({ hasText: desc });
            await expect(row).toBeVisible();
            await row.locator('input[type="checkbox"]').check();
        }

        // 3. Verificar se o botão de excluir em massa apareceu
        const bulkDeleteBtn = page.locator('button:has-text("Excluir (3)")');
        await expect(bulkDeleteBtn).toBeVisible();

        // 4. Clicar em excluir em massa e confirmar
        page.once('dialog', dialog => dialog.accept());
        await bulkDeleteBtn.click();

        // 5. Verificar se as transações sumiram
        for (const desc of descriptions) {
            await expect(page.locator(`text=${desc}`)).not.toBeVisible();
        }
    });
});
