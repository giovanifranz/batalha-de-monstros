import { StrictMode } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { roster } from '@/db/roster.ts';
import { seedRoster } from '@/db/seed-monsters.ts';
import { startAxeInDevelopment } from '@/lib/dev-axe.ts';
import { settingsStore } from '@/stores/settings.store.ts';
import { routeTree } from './routeTree.gen.ts';
import './index.css';

// ANTES do primeiro paint: um `useEffect` roda DEPOIS, e a primeira frame sairia
// no tema claro e piscaria.
document.documentElement.classList.toggle(
  'dark',
  settingsStore.getSnapshot().context.theme === 'dark',
);

const router = createRouter({
  routeTree,
  context: { roster },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/*
 * O `await` acontece ANTES do `createRoot` de propósito: `preload()` é uma
 * leitura síncrona do localStorage embrulhada numa Promise, e sem ele a primeira
 * frame mostra o estado vazio por um tick antes de trocar.
 *
 * Falha de semente NÃO impede o app de subir — um roster vazio com o botão de
 * restaurar é melhor que uma tela branca.
 */
async function start() {
  try {
    await roster.preload();
    await seedRoster(roster);
  } catch (error) {
    console.error('Não foi possível preparar o roster:', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );

  // Sem `await`: o observador não pode atrasar o primeiro paint.
  void startAxeInDevelopment();
}

void start();
