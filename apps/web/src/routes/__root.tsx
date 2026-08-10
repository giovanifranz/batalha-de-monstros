import { useEffect, type ReactNode } from 'react';
import type { RosterCollection } from '@arena/infra/roster/collection';
import { Button } from '@arena/ui/components/button';
import { Toaster } from '@arena/ui/components/sonner';
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useSelector } from '@xstate/react';
import { Moon, Sun, Swords } from 'lucide-react';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { BattleSetupActor } from '@/machines/battle-setup.context.tsx';
import { settingsStore } from '@/stores/settings.store.ts';

export type RouterContext = {
  roster: RosterCollection;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorScreen,
  notFoundComponent: () => (
    <div className="mx-auto mt-16 max-w-md space-y-4 text-center">
      <p className="text-muted-foreground">Essa rota não existe.</p>
      <Button asChild>
        <Link to="/">Voltar para o roster</Link>
      </Button>
    </div>
  ),
});

const navLink =
  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground';

/**
 * O casco: header, tema e `<main>`. Separado do `RootLayout` porque o
 * `errorComponent` da raiz SUBSTITUI o componente da raiz — sem ele, qualquer
 * rota que lance derruba a navegação junto e não sobra caminho de volta.
 */
function AppShell({ children }: { children: ReactNode }) {
  // `useSelector` do @xstate/react também lê um store do @xstate/store.
  const theme = useSelector(settingsStore, (snapshot) => snapshot.context.theme);

  // O tema é uma classe no <html>, fora da árvore React — precisa de efeito.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        {/* `flex-wrap` medido: a 320px o wordmark mais os links somavam 413px de
            `scrollWidth` e a página inteira rolava na horizontal. */}
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
          <Link to="/" className="mr-auto flex items-center gap-2">
            <Swords className="text-primary size-5" aria-hidden />
            <span className="wordmark text-[11px] leading-none">BATALHA DE MONSTROS</span>
          </Link>

          <Link to="/" className={navLink}>
            Roster
          </Link>
          <Link to="/monsters/new" className={navLink}>
            Cadastrar
          </Link>
          <Link to="/battle" className={navLink}>
            Batalhar
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => settingsStore.trigger.themeToggled()}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}

function RootLayout() {
  return (
    <AppShell>
      {/* O `BattleSetupActor` fica acima das rotas porque a seleção sobrevive à navegação. */}
      <NuqsAdapter>
        <BattleSetupActor.Provider>
          <Outlet />
        </BattleSetupActor.Provider>
      </NuqsAdapter>
    </AppShell>
  );
}

/**
 * `reset` refaz a renderização da rota sem recarregar, o que resolve a causa
 * transitória e não a que está na URL — daí o link para o roster ao lado.
 */
function RootErrorScreen({ error, reset }: ErrorComponentProps) {
  return (
    <AppShell>
      <div className="mx-auto mt-12 max-w-md space-y-4 text-center">
        <h1 className="text-xl font-bold">Algo quebrou nesta tela.</h1>
        <p className="text-muted-foreground text-sm break-words">{error.message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Tentar de novo</Button>
          <Button asChild variant="secondary">
            <Link to="/">Voltar para o roster</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
