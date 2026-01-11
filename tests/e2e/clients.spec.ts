import { test, expect } from '@playwright/test';

test.describe('Gestão de Clientes', () => {
    test('deve permitir cadastrar um novo cliente e vê-lo na listagem', async ({ page }) => {
        // 1. Navegar para a página de clientes
        await page.goto('/clientes');

        // 2. Clicar no botão para adicionar novo cliente
        await page.click('button:has-text("Novo Cliente")');

        // 3. Preencher o formulário
        const clientName = `Cliente Teste ${Math.floor(Math.random() * 1000)}`;
        await page.fill('input[placeholder="Ex: João Silva"]', clientName);
        await page.fill('input[placeholder="joao@example.com"]', 'teste@playwright.com');
        await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 98765-4321');

        // 4. Salvar o cliente
        await page.click('button:has-text("Salvar Cliente")');

        // 5. Verificar se o modal fechou (aguarda o desaparecimento do texto do título do modal)
        await expect(page.locator('h3:has-text("Novo Cliente")')).not.toBeVisible();

        // 6. Verificar se o cliente aparece na listagem
        // Aguarda um pouco para o Supabase processar e o estado atualizar
        await page.waitForTimeout(2000);
        await expect(page.locator(`text=${clientName}`)).toBeVisible();
    });

    test('deve filtrar clientes na busca', async ({ page }) => {
        await page.goto('/clientes');

        // Assume que já existem clientes ou cria um cenário controlado
        const searchInput = page.locator('input[placeholder="Buscar por nome ou email..."]');
        await searchInput.fill('Inexistente XYZ');

        await expect(page.locator('text=Nenhum cliente encontrado')).toBeVisible();
    });
});
