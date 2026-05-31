<script setup lang="ts">
import { computed } from 'vue';
import type { GamePhase } from '../types';

const props = defineProps<{
  phase: GamePhase;
  period: number;
}>();

defineEmits<{
  'start-game': [];
  'start-period': [];
  'end-period': [];
  'end-match': [];
}>();

const status = computed(() => {
  switch (props.phase) {
    case 'pregame':
      return 'Not started';
    case 'game_started':
      return 'Ready to start';
    case 'period_started':
      return `Period ${props.period}`;
    case 'period_ended':
      return `Period ${props.period} ended`;
    case 'game_ended':
      return 'Match over';
    default:
      return '';
  }
});
</script>

<template>
  <section
    class="period"
    :class="{
      idle: phase === 'pregame' || phase === 'game_ended',
      running: phase === 'period_started',
    }"
  >
    <div class="label">
      <span class="caption">Status</span>
      <span class="value">
        <span v-if="phase === 'period_started'" class="pulse" aria-hidden="true" />
        {{ status }}
      </span>
    </div>
    <div class="actions">
      <!-- pregame -->
      <button v-if="phase === 'pregame'" class="primary" @click="$emit('start-game')">
        Ready to start
      </button>

      <!-- after game start / after a period ended: start the (next) period, or end the match -->
      <template v-else-if="phase === 'game_started' || phase === 'period_ended'">
        <button class="primary" @click="$emit('start-period')">
          Start period {{ period + 1 }}
        </button>
        <button class="secondary" @click="$emit('end-match')">End match</button>
      </template>

      <!-- during a period: end the period, or end the match -->
      <template v-else-if="phase === 'period_started'">
        <button class="primary" @click="$emit('end-period')">End period</button>
        <button class="secondary" @click="$emit('end-match')">End match</button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.period {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}
.period.idle {
  border-color: #475569;
  background: #0f172a;
}
.period.running {
  border-color: #15803d;
  background: #052e16;
}
.label {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.caption {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}
.value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
}
.pulse {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
  animation: period-pulse 1.4s ease-in-out infinite;
}
@keyframes period-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 0.5rem rgba(34, 197, 94, 0);
    opacity: 0.7;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
}
.actions {
  display: flex;
  gap: 0.5rem;
}
button {
  cursor: pointer;
  border: 1px solid #475569;
  background: #334155;
  color: #e2e8f0;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.15s;
}
button:hover:not(:disabled) { background: #475569; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
.primary {
  background: #0ea5e9;
  border-color: #0284c7;
  color: #f0f9ff;
}
.primary:hover { background: #0284c7; }
.secondary {
  background: transparent;
  color: #94a3b8;
}
</style>
