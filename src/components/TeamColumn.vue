<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';
import type { TchoukTeam, TeamId } from '../types';

const props = withDefaults(
  defineProps<{
    id: TeamId;
    name: string;
    opponents?: TchoukTeam[];
    disabled?: boolean;
    canDecrement?: boolean;
  }>(),
  {
    opponents: () => [],
    disabled: false,
    canDecrement: true,
  },
);

const emit = defineEmits<{
  score: [id: TeamId, givenBy?: TeamId];
  decrement: [];
}>();

const { confirm } = useConfirm();

const requestDecrement = async () => {
  const ok = await confirm(`Remove 1 point from ${props.name}?`, {
    confirmLabel: 'Remove point',
    cancelLabel: 'Keep',
  });
  if (ok) emit('decrement');
};
</script>

<template>
  <section class="team">
    <button class="big-plus" @click="emit('score', id)" :disabled="disabled">+1</button>
    <h2>{{ name }}</h2>
    <div v-if="opponents.length" class="opponents">
      <ul class="opponent-rows">
        <li v-for="opponent in opponents" :key="opponent.id">
          <button
            class="plus-one"
            @click="emit('score', id, opponent.id)"
            :disabled="disabled"
          >
            <span class="given-label">Given point by</span>
            <span class="given-name">{{ opponent.name }}</span>
          </button>
        </li>
      </ul>
    </div>
    <button
      class="undo"
      @click="requestDecrement"
      :disabled="disabled || !canDecrement"
    >
      Correction: -1
    </button>
  </section>
</template>

<style scoped>
.team {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
}
.team h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
button {
  cursor: pointer;
  border: 1px solid #475569;
  background: #334155;
  color: #e2e8f0;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.15s;
}
button:hover:not(:disabled) { background: #475569; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
.big-plus {
  background: #0ea5e9;
  border-color: #0284c7;
  color: #f0f9ff;
  font-size: 2.75rem;
  font-weight: 700;
  line-height: 1;
  padding: 1.5rem 1rem;
  margin-bottom: 1rem;
}
.big-plus:hover:not(:disabled) { background: #0284c7; }
.opponents {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}
.opponent-rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.plus-one {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  background: #0ea5e9;
  border-color: #0284c7;
  color: #f0f9ff;
  padding: 0.5rem 0.7rem;
}
.plus-one:hover:not(:disabled) { background: #0284c7; }
.given-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.85;
}
.given-name {
  font-size: 0.95rem;
  font-weight: 700;
}
.undo {
  margin-top: 1.5rem;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: transparent;
  border-color: #475569;
  color: #94a3b8;
}
.undo:hover:not(:disabled) { background: #334155; }
</style>
