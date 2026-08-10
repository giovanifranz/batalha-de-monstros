import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { toMonster, type RosterCollection } from '@arena/infra/roster/collection';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@arena/ui/components/alert';
import { Button } from '@arena/ui/components/button';
import { Card, CardContent } from '@arena/ui/components/card';
import { VersusBar } from '@arena/ui/battle/VersusBar';
import { MonsterGrid } from '@arena/ui/monster/MonsterGrid';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Info, Sparkles, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MonsterFilters } from '@/components/MonsterFilters.tsx';
import { MonsterPagination } from '@/components/MonsterPagination.tsx';
import { useMonsterBrowser } from '@/hooks/useMonsterBrowser.ts';
import { BattleSetupActor } from '@/machines/battle-setup.context.tsx';
import { validateBrowserSearch } from '@/lib/search-params.ts';

export const Route = createFileRoute('/battle/')({
  validateSearch: validateBrowserSearch,
  component: BattlePage,
});

function prefilledMessage(left: Monster | null, right: Monster | null): string {
  if (left && right) {
    return `${left.name} e ${right.name} já estão escalados para este duelo.`;
  }

  const only = left ?? right;
  return `${only?.name} já está escalado para este duelo.`;
}

function fresh(roster: RosterCollection, id: string): Monster | null {
  const row = roster.get(id);

  return row ? toMonster(row) : null;
}

function BattlePage() {
  const { roster } = Route.useRouteContext();
  const browser = useMonsterBrowser(roster);
  const navigate = useNavigate();

  const setupActor = BattleSetupActor.useActorRef();
  const { left, right, activeSlot } = BattleSetupActor.useSelector((snapshot) => snapshot.context);
  const canFight = BattleSetupActor.useSelector((snapshot) => snapshot.matches('ready'));

  const validLeft = left ? fresh(roster, left.id) : null;
  const validRight = right ? fresh(roster, right.id) : null;
  const effectiveCanFight = canFight && Boolean(validLeft) && Boolean(validRight);
  const isEmpty = !validLeft && !validRight;
  const isPartial = Boolean(validLeft) !== Boolean(validRight);

  function clearSlot(slot: Side) {
    const monster = slot === 'left' ? left : right;
    if (monster) setupActor.send({ type: 'fighter.picked', monster });
  }

  useEffect(() => {
    if (left && !roster.has(left.id)) clearSlot('left');
    if (right && !roster.has(right.id)) clearSlot('right');
  });

  const [arrivedIds, setArrivedIds] = useState<ReadonlySet<string>>(() => {
    const arrival = setupActor.getSnapshot().context;
    return new Set(
      [arrival.left?.id, arrival.right?.id].filter((id): id is string => id !== undefined),
    );
  });

  useEffect(() => {
    const stillOccupying = new Set(
      [left?.id, right?.id].filter((id): id is string => id !== undefined),
    );

    setArrivedIds((current) => {
      const pruned = new Set([...current].filter((id) => stillOccupying.has(id)));
      return pruned.size === current.size ? current : pruned;
    });
  }, [left, right]);

  const arrivedLeft = validLeft && arrivedIds.has(validLeft.id) ? validLeft : null;
  const arrivedRight = validRight && arrivedIds.has(validRight.id) ? validRight : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Batalha</h1>
        <p className="text-muted-foreground text-sm">
          Escolha dois monstros do seu roster para lutar. Quem tiver a maior velocidade ataca
          primeiro.
        </p>
      </header>

      {isEmpty && (
        <Alert>
          <Info />
          <AlertTitle>Escale os dois lutadores</AlertTitle>
          <AlertDescription>
            Clique em dois monstros do grid abaixo. O primeiro clique preenche o Lutador 1, o
            segundo o Lutador 2.
          </AlertDescription>
        </Alert>
      )}

      {isPartial && (
        <Alert>
          <Info />
          <AlertTitle>Falta um lutador</AlertTitle>
          <AlertDescription>
            Escolha mais um monstro no grid abaixo para completar a dupla.
          </AlertDescription>
        </Alert>
      )}

      {(arrivedLeft || arrivedRight) && (
        <Alert>
          <Sparkles />
          <AlertTitle>Lutadores pré-selecionados</AlertTitle>
          <AlertDescription>{prefilledMessage(arrivedLeft, arrivedRight)}</AlertDescription>
          <AlertAction>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (arrivedLeft) clearSlot('left');
                if (arrivedRight) clearSlot('right');
              }}
            >
              Limpar pré-seleção
            </Button>
          </AlertAction>
        </Alert>
      )}

      <VersusBar
        left={validLeft}
        right={validRight}
        activeSlot={effectiveCanFight ? null : activeSlot}
        canFight={effectiveCanFight}
        onClear={clearSlot}
        onSwap={() => setupActor.send({ type: 'sides.swapped' })}
        onFight={() => {
          if (!validLeft || !validRight) return;

          void navigate({
            to: '/battle/$leftId/$rightId',
            params: { leftId: validLeft.id, rightId: validRight.id },
          });
        }}
      />

      <MonsterFilters q={browser.q} onQueryChange={browser.setQuery} />

      {browser.rosterSize === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <Swords className="text-primary mx-auto size-8" aria-hidden />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Nenhum lutador disponível</h2>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                O roster está vazio. Cadastre pelo menos dois monstros para batalhar.
              </p>
            </div>
            <Button asChild>
              <Link to="/monsters/new">Cadastrar o primeiro</Link>
            </Button>
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
          selectedIds={{ left: validLeft?.id, right: validRight?.id }}
          onSelect={(monster) => setupActor.send({ type: 'fighter.picked', monster })}
        />
      )}

      <MonsterPagination
        page={browser.page}
        totalPages={browser.totalPages}
        onChange={browser.setPage}
        hrefForPage={browser.hrefForPage}
      />
    </div>
  );
}
