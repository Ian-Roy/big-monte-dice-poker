import { computed, ref, toRaw } from 'vue';
import { defineStore } from 'pinia';

import { getLeaderIndex, getPlayerGrandTotal, isSessionCompleted, type GameSessionState } from '../shared/gameSession';

export type LeaderboardEntry = {
  id: string;
  finishedAt: number;
  playersCount: number;
  leaderPlayerId: string;
  leaderName: string;
  leaderScore: number;
  session: GameSessionState;
};

const LEADERBOARD_STORAGE_KEY = 'big-monte:leaderboard';
const LEADERBOARD_STORAGE_VERSION = 1;
const MAX_LEADERBOARD_ENTRIES = 50;

type PersistedLeaderboardPayloadV1 = {
  version: 1;
  savedAt: number;
  entries: LeaderboardEntry[];
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

function deepClone<T>(value: T): T {
  const raw = toRaw(value) as T;
  const cloner = (globalThis as unknown as { structuredClone?: (input: T) => T }).structuredClone;
  if (typeof cloner === 'function') {
    try {
      return cloner(raw);
    } catch {
      // ignore and fall back to JSON clone for reactive proxies, etc.
    }
  }
  return JSON.parse(JSON.stringify(raw)) as T;
}

function normalizeEntry(raw: unknown): LeaderboardEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Partial<LeaderboardEntry>;
  if (typeof entry.id !== 'string' || !entry.id.trim()) return null;
  if (typeof entry.finishedAt !== 'number' || !Number.isFinite(entry.finishedAt)) return null;
  if (typeof entry.playersCount !== 'number' || !Number.isFinite(entry.playersCount) || entry.playersCount < 1) return null;
  if (typeof entry.leaderPlayerId !== 'string' || !entry.leaderPlayerId.trim()) return null;
  if (typeof entry.leaderName !== 'string') return null;
  if (typeof entry.leaderScore !== 'number' || !Number.isFinite(entry.leaderScore) || entry.leaderScore < 0) return null;
  if (!entry.session || typeof entry.session !== 'object') return null;
  const session = entry.session as Partial<GameSessionState>;
  if (session.mode !== 'solo' && session.mode !== 'pass-and-play') return null;
  if (!Array.isArray(session.players) || !session.players.length) return null;
  if (typeof session.activePlayerIndex !== 'number' || !Number.isFinite(session.activePlayerIndex)) return null;

  return {
    id: entry.id,
    finishedAt: entry.finishedAt,
    playersCount: entry.playersCount,
    leaderPlayerId: entry.leaderPlayerId,
    leaderName: entry.leaderName,
    leaderScore: entry.leaderScore,
    session: entry.session as GameSessionState
  };
}

function loadPersistedEntries(): LeaderboardEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedLeaderboardPayloadV1;
    if (!parsed || parsed.version !== LEADERBOARD_STORAGE_VERSION) return [];
    if (!Array.isArray(parsed.entries)) return [];
    const out: LeaderboardEntry[] = [];
    const seen = new Set<string>();
    parsed.entries.forEach((candidate) => {
      const entry = normalizeEntry(candidate);
      if (!entry) return;
      if (seen.has(entry.id)) return;
      out.push(entry);
      seen.add(entry.id);
    });
    return out;
  } catch (err) {
    console.warn('[LeaderboardStore] failed to parse leaderboard; ignoring snapshot.', err);
    return [];
  }
}

function persistEntries(entries: LeaderboardEntry[]) {
  const storage = getStorage();
  if (!storage) return;
  if (!entries.length) {
    storage.removeItem(LEADERBOARD_STORAGE_KEY);
    return;
  }
  const payload: PersistedLeaderboardPayloadV1 = {
    version: LEADERBOARD_STORAGE_VERSION,
    savedAt: Date.now(),
    entries
  };
  try {
    storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[LeaderboardStore] failed to persist leaderboard', err);
  }
}

function sortLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => {
    if (b.leaderScore !== a.leaderScore) return b.leaderScore - a.leaderScore;
    return b.finishedAt - a.finishedAt;
  });
}

function clampEntries(entries: LeaderboardEntry[]) {
  return sortLeaderboard(entries).slice(0, MAX_LEADERBOARD_ENTRIES);
}

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref<LeaderboardEntry[]>(loadPersistedEntries());

  const sortedEntries = computed(() => sortLeaderboard(entries.value));
  const topEntry = computed(() => sortedEntries.value[0] ?? null);
  const topScore = computed(() => topEntry.value?.leaderScore ?? 0);

  function recordCompletedSession(options: { id: string; session: GameSessionState; finishedAt?: number }) {
    const id = options.id?.trim();
    if (!id) return { ok: false as const, reason: 'invalid-id' as const };

    const existing = entries.value.find((entry) => entry.id === id) ?? null;
    if (existing) {
      return {
        ok: true as const,
        entry: existing,
        isNew: false as const
      };
    }

    if (!isSessionCompleted(options.session)) {
      return { ok: false as const, reason: 'incomplete-session' as const };
    }

    const cloned = deepClone(options.session);
    const leaderIdx = getLeaderIndex(cloned);
    if (leaderIdx === null) return { ok: false as const, reason: 'no-leader' as const };
    const leader = cloned.players[leaderIdx];
    if (!leader) return { ok: false as const, reason: 'no-leader' as const };

    const entry: LeaderboardEntry = {
      id,
      finishedAt: typeof options.finishedAt === 'number' && Number.isFinite(options.finishedAt) ? options.finishedAt : Date.now(),
      playersCount: cloned.players.length,
      leaderPlayerId: leader.id,
      leaderName: leader.name,
      leaderScore: getPlayerGrandTotal(leader.state),
      session: cloned
    };

    entries.value = clampEntries([entry, ...entries.value]);
    persistEntries(entries.value);
    return { ok: true as const, entry, isNew: true as const };
  }

  function renameLeader(entryId: string, nextName: string) {
    const trimmed = nextName.trim();
    if (!trimmed) return false;

    const idx = entries.value.findIndex((entry) => entry.id === entryId);
    if (idx < 0) return false;

    const entry = entries.value[idx];
    const leaderId = entry.leaderPlayerId;
    const players = entry.session.players.map((player) =>
      player.id === leaderId ? { ...player, name: trimmed } : player
    );

    const session: GameSessionState = { ...entry.session, players };
    const nextEntry: LeaderboardEntry = {
      ...entry,
      leaderName: trimmed,
      session
    };

    const nextEntries = [...entries.value];
    nextEntries[idx] = nextEntry;
    entries.value = nextEntries;
    persistEntries(entries.value);
    return true;
  }

  function getEntry(id: string) {
    return entries.value.find((entry) => entry.id === id) ?? null;
  }

  function clearLeaderboard() {
    entries.value = [];
    persistEntries(entries.value);
  }

  return {
    entries,
    sortedEntries,
    topEntry,
    topScore,
    recordCompletedSession,
    renameLeader,
    getEntry,
    clearLeaderboard
  };
});
