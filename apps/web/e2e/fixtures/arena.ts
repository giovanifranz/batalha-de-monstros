import type { Monster } from '@arena/domain/monster';
import { expect, test as base } from '@playwright/test';
import { ROSTER } from './monsters.ts';

const SEED_KEY = 'arena:seed';
const SETTINGS_KEY = 'arena:settings';

function settingsPayload(speed: PlaybackSpeed): string {
  return JSON.stringify({ context: { speed, theme: 'dark' }, version: 1 });
}

export type PlaybackSpeed = 1 | 2 | 4;

type ArenaOptions = {
  roster: readonly string[];
  speed: PlaybackSpeed;
};

function resolveCast(names: readonly string[]): readonly Monster[] {
  return names.map((name) => {
    const found = ROSTER.find((monster) => monster.name === name);
    if (!found) throw new Error(`Monstro de fixture inexistente: ${name}`);

    return found;
  });
}

export const test = base.extend<ArenaOptions>({
  roster: [ROSTER.map((monster) => monster.name), { option: true }],
  speed: [4, { option: true }],

  page: async ({ page, baseURL, roster, speed }, use) => {
    await page.addInitScript(
      ([seedKey, seedValue, settingsKey, settingsValue]: string[]) => {
        window.localStorage.setItem(seedKey, seedValue);
        if (window.localStorage.getItem(settingsKey) === null) {
          window.localStorage.setItem(settingsKey, settingsValue);
        }
      },
      [SEED_KEY, JSON.stringify(resolveCast(roster)), SETTINGS_KEY, settingsPayload(speed)],
    );

    const origin = new URL(baseURL ?? 'http://localhost').origin;
    const escaped: string[] = [];
    const isLocal = (url: string) => {
      if (/^(data|blob|about|chrome-error):/.test(url)) return true;

      try {
        return new URL(url).origin === origin;
      } catch {
        return false;
      }
    };

    page.on('request', (request) => {
      if (!isLocal(request.url())) escaped.push(`${request.method()} ${request.url()}`);
    });
    await page.route(
      (url) => !isLocal(url.toString()),
      (route) => route.abort(),
    );

    await use(page);

    expect(escaped, 'a suíte tem de terminar com zero requisição cross-origin').toEqual([]);
  },
});
