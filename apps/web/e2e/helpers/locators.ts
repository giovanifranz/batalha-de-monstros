import type { Locator, Page } from '@playwright/test';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function monsterCard(page: Page, name: string): Locator {
  return page.getByRole('button', { name: new RegExp(`${escapeRegex(name)} HP\\b`) });
}

export function rosterCard(page: Page, name: string): Locator {
  return page.locator('[data-slot="card"]').filter({ hasText: name });
}

export function visibleCards(page: Page): Locator {
  return page.getByRole('button', { name: /^Excluir .+/ });
}
