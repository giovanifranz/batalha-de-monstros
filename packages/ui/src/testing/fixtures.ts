import type { Monster } from '@arena/domain/monster';
import { MONSTER_ART } from './art.ts';

export const pyrelisk: Monster = {
  id: 'pyrelisk',
  name: 'Pyrelisk',
  hp: 100,
  attack: 60,
  defense: 50,
  speed: 100,
  imageUrl: MONSTER_ART.pyrelisk,
};

export const aquashell: Monster = {
  id: 'aquashell',
  name: 'Aquashell',
  hp: 105,
  attack: 70,
  defense: 90,
  speed: 50,
  imageUrl: MONSTER_ART.aquashell,
};

export const duskfang: Monster = {
  id: 'duskfang',
  name: 'Duskfang',
  hp: 120,
  attack: 95,
  defense: 40,
  speed: 60,
  imageUrl: MONSTER_ART.duskfang,
};
