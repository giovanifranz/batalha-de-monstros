import { describe, expect, it } from 'vitest';
import { paginate } from './pagination.ts';

describe('paginate', () => {
  it('divide o total em páginas do tamanho pedido', () => {
    // Arrange
    const totalItems = 12;

    // Act
    const { totalPages } = paginate(totalItems, 8, 1);

    // Assert
    expect(totalPages).toBe(2);
  });

  it('não cria página a mais quando o total é múltiplo exato', () => {
    // Arrange
    const totalItems = 16;

    // Act
    const { totalPages } = paginate(totalItems, 8, 1);

    // Assert
    expect(totalPages).toBe(2);
  });

  it('dá UMA página para um roster vazio, não zero', () => {
    // Arrange
    const totalItems = 0;

    // Act
    const { totalPages, page, offset } = paginate(totalItems, 8, 1);

    // Assert
    expect({ totalPages, page, offset }).toEqual({ totalPages: 1, page: 1, offset: 0 });
  });

  it('começa a primeira página no início', () => {
    // Arrange
    const requested = 1;

    // Act
    const { offset } = paginate(12, 8, requested);

    // Assert
    expect(offset).toBe(0);
  });

  it('pula uma página inteira na segunda', () => {
    // Arrange
    const requested = 2;

    // Act
    const { offset } = paginate(12, 8, requested);

    // Assert
    expect(offset).toBe(8);
  });

  it('cai na última página quando a URL pede além do fim', () => {
    // Arrange
    const requested = 99;

    // Act
    const { page, offset } = paginate(12, 8, requested);

    // Assert
    expect({ page, offset }).toEqual({ page: 2, offset: 8 });
  });

  it('cai na primeira página quando a URL pede zero', () => {
    // Arrange
    const requested = 0;

    // Act
    const { page, offset } = paginate(12, 8, requested);

    // Assert
    expect({ page, offset }).toEqual({ page: 1, offset: 0 });
  });

  it('cai na primeira página quando a URL pede número negativo', () => {
    // Arrange
    const requested = -5;

    // Act
    const { page } = paginate(12, 8, requested);

    // Assert
    expect(page).toBe(1);
  });

  it('mantém a página pedida quando ela existe', () => {
    // Arrange
    const requested = 2;

    // Act
    const { page } = paginate(20, 8, requested);

    // Assert
    expect(page).toBe(2);
  });
});
