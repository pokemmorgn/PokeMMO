// Quest/index.js - POINT D'ENTRÉE AVEC QUESTDETAILSUI
// 🎯 Export direct du QuestSystem unifié + QuestDetailsUI

export { QuestSystem, createQuestSystem } from './QuestSystem.js';
export { QuestIcon } from './QuestIcon.js';
export { QuestUI } from './QuestUI.js';
export { QuestDetailsUI } from './QuestDetailsUI.js'; // 🆕 NOUVEAU

// === ALIAS POUR COMPATIBILITÉ ===
export { createQuestSystem as createQuestModule } from './QuestSystem.js';
export { QuestSystem as QuestModule } from './QuestSystem.js';

// === FONCTION PRINCIPALE ===
export async function initializeQuestSystem(gameRoom, networkManager) {
  const { createQuestSystem } = await import('./QuestSystem.js');
  return createQuestSystem(gameRoom, networkManager);
}

console.log('📖 [Quest/index] Système unifié simplifié avec QuestDetailsUI chargé');
console.log('🎯 Utilisez createQuestSystem(gameRoom, networkManager) pour initialiser');
console.log('📋 QuestDetailsUI inclus dans le système complet');
