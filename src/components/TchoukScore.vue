<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import TeamColumn from './TeamColumn.vue';
import PeriodTracker from './PeriodTracker.vue';
import LastActionTimer from './LastActionTimer.vue';
import Scoreboard from './Scoreboard.vue';
import { computeScores, currentPhase, currentPeriod } from '../types';
import type {
  TchoukTeam,
  TchoukEvent,
  TchoukEventType,
  TchoukSheet,
  TeamId,
} from '../types';

const props = defineProps<{
  teams: TchoukTeam[];
}>();

const emit = defineEmits<{
  'game-event-change': [data: TchoukSheet];
}>();

interface MatchState {
  startedAt: string;
  events: TchoukEvent[];
}

const lastActionAt = ref<string | null>(null);

const bumpLastAction = () => {
  lastActionAt.value = new Date().toISOString();
};

// The event log is the single source of truth; scores, phase and the current
// period are all derived from it.
const state = reactive<MatchState>({
  startedAt: new Date().toISOString(),
  events: [],
});

const scores = computed(() => computeScores(state.events));
const phase = computed(() => currentPhase(state.events));
const period = computed(() => currentPeriod(state.events));
const canScore = computed(() => phase.value === 'period_started');

const recordEvent = (
  type: TchoukEventType,
  teamId: TeamId | null,
  extra: Partial<TchoukEvent> = {},
) => {
  state.events.push({
    type,
    teamId,
    period: period.value,
    at: new Date().toISOString(),
    ...extra,
  });
  bumpLastAction();
};

const increment = (teamId: TeamId, givenBy?: TeamId) => {
  recordEvent(givenBy ? 'score_point_given' : 'score_point_scored', teamId, {
    scoreChange: { teamId, increment: 1 },
    ...(givenBy ? { givenBy } : {}),
  });
};

const decrement = (teamId: TeamId) => {
  if ((scores.value[teamId] ?? 0) > 0) {
    recordEvent('score_point_correction', teamId, {
      scoreChange: { teamId, increment: -1 },
    });
  }
};

// Time / phase transitions — the buttons that emit these are only shown when
// the transition is valid for the current phase (see PeriodTracker).
const startGame = () => recordEvent('time_game_start', null);
const startPeriod = () => recordEvent('time_period_start', null);
const endPeriod = () => recordEvent('time_period_end', null);
const endMatch = () => recordEvent('time_game_end', null);

const reset = () => {
  state.startedAt = new Date().toISOString();
  state.events = [];
  lastActionAt.value = null;
};

const getOpponents = (team: TchoukTeam) =>
  props.teams.filter((t) => t.id !== team.id);

const matchData = computed<TchoukSheet>(() => ({
  teams: props.teams.map((t) => ({ id: t.id, name: t.name })),
  period: period.value,
  startedAt: state.startedAt,
  events: [...state.events],
}));

watch(matchData, (data) => emit('game-event-change', data), { deep: true });
</script>

<template>
  <PeriodTracker
    :phase="phase"
    :period="period"
    @start-game="startGame"
    @start-period="startPeriod"
    @end-period="endPeriod"
    @end-match="endMatch"
  />
  <LastActionTimer
    :since="lastActionAt"
    :active="canScore"
    @end-period="endPeriod"
    @end-match="endMatch"
  />
  <Scoreboard :sheet="matchData" />
  <div class="scoreboard" :style="{ '--cols': teams.length }">
    <TeamColumn
      v-for="team in teams"
      :key="team.id"
      :id="team.id"
      :name="team.name"
      :opponents="getOpponents(team)"
      :disabled="!canScore"
      :can-decrement="(scores[team.id] ?? 0) > 0"
      @score="increment"
      @decrement="decrement(team.id)"
    />
  </div>
  <button class="reset" @click="reset" :disabled="!state.events.length">Reset</button>
</template>

<style scoped>
.scoreboard {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
  gap: 1rem;
}
.reset {
  margin: 2rem auto 0;
  display: block;
  cursor: pointer;
  border: 1px solid #64748b;
  background: transparent;
  color: #94a3b8;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.15s;
}
.reset:hover:not(:disabled) { background: #334155; }
.reset:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
