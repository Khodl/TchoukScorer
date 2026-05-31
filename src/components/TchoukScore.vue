<script setup lang="ts">
import { watch } from 'vue';
import TeamColumn from './TeamColumn.vue';
import PeriodTracker from './PeriodTracker.vue';
import LastActionTimer from './LastActionTimer.vue';
import Scoreboard from './Scoreboard.vue';
import EventLog from './EventLog.vue';
import { useMatchStore } from '../stores/useMatchStore';
import type { TchoukTeam, GameSheet } from '../types';

const props = defineProps<{
  teams: TchoukTeam[];
}>();

const emit = defineEmits<{
  'game-event-change': [data: GameSheet];
}>();

// All match state and calculations live in the store; this component is just
// a view over the single source of truth (the sheet).
const store = useMatchStore();
const { sheet, scores, phase, period, canScore, lastActionAt } = store;

store.setTeams(props.teams);
watch(() => props.teams, (teams) => store.setTeams(teams), { deep: true });

const getOpponents = (team: TchoukTeam) =>
  sheet.teams.filter((t) => t.id !== team.id);

// Re-publish a snapshot of the sheet whenever it changes.
watch(
  () => sheet,
  (data) =>
    emit('game-event-change', {
      ...data,
      teams: [...data.teams],
      events: [...data.events],
    }),
  { deep: true },
);
</script>

<template>
  <PeriodTracker
    :phase="phase"
    :period="period"
    @start-game="store.startGame"
    @start-period="store.startPeriod"
    @end-period="store.endPeriod"
    @end-match="store.endMatch"
  />
  <LastActionTimer
    :since="lastActionAt"
    :active="canScore"
    @end-period="store.endPeriod"
    @end-match="store.endMatch"
  />
  <Scoreboard :sheet="sheet" />
  <div class="scoreboard" :style="{ '--cols': sheet.teams.length }">
    <TeamColumn
      v-for="team in sheet.teams"
      :key="team.id"
      :id="team.id"
      :name="team.name"
      :opponents="getOpponents(team)"
      :disabled="!canScore"
      :can-decrement="(scores[team.id] ?? 0) > 0"
      @score="store.score"
      @decrement="store.correct(team.id)"
    />
  </div>
  <button class="reset" @click="store.reset" :disabled="!sheet.events.length">Reset</button>
  <EventLog :sheet="sheet" @delete="store.removeEvent" />
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
