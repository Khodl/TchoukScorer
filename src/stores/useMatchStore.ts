import { reactive, computed } from 'vue';
import {
  computeScores,
  currentPhase,
  currentPeriod,
  gameStartedAt,
} from '../types';
import type {
  TchoukSheet,
  TchoukTeam,
  TchoukEvent,
  TchoukEventType,
  TeamId,
} from '../types';

// THE single source of truth: one sheet, holding only the teams and the event
// log. Every other value below is *calculated* from `sheet.events`.
const sheet = reactive<TchoukSheet>({
  teams: [],
  events: [],
});

// Derived state — each of these recomputes whenever the one watched variable
// (the sheet's event log) changes.
const scores = computed(() => computeScores(sheet.events));
const phase = computed(() => currentPhase(sheet.events));
const period = computed(() => currentPeriod(sheet.events));
const startedAt = computed(() => gameStartedAt(sheet.events));
const canScore = computed(() => phase.value === 'period_started');
const lastActionAt = computed(() => {
  const last = sheet.events[sheet.events.length - 1];
  return last ? last.at : null;
});

const recordEvent = (
  type: TchoukEventType,
  extra: Partial<TchoukEvent> = {},
) => {
  sheet.events.push({
    type,
    at: new Date().toISOString(),
    ...extra,
  });
};

const removeEvent = (index: number) => {
  if (index >= 0 && index < sheet.events.length) sheet.events.splice(index, 1);
};

const setTeams = (teams: TchoukTeam[]) => {
  sheet.teams = teams.map((t) => ({ id: t.id, name: t.name }));
};

// `teamId` is the team that benefits. With `givenBy`, an opponent conceded the
// point: that opponent is the actor, the benefiting team is the target.
const score = (teamId: TeamId, givenBy?: TeamId) => {
  if (givenBy != null) {
    recordEvent('score_point_given', {
      actor: { teamId: givenBy },
      target: { teamId },
      scoreChange: { teamId, increment: 1 },
    });
  } else {
    recordEvent('score_point_scored', {
      actor: { teamId },
      target: { teamId },
      scoreChange: { teamId, increment: 1 },
    });
  }
};

// A cancelled point has only a target (the team losing the point), no actor.
const correct = (teamId: TeamId) => {
  if ((scores.value[teamId] ?? 0) > 0) {
    recordEvent('score_point_correction', {
      target: { teamId },
      scoreChange: { teamId, increment: -1 },
    });
  }
};

// Time / phase transitions. The UI only surfaces the ones valid for the
// current phase (see PeriodTracker), but the store stays agnostic.
const startGame = () => recordEvent('time_game_start');
const startPeriod = () => recordEvent('time_period_start');
const endPeriod = () => recordEvent('time_period_end');
const endMatch = () => recordEvent('time_game_end');

const reset = () => {
  sheet.events = [];
};

export function useMatchStore() {
  return {
    // single source of truth
    sheet,
    // derived
    scores,
    phase,
    period,
    startedAt,
    canScore,
    lastActionAt,
    // actions (the only way to mutate the sheet)
    setTeams,
    score,
    correct,
    removeEvent,
    startGame,
    startPeriod,
    endPeriod,
    endMatch,
    reset,
  };
}
