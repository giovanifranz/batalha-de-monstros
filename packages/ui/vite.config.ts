import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    // `@vitejs/plugin-react` 6 é oxc-only e não tem mais opção `babel`; o React
    // Compiler entra por aqui. `babel()` é uma factory ASSÍNCRONA — sem o `await`
    // a entrada é aceita sem erro e o compiler fica silenciosamente inativo.
    await babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
});
