// Shared type definitions for the scorer.
//
// `TchoukSheet` is the canonical record of a match. It is exactly the shape
// emitted by TchoukScore's `game-event-change` event (its `matchData`), so a
// sheet can be fed straight from that event into the <Sheet> component.

/** Stable identifier for a team. */
export type TeamId = string | number;

/** A team taking part in the match. */
export interface TchoukTeam {
  id: TeamId;
  name: string;
}

/** A map of team id -> current score. */
export type TchoukScores = Record<TeamId, number>;

/** A change to a team's score: which team, and by how much (+1 or -1). */
export interface ScoreChangeType {
  teamId: TeamId;
  /** The score delta, e.g. +1 for a point scored or -1 for a correction. */
  increment: number;
}

/** The kinds of things that can happen during a match. */
export type TchoukEventType =
  | 'time_period_start'
  | 'time_period_end'
  | 'time_game_start'
  | 'time_game_end'
  | 'score_point_scored'
  | 'score_point_given'
  | 'score_point_correction';

/** A single recorded action. */
export interface TchoukEvent {
  /** What happened. */
  type: TchoukEventType;
  /** Team the event belongs to (null for match-wide events). */
  teamId: TeamId | null;
  /** Period the event occurred in. */
  period: number;
  /** ISO-8601 timestamp. */
  at: string;
  /** For the `score_point_*` events: the team and delta that changed. */
  scoreChange?: ScoreChangeType;
  /** For `score_point_given`: opponent that conceded the point. */
  givenBy?: TeamId;
}

/**
 * A full match sheet — the same object the scoreboard publishes on every change.
 * Only the teams and the event log are stored; everything else (scores, current
 * period, start time) is derived from `events`.
 */
export interface TchoukSheet {
  /** Teams in the match. */
  teams: TchoukTeam[];
  /** Chronological log of every recorded event. */
  events: TchoukEvent[];
}

/**
 * Reconstruct the current score per team by folding the event log:
 * each score event applies its `scoreChange` delta. A reset empties the sheet
 * (clears `events`), so there is nothing to fold afterwards.
 */
export function computeScores(events: TchoukEvent[]): TchoukScores {
  const scores: TchoukScores = {};
  for (const event of events) {
    if (event.scoreChange) {
      const { teamId, increment } = event.scoreChange;
      scores[teamId] = (scores[teamId] ?? 0) + increment;
    }
  }
  return scores;
}

/**
 * The phase a match is in, derived from its `time_*` events. The allowed
 * transitions are:
 *   pregame        --time_game_start-->   game_started
 *   game_started   --time_period_start--> period_started
 *   game_started   --time_game_end-->     game_ended
 *   period_started --time_period_end-->   period_ended
 *   period_started --time_game_end-->     game_ended
 *   period_ended   --time_period_start--> period_started  (next period)
 *   period_ended   --time_game_end-->     game_ended
 */
export type GamePhase =
  | 'pregame'
  | 'game_started'
  | 'period_started'
  | 'period_ended'
  | 'game_ended';

/** The phase implied by the most recent `time_*` event in the log. */
export function currentPhase(events: TchoukEvent[]): GamePhase {
  for (let i = events.length - 1; i >= 0; i--) {
    switch (events[i].type) {
      case 'time_game_start':
        return 'game_started';
      case 'time_period_start':
        return 'period_started';
      case 'time_period_end':
        return 'period_ended';
      case 'time_game_end':
        return 'game_ended';
    }
  }
  return 'pregame';
}

/** Current period number — how many periods have been started so far. */
export function currentPeriod(events: TchoukEvent[]): number {
  return events.filter((event) => event.type === 'time_period_start').length;
}

/**
 * When the match started — the timestamp of the `time_game_start` event,
 * or null if the game has not started yet.
 */
export function gameStartedAt(events: TchoukEvent[]): string | null {
  return events.find((event) => event.type === 'time_game_start')?.at ?? null;
}
