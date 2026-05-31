<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import TchoukScore from './components/TchoukScore.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import type { TchoukTeam, TchoukSheet } from './types';

const teams: TchoukTeam[] = [
  { id: 'italy', name: 'Italy' },
  { id: 'switzerland-m15-bejune', name: 'Switzerland M15 BEJUNE' },
];

const lastEvent = ref<TchoukSheet | null>(null);
const isOnline = ref(navigator.onLine);
const transientMessage = ref<string | null>(null);
let messageTimer: ReturnType<typeof setTimeout> | undefined;

const flash = (text: string) => {
  transientMessage.value = text;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => (transientMessage.value = null), 3000);
};

const handleOnline = () => {
  isOnline.value = true;
  flash('Back online');
};
const handleOffline = () => {
  isOnline.value = false;
  flash('You are offline — the app keeps working');
};

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  clearTimeout(messageTimer);
});

const onGameEventChange = (data: TchoukSheet) => {
  lastEvent.value = data;
  console.log('game-event-change', data);
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="transientMessage"
      class="status-banner"
      :class="isOnline ? 'online' : 'offline'"
      role="status"
      aria-live="polite"
    >
      <span class="dot" />
      {{ transientMessage }}
    </div>
  </Transition>
  <main>
    <h1>Tchouk Scorer</h1>
    <TchoukScore
      :teams="teams"
      @game-event-change="onGameEventChange"
    />
    <pre v-if="lastEvent" class="debug">{{ JSON.stringify(lastEvent, null, 2) }}</pre>
  </main>
  <ConfirmDialog />
</template>

<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
main { width: 100%; max-width: 720px; }
h1 {
  text-align: center;
  margin: 0 0 2rem;
  font-size: 2rem;
  letter-spacing: -0.02em;
}
.debug {
  margin-top: 2rem;
  padding: 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 0.8rem;
  overflow-x: auto;
}
.status-banner {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  z-index: 1000;
  border: 1px solid;
  backdrop-filter: blur(8px);
}
.status-banner.offline {
  background: rgba(127, 29, 29, 0.85);
  border-color: #b91c1c;
  color: #fee2e2;
}
.status-banner.online {
  background: rgba(20, 83, 45, 0.85);
  border-color: #15803d;
  color: #dcfce7;
}
.status-banner .dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -0.5rem);
}
</style>
