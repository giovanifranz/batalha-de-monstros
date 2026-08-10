import { describe, expect, it } from 'vitest';
import { isStorageFull } from './storage-error.ts';

describe('isStorageFull', () => {
  it('reconhece o QuotaExceededError padrão pelo nome', () => {
    // Arrange
    const error = new DOMException('cota estourada', 'QuotaExceededError');

    // Act
    const full = isStorageFull(error);

    // Assert
    expect(full).toBe(true);
  });

  it('reconhece o erro de cota do Firefox pelo nome próprio dele', () => {
    // Arrange
    const error = new DOMException('cota estourada', 'NS_ERROR_DOM_QUOTA_REACHED');

    // Act
    const full = isStorageFull(error);

    // Assert
    expect(full).toBe(true);
  });

  it('enxerga o erro de cota escondido na cadeia de cause', () => {
    // Arrange
    const error = new Error('falha ao persistir', {
      cause: new DOMException('cota estourada', 'QuotaExceededError'),
    });

    // Act
    const full = isStorageFull(error);

    // Assert
    expect(full).toBe(true);
  });

  it('não confunde uma falha de escrita qualquer com cota cheia', () => {
    // Arrange
    const error = new Error('storage indisponível');

    // Act
    const full = isStorageFull(error);

    // Assert
    expect(full).toBe(false);
  });

  it('devolve false para o que nem é um Error', () => {
    // Arrange
    const rejected = 'QuotaExceededError';

    // Act
    const full = isStorageFull(rejected);

    // Assert
    expect(full).toBe(false);
  });
});
