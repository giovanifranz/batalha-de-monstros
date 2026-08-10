import { describe, expect, it } from 'vitest';
import { MonsterNotFoundError } from './errors.ts';

describe('MonsterNotFoundError', () => {
  it('inclui o id procurado na mensagem', () => {
    // Arrange
    const monsterId = 'golem';

    // Act
    const error = new MonsterNotFoundError(monsterId);

    // Assert
    expect(error.message).toBe('Monstro "golem" não encontrado.');
  });

  it('usa MonsterNotFoundError como nome do erro', () => {
    // Arrange
    const monsterId = 'golem';

    // Act
    const error = new MonsterNotFoundError(monsterId);

    // Assert
    expect(error.name).toBe('MonsterNotFoundError');
  });

  it('guarda o id procurado na propriedade monsterId', () => {
    // Arrange
    const monsterId = 'golem';

    // Act
    const error = new MonsterNotFoundError(monsterId);

    // Assert
    expect(error.monsterId).toBe('golem');
  });
});
