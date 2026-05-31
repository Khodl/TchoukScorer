<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

const IDLE_ALERT_MS = 5000;

const props = withDefaults(
  defineProps<{
    since?: string | number | Date | null;
    /** Only prompt while a match is actually in progress. */
    active?: boolean;
  }>(),
  {
    since: null,
    active: true,
  },
);

const emit = defineEmits<{
  'end-period': [];
  'end-match': [];
}>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 500);
});
onBeforeUnmount(() => clearInterval(timer));

const elapsedMs = computed(() => {
  if (!props.since) return null;
  const base = new Date(props.since).getTime();
  return Math.max(0, now.value - base);
});

const display = computed(() => {
  if (elapsedMs.value === null) return '0:00';
  const totalSec = Math.floor(elapsedMs.value / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
});

// "Do something else" dismisses the alert; it reappears only after the next
// recorded action (i.e. when `since` changes) leaves the game idle again.
const dismissed = ref(false);
watch(
  () => props.since,
  () => {
    dismissed.value = false;
  },
);

const showAlert = computed(
  () =>
    props.active &&
    !dismissed.value &&
    elapsedMs.value !== null &&
    elapsedMs.value > IDLE_ALERT_MS,
);

const endPeriod = () => {
  emit('end-period');
};
const endMatch = () => {
  emit('end-match');
};
const dismiss = () => {
  dismissed.value = true;
};
</script>

<template>
  <Transition name="alert-fade">
    <section v-if="showAlert" class="idle-alert" role="alert">
      <p class="message">
        No action for <strong>{{ display }}</strong>. What next?
      </p>
      <div class="actions">
        <button class="primary" @click="endPeriod">End period</button>
        <button class="danger" @click="endMatch">End match</button>
        <button class="ghost" @click="dismiss">Keep playing</button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.idle-alert {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  background: #422006;
  border: 1px solid #b45309;
  border-radius: 12px;
}
.message {
  margin: 0;
  font-size: 0.95rem;
  color: #fed7aa;
}
.message strong {
  font-variant-numeric: tabular-nums;
  color: #fef3c7;
}
.actions {
  display: flex;
  flex-wrap: wrap;
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
button:hover { background: #475569; }
.primary {
  background: #0ea5e9;
  border-color: #0284c7;
  color: #f0f9ff;
}
.primary:hover { background: #0284c7; }
.danger {
  background: #dc2626;
  border-color: #b91c1c;
  color: #fee2e2;
}
.danger:hover { background: #b91c1c; }
.ghost {
  background: transparent;
  color: #fdba74;
  border-color: #b45309;
}
.ghost:hover { background: rgba(180, 83, 9, 0.2); }
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.2s;
}
.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
}
</style>
