import { useRef } from 'react';
import {
  ATTRIBUTE_BUDGET,
  STAT_LIMITS,
  type MonsterFormValues,
  monsterFormSchema,
} from '@arena/domain/monster';
import { Button } from '@arena/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@arena/ui/components/card';
import { Input } from '@arena/ui/components/input';
import { Field } from '@arena/ui/form/Field';
import { ImagePreview } from '@arena/ui/monster/ImagePreview';
import { PointBudget } from '@arena/ui/monster/PointBudget';
import { StatBar } from '@arena/ui/monster/StatBar';
import { useForm } from '@tanstack/react-form';
import { Dices } from 'lucide-react';
import { rollStats } from '@/lib/roll-stats.ts';

const DEFAULTS: MonsterFormValues = {
  name: '',
  attack: 50,
  defense: 40,
  speed: 45,
  hp: 100,
  imageUrl: '',
};

const STAT_FIELDS = [
  { name: 'attack', label: 'Ataque', ...STAT_LIMITS.attack },
  { name: 'defense', label: 'Defesa', ...STAT_LIMITS.defense },
  { name: 'speed', label: 'Velocidade', ...STAT_LIMITS.speed },
  { name: 'hp', label: 'HP', ...STAT_LIMITS.hp },
] as const;

function firstError(errors: readonly unknown[]): string | undefined {
  return (errors[0] as { message?: string } | undefined)?.message;
}

function visibleError(meta: {
  isTouched: boolean;
  errors: readonly unknown[];
}): string | undefined {
  return meta.isTouched ? firstError(meta.errors) : undefined;
}

function safe(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

type Props = {
  onSubmit: (values: MonsterFormValues) => Promise<void> | void;
  submitLabel?: string;
  submittingLabel?: string;
  defaultValues?: MonsterFormValues;
};

export function MonsterForm({
  onSubmit,
  submitLabel = 'Cadastrar monstro',
  submittingLabel = 'Cadastrando…',
  defaultValues = DEFAULTS,
}: Props) {
  const isSubmittingRef = useRef(false);

  const form = useForm({
    defaultValues,
    validators: { onChange: monsterFormSchema },
    onSubmit: async ({ value }) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      try {
        await onSubmit(value);
      } finally {
        isSubmittingRef.current = false;
      }
    },
  });

  const handleRollStats = () => {
    const rolled = rollStats();

    form.setFieldValue('hp', rolled.hp);
    form.setFieldValue('attack', rolled.attack);
    form.setFieldValue('defense', rolled.defense);
    form.setFieldValue('speed', rolled.speed);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
        className="space-y-6"
      >
        <Card>
          <CardContent className="space-y-6 pt-6">
            <form.Field
              name="name"
              children={(field) => (
                <Field label="Nome" error={visibleError(field.state.meta)}>
                  {(control) => (
                    <Input
                      {...control}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Ignaruk"
                    />
                  )}
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {STAT_FIELDS.map(({ name, label, min, max }) => (
                <form.Field
                  key={name}
                  name={name}
                  children={(field) => (
                    <Field label={label} error={visibleError(field.state.meta)}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          min={min}
                          max={max}
                          value={Number.isNaN(field.state.value) ? '' : field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                        />
                      )}
                    </Field>
                  )}
                />
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={handleRollStats}>
                <Dices className="size-4" /> Sortear atributos
              </Button>

              <form.Subscribe
                selector={(state) =>
                  [
                    state.values.attack,
                    state.values.defense,
                    state.values.speed,
                    state.values.hp,
                    state.errorMap.onChange,
                  ] as const
                }
                children={([attack, defense, speed, hp, onChangeIssues]) => (
                  <div className="w-full sm:w-64">
                    <PointBudget
                      used={Math.round(
                        safe(attack) + safe(defense) + safe(speed) + Math.floor(safe(hp) / 3),
                      )}
                      budget={ATTRIBUTE_BUDGET}
                      error={onChangeIssues?.['']?.[0]?.message}
                    />
                  </div>
                )}
              />
            </div>

            <form.Field
              name="imageUrl"
              children={(field) => (
                <Field
                  label="URL da imagem"
                  hint="Qualquer imagem serve — foto, arte, o que você quiser."
                  error={visibleError(field.state.meta)}
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="url"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="https://…/monstro.png"
                    />
                  )}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <form.Subscribe
          selector={(state) => [state.isSubmitting, state.canSubmit] as const}
          children={([isSubmitting, canSubmit]) => (
            <Button type="submit" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          )}
        />
      </form>

      <form.Subscribe
        selector={(state) => state.values}
        children={(values) => (
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-base">Prévia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted flex h-36 items-center justify-center rounded-md">
                <ImagePreview src={values.imageUrl} alt={values.name} />
              </div>
              <p className="truncate font-semibold">{values.name || '???'}</p>
              <StatBar label="HP" value={values.hp || 0} tone="hp" />
              <StatBar label="ATK" value={values.attack || 0} tone="attack" />
              <StatBar label="DEF" value={values.defense || 0} tone="defense" />
              <StatBar label="SPD" value={values.speed || 0} tone="speed" />
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}
