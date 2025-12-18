import type { GameState, GameTotals } from '../game/engine';
import type { DiceColorKey } from '../stores/settingsStore';

export type PlayerAppearance = {
  diceColor: DiceColorKey;
  heldColor: DiceColorKey;
};

export type GameSessionPlayer = {
  id: string;
  name: string;
  appearance: PlayerAppearance;
  state: GameState;
};

export type GameSessionMode = 'solo' | 'pass-and-play';

export type GameSessionState = {
  mode: GameSessionMode;
  players: GameSessionPlayer[];
  activePlayerIndex: number;
};

export function getPlayerGrandTotal(state: GameState): number {
  return state?.totals?.grand ?? 0;
}

export function getPlayerTotals(state: GameState): GameTotals {
  return state?.totals ?? { upper: 0, lower: 0, bonus: 0, grand: 0 };
}

export function isSessionCompleted(session: GameSessionState): boolean {
  return session.players.every((p) => p.state?.completed === true);
}

export function getLeaderIndex(session: GameSessionState): number | null {
  if (!session.players.length) return null;
  let bestIdx = 0;
  let bestScore = getPlayerGrandTotal(session.players[0].state);
  for (let i = 1; i < session.players.length; i += 1) {
    const score = getPlayerGrandTotal(session.players[i].state);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

