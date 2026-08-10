import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

// Porta própria, e não a 5173 do `vp dev`: com `reuseExistingServer` ligado a
// suíte rodaria contra o servidor do desenvolvedor — e o localStorage dele.
const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Extensão própria: um `.spec.ts` seria coletado por `vp test` e quebraria lá.
  testMatch: '**/*.e2e.ts',

  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html', { open: 'never' }]],

  // Dobrados: a primeira navegação de cada worker paga a transformação do app
  // inteiro pelo dev server.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // Roda a partir de `apps/web`, então o `vp` resolve o pacote local sem o `defaultPackage` da raiz.
    command: 'vp dev',
    env: { PORT: String(PORT) },
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
