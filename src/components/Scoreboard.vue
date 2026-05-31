<script setup lang="ts">
import { computed } from 'vue';
import { computeScores } from '../types';
import type { GameSheet } from '../types';

const props = defineProps<{
  sheet: GameSheet;
}>();

const scores = computed(() => computeScores(props.sheet.events));
</script>

<template>
  <section class="scoreboard" :style="{ '--cols': sheet.teams.length }">
    <div v-for="team in sheet.teams" :key="team.id" class="team">
      <span class="name">{{ team.name }}</span>
      <span class="score">{{ scores[team.id] ?? 0 }}</span>
    </div>
  </section>
</template>

<style scoped>
.scoreboard {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
  gap: 1rem;
}
.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
}
.name {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
  text-align: center;
}
.score {
  font-size: 3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #e2e8f0;
}
</style>
