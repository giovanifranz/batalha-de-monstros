import type { Monster } from '@arena/domain/monster';
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { battleSetupMachine } from './battle-setup.machine.ts';

const EMBER: Monster = {
  id: '3f1c9d2e-5b7a-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'Ember',
  hp: 120,
  attack: 70,
  defense: 50,
  speed: 90,
  imageUrl: 'https://example.test/ember.png',
};

const TIDE: Monster = {
  id: '7a2b4c6d-8e0f-4a1b-b2c3-d4e5f6a7b8c9',
  name: 'Tide',
  hp: 150,
  attack: 55,
  defense: 80,
  speed: 45,
  imageUrl: 'https://example.test/tide.png',
};

const DUSK: Monster = {
  id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
  name: 'Dusk',
  hp: 135,
  attack: 85,
  defense: 40,
  speed: 60,
  imageUrl: 'https://example.test/dusk.png',
};

function startActor() {
  const actor = createActor(battleSetupMachine);
  actor.start();

  return actor;
}

describe('battleSetupMachine', () => {
  it('começa vazia, sem lutador nenhum e com o slot esquerdo ativo', () => {
    // Arrange
    const actor = startActor();

    // Act
    const snapshot = actor.getSnapshot();

    // Assert
    expect(snapshot.value).toBe('empty');
    expect(snapshot.context).toEqual({ left: null, right: null, activeSlot: 'left' });
    expect(snapshot.hasTag('can-fight')).toBe(false);
  });

  it('escala o primeiro lutador na esquerda e passa o slot ativo para a direita', () => {
    // Arrange
    const actor = startActor();

    // Act
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('partial');
    expect(snapshot.context).toEqual({ left: EMBER, right: null, activeSlot: 'right' });
  });

  it('escala o segundo lutador na direita e fica pronta para lutar', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Act
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect(snapshot.hasTag('can-fight')).toBe(true);
    expect(snapshot.context).toEqual({ left: EMBER, right: TIDE, activeSlot: 'left' });
  });

  it('não libera a luta enquanto só um lutador está escalado', () => {
    // Arrange
    const actor = startActor();

    // Act
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Assert
    expect(actor.getSnapshot().hasTag('can-fight')).toBe(false);
  });

  it('limpa o slot quando o mesmo monstro é escalado de novo', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Act
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('partial');
    expect(snapshot.hasTag('can-fight')).toBe(false);
    expect(snapshot.context).toEqual({ left: null, right: TIDE, activeSlot: 'left' });
  });

  it('devolve o slot ativo para a direita ao remover o lutador da direita', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Act
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Assert
    expect(actor.getSnapshot().context).toEqual({
      left: EMBER,
      right: null,
      activeSlot: 'right',
    });
  });

  it('volta para vazia quando o único lutador escalado é removido', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Act
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('empty');
    expect(snapshot.context).toEqual({ left: null, right: null, activeSlot: 'left' });
  });

  it('substitui o lutador do slot ativo quando um terceiro monstro é escalado', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Act
    actor.send({ type: 'fighter.picked', monster: DUSK });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect(snapshot.context).toEqual({ left: DUSK, right: TIDE, activeSlot: 'right' });
  });

  it('troca os dois lutadores de lado sem sair de pronta', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Act
    actor.send({ type: 'sides.swapped' });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect(snapshot.hasTag('can-fight')).toBe(true);
    expect([snapshot.context.left, snapshot.context.right]).toEqual([TIDE, EMBER]);
  });

  it('move o único lutador escalado para o outro lado e continua parcial', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Act
    actor.send({ type: 'sides.swapped' });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('partial');
    expect([snapshot.context.left, snapshot.context.right]).toEqual([null, EMBER]);
  });

  it('leva o slot ativo para o lado que ficou vazio ao trocar os lados', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Act
    actor.send({ type: 'sides.swapped' });

    // Assert
    expect(actor.getSnapshot().context.activeSlot).toBe('left');
  });

  it('completa a dupla depois de trocar os lados, em vez de sobrescrever o único lutador', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });
    actor.send({ type: 'sides.swapped' });

    // Act
    actor.send({ type: 'fighter.picked', monster: TIDE });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect([snapshot.context.left, snapshot.context.right]).toEqual([TIDE, EMBER]);
  });

  it('não mexe no slot ativo ao trocar os lados sem lutador nenhum', () => {
    // Arrange
    const actor = startActor();

    // Act
    actor.send({ type: 'sides.swapped' });

    // Assert
    expect(actor.getSnapshot().context.activeSlot).toBe('left');
  });

  it('esvazia a seleção inteira e devolve o slot ativo para a esquerda', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });
    actor.send({ type: 'fighter.picked', monster: TIDE });
    actor.send({ type: 'sides.swapped' });

    // Act
    actor.send({ type: 'selection.cleared' });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('empty');
    expect(snapshot.hasTag('can-fight')).toBe(false);
    expect(snapshot.context).toEqual({ left: null, right: null, activeSlot: 'left' });
  });

  it('esvazia a seleção também quando só um lutador está escalado', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'fighter.picked', monster: EMBER });

    // Act
    actor.send({ type: 'selection.cleared' });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('empty');
    expect(snapshot.context).toEqual({ left: null, right: null, activeSlot: 'left' });
  });
});
