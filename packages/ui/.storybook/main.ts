import process from 'node:process';
import type { StorybookConfig } from '@storybook/react-vite';

/**
 * O prefixo em que o Storybook é servido. Errar aqui não dá erro: dá uma página
 * com TODO asset em 404. O default `/` é o que serve o `storybook dev`.
 *
 * Entra por `viteFinal` porque o builder do `@storybook/react-vite` FIXA
 * `base: './'` e mescla por cima da config do usuário — só o `viteFinal` fala
 * depois dele.
 *
 * `vp run <script>` roda em ambiente limpo, então `STORYBOOK_BASE_PATH` só chega
 * aqui pelo `env` de uma TAREFA; é por isso que o build é tarefa e não script.
 */
function resolveStorybookBase(): string {
  const raw = process.env.STORYBOOK_BASE_PATH?.trim();
  if (!raw || raw === '/') return '/';

  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

const config: StorybookConfig = {
  viteFinal: (config) => ({ ...config, base: resolveStorybookBase() }),
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // `@storybook/addon-essentials` não existe no Storybook 10: só o addon de a11y
  // ainda precisa ser listado.
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: { name: '@storybook/react-vite', options: {} },
};

export default config;
