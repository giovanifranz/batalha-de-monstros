import { describe, expect, it } from 'vitest';
import { monsterFormSchema, monsterSchema } from './monster.ts';

const GOLEM_ID = '9c4f0b2e-6d1a-4a5b-8f3c-2e7d1b9a4c60';

const RANDOM_UUID_SAMPLE = '3f2b1c8d-5e47-4a91-bd06-8c1e5f7a2b34';

function validValues() {
  return {
    name: 'Monstro',
    attack: 50,
    defense: 50,
    speed: 50,
    hp: 100,
    imageUrl: 'https://example.com/monstro.png',
  };
}

describe('monsterFormSchema', () => {
  it('rejeita nome com menos de 2 caracteres', () => {
    // Arrange
    const values = { ...validValues(), name: 'A' };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Use pelo menos 2 caracteres');
  });

  it('rejeita nome com mais de 24 caracteres', () => {
    // Arrange
    const values = { ...validValues(), name: 'N'.repeat(25) };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Máximo de 24 caracteres');
  });

  it('rejeita ataque que não é um número', () => {
    // Arrange
    const values = { ...validValues(), attack: 'dez' };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Informe um número');
  });

  it('rejeita ataque não inteiro', () => {
    // Arrange
    const values = { ...validValues(), attack: 10.5 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Use um número inteiro');
  });

  it('rejeita ataque abaixo do mínimo', () => {
    // Arrange
    const values = { ...validValues(), attack: 0 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Mínimo 1');
  });

  it('rejeita defesa negativa', () => {
    // Arrange
    const values = { ...validValues(), defense: -1 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Mínimo 0');
  });

  it('rejeita velocidade negativa', () => {
    // Arrange
    const values = { ...validValues(), speed: -1 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Mínimo 0');
  });

  it('rejeita hp abaixo do mínimo', () => {
    // Arrange
    const values = { ...validValues(), hp: 99 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Mínimo 100');
  });

  it('remove espaços em branco nas bordas do nome', () => {
    // Arrange
    const values = { ...validValues(), name: '  Monstro  ' };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.data?.name).toBe('Monstro');
  });

  it('rejeita hp acima do máximo', () => {
    // Arrange
    const values = { ...validValues(), hp: 301 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Máximo 300');
  });

  it('rejeita URL de imagem inválida', () => {
    // Arrange
    const values = { ...validValues(), imageUrl: 'not-a-url' };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe('Informe uma URL de imagem válida');
  });

  it('rejeita URL de imagem acima de 1 MB', () => {
    // Arrange
    const gigante = `data:image/png;base64,${'A'.repeat(1_000_001)}`;
    const values = { ...validValues(), imageUrl: gigante };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe(
      'Imagem muito grande — use um link em vez de colar a imagem inteira',
    );
  });

  it('aceita URL de imagem exatamente no teto de 1 MB', () => {
    // Arrange
    const prefixo = 'data:image/png;base64,';
    const noTeto = prefixo + 'A'.repeat(1_000_000 - prefixo.length);
    const values = { ...validValues(), imageUrl: noTeto };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.success).toBe(true);
  });

  it('aceita quando a soma dos atributos é exatamente 250 pontos', () => {
    // Arrange
    const values = { ...validValues(), attack: 50, defense: 50, speed: 50, hp: 300 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.success).toBe(true);
  });

  it('rejeita quando a soma dos atributos ultrapassa 250 pontos', () => {
    // Arrange
    const values = { ...validValues(), attack: 50, defense: 50, speed: 51, hp: 300 };

    // Act
    const result = monsterFormSchema.safeParse(values);

    // Assert
    expect(result.error?.issues[0]?.message).toBe(
      'A soma dos atributos não pode ultrapassar 250 pontos',
    );
  });
});

describe('monsterSchema', () => {
  it('exige um id, ao contrário do schema de formulário', () => {
    // Arrange
    const values = validValues();

    // Act
    const result = monsterSchema.safeParse(values);

    // Assert
    expect(result.success).toBe(false);
  });

  it('aceita os valores do formulário acrescidos de um id', () => {
    // Arrange
    const values = { ...validValues(), id: GOLEM_ID };

    // Act
    const result = monsterSchema.safeParse(values);

    // Assert
    expect(result.data).toMatchObject({ id: GOLEM_ID });
  });

  it('rejeita um id que não é um UUID v4', () => {
    // Arrange
    const values = { ...validValues(), id: 'golem' };

    // Act
    const result = monsterSchema.safeParse(values);

    // Assert
    expect(result.success).toBe(false);
  });

  it('aceita o que o crypto.randomUUID do runtime gera', () => {
    // Arrange
    const values = { ...validValues(), id: RANDOM_UUID_SAMPLE };

    // Act
    const result = monsterSchema.safeParse(values);

    // Assert
    expect(result.success).toBe(true);
  });
});
