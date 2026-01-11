import { test, expect } from '@playwright/test';
import { supabase } from '../../src/lib/supabase';

test.describe('Gestão de Serviços', () => {
    let testClientId: string;

    test.beforeAll(async () => {
        // 0. Garantir um cliente para o teste
        const { data } = await supabase
            .from('clients')
            .insert([{
                name: 'Cliente Para Teste de Serviço',
                user_id: '00000000-0000-0000-0000-000000000000'
            }])
            .select()
            .single();

        if (data) testClientId = data.id;
    });

    test('deve permitir cadastrar um novo serviço para um cliente', async ({ page }) => {
        await page.goto('/servicos');

        // Aguarda os clientes carregarem no select
        await page.click('button:has-text("Novo Serviço")');

        const clientSelect = page.locator('select').first();
        await clientSelect.waitFor();

        await page.fill('input[placeholder="Ex: Hospedagem Hosting Pro"]', 'Serviço Playwright Test');

        // Seleciona o cliente que criamos no beforeAll
        await clientSelect.selectOption({ label: 'Cliente Para Teste de Serviço' });

        await page.fill('input[placeholder="299,00"]', '150.00');
        await page.selectOption('select >> nth=1', 'monthly'); // Segundo select (recorrência)

        await page.click('button:has-text("Criar Serviço")');

        await expect(page.locator('h3:has-text("Novo Serviço")')).not.toBeVisible();
        await expect(page.locator('text=Serviço Playwright Test')).toBeVisible();
        await expect(page.locator('text=R$ 150,00')).toBeVisible();
    });
});
