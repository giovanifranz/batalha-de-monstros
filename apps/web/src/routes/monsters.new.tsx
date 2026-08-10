import { monsterFormSchema, type Monster, type MonsterFormValues } from '@arena/domain/monster';
import { addMonster } from '@arena/infra/roster/collection';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { MonsterForm } from '@/components/MonsterForm.tsx';
import {
  STORAGE_FULL_DURATION_MS,
  STORAGE_FULL_MESSAGE,
  TOAST_LONGO_MS,
  isStorageFull,
} from '@/lib/storage-error.ts';
import { BattleSetupActor } from '@/machines/battle-setup.context.tsx';

export const Route = createFileRoute('/monsters/new')({ component: NewMonsterPage });

function NewMonsterPage() {
  const { roster } = Route.useRouteContext();
  const navigate = useNavigate();
  const setupActor = BattleSetupActor.useActorRef();

  /** O cadastro sempre escala o monstro novo, então navega para `/battle` e não para `/`. */
  async function handleSubmit(values: MonsterFormValues) {
    /**
     * `values` é o tipo de ENTRADA do Standard Schema: `.trim()` só se aplica no
     * parse, não no tipo. Reparsear aqui é o que faz o `fighter.picked` carregar
     * o mesmo `name` que o `addMonster` grava.
     */
    const parsed = monsterFormSchema.safeParse(values);
    if (!parsed.success) {
      // O `onChange` já bloqueia o envio inválido; um toast é melhor que uma exceção solta.
      toast.error('Não foi possível cadastrar o monstro: dados inválidos.');
      return;
    }

    const monster: Monster = { id: nanoid(), ...parsed.data };

    try {
      await addMonster(roster, monster);
    } catch (error) {
      // A cota do `localStorage` é o único jeito realista de esta escrita falhar,
      // e a genérica mandaria o usuário repetir exatamente o que vai falhar de novo.
      if (isStorageFull(error)) {
        toast.error(STORAGE_FULL_MESSAGE, { duration: STORAGE_FULL_DURATION_MS });
      } else {
        toast.error(`Não foi possível cadastrar ${monster.name}.`);
      }
      return;
    }

    // Lido ANTES do evento: com os dois slots cheios, `fighter.picked` sobrescreve
    // o slot ativo, e o toast precisa dizer quem saiu.
    const beforePick = setupActor.getSnapshot();
    const evicted = beforePick.matches('ready')
      ? beforePick.context[beforePick.context.activeSlot]
      : null;

    // Funciona porque o ator vive no __root, acima das rotas.
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
