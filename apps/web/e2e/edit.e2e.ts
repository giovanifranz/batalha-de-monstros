import { expect } from '@playwright/test';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR } from './fixtures/monsters.ts';
import { rosterCard, visibleCards } from './helpers/locators.ts';

const NEW_NAME = 'Vorax';

test.describe('editar um monstro', () => {
  test.use({ roster: [AUROX.name, BRONTOR.name] });

  test('abre preenchido, valida o orçamento e salva o que eu mudei', async ({ page }) => {
    await test.step('Dado um roster com dois monstros', async () => {
      await page.goto('/');

      await expect(visibleCards(page)).toHaveCount(2);
    });

    await test.step(`Quando eu peço para editar ${AUROX.name}`, async () => {
      await rosterCard(page, AUROX.name).getByRole('button', { name: 'Editar' }).click();
    });

    await test.step('Então o formulário abre com os atributos dele', async () => {
      await expect(page.getByRole('heading', { name: `Editar ${AUROX.name}` })).toBeVisible();
      await expect(page.getByLabel('Nome')).toHaveValue(AUROX.name);
      await expect(page.getByLabel('Ataque')).toHaveValue(String(AUROX.attack));
      await expect(page.getByLabel('Defesa')).toHaveValue(String(AUROX.defense));
      await expect(page.getByLabel('Velocidade')).toHaveValue(String(AUROX.speed));
      await expect(page.getByLabel('HP')).toHaveValue(String(AUROX.hp));
      await expect(page.getByLabel('URL da imagem')).toHaveValue(AUROX.imageUrl);
    });

    await test.step('Quando eu estouro o orçamento de 250 pontos', async () => {
      await page.getByLabel('Defesa').fill('100');
      await page.getByLabel('Velocidade').fill('100');
    });

    await test.step('Então o aviso aparece e o botão de salvar desabilita', async () => {
      await expect(
        page.getByText('A soma dos atributos não pode ultrapassar 250 pontos'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    });

    await test.step('Quando eu volto para dentro do orçamento e troco o nome', async () => {
      await page.getByLabel('Defesa').fill(String(AUROX.defense));
      await page.getByLabel('Velocidade').fill(String(AUROX.speed));
      await page.getByLabel('Nome').fill(NEW_NAME);
      await page.getByRole('button', { name: 'Salvar alterações' }).click();
    });

    await test.step('Então volto ao roster com o nome novo no lugar do antigo', async () => {
      await expect(page.getByText(`${NEW_NAME} foi atualizado.`)).toBeVisible();
      await expect(page).toHaveURL(/\/(\?|$)/);
      await expect(rosterCard(page, NEW_NAME)).toBeVisible();
      await expect(rosterCard(page, AUROX.name)).toHaveCount(0);
      await expect(visibleCards(page)).toHaveCount(2);
    });

    await test.step('E o outro monstro segue intacto', async () => {
      await expect(rosterCard(page, BRONTOR.name)).toBeVisible();
    });
  });

  test('avisa quando o monstro pedido não existe', async ({ page }) => {
    await test.step('Quando eu abro a edição de um id que não está no roster', async () => {
      await page.goto('/monsters/99999999-9999-4999-8999-999999999999/edit');
    });

    await test.step('Então a tela explica e oferece a volta', async () => {
      await expect(page.getByText('Esse monstro não está mais no seu roster.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Voltar ao roster' })).toBeVisible();
    });
  });
});
