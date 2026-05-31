<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import { useConfirm } from '../composables/useConfirm';

const { state, accept, cancel } = useConfirm();

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') cancel();
  else if (e.key === 'Enter') accept();
};

watch(
  () => state.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown);
    else window.removeEventListener('keydown', onKeydown);
  },
);

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Transition name="confirm-fade">
    <div v-if="state.open" class="confirm-overlay" @click.self="cancel">
      <div class="confirm-dialog" role="alertdialog" aria-modal="true">
        <p class="confirm-message">{{ state.message }}</p>
        <div class="confirm-actions">
          <button class="cancel" @click="cancel">{{ state.cancelLabel }}</button>
          <button class="accept" @click="accept" autofocus>{{ state.confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
}
.confirm-dialog {
  width: 100%;
  max-width: 360px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
.confirm-message {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  line-height: 1.4;
  color: #e2e8f0;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
button {
  cursor: pointer;
  border: 1px solid #475569;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.15s;
}
.cancel {
  background: transparent;
  color: #94a3b8;
}
.cancel:hover { background: #334155; }
.accept {
  background: #dc2626;
  border-color: #b91c1c;
  color: #fee2e2;
}
.accept:hover { background: #b91c1c; }
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.15s;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
