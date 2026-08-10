import { z } from 'zod';

export type Monster = {
  id: string;
  name: string;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  imageUrl: string;
};

/** Limites por stat. Exportados porque o formulário (`min`/`max` e o sorteio) usa os mesmos números. */
export const STAT_LIMITS = {
  attack: { min: 1, max: 100 },
  defense: { min: 0, max: 100 },
  speed: { min: 0, max: 100 },
  hp: { min: 100, max: 300 },
} as const;

/** Teto de `attack + defense + speed + floor(hp / 3)`. Sem ele, o monstro no máximo de tudo é sempre a escolha ótima e todo duelo fica igual. */
export const ATTRIBUTE_BUDGET = 250;

// `z.number()` e não `z.coerce.number()`: o TanStack Form usa o tipo de ENTRADA
// do Standard Schema, e `coerce` tem entrada `unknown`, o que destrói a
// inferência de `defaultValues`.
const statNumber = (max: number, min = 0) =>
  z
    .number({ error: 'Informe um número' })
    .int('Use um número inteiro')
    .min(min, `Mínimo ${min}`)
    .max(max, `Máximo ${max}`);

export const monsterFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Use pelo menos 2 caracteres')
      .max(24, 'Máximo de 24 caracteres'),
    attack: statNumber(STAT_LIMITS.attack.max, STAT_LIMITS.attack.min),
    defense: statNumber(STAT_LIMITS.defense.max, STAT_LIMITS.defense.min),
    speed: statNumber(STAT_LIMITS.speed.max, STAT_LIMITS.speed.min),
    hp: statNumber(STAT_LIMITS.hp.max, STAT_LIMITS.hp.min),
    imageUrl: z.url('Informe uma URL de imagem válida'),
  })
  .refine(
    (data) => data.attack + data.defense + data.speed + Math.floor(data.hp / 3) <= ATTRIBUTE_BUDGET,
    { message: 'A soma dos atributos não pode ultrapassar 250 pontos' },
  );

export type MonsterFormValues = z.infer<typeof monsterFormSchema>;

export const monsterSchema = monsterFormSchema.extend({
  id: z.string(),
});

export type Expect<T extends true> = T;
export type Exact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type _MonsterMatchesSchema = Expect<Exact<z.infer<typeof monsterSchema>, Monster>>;
type _MonsterIdIsString = Expect<Exact<Monster['id'], string>>;
