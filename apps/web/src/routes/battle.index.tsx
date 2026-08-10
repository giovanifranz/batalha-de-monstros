import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
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
import { validateBrowserSearch } from '@/search-params.ts';

export const Route = createFileRoute('/battle/')({
  validateSearch: validateBrowserSearch,
  component: BattlePage,
});

/**
 * Duas causas levam ao mesmo estado (cadastro e volta do roster), então a frase
 * fala de onde o monstro ESTÁ, nunca de como chegou lá. Recebe `arrivedIds`
 * filtrado, nunca o `left`/`right` cru.
 */
function prefilledMessage(left: Monster | null, right: Monster | null): string {
  if (left && right) {
    return `${left.name} e ${right.name} já estão escalados para este duelo.`;
  }

  const only = left ?? right;
  return `${only?.name} já está escalado para este duelo.`;
}

function BattlePage() {
  const { roster } = Route.useRouteContext();
  const browser = useMonsterBrowser(roster);
  const navigate = useNavigate();

  const setupActor = BattleSetupActor.useActorRef();
  const { left, right, activeSlot } = BattleSetupActor.useSelector((snapshot) => snapshot.context);
  // A máquina garante que os dois slots estão cheios, não que os monstros ainda
  // existem no roster: `effectiveCanFight` é a conjunção, nunca um substituto.
  const canFight = BattleSetupActor.useSelector((snapshot) => snapshot.matches('ready'));

  // A máquina guarda uma CÓPIA do `Monster` do clique: ele pode ter sido
  // excluído (nesta aba, em outra, ou por resincronização) sem ela saber.
  const validLeft = left && roster.has(left.id) ? left : null;
  const validRight = right && roster.has(right.id) ? right : null;
  const effectiveCanFight = canFight && Boolean(validLeft) && Boolean(validRight);
  const isEmpty = !validLeft && !validRight;
  const isPartial = Boolean(validLeft) !== Boolean(validRight);

  function clearSlot(slot: Side) {
    const monster = slot === 'left' ? left : right;
    // Não há evento "limpar só este slot": reenviar o mesmo monstro cai no ramo
    // "já escalado" de `togglePick`. Lê o `left`/`right` CRU, que é o que a
    // máquina tem guardado e o que precisa bater por `id`.
    if (monster) setupActor.send({ type: 'fighter.picked', monster });
  }

  // Evacua da MÁQUINA o slot cujo monstro sumiu do roster; `validLeft`/
  // `validRight` só consertam a renderização. SEM array de dependências de
  // propósito: `roster.has` é leitura síncrona de um objeto externo ao React.
  useEffect(() => {
    if (left && !roster.has(left.id)) clearSlot('left');
    if (right && !roster.has(right.id)) clearSlot('right');
  });

  // Capturado uma vez, na MONTAGEM: quem já vinha escalado antes de qualquer clique nesta tela.
  const [arrivedIds, setArrivedIds] = useState<ReadonlySet<string>>(() => {
    const arrival = setupActor.getSnapshot().context;
    return new Set(
      [arrival.left?.id, arrival.right?.id].filter((id): id is string => id !== undefined),
    );
  });

  // Um id só continua em `arrivedIds` enquanto nunca SAIU de um slot: sem a poda,
  // reescolher à mão o mesmo monstro que acabou de sair voltava a ser anunciado
  // como "já escalado". Compara por id para sobreviver a "Inverter lutadores".
  useEffect(() => {
    const stillOccupying = new Set(
      [left?.id, right?.id].filter((id): id is string => id !== undefined),
    );

    setArrivedIds((current) => {
      const pruned = new Set([...current].filter((id) => stillOccupying.has(id)));
      // Mesma referência quando nada mudou: um swap muda `left`/`right` sem podar nada.
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
                // Limpa só quem CHEGOU escalado; `selection.cleared` levaria junto
                // a escolha que o usuário fez à mão nesta tela.
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
        // `activeSlot` da máquina nunca é `null`; a VersusBar usa `null` para "ninguém esperando clique".
        activeSlot={effectiveCanFight ? null : activeSlot}
        canFight={effectiveCanFight}
        onClear={clearSlot}
        onSwap={() => setupActor.send({ type: 'sides.swapped' })}
        onFight={() => {
          // Estreitamento para o TypeScript; `effectiveCanFight` já garante isto no `disabled`.
          if (!validLeft || !validRight) return;

          // Só os ids vão para a URL: é o que faz o duelo sobreviver a um F5 e
          // ser compartilhável por link.
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
