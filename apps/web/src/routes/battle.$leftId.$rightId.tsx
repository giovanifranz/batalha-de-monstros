import { simulateBattle } from '@arena/domain/battle';
import { MonsterNotFoundError } from '@arena/domain/errors';
import { findMonster } from '@arena/infra/roster/collection';
import { Alert, AlertDescription, AlertTitle } from '@arena/ui/components/alert';
import { Button } from '@arena/ui/components/button';
import { Skeleton } from '@arena/ui/components/skeleton';
import { Link, createFileRoute } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { BattleArena } from '@/components/BattleArena.tsx';

export const Route = createFileRoute('/battle/$leftId/$rightId')({
  loader: async ({ context, params }) => {
    const left = await findMonster(context.roster, params.leftId);
    const right = await findMonster(context.roster, params.rightId);

    return { left, right };
  },

  errorComponent: ({ error }) => {
    const message =
      error instanceof MonsterNotFoundError
        ? 'Um dos monstros deste duelo não existe mais no seu roster.'
        : 'Não foi possível montar essa batalha.';

    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Batalha indisponível</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{message}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/battle">Escolher outros monstros</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  },

  pendingComponent: () => (
    <div className="space-y-4">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  ),

  component: BattlePage,
});

function BattlePage() {
  const { left, right } = Route.useLoaderData();

  const [runId, setRunId] = useState(0);

  const result = simulateBattle(left, right);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {left.name} vs {right.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          A batalha inteira já foi calculada. O que você vê abaixo é a reprodução do log, round a
          round.
        </p>
      </header>
      <BattleArena
        key={JSON.stringify([left.id, right.id, runId])}
        left={left}
        right={right}
        result={result}
        onReplay={() => setRunId((id) => id + 1)}
      />
    </div>
  );
}
