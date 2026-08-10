import { expect } from '@playwright/test';
import { test } from './fixtures/arena.ts';
import { BRONTOR, DUELO_DO_CADASTRO, ROSTER, SOMBRASTRO } from './fixtures/monsters.ts';
import { cardDoMonstro, cardDoRoster } from './helpers/locators.ts';

test('um monstro cadastrado pelo formulário entra no roster, já escalado, e vence a batalha', async ({
  page,
}) => {
  await test.step('Dado que estou na tela de cadastro', async () => {
    await page.goto('/monsters/new');

    await expect(page.getByRole('heading', { name: 'Cadastrar monstro' })).toBeVisible();
  });

  await test.step('Quando eu envio o formulário sem preencher nada', async () => {
    await page.getByRole('button', { name: 'Cadastrar monstro' }).click();
  });

  await test.step('Então o nome obrigatório e a URL da imagem são cobrados', async () => {
    await expect(
      page.getByRole('alert').filter({ hasText: 'Use pelo menos 2 caracteres' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Informe uma URL de imagem válida' }),
    ).toBeVisible();
    await expect(page).toHaveURL('/monsters/new');
  });

  await test.step('Quando eu estouro o orçamento de 250 pontos', async () => {
    await page.getByLabel('Nome', { exact: true }).fill(SOMBRASTRO.nome);
    await page.getByLabel('Ataque', { exact: true }).fill('100');
    await page.getByLabel('Defesa', { exact: true }).fill('100');
    await page.getByLabel('Velocidade', { exact: true }).fill('100');
    await page.getByLabel('HP', { exact: true }).fill('300');
  });

  await test.step('Então a regra de balanceamento aparece com quanto passou', async () => {
    await expect(page.getByRole('status')).toContainText('150 pontos acima do limite');
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'A soma dos atributos não pode ultrapassar 250 pontos' }),
    ).toBeVisible();
  });

  await test.step('Quando eu corrijo os atributos para valores válidos', async () => {
    await page.getByLabel('Ataque', { exact: true }).fill(SOMBRASTRO.ataque);
    await page.getByLabel('Defesa', { exact: true }).fill(SOMBRASTRO.defesa);
    await page.getByLabel('Velocidade', { exact: true }).fill(SOMBRASTRO.velocidade);
    await page.getByLabel('HP', { exact: true }).fill(SOMBRASTRO.hp);
    await page.getByLabel('URL da imagem', { exact: true }).fill(SOMBRASTRO.imagem);
  });

  await test.step('Então não sobra nenhum erro na tela', async () => {
    await expect(page.getByRole('status')).toContainText('Restam 0 pontos');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  await test.step('E salvo o monstro', async () => {
    await page.getByRole('button', { name: 'Cadastrar monstro' }).click();
  });

  await test.step('Então sou levado para a batalha com ele já escalado', async () => {
    await expect(page).toHaveURL('/battle');
    await expect(page.getByRole('button', { name: `Remover ${SOMBRASTRO.nome}` })).toBeVisible();
    await expect(
      page.getByText(`${SOMBRASTRO.nome} já está escalado para este duelo.`),
    ).toBeVisible();
  });

  await test.step(`Quando eu o coloco para lutar contra ${BRONTOR.name}`, async () => {
    await cardDoMonstro(page, BRONTOR.name).click();
    await page.getByRole('button', { name: 'Lutar!' }).click();
  });

  await test.step('Então ele vence, com os números que o algoritmo calculou', async () => {
    const painel = page.getByRole('region', { name: 'Resultado da batalha: vencedor' });

    await expect(painel).toContainText(`${DUELO_DO_CADASTRO.vencedor} venceu a batalha!`, {
      timeout: 15_000,
    });
    await expect(painel.getByRole('definition')).toHaveText([
      String(DUELO_DO_CADASTRO.rounds),
      String(DUELO_DO_CADASTRO.golpes),
      String(DUELO_DO_CADASTRO.danoDoSombrastro),
      String(DUELO_DO_CADASTRO.danoDoBrontor),
    ]);
  });

  await test.step('E ele continua no roster enquanto a sessão dura', async () => {
    await page.getByRole('link', { name: 'Roster' }).click();

    await expect(
      page.getByText(`${ROSTER.length + 1} monstros prontos para batalhar.`),
    ).toBeVisible();

    await page.getByLabel('Buscar monstro por nome').fill(SOMBRASTRO.nome);

    await expect(cardDoRoster(page, SOMBRASTRO.nome)).toBeVisible();
    await expect(page.getByText(`Mostrando 1 de ${ROSTER.length + 1} monstros.`)).toBeVisible();
  });

  await test.step('E ele NÃO sobrevive a um documento novo, porque o roster é da sessão', async () => {
    await page.goto('/');

    await expect(page.getByText(`${ROSTER.length} monstros prontos para batalhar.`)).toBeVisible();
    await expect(cardDoRoster(page, SOMBRASTRO.nome)).toHaveCount(0);
  });
});
