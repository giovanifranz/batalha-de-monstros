import { useState } from 'react';
import { MonsterNotFoundError } from '@arena/domain/errors';
import type { Monster } from '@arena/domain/monster';
import { removeMonster } from '@arena/infra/roster/collection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@arena/ui/components/alert-dialog';
import { Button } from '@arena/ui/components/button';
import { Card, CardContent } from '@arena/ui/components/card';
import { MonsterGrid } from '@arena/ui/monster/MonsterGrid';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus, Sparkles, Swords, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MonsterFilters } from '@/components/MonsterFilters.tsx';
import { MonsterPagination } from '@/components/MonsterPagination.tsx';
import { seedExamples } from '@/db/seed-monsters.ts';
import { useMonsterBrowser } from '@/hooks/useMonsterBrowser.ts';
import { validateBrowserSearch } from '@/lib/search-params.ts';

export const Route = createFileRoute('/')({
  validateSearch: validateBrowserSearch,
  component: RosterPage,
});

function monsterCount(count: number): string {
  return count === 1 ? '1 monstro' : `${count} monstros`;
}

function rosterSummary(totalItems: number, rosterSize: number, filtering: boolean): string {
  if (rosterSize === 0) return 'Nenhum monstro cadastrado ainda.';
  if (filtering) return `Mostrando ${totalItems} de ${monsterCount(rosterSize)}.`;

  return rosterSize === 1
    ? '1 monstro pronto para batalhar.'
    : `${rosterSize} monstros prontos para batalhar.`;
}

function RosterPage() {
  const { roster } = Route.useRouteContext();
  const browser = useMonsterBrowser(roster);
  const navigate = useNavigate();

  const [pendingRemoval, setPendingRemoval] = useState<Monster | null>(null);

  async function removeConfirmed(monster: Monster) {
    try {
      await removeMonster(roster, monster.id);
      toast.success(`${monster.name} saiu do roster.`);
    } catch (error) {
      toast.error(
        error instanceof MonsterNotFoundError
          ? `${monster.name} já não estava no roster.`
          : `Não foi possível excluir ${monster.name}.`,
      );
    }
  }

  async function restoreExamples() {
    try {
      const seeded = await seedExamples(roster);
      toast[seeded ? 'success' : 'info'](
        seeded ? 'Monstros de exemplo restaurados.' : 'O roster já tem monstros.',
      );
    } catch {
      toast.error('Não foi possível restaurar os exemplos.');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
          <p className="text-muted-foreground text-sm">
            {rosterSummary(browser.totalItems, browser.rosterSize, browser.q !== '')}
          </p>
        </div>

        <Button asChild>
          <Link to="/monsters/new">
            <Plus className="size-4" /> Novo monstro
          </Link>
        </Button>
      </header>

      <MonsterFilters q={browser.q} onQueryChange={browser.setQuery} />

      {browser.rosterSize === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <Swords className="text-primary mx-auto size-8" aria-hidden />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Comece o seu roster</h2>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                O roster está vazio. Cadastre um monstro ou traga os exemplos de volta.
              </p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                Com dois monstros cadastrados você já pode colocá-los para lutar.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/monsters/new">Cadastrar o primeiro</Link>
              </Button>
              <Button variant="secondary" onClick={() => void restoreExamples()}>
                <Sparkles className="size-4" /> Restaurar exemplos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : browser.totalItems === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <h2 className="text-lg font-semibold">Nenhum resultado</h2>
            <p className="text-muted-foreground">Nenhum monstro com esse nome.</p>
            <Button variant="secondary" onClick={() => browser.setQuery('')}>
              Limpar busca
            </Button>
          </CardContent>
        </Card>
      ) : (
        <MonsterGrid
          monsters={browser.monsters}
          onEdit={(monster) =>
            void navigate({
              to: '/monsters/$monsterId/edit',
              params: { monsterId: monster.id },
            })
          }
          onRemove={setPendingRemoval}
        />
      )}

      <MonsterPagination
        page={browser.page}
        totalPages={browser.totalPages}
        onChange={browser.setPage}
        hrefForPage={browser.hrefForPage}
      />

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive-ink" />
            </AlertDialogMedia>
            <AlertDialogTitle>Excluir {pendingRemoval?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O monstro sai do roster deste navegador para sempre. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingRemoval) void removeConfirmed(pendingRemoval);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
