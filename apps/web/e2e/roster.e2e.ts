import { expect } from '@playwright/test';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR, ROSTER } from './fixtures/monsters.ts';
import { cardDoRoster, cardsVisiveis } from './helpers/locators.ts';

/** Repetido de propósito: importar a constante deixaria as duas pontas concordando com o valor errado. */
const POR_PAGINA = 6;

/** Alcançado pelo texto porque não tem papel nem nome acessível; escopado porque o
 *  "Limpar busca" de dentro dele divide o nome acessível com o X do campo de busca. */
function cardDeAviso(page: Parameters<typeof cardDoRoster>[0], texto: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: texto });
}

test.describe('a lista de monstros', () => {
  test('mostra uma página de cada vez e o botão voltar desfaz a troca', async ({ page }) => {
    await test.step('Dado um roster com mais monstros do que cabem numa página', async () => {
      await page.goto('/');

      await expect(
        page.getByText(`${ROSTER.length} monstros prontos para batalhar.`),
      ).toBeVisible();
      await expect(cardsVisiveis(page)).toHaveCount(POR_PAGINA);
    });

    await test.step('Quando eu vou para a página 2', async () => {
      await page.getByRole('link', { name: 'Ir para a página 2' }).click();
    });

    await test.step('Então vejo o resto do elenco, e a URL carrega a página', async () => {
      await expect(page).toHaveURL(/[?&]page=2\b/);
      await expect(cardsVisiveis(page)).toHaveCount(ROSTER.length - POR_PAGINA);
      await expect(cardDoRoster(page, 'Hydrivo')).toBeVisible();
      await expect(cardDoRoster(page, 'Ignivor')).toBeVisible();
      await expect(cardDoRoster(page, AUROX.name)).toHaveCount(0);
    });

    await test.step('E o voltar do navegador me devolve para a página 1', async () => {
      // A paginação escreve com `history: 'push'` justamente para isto.
      await page.goBack();

      await expect(cardsVisiveis(page)).toHaveCount(POR_PAGINA);
      await expect(cardDoRoster(page, AUROX.name)).toBeVisible();
    });
  });

  test.describe('com o elenco cabendo numa página só', () => {
    test.use({ roster: ROSTER.slice(0, POR_PAGINA).map((monstro) => monstro.name) });

    test('não mostra paginação nenhuma', async ({ page }) => {
      await test.step(`Dado um roster de exatamente ${POR_PAGINA} monstros`, async () => {
        await page.goto('/');

        await expect(cardsVisiveis(page)).toHaveCount(POR_PAGINA);
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
      await expect(cardsVisiveis(page)).toHaveCount(1);
      await expect(cardDoRoster(page, BRONTOR.name)).toBeVisible();
      await expect(page.getByText(`Mostrando 1 de ${ROSTER.length} monstros.`)).toBeVisible();
      // A escrita na URL é debounced em 300 ms; o `expect` já espera por ela.
      await expect(page).toHaveURL(new RegExp(`[?&]q=${BRONTOR.name}\\b`));
    });

    await test.step('E o filtro sobrevive ao recarregar a página', async () => {
      await page.reload();

      await expect(page.getByLabel('Buscar monstro por nome')).toHaveValue(BRONTOR.name);
      await expect(cardsVisiveis(page)).toHaveCount(1);
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
      await expect(cardsVisiveis(page)).toHaveCount(0);
      await expect(page.getByText(`Mostrando 0 de ${ROSTER.length} monstros.`)).toBeVisible();
    });

    await test.step('E limpar devolve o elenco inteiro', async () => {
      await cardDeAviso(page, 'Nenhum monstro com esse nome.')
        .getByRole('button', { name: 'Limpar busca' })
        .click();

      await expect(cardsVisiveis(page)).toHaveCount(POR_PAGINA);
    });
  });
});

test.describe('excluir um monstro', () => {
  test.use({ roster: [AUROX.name, BRONTOR.name] });

  test('pede confirmação, pode ser cancelado e não volta ao recarregar', async ({ page }) => {
    await test.step('Dado um roster com dois monstros', async () => {
      await page.goto('/');

      await expect(cardsVisiveis(page)).toHaveCount(2);
    });

    await test.step(`Quando eu peço para excluir ${BRONTOR.name} e desisto`, async () => {
      await cardDoRoster(page, BRONTOR.name).getByRole('button', { name: 'Excluir' }).click();

      await expect(page.getByRole('alertdialog')).toContainText(`Excluir ${BRONTOR.name}?`);
      await page.getByRole('button', { name: 'Cancelar' }).click();
    });

    await test.step('Então ninguém saiu do roster', async () => {
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(cardsVisiveis(page)).toHaveCount(2);
    });

    await test.step('Quando eu peço de novo e confirmo', async () => {
      await cardDoRoster(page, BRONTOR.name).getByRole('button', { name: 'Excluir' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
    });

    await test.step('Então ele sai da tela e o aviso confirma', async () => {
      await expect(page.getByText(`${BRONTOR.name} saiu do roster.`)).toBeVisible();
      await expect(cardDoRoster(page, BRONTOR.name)).toHaveCount(0);
      await expect(page.getByText('1 monstro pronto para batalhar.')).toBeVisible();
    });

    await test.step('E ele não ressuscita ao recarregar', async () => {
      await page.reload();

      await expect(cardsVisiveis(page)).toHaveCount(1);
      await expect(cardDoRoster(page, AUROX.name)).toBeVisible();
      await expect(cardDoRoster(page, BRONTOR.name)).toHaveCount(0);
    });
  });
});

test.describe('o roster vazio', () => {
  // Um monstro só: o `seedIfEmpty` do boot planta os exemplos em qualquer coleção
  // que comece vazia, então excluir é o único caminho até o estado vazio.
  test.use({ roster: [AUROX.name] });

  test('explica o vazio e traz os exemplos de volta', async ({ page }) => {
    await test.step('Dado um roster com um único monstro', async () => {
      await page.goto('/');

      await expect(page.getByText('1 monstro pronto para batalhar.')).toBeVisible();
    });

    await test.step('Quando eu excluo o último que restava', async () => {
      await cardDoRoster(page, AUROX.name).getByRole('button', { name: 'Excluir' }).click();
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

    await test.step('Então os quatro monstros de exemplo do app aparecem', async () => {
      await expect(page.getByText('Monstros de exemplo restaurados.')).toBeVisible();
      await expect(page.getByText('4 monstros prontos para batalhar.')).toBeVisible();

      for (const nome of ['Ignaruk', 'Petragon', 'Umbrafel', 'Zefirion']) {
        await expect(cardDoRoster(page, nome)).toBeVisible();
      }
    });
  });
});
