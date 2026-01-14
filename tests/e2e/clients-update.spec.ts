import { test, expect } from '@playwright/test';

test.describe('Gestão de Clientes - Atualização', () => {
    test('deve permitir editar o nome de um cliente existente', async ({ page }) => {
        // Navegar para a página de clientes
        await page.goto('/clientes');

        // Criar um novo cliente
        await page.click('button:has-text("Novo Cliente")');
        const clientName = `Cliente Edit ${Math.floor(Math.random() * 1000)}`;
        await page.fill('input[placeholder="Ex: João Silva"]', clientName);
        await page.fill('input[placeholder="joao@example.com"]', 'edit@test.com');
        await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 22222-2222');
        await page.click('button:has-text("Salvar Cliente")');
        await expect(page.locator(`text=${clientName}`)).toBeVisible();

        // Entrar no modo de edição
        const editButton = page.locator('tr', { hasText: clientName }).locator('button').first();
        await editButton.click();

        // Alterar o nome
        const newName = clientName + ' Updated';
        await page.fill('input[name="name"]', newName);
        await page.click('button:has-text("Atualizar Dados")');

        // Verificar atualização
        await expect(page.locator(`text=${newName}`)).toBeVisible();
    });
});
