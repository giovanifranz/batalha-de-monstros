import { StrictMode } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { roster } from '@/db/roster.ts';
import { seedRoster } from '@/db/seed-monsters.ts';
import { settingsStore } from '@/stores/settings.store.ts';
import { routeTree } from './routeTree.gen.ts';
import './index.css';

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

async function start() {
  try {
    await roster.preload();
    await seedRoster(roster);
  } catch (error) {
    console.error('Não foi possível preparar o roster:', error);
  }

  const root = document.getElementById('root');

  if (!root) {
    throw new Error('Não foi possível encontrar o elemento root para montar o app.');
  }

  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

void start();
