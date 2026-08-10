import { monsterFormSchema, type Monster, type MonsterFormValues } from '@arena/domain/monster';
import { addMonster } from '@arena/infra/roster/collection';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { MonsterForm } from '@/components/MonsterForm.tsx';
import { TOAST_LONGO_MS } from '@/lib/toast.ts';
import { BattleSetupActor } from '@/machines/battle-setup.context.tsx';

export const Route = createFileRoute('/monsters/new')({ component: NewMonsterPage });

function NewMonsterPage() {
  const { roster } = Route.useRouteContext();
  const navigate = useNavigate();
  const setupActor = BattleSetupActor.useActorRef();

  async function handleSubmit(values: MonsterFormValues) {
    const parsed = monsterFormSchema.safeParse(values);
    if (!parsed.success) {
      toast.error('Não foi possível cadastrar o monstro: dados inválidos.');
      return;
    }

    const monster: Monster = { id: crypto.randomUUID(), ...parsed.data };

    try {
      await addMonster(roster, monster);
    } catch {
      toast.error(`Não foi possível cadastrar ${monster.name}.`);
      return;
    }

    const beforePick = setupActor.getSnapshot();
    const evicted = beforePick.matches('ready')
      ? beforePick.context[beforePick.context.activeSlot]
      : null;

    setupActor.send({ type: 'fighter.picked', monster });

    toast.success(
      evicted
        ? `${monster.name} entrou no roster e tomou o lugar de ${evicted.name} na batalha.`
        : `${monster.name} entrou no roster e foi escalado para a batalha!`,
      { duration: TOAST_LONGO_MS },
    );
    void navigate({ to: '/battle' });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cadastrar monstro</h1>
        <p className="text-muted-foreground text-sm">
          Ele entra no seu roster e pode lutar contra qualquer outro monstro cadastrado.
        </p>
      </header>

      <MonsterForm onSubmit={handleSubmit} />
    </div>
  );
}
