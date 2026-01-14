import { test, expect } from '@playwright/test';

test.describe('Gestão de Clientes - Deleção', () => {
    test('deve permitir excluir um cliente existente', async ({ page }) => {
        // Navegar para a página de clientes
        await page.goto('/clientes');

        // Criar um novo cliente
        await page.click('button:has-text("Novo Cliente")');
        const clientName = `Cliente Delete ${Math.floor(Math.random() * 1000)}`;
        await page.fill('input[placeholder="Ex: João Silva"]', clientName);
        await page.fill('input[placeholder="joao@example.com"]', 'delete@test.com');
        await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 11111-1111');
        await page.click('button:has-text("Salvar Cliente")');
        await expect(page.locator(`text=${clientName}`)).toBeVisible();

        // Deletar o cliente recém-criado
        const clientRow = page.locator('tr', { hasText: clientName }).first();
        // The delete button is the second button in the actions cell
        await clientRow.locator('button').nth(1).click();
        // Aceitar o diálogo de confirmação
        page.once('dialog', dialog => dialog.accept());

        // Verificar que o cliente não está mais na lista
        await expect(page.locator(`text=${clientName}`)).not.toBeVisible();
    });
});
