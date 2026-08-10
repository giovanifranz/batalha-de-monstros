import { MonsterNotFoundError } from '@arena/domain/errors';
import { monsterFormSchema, type MonsterFormValues } from '@arena/domain/monster';
import { findMonster, updateMonster } from '@arena/infra/roster/collection';
import { Alert, AlertDescription, AlertTitle } from '@arena/ui/components/alert';
import { Button } from '@arena/ui/components/button';
import { Skeleton } from '@arena/ui/components/skeleton';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { MonsterForm } from '@/components/MonsterForm.tsx';

export const Route = createFileRoute('/monsters/$monsterId/edit')({
  loader: ({ context, params }) => findMonster(context.roster, params.monsterId),

  errorComponent: ({ error }) => {
    const message =
      error instanceof MonsterNotFoundError
        ? 'Esse monstro não está mais no seu roster.'
        : 'Não foi possível abrir esse monstro para edição.';

    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Edição indisponível</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{message}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Voltar ao roster</Link>
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

  component: EditMonsterPage,
});

function EditMonsterPage() {
  const { roster } = Route.useRouteContext();
  const monster = Route.useLoaderData();
  const navigate = useNavigate();

  async function handleSubmit(values: MonsterFormValues) {
    const parsed = monsterFormSchema.safeParse(values);
    if (!parsed.success) {
      toast.error('Não foi possível salvar o monstro: dados inválidos.');
      return;
    }

    try {
      await updateMonster(roster, monster.id, parsed.data);
    } catch (error) {
      toast.error(
        error instanceof MonsterNotFoundError
          ? `${monster.name} já não estava no roster.`
          : `Não foi possível salvar ${parsed.data.name}.`,
      );
      return;
    }

    toast.success(`${parsed.data.name} foi atualizado.`);
    void navigate({ to: '/' });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Editar {monster.name}</h1>
        <p className="text-muted-foreground text-sm">
          Os mesmos limites do cadastro valem aqui: a soma dos atributos não pode passar de 250
          pontos.
        </p>
      </header>

      <MonsterForm
        key={monster.id}
        defaultValues={{
          name: monster.name,
          attack: monster.attack,
          defense: monster.defense,
          speed: monster.speed,
          hp: monster.hp,
          imageUrl: monster.imageUrl,
        }}
        submitLabel="Salvar alterações"
        submittingLabel="Salvando…"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
