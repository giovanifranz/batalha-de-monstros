import { expect } from '@playwright/test';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR, DUELO, DUELO_ESPELHADO } from './fixtures/monsters.ts';
import { cardDoMonstro } from './helpers/locators.ts';

test('a batalha termina sozinha e anuncia o vencedor que o algoritmo calculou', async ({
  page,
}) => {
  await test.step('Dado que estou na tela de montar batalha com o roster carregado', async () => {
    await page.goto('/battle');

    await expect(page.getByRole('heading', { name: 'Batalha' })).toBeVisible();
    await expect(cardDoMonstro(page, AUROX.name)).toBeVisible();
  });

  await test.step('Quando eu escalo Aurox e Brontor', async () => {
    await cardDoMonstro(page, AUROX.name).click();
    await cardDoMonstro(page, BRONTOR.name).click();

    await expect(page.getByRole('button', { name: `Remover ${AUROX.name}` })).toBeVisible();
    await expect(page.getByRole('button', { name: `Remover ${BRONTOR.name}` })).toBeVisible();
  });

  await test.step('E mando lutar', async () => {
    await page.getByRole('button', { name: 'Lutar!' }).click();

    await expect(page).toHaveURL(`/battle/${AUROX.id}/${BRONTOR.id}`);
    await expect(
      page.getByRole('heading', { name: `${AUROX.name} vs ${BRONTOR.name}` }),
    ).toBeVisible();
  });

  await test.step('Então, sem eu tocar em mais nada, o vencedor aparece ao fim da reprodução', async () => {
    const painel = page.getByRole('region', { name: 'Resultado da batalha: vencedor' });

    await expect(painel).toBeVisible({ timeout: 15_000 });
    await expect(painel).toContainText(`${DUELO.vencedor} venceu a batalha!`);
  });

  await test.step('E o resumo traz os rounds, os golpes e o dano de cada lado', async () => {
    const numeros = page
      .getByRole('region', { name: 'Resultado da batalha: vencedor' })
      .getByRole('definition');

    await expect(numeros).toHaveText([
      String(DUELO.rounds),
      String(DUELO.golpes),
      String(DUELO.danoDoAurox),
      String(DUELO.danoDoBrontor),
    ]);
  });

  await test.step('E a iniciativa é explicada pela regra que a decidiu', async () => {
    await expect(
      page.getByRole('region', { name: 'Resultado da batalha: vencedor' }),
    ).toContainText(
      `${AUROX.name} atacou primeiro por velocidade maior (${AUROX.speed} vs ${BRONTOR.speed}).`,
    );
  });

  await test.step('E o HP dos dois lados bate com o log, não com a largura da barra', async () => {
    await expect(page.getByRole('progressbar', { name: `HP de ${AUROX.name}` })).toHaveAttribute(
      'aria-valuenow',
      String(DUELO.hpFinalDoAurox),
    );
    await expect(page.getByRole('progressbar', { name: `HP de ${BRONTOR.name}` })).toHaveAttribute(
      'aria-valuenow',
      String(DUELO.hpFinalDoBrontor),
    );
  });

  await test.step('E existe exatamente um botão de rever a batalha', async () => {
    await expect(page.getByRole('button', { name: 'Rever batalha' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Pular para o fim' })).toHaveCount(0);
  });
});

test('com os lados trocados, quem vence e quem começa passam a ser o Lutador 2', async ({
  page,
}) => {
  await test.step('Dado o duelo montado ao contrário, por link direto', async () => {
    await page.goto(`/battle/${BRONTOR.id}/${AUROX.id}`);

    await expect(
      page.getByRole('heading', { name: `${BRONTOR.name} vs ${AUROX.name}` }),
    ).toBeVisible();
  });

  await test.step('Então o painel coroa o monstro da DIREITA', async () => {
    const painel = page.getByRole('region', { name: 'Resultado da batalha: vencedor' });

    await expect(painel).toContainText(`${DUELO_ESPELHADO.vencedor} venceu a batalha!`, {
      timeout: 15_000,
    });
    await expect(painel).not.toContainText(`${DUELO_ESPELHADO.perdedor} venceu a batalha!`);
  });

  await test.step('E credita a iniciativa ao monstro da DIREITA', async () => {
    await expect(
      page.getByRole('region', { name: 'Resultado da batalha: vencedor' }),
    ).toContainText(
      `${AUROX.name} atacou primeiro por velocidade maior (${AUROX.speed} vs ${BRONTOR.speed}).`,
    );
  });

  await test.step('E o resumo espelha os números do duelo original', async () => {
    await expect(
      page.getByRole('region', { name: 'Resultado da batalha: vencedor' }).getByRole('definition'),
    ).toHaveText([
      String(DUELO_ESPELHADO.rounds),
      String(DUELO_ESPELHADO.golpes),
      String(DUELO_ESPELHADO.danoDoBrontor),
      String(DUELO_ESPELHADO.danoDoAurox),
    ]);

    await expect(page.getByRole('progressbar', { name: `HP de ${BRONTOR.name}` })).toHaveAttribute(
      'aria-valuenow',
      String(DUELO_ESPELHADO.hpFinalDoBrontor),
    );
    await expect(page.getByRole('progressbar', { name: `HP de ${AUROX.name}` })).toHaveAttribute(
      'aria-valuenow',
      String(DUELO_ESPELHADO.hpFinalDoAurox),
    );
  });
});

test.describe('em velocidade 1x', () => {
  test.use({ speed: 1 });

  test('pular para o fim entrega o mesmo resultado da reprodução inteira', async ({ page }) => {
    await test.step('Dado que abri o duelo por link direto, em 1x', async () => {
      await page.goto(`/battle/${AUROX.id}/${BRONTOR.id}`);

      await expect(page.getByRole('radio', { name: 'Velocidade 1x' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(
        page.getByRole('progressbar', { name: `HP de ${BRONTOR.name}` }),
      ).toHaveAttribute('aria-valuenow', String(BRONTOR.hp));
    });

    await test.step('Quando eu pulo para o fim', async () => {
      await page.getByRole('button', { name: 'Pular para o fim' }).click();
    });

    await test.step('Então o resultado é o mesmo que a reprodução completa daria', async () => {
      const painel = page.getByRole('region', { name: 'Resultado da batalha: vencedor' });

      await expect(painel).toContainText(`${DUELO.vencedor} venceu a batalha!`);
      await expect(painel.getByRole('definition')).toHaveText([
        String(DUELO.rounds),
        String(DUELO.golpes),
        String(DUELO.danoDoAurox),
        String(DUELO.danoDoBrontor),
      ]);
      await expect(
        page.getByRole('progressbar', { name: `HP de ${BRONTOR.name}` }),
      ).toHaveAttribute('aria-valuenow', '0');
    });
  });
});

test('um duelo com um monstro que não está no roster mostra a batalha indisponível', async ({
  page,
}) => {
  await test.step('Dado um link direto para um id que não existe', async () => {
    await page.goto(`/battle/${AUROX.id}/e2e-nao-existe`);
  });

  await test.step('Então a tela explica o problema e oferece o caminho de volta', async () => {
    const alerta = page.getByRole('alert');

    await expect(alerta).toContainText('Batalha indisponível');
    await expect(alerta).toContainText(
      'Um dos monstros deste duelo não existe mais no seu roster.',
    );
    await expect(page.getByRole('link', { name: 'Escolher outros monstros' })).toBeVisible();
  });

  await test.step('E o link leva de volta para a montagem da batalha', async () => {
    await page.getByRole('link', { name: 'Escolher outros monstros' }).click();

    await expect(page).toHaveURL('/battle');
    await expect(cardDoMonstro(page, AUROX.name)).toBeVisible();
  });
});
