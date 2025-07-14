// client/src/game/InteractionManager.js - CHEF D'ORCHESTRE DES INTERACTIONS
// 🎯 Route les interactions vers les managers spécialisés

import { InteractionNpcManager } from '../Interaction/InteractionNpcManager.js';
import { InteractionGameobjectManager } from '../Interaction/InteractionGameobjectManager.js';

export class InteractionManager {
  constructor(networkManager) {
    this.networkManager = networkManager;
    
    // Créer les managers spécialisés
    this.npcManager = new InteractionNpcManager(networkManager);
    this.gameobjectManager = new InteractionGameobjectManager(networkManager);
    
    this.isInitialized = false;
    this.lastInteractionTime = 0;
    this.globalCooldown = 300; // Cooldown global minimal
  }
  
  initialize() {
    if (this.isInitialized) {
      return;
    }
    
    // Configurer les callbacks du NetworkManager
    this.setupNetworkCallbacks();
    
    this.isInitialized = true;
  }
  
  setupNetworkCallbacks() {
    // Callback pour réponses NPC du serveur
    this.networkManager.onNpcInteraction((data) => {
      if (this.npcManager) {
        this.npcManager.handleServerResponse(data);
      }
    });
    
    // Callback pour réponses Gameobject du serveur (si disponible)
    if (this.networkManager.onGameobjectInteraction) {
      this.networkManager.onGameobjectInteraction((data) => {
        if (this.gameobjectManager) {
          this.gameobjectManager.handleServerResponse(data);
        }
      });
    }
  }
  
  // === POINT D'ENTRÉE PRINCIPAL ===
  
  handleInteraction(targetData) {
    if (!this.isInitialized) {
      console.error('❌ [InteractionManager] Non initialisé');
      return false;
    }
    
    // Protection cooldown global
    if (!this.canInteract()) {
      return false;
    }
    
    this.lastInteractionTime = Date.now();
    
    // Router selon le type d'objet
    if (this.isNpc(targetData)) {
      return this.npcManager.handleNpcInteraction(targetData);
    } else if (this.isGameobject(targetData)) {
      return this.gameobjectManager.handleGameobjectInteraction(targetData);
    } else {
      console.warn('⚠️ [InteractionManager] Type d\'objet non reconnu');
      return false;
    }
  }
  
  // === DÉTECTION DU TYPE D'OBJET ===
  
  isNpc(data) {
    if (!data) return false;
    
    return !!(
      data.isNpc ||
      data.npcId ||
      data.npcType ||
      data.npcName ||
      (data.type && ['npc', 'character', 'person'].includes(data.type.toLowerCase())) ||
      (data.sprite && data.sprite.includes('npc')) ||
      data.name // Les NPCs ont généralement un nom
    );
  }
  
  isGameobject(data) {
    if (!data) return false;
    
    return !!(
      data.isGameobject ||
      data.objectId ||
      data.objectType ||
      (data.type && ['chest', 'door', 'switch', 'collectible', 'teleporter', 'sign', 'object'].includes(data.type.toLowerCase()))
    );
  }
  
  // === UTILITAIRES ===
  
  canInteract() {
    const now = Date.now();
    return (now - this.lastInteractionTime) >= this.globalCooldown;
  }
  
  // === ACCÈS AUX MANAGERS SPÉCIALISÉS ===
  
  getNpcManager() {
    return this.npcManager;
  }
  
  getGameobjectManager() {
    return this.gameobjectManager;
  }
  
  // === ÉTAT ET DEBUG ===
  
  isProcessing() {
    return (
      this.npcManager?.isProcessing || 
      this.gameobjectManager?.isProcessing ||
      false
    );
  }
  
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      lastInteractionTime: this.lastInteractionTime,
      canInteract: this.canInteract(),
      isProcessing: this.isProcessing(),
      npcManager: this.npcManager?.getDebugInfo() || null,
      gameobjectManager: this.gameobjectManager?.getDebugInfo() || null
    };
  }
  
  // === MÉTHODES LEGACY POUR COMPATIBILITÉ ===
  
  // Appelée par les scenes existantes
  processInteraction(targetData) {
    return this.handleInteraction(targetData);
  }
  
  // Pour les systèmes qui appellent directement
  handleNpcInteraction(npcData) {
    if (this.isNpc(npcData)) {
      return this.npcManager.handleNpcInteraction(npcData);
    }
    return false;
  }
  
  handleObjectInteraction(objectData) {
    if (this.isGameobject(objectData)) {
      return this.gameobjectManager.handleGameobjectInteraction(objectData);
    }
    return false;
  }
  
  // === NETTOYAGE ===
  
  destroy() {
    this.isInitialized = false;
    
    if (this.npcManager) {
      this.npcManager.destroy?.();
      this.npcManager = null;
    }
    
    if (this.gameobjectManager) {
      this.gameobjectManager.destroy?.();
      this.gameobjectManager = null;
    }
    
    this.networkManager = null;
  }
}

export default InteractionManager;
