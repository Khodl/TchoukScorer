<script setup lang="ts">
import { computed } from 'vue';
import { useConfirm } from '../composables/useConfirm';
import { eventPeriod } from '../types';
import type { TchoukSheet, TchoukEvent, TchoukEventType, TeamId } from '../types';

const props = defineProps<{
  sheet: TchoukSheet;
}>();

const emit = defineEmits<{
  delete: [index: number];
}>();

const { confirm } = useConfirm();

const EVENT_LABELS: Record<TchoukEventType, string> = {
  time_game_start: 'Game start',
  time_period_start: 'Period start',
  time_period_end: 'Period end',
  time_game_end: 'Game end',
  score_point_scored: 'Point scored',
  score_point_given: 'Point given',
  score_point_correction: 'Correction',
};

const teamNames = computed(() => {
  const map = new Map<TeamId, string>();
  for (const team of props.sheet.teams) map.set(team.id, team.name);
  return map;
});

// Most recent first, while keeping each event's real index in the log so we
// can delete the right one. The period is derived from the event's position.
const rows = computed(() =>
  props.sheet.events
    .map((event, index) => ({
      event,
      index,
      period: eventPeriod(props.sheet.events, index),
    }))
    .reverse(),
);

const isPointEvent = (event: TchoukEvent) => event.type.startsWith('score_');

// Point events can always be deleted. Time/phase events form the match
// timeline, so only the most recent one (the last log) may be removed.
const canDelete = (event: TchoukEvent, index: number) =>
  isPointEvent(event) || index === props.sheet.events.length - 1;

const requestDelete = async (index: number, event: TchoukEvent) => {
  const ok = await confirm(`Delete event "${EVENT_LABELS[event.type]}"?`, {
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
  });
  if (ok) emit('delete', index);
};

const teamName = (id?: TeamId | null) =>
  id == null ? '—' : teamNames.value.get(id) ?? String(id);

const time = (iso: string) => new Date(iso).toLocaleTimeString();

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const detail = (event: TchoukEvent) => {
  if (!event.scoreChange) return '—';
  const delta = signed(event.scoreChange.increment);
  if (event.type === 'score_point_given' && event.actor) {
    return `${delta} (by ${teamName(event.actor.teamId)})`;
  }
  return delta;
};
</script>

<template>
  <section class="event-log">
    <h3>Event log</h3>
    <p v-if="!sheet.events.length" class="empty">No events yet.</p>
    <table v-else>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Time</th>
          <th>Period</th>
          <th>Event</th>
          <th>Team</th>
          <th>Detail</th>
          <th class="actions" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="{ event, index, period } in rows" :key="index">
          <td class="num">{{ index + 1 }}</td>
          <td class="time">{{ time(event.at) }}</td>
          <td class="num">{{ period ?? '—' }}</td>
          <td>{{ EVENT_LABELS[event.type] }}</td>
          <td>{{ teamName(event.target?.teamId) }}</td>
          <td class="detail">{{ detail(event) }}</td>
          <td class="actions">
            <button
              v-if="canDelete(event, index)"
              class="delete"
              title="Delete event"
              aria-label="Delete event"
              @click="requestDelete(index, event)"
            >×</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.event-log {
  margin-top: 2rem;
}
h3 {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}
.empty {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}
th,
td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #334155;
}
th {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
  background: #0f172a;
}
tbody tr:last-child td {
  border-bottom: none;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}
.time {
  font-variant-numeric: tabular-nums;
  color: #cbd5e1;
}
.detail {
  font-variant-numeric: tabular-nums;
}
th.actions,
td.actions {
  width: 1%;
  text-align: center;
  padding: 0.25rem 0.5rem;
}
.delete {
  cursor: pointer;
  width: 1.6rem;
  height: 1.6rem;
  line-height: 1;
  border: 1px solid #475569;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 1.1rem;
  font-weight: 700;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.delete:hover {
  background: #7f1d1d;
  border-color: #b91c1c;
  color: #fee2e2;
}
</style>
