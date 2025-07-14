// client/src/game/InteractionManager.js - CHEF D'ORCHESTRE DES INTERACTIONS
// 🎯 Route les interactions vers les managers spécialisés

import { InteractionNpcManager } from '../Interaction/InteractionNpcManager.js';
import { InteractionGameobjectManager } from '../Interaction/InteractionGameobjectManager.js';

export class InteractionManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    
    // === MANAGERS SPÉCIALISÉS ===
    this.npcManager = new InteractionNpcManager(networkManager);
    this.gameobjectManager = new InteractionGameobjectManager(networkManager);
    
    // === ÉTAT ===
    this.isInitialized = false;
    this.lastInteractionTime = 0;
    this.globalCooldown = 200; // 200ms entre toute interaction
    
    console.log('🎯 [InteractionManager] Chef d\'orchestre créé');
  }
  
  // === 🚀 INITIALISATION ===
  
  initialize() {
    if (this.isInitialized) {
      console.log('ℹ️ [InteractionManager] Déjà initialisé');
      return;
    }
    
    console.log('🚀 [InteractionManager] Initialisation...');
    
    // Configurer les callbacks du NetworkManager pour router les réponses
    this.setupNetworkCallbacks();
    
    this.isInitialized = true;
    console.log('✅ [InteractionManager] Initialisé et connecté au réseau');
  }
  
  // === 📡 CONFIGURATION RÉSEAU ===
  
  setupNetworkCallbacks() {
    console.log('📡 [InteractionManager] Configuration callbacks réseau...');
    
    // Callback pour réponses d'interactions NPCs
    this.networkManager.onNpcInteraction((data) => {
      console.log('📨 [InteractionManager] Réponse NPC reçue, routage vers NpcManager');
      this.npcManager.handleServerResponse(data);
    });
    
    // Callback pour réponses d'interactions d'objets
    this.networkManager.onMessage('gameobjectInteractionResult', (data) => {
      console.log('📨 [InteractionManager] Réponse Gameobject reçue, routage vers GameobjectManager');
      this.gameobjectManager.handleServerResponse(data);
    });
    
    // Callback générique pour interactions (backup)
    this.networkManager.onMessage('interactionResult', (data) => {
      console.log('📨 [InteractionManager] Réponse générique reçue');
      this.routeGenericResponse(data);
    });
    
    console.log('✅ [InteractionManager] Callbacks réseau configurés');
  }
  
  // === 🎯 POINT D'ENTRÉE PRINCIPAL ===
  
  handleInteraction(targetData) {
    console.log('🎯 [InteractionManager] === INTERACTION DEMANDÉE ===');
    console.log('📊 Target:', targetData);
    
    // Vérifications préliminaires
    if (!this.canProcessInteraction()) {
      console.log('🚫 [InteractionManager] Interaction bloquée (cooldown global)');
      return false;
    }
    
    if (!this.isInitialized) {
      console.error('❌ [InteractionManager] Non initialisé');
      return false;
    }
    
    if (!targetData) {
      console.error('❌ [InteractionManager] Aucune donnée de cible');
      return false;
    }
    
    // Mettre à jour le cooldown global
    this.lastInteractionTime = Date.now();
    
    // Router selon le type d'objet
    return this.routeInteraction(targetData);
  }
  
  // === 🔀 ROUTAGE DES INTERACTIONS ===
  
  routeInteraction(targetData) {
    console.log('🔀 [InteractionManager] === ROUTAGE ===');
    
    // Déterminer le type d'objet
    const objectType = this.determineObjectType(targetData);
    console.log('📋 [InteractionManager] Type détecté:', objectType);
    
    switch (objectType) {
      case 'npc':
        console.log('🤖 [InteractionManager] → Délégation au NpcManager');
        return this.npcManager.handleNpcInteraction(targetData);
        
      case 'gameobject':
        console.log('📦 [InteractionManager] → Délégation au GameobjectManager');
        return this.gameobjectManager.handleGameobjectInteraction(targetData);
        
      case 'unknown':
      default:
        console.warn('⚠️ [InteractionManager] Type d\'objet non reconnu, tentative auto-détection...');
        return this.handleUnknownObject(targetData);
    }
  }
  
  // === 🔍 DÉTECTION DU TYPE D'OBJET ===
  
  determineObjectType(data) {
    // Vérification explicite NPC
    if (this.isNpc(data)) {
      return 'npc';
    }
    
    // Vérification explicite Gameobject
    if (this.isGameobject(data)) {
      return 'gameobject';
    }
    
    // Auto-détection par propriétés
    if (data.name && (data.dialog || data.shop || data.quest)) {
      return 'npc';
    }
    
    if (data.interactable || data.trigger || data.collectible) {
      return 'gameobject';
    }
    
    return 'unknown';
  }
  
  isNpc(data) {
    return !!(
      data.isNpc ||
      data.npcId ||
      data.npcType ||
      data.npcName ||
      (data.type && ['npc', 'character', 'person', 'merchant', 'trainer', 'questgiver'].includes(data.type.toLowerCase())) ||
      (data.objectType && ['npc', 'character'].includes(data.objectType.toLowerCase()))
    );
  }
  
  isGameobject(data) {
    return !!(
      data.isGameobject ||
      data.objectId ||
      data.objectType ||
      data.gameobjectId ||
      (data.type && ['chest', 'door', 'switch', 'collectible', 'teleporter', 'sign', 'object'].includes(data.type.toLowerCase())) ||
      (data.interactable === true)
    );
  }
  
  // === 🤷 GESTION DES OBJETS INCONNUS ===
  
  handleUnknownObject(data) {
    console.log('🤷 [InteractionManager] Objet de type inconnu, tentative générique...');
    
    // Si on a un ID quelconque, essayer comme NPC d'abord
    if (data.id || data.name) {
      console.log('🔄 [InteractionManager] Tentative NPC par défaut...');
      return this.npcManager.handleNpcInteraction(data);
    }
    
    console.warn('⚠️ [InteractionManager] Impossible de déterminer le type d\'objet');
    this.showErrorMessage('Objet non interactif');
    return false;
  }
  
  // === 📨 ROUTAGE DES RÉPONSES GÉNÉRIQUES ===
  
  routeGenericResponse(data) {
    console.log('📨 [InteractionManager] Routage réponse générique:', data);
    
    // Router selon le type de réponse
    if (data.type && ['questGiver', 'shop', 'dialog', 'trainer'].includes(data.type)) {
      console.log('🤖 [InteractionManager] Réponse générique → NpcManager');
      this.npcManager.handleServerResponse(data);
    } else if (data.type && ['chest', 'door', 'switch', 'collectible'].includes(data.type)) {
      console.log('📦 [InteractionManager] Réponse générique → GameobjectManager');
      this.gameobjectManager.handleServerResponse(data);
    } else {
      console.warn('⚠️ [InteractionManager] Type de réponse non reconnu:', data.type);
    }
  }
  
  // === 🚫 PROTECTION ANTI-SPAM ===
  
  canProcessInteraction() {
    const now = Date.now();
    return (now - this.lastInteractionTime) >= this.globalCooldown;
  }
  
  // === 🔧 UTILITAIRES ===
  
  showErrorMessage(message) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'warning', { duration: 2000 });
    } else {
      console.warn(`⚠️ [InteractionManager] ${message}`);
    }
  }
  
  // === 📊 STATISTIQUES ET DEBUG ===
  
  getStats() {
    return {
      isInitialized: this.isInitialized,
      lastInteractionTime: this.lastInteractionTime,
      globalCooldown: this.globalCooldown,
      canProcessInteraction: this.canProcessInteraction(),
      npcManager: this.npcManager.getDebugInfo(),
      gameobjectManager: this.gameobjectManager.getDebugInfo()
    };
  }
  
  getDebugInfo() {
    const stats = this.getStats();
    
    console.log('🔍 [InteractionManager] === DEBUG INFO ===');
    console.log('📊 État général:', {
      initialized: stats.isInitialized,
      canProcess: stats.canProcessInteraction,
      lastInteraction: new Date(stats.lastInteractionTime).toLocaleTimeString()
    });
    console.log('🤖 NpcManager:', stats.npcManager);
    console.log('📦 GameobjectManager:', stats.gameobjectManager);
    
    return stats;
  }
  
  // === 🔄 MÉTHODES DE GESTION ===
  
  reset() {
    console.log('🔄 [InteractionManager] Reset...');
    
    this.lastInteractionTime = 0;
    
    // Reset des managers spécialisés si ils ont une méthode reset
    if (this.npcManager.reset) {
      this.npcManager.reset();
    }
    
    if (this.gameobjectManager.reset) {
      this.gameobjectManager.reset();
    }
    
    console.log('✅ [InteractionManager] Reset terminé');
  }
  
  destroy() {
    console.log('🧹 [InteractionManager] Destruction...');
    
    this.isInitialized = false;
    
    // Détruire les managers spécialisés
    if (this.npcManager.destroy) {
      this.npcManager.destroy();
    }
    
    if (this.gameobjectManager.destroy) {
      this.gameobjectManager.destroy();
    }
    
    // Nettoyer les références
    this.networkManager = null;
    this.npcManager = null;
    this.gameobjectManager = null;
    
    console.log('✅ [InteractionManager] Détruit');
  }
  
  // === 🎯 MÉTHODES D'ACCÈS AUX MANAGERS ===
  
  getNpcManager() {
    return this.npcManager;
  }
  
  getGameobjectManager() {
    return this.gameobjectManager;
  }
  
  // === 🔧 CONFIGURATION ===
  
  setGlobalCooldown(ms) {
    this.globalCooldown = Math.max(0, ms);
    console.log(`⚙️ [InteractionManager] Cooldown global: ${this.globalCooldown}ms`);
  }
  
  // === 🎮 MÉTHODES LEGACY (pour compatibilité) ===
  
  // Méthode legacy pour compatibilité avec l'ancien code
  processInteraction(targetData) {
    console.log('🔄 [InteractionManager] Méthode legacy processInteraction → handleInteraction');
    return this.handleInteraction(targetData);
  }
  
  // Méthode legacy pour les interactions directes
  interactWith(target) {
    console.log('🔄 [InteractionManager] Méthode legacy interactWith → handleInteraction');
    return this.handleInteraction(target);
  }
}

// === 🌐 EXPOSITION GLOBALE ===

// Fonction d'aide pour créer et initialiser l'InteractionManager
export function createInteractionManager(networkManager) {
  console.log('🏭 [InteractionManagerFactory] Création InteractionManager...');
  
  const manager = new InteractionManager(networkManager);
  manager.initialize();
  
  console.log('✅ [InteractionManagerFactory] InteractionManager créé et initialisé');
  return manager;
}

// Debug global
window.debugInteractionManager = function() {
  if (window.interactionManager) {
    return window.interactionManager.getDebugInfo();
  } else {
    console.error('❌ InteractionManager global non disponible');
    return null;
  }
};
