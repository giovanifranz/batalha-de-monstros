import path from 'node:path';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Sem isso o `vp` abre um seletor de pacote a cada `vp dev` / `vp build`.
  defaultPackage: { dev: './apps/web', build: './apps/web' },

  // O `@` de `apps/web`, repetido de propósito: `vp test` na raiz varre o
  // workspace como um projeto Vitest só, e o `resolve` de cada pacote não vale
  // nessa execução. Só `apps/web` declara `@/*` em `paths`, então o alias global
  // não é ambíguo.
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './apps/web/src') } },

  fmt: {
    // docs/ é a especificação do projeto; o oxfmt nunca deve reescrevê-la.
    ignorePatterns: ['docs/**'],
    singleQuote: true,
    semi: true,
    overrides: [{ files: ['**/*.md'], options: { proseWrap: 'preserve' } }],
  },

  lint: {
    ignorePatterns: ['**/dist/**', '**/storybook-static/**', '**/routeTree.gen.ts'],
    plugins: ['typescript'],
    options: {
      // Liga o caminho type-aware (tsgolint): `vp check` vira format + lint + type-check.
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
    overrides: [
      {
        files: ['apps/web/**', 'packages/ui/**'],
        // Um override que declara `plugins` SUBSTITUI a lista base — daí o 'typescript' repetido.
        plugins: ['typescript', 'react'],
        rules: {
          'react/self-closing-comp': 'error',
          'react/jsx-key': 'error',
        },
      },
      {
        files: ['**/*.test.ts', '**/*.test.tsx', '**/*.stories.tsx'],
        plugins: ['typescript', 'react', 'vitest'],
        rules: { '@typescript-eslint/no-explicit-any': 'off' },
      },
      {
        // Ferramentas de linha de comando: a saída no stdout É a interface.
        files: ['packages/ui/scripts/**'],
        rules: { 'no-console': 'off' },
      },
    ],
  },

  run: {
    cache: true,
    tasks: {
      build: {
        command: 'vp build',
        dependsOn: [{ task: 'build', from: 'dependencies' }],
      },

      // TAREFA e não script porque `vp run <script>` roda em ambiente limpo: só o
      // `env` de uma tarefa faz `STORYBOOK_BASE_PATH` chegar (e entrar na chave de
      // cache). `exec` porque o binário `storybook` vem do node_modules do pacote.
      'build-storybook': {
        command: 'vp -C packages/ui exec storybook build',
        env: ['STORYBOOK_BASE_PATH'],
      },

      // Regressão visual: um PNG por story, comparado pixel a pixel com a
      // baseline. Depende do build do Storybook porque é ele que a captura
      // serve. Sem cache: o resultado depende da baseline no disco, que não
      // entra na chave.
      vrt: {
        command: 'vp -C packages/ui exec node scripts/vrt.ts',
        dependsOn: ['build-storybook'],
        cache: false,
      },

      // Promove a captura da vez a baseline. É o passo que se roda DE PROPÓSITO
      // depois de conferir que a mudança visual era a pretendida.
      'vrt:approve': {
        command: 'vp -C packages/ui exec node scripts/vrt.ts --approve',
        dependsOn: ['build-storybook'],
        cache: false,
      },

      // A suíte de stories NÃO roda no `vp test` da raiz: ele varre o workspace
      // como um projeto Vitest só e não enxerga o `vitest.config.ts` do
      // `packages/ui`, que declara o projeto de browser. O portão dela é o `ready`.
      'test:stories': {
        command: 'vp -C packages/ui test',
        // Sem cache: o resultado depende do browser e do CSS resolvido em runtime.
        cache: false,
      },
    },
  },
});
