export default {
  packageManager: 'pnpm',

  // Obrigatório: a autodescoberta não acha o vitest-runner neste workspace pnpm
  // (o glob resolve para dentro do `.pnpm` de @stryker-mutator/core).
  plugins: ['@stryker-mutator/vitest-runner'],

  testRunner: 'vitest',
  vitest: {
    configFile: 'vite.config.ts',
  },

  // Aponta DE PROPÓSITO para um arquivo inexistente: assim o TSConfigPreprocessor
  // não roda e não chama `ts.parseConfigFileTextToJson`, que o typescript@7 deste
  // catálogo não expõe. Apagar esta linha quebra toda execução do `test:mutation`.
  tsconfigFile: 'tsconfig.stryker-unused.json',

  mutate: ['src/**/*.ts', '!src/**/*.test.ts'],
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },

  // Sem folga: toda exceção legítima é silenciada com `// Stryker disable` +
  // motivo no código, o que reduz o denominador em vez de esconder um sobrevivente.
  thresholds: { high: 100, low: 100, break: 100 },

  timeoutMS: 20000,
  concurrency: 4,
};
