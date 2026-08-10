import { createStore } from '@xstate/store';
import { createJSONStorage, persist } from '@xstate/store/persist';

export const PLAYBACK_SPEEDS = [1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
export type ThemeMode = 'light' | 'dark';

export const settingsStore = createStore({
  context: { speed: 1 as PlaybackSpeed, theme: 'dark' as ThemeMode },
  on: {
    // @xstate/store não faz merge parcial: o retorno SUBSTITUI o contexto inteiro,
    // então todo handler precisa espalhar `...context`.
    speedSet: (context, event: { speed: PlaybackSpeed }) => ({ ...context, speed: event.speed }),
    themeToggled: (context) => ({
      ...context,
      theme: (context.theme === 'dark' ? 'light' : 'dark') as ThemeMode,
    }),
  },
}).with(
  persist({
    name: 'arena:settings',
    version: 1,
    storage: createJSONStorage(() => localStorage),
  }),
);
