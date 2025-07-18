// Quest/index.js - POINT D'ENTRÉE SIMPLIFIÉ
// 🎯 Export direct du QuestSystem unifié

export { QuestSystem, createQuestSystem } from './QuestSystem.js';
export { QuestIcon } from './QuestIcon.js';
export { QuestUI } from './QuestUI.js';

// === ALIAS POUR COMPATIBILITÉ ===

export { createQuestSystem as createQuestModule } from './QuestSystem.js';
export { QuestSystem as QuestModule } from './QuestSystem.js';

// === FONCTION PRINCIPALE ===

export async function initializeQuestSystem(gameRoom, networkManager, scene) {
  const { createQuestSystem } = await import('./QuestSystem.js');
  return createQuestSystem(gameRoom, networkManager, scene);
}

console.log('📖 [Quest/index] Système unifié chargé');
console.log('🎯 Utilisez createQuestSystem(gameRoom, networkManager) pour initialiser');
