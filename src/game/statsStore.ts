import { isNeutralRole } from '../shared/gameRules';
import type { MatchOutcome, RoomSnapshot } from '../shared/types';

export interface CareerStats {
  matchesPlayed: number;
  wins: number;
  crewWins: number;
  batparWins: number;
  pagolWins: number;
  tasksCompleted: number;
}

const STORAGE_KEY = 'ke_batpar_career_stats_v1';

const DEFAULT_STATS: CareerStats = {
  matchesPlayed: 0,
  wins: 0,
  crewWins: 0,
  batparWins: 0,
  pagolWins: 0,
  tasksCompleted: 0,
};

export function loadCareerStats(): CareerStats {
  if (typeof window === 'undefined') return { ...DEFAULT_STATS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      matchesPlayed: Number(parsed.matchesPlayed) || 0,
      wins: Number(parsed.wins) || 0,
      crewWins: Number(parsed.crewWins) || 0,
      batparWins: Number(parsed.batparWins) || 0,
      pagolWins: Number(parsed.pagolWins) || 0,
      tasksCompleted: Number(parsed.tasksCompleted) || 0,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveCareerStats(stats: CareerStats): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage quota errors
  }
}

export function incrementCareerTasksCompleted(count: number = 1): CareerStats {
  const current = loadCareerStats();
  const next: CareerStats = {
    ...current,
    tasksCompleted: current.tasksCompleted + Math.max(0, count),
  };
  saveCareerStats(next);
  return next;
}

export function recordCareerMatchOutcome(
  snapshot: RoomSnapshot,
  localPlayerId: string,
  outcome: MatchOutcome,
): CareerStats {
  const current = loadCareerStats();
  const lp = snapshot.players.find((p) => p.id === localPlayerId);
  const won =
    outcome.winner === 'pagol' || outcome.winner === 'chandabaz' || outcome.winner === 'tiktok_star'
      ? outcome.winnerPlayerId === lp?.id
      : Boolean(
          (lp && !isNeutralRole(lp.specialRole) && lp.role === outcome.winner) ||
            (lp && outcome.coWinnerIds?.includes(lp.id)),
        );

  const next: CareerStats = {
    ...current,
    matchesPlayed: current.matchesPlayed + 1,
    wins: current.wins + (won ? 1 : 0),
    crewWins: current.crewWins + (won && outcome.winner === 'parabasi' ? 1 : 0),
    batparWins: current.batparWins + (won && outcome.winner === 'vondo' ? 1 : 0),
    pagolWins:
      current.pagolWins +
      (won && (outcome.winner === 'pagol' || outcome.winner === 'chandabaz' || outcome.winner === 'tiktok_star')
        ? 1
        : 0),
  };
  saveCareerStats(next);
  return next;
}
