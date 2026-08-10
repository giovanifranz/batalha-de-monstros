import { expect } from '@playwright/test';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR, ROSTER } from './fixtures/monsters.ts';
import { rosterCard, visibleCards } from './helpers/locators.ts';

const PER_PAGE = 8;

function noticeCard(page: Parameters<typeof rosterCard>[0], text: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: text });
}

test.describe('a lista de monstros', () => {
  test('mostra uma página de cada vez e o botão voltar desfaz a troca', async ({ page }) => {
    await test.step('Dado um roster com mais monstros do que cabem numa página', async () => {
      await page.goto('/');

      await expect(
        page.getByText(`${ROSTER.length} monstros prontos para batalhar.`),
      ).toBeVisible();
      await expect(visibleCards(page)).toHaveCount(PER_PAGE);
    });

    await test.step('Quando eu vou para a página 2', async () => {
      await page.getByRole('link', { name: 'Ir para a página 2' }).click();
    });

    await test.step('Então vejo o resto do elenco, e a URL carrega a página', async () => {
      await expect(page).toHaveURL(/[?&]page=2\b/);
      await expect(visibleCards(page)).toHaveCount(ROSTER.length - PER_PAGE);
      await expect(rosterCard(page, 'Jelmoro')).toBeVisible();
      await expect(rosterCard(page, 'Kraveln')).toBeVisible();
      await expect(rosterCard(page, AUROX.name)).toHaveCount(0);
    });

    await test.step('E o voltar do navegador me devolve para a página 1', async () => {
      await page.goBack();

      await expect(visibleCards(page)).toHaveCount(PER_PAGE);
      await expect(rosterCard(page, AUROX.name)).toBeVisible();
    });
  });

  test.describe('com o elenco cabendo numa página só', () => {
    test.use({ roster: ROSTER.slice(0, PER_PAGE).map((monster) => monster.name) });

    test('não mostra paginação nenhuma', async ({ page }) => {
      await test.step(`Dado um roster de exatamente ${PER_PAGE} monstros`, async () => {
        await page.goto('/');

        await expect(visibleCards(page)).toHaveCount(PER_PAGE);
      });

      await test.step('Então não há controle de paginação na tela', async () => {
        await expect(page.getByRole('navigation', { name: 'pagination' })).toHaveCount(0);
      });
    });
  });
});

test.describe('a busca por nome', () => {
  test('filtra o grid, fica na URL e sobrevive ao recarregar', async ({ page }) => {
    await test.step('Dado que estou no roster', async () => {
      await page.goto('/');
    });

    await test.step(`Quando eu busco por "${BRONTOR.name}"`, async () => {
      await page.getByLabel('Buscar monstro por nome').fill(BRONTOR.name);
    });

    await test.step('Então só ele sobra, e a busca aparece na URL', async () => {
      await expect(visibleCards(page)).toHaveCount(1);
      await expect(rosterCard(page, BRONTOR.name)).toBeVisible();
      await expect(page.getByText(`Mostrando 1 de ${ROSTER.length} monstros.`)).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`[?&]q=${BRONTOR.name}\\b`));
    });

    await test.step('E o filtro sobrevive ao recarregar a página', async () => {
      await page.reload();

      await expect(page.getByLabel('Buscar monstro por nome')).toHaveValue(BRONTOR.name);
      await expect(visibleCards(page)).toHaveCount(1);
    });
  });

  test('sem resultado, oferece limpar o filtro em vez de uma tela muda', async ({ page }) => {
    await test.step('Dado que estou no roster', async () => {
      await page.goto('/');
    });

    await test.step('Quando eu busco por um nome que ninguém tem', async () => {
      await page.getByLabel('Buscar monstro por nome').fill('zzzz');
    });

    await test.step('Então a tela diz que não achou e oferece limpar', async () => {
      await expect(page.getByText('Nenhum monstro com esse nome.')).toBeVisible();
      await expect(visibleCards(page)).toHaveCount(0);
      await expect(page.getByText(`Mostrando 0 de ${ROSTER.length} monstros.`)).toBeVisible();
    });

    await test.step('E limpar devolve o elenco inteiro', async () => {
      await noticeCard(page, 'Nenhum monstro com esse nome.')
        .getByRole('button', { name: 'Limpar busca' })
        .click();

      await expect(visibleCards(page)).toHaveCount(PER_PAGE);
    });
  });
});

test.describe('excluir um monstro', () => {
  test.use({ roster: [AUROX.name, BRONTOR.name] });

  test('pede confirmação, pode ser cancelado e não volta ao trocar de tela', async ({ page }) => {
    await test.step('Dado um roster com dois monstros', async () => {
      await page.goto('/');

      await expect(visibleCards(page)).toHaveCount(2);
    });

    await test.step(`Quando eu peço para excluir ${BRONTOR.name} e desisto`, async () => {
      await rosterCard(page, BRONTOR.name).getByRole('button', { name: 'Excluir' }).click();

      await expect(page.getByRole('alertdialog')).toContainText(`Excluir ${BRONTOR.name}?`);
      await page.getByRole('button', { name: 'Cancelar' }).click();
    });

    await test.step('Então ninguém saiu do roster', async () => {
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(visibleCards(page)).toHaveCount(2);
    });

    await test.step('Quando eu peço de novo e confirmo', async () => {
      await rosterCard(page, BRONTOR.name).getByRole('button', { name: 'Excluir' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
    });

    await test.step('Então ele sai da tela e o aviso confirma', async () => {
      await expect(page.getByText(`${BRONTOR.name} saiu do roster.`)).toBeVisible();
      await expect(rosterCard(page, BRONTOR.name)).toHaveCount(0);
      await expect(page.getByText('1 monstro pronto para batalhar.')).toBeVisible();
    });

    await test.step('E ele não volta ao navegar para outra tela e voltar', async () => {
      await page.getByRole('link', { name: 'Novo monstro' }).click();
      await page.goBack();

      await expect(visibleCards(page)).toHaveCount(1);
      await expect(rosterCard(page, AUROX.name)).toBeVisible();
      await expect(rosterCard(page, BRONTOR.name)).toHaveCount(0);
    });
  });
});

test.describe('o roster vazio', () => {
  test.use({ roster: [AUROX.name] });

  test('explica o vazio e traz os exemplos de volta', async ({ page }) => {
    await test.step('Dado um roster com um único monstro', async () => {
      await page.goto('/');

      await expect(page.getByText('1 monstro pronto para batalhar.')).toBeVisible();
    });

    await test.step('Quando eu excluo o último que restava', async () => {
      await rosterCard(page, AUROX.name).getByRole('button', { name: 'Excluir' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
    });

    await test.step('Então a tela vazia oferece cadastrar ou restaurar', async () => {
      await expect(page.getByText('Nenhum monstro cadastrado ainda.')).toBeVisible();
      await expect(
        page.getByText('O roster está vazio. Cadastre um monstro ou traga os exemplos de volta.'),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Cadastrar o primeiro' })).toBeVisible();
    });

    await test.step('Quando eu restauro os exemplos', async () => {
      await page.getByRole('button', { name: 'Restaurar exemplos' }).click();
    });

    await test.step('Então os doze monstros de exemplo do app aparecem, paginados', async () => {
      await expect(page.getByText('Monstros de exemplo restaurados.')).toBeVisible();
      await expect(page.getByText('12 monstros prontos para batalhar.')).toBeVisible();

      await expect(visibleCards(page)).toHaveCount(PER_PAGE);
      await expect(page.getByRole('navigation', { name: 'pagination' })).toBeVisible();

      await expect(rosterCard(page, 'Aurevanto')).toBeVisible();
      await expect(rosterCard(page, 'Zefirion')).toHaveCount(0);
    });
  });
});
