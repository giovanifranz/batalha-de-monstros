import type { Locator, Page } from '@playwright/test';

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cardDoMonstro(page: Page, nome: string): Locator {
  return page.getByRole('button', { name: new RegExp(`${escapar(nome)} HP\\b`) });
}

export function cardDoRoster(page: Page, nome: string): Locator {
  return page.locator('[data-slot="card"]').filter({ hasText: nome });
}

export function cardsVisiveis(page: Page): Locator {
  return page.getByRole('button', { name: /^Excluir .+/ });
}
