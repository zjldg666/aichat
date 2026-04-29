import { useTownStore } from '@/stores/useTownStore.js';

export async function bootstrapTown() {
  const townStore = useTownStore();
  await townStore.initialize();
  return townStore.activeWorld;
}
