import path from 'node:path';
import process from 'node:process';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    // OBRIGATÓRIO antes de react(): senão routeTree.gen.ts não é gerado.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    // `@vitejs/plugin-react` 6 não tem opção `babel`, e `babel()` é uma factory
    // assíncrona: sem o `await` o React Compiler nunca roda, em silêncio.
    await babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // O Vite não lê `PORT` sozinho; sem `PORT` no ambiente cai no padrão dele.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined },
  test: {
    // Segunda trava contra o Vitest coletar spec de Playwright (a primeira é a extensão `.e2e.ts`).
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
