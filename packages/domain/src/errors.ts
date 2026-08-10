export class MonsterNotFoundError extends Error {
  constructor(public readonly monsterId: string) {
    super(`Monstro "${monsterId}" não encontrado.`);
    this.name = 'MonsterNotFoundError';
  }
}
