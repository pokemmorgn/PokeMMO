// client/src/managers/TeamManager.js - VERSION CONTRÔLÉE PAR UIMANAGER
// 🎯 UIManager devient le MAÎTRE - modules deviennent des SERVANTS obéissants

import { TeamUI } from '../components/TeamUI.js';
import { TeamIcon } from '../components/TeamIcon.js';

export class TeamManager {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    
    // === ÉTAT CENTRALISÉ CONTRÔLÉ PAR UIMANAGER ===
    this.uiManagerState = {
      visible: false,           // UIManager contrôle la visibilité
      enabled: false,           // UIManager contrôle l'état
      initialized: false,       // UIManager contrôle l'initialisation
      controlled: true          // Marquer comme contrôlé par UIManager
    };
    
    // === MODULES UI PASSIFS ===
    this.teamUI = null;
    this.teamIcon = null;
    
    // === DONNÉES BUSINESS LOGIC SEULEMENT ===
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      faintedPokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    // === CONFIGURATION ===
    this.isUIManagerControlled = true;  // Flag important
    this.preventAutoActions = true;     // Empêcher les actions automatiques
    this.silentMode = false;           // Mode silencieux pour les logs
    
    console.log("⚔️ [TeamManager] Instance créée (UIManager-controlled)");
  }

  // ===== 🎯 INITIALISATION CONTRÔLÉE PAR UIMANAGER =====
  
  async init() {
    if (this.isUIManagerControlled) {
      // En mode contrôlé, on ne fait QUE la logique business
      this.log("🎯 [TeamManager] Init en mode UIManager-controlled");
      
      // Setup data logic seulement
      this.setupDataLogic();
      this.setupServerListeners();
      
      // PAS d'UI - sera créée par UIManager via les factories
      this.uiManagerState.initialized = true;
      
      this.log("✅ [TeamManager] Logique business initialisée");
      return this;
    }
    
    // Mode legacy (ne devrait pas être utilisé)
    return this.initLegacy();
  }

  setupDataLogic() {
    // Setup uniquement la logique de données
    this.dataUpdateHandlers = new Map();
    this.eventQueue = [];
    this.lastDataUpdate = 0;
    
    // Auto-cleanup des données anciennes
    setInterval(() => {
      this.cleanupStaleData();
    }, 60000); // 1 minute
  }

  setupServerListeners() {
    if (!this.gameRoom) {
      this.warn("⚠️ Pas de gameRoom pour les listeners");
      return;
    }

    try {
      // === LISTENERS PUREMENT DATA - SANS UI ===
      
      this.gameRoom.onMessage("teamData", (data) => {
        this.handleTeamDataUpdate(data);
      });

      this.gameRoom.onMessage("teamActionResult", (data) => {
        this.handleTeamActionResult(data);
      });

      this.gameRoom.onMessage("teamHealed", (data) => {
        this.handleTeamHealed(data);
      });

      this.gameRoom.onMessage("teamStats", (data) => {
        this.handleTeamStats(data);
      });
      
      this.log("✅ [TeamManager] Listeners data configurés");
      
    } catch (error) {
      console.error("❌ [TeamManager] Erreur setup listeners:", error);
    }
  }

  // ===== 🏭 FACTORIES POUR UIMANAGER =====
  
  /**
   * Factory pour TeamIcon - appelée par UIManager
   */
  createTeamIconForUIManager() {
    this.log("🏭 [Factory] Création TeamIcon pour UIManager");
    
    if (this.teamIcon) {
      this.warn("⚠️ TeamIcon existe déjà - destruction...");
      this.destroyTeamIcon();
    }

    try {
      // Créer TeamIcon en mode passif
      this.teamIcon = new TeamIcon(null, {
        uiManagerControlled: true,
        preventAutoActions: true,
        silent: this.silentMode,
        dataProvider: this // TeamManager fournit les données
      });
      
      // Connecter les données sans logique UI
      this.connectTeamIconData();
      
      this.log("✅ [Factory] TeamIcon créé (contrôlé par UIManager)");
      return this.teamIcon;
      
    } catch (error) {
      console.error("❌ [Factory] Erreur création TeamIcon:", error);
      return this.createFallbackTeamIcon();
    }
  }

  /**
   * Factory pour TeamUI - appelée par UIManager
   */
  createTeamUIForUIManager() {
    this.log("🏭 [Factory] Création TeamUI pour UIManager");
    
    if (this.teamUI) {
      this.warn("⚠️ TeamUI existe déjà - destruction...");
      this.destroyTeamUI();
    }

    try {
      // Créer TeamUI en mode passif
      this.teamUI = new TeamUI(this.gameRoom, {
        uiManagerControlled: true,
        preventAutoShow: true,
        preventAutoHide: true,
        dataProvider: this // TeamManager fournit les données
      });
      
      // Connecter les données sans logique UI
      this.connectTeamUIData();
      
      this.log("✅ [Factory] TeamUI créé (contrôlé par UIManager)");
      return this.teamUI;
      
    } catch (error) {
      console.error("❌ [Factory] Erreur création TeamUI:", error);
      return this.createFallbackTeamUI();
    }
  }

  // ===== 🔗 CONNEXIONS DATA SANS LOGIQUE UI =====

  connectTeamIconData() {
    if (!this.teamIcon) return;
    
    // Fournir les données initiales
    this.teamIcon.updateTeamStats(this.teamStats);
    
    // Connecter le click handler SANS logique d'affichage
    this.teamIcon.onClickRequest = () => {
      // Demander à UIManager d'ouvrir TeamUI
      this.requestUIManagerAction('toggleTeamUI');
    };
    
    // Connecter les updates de données
    this.on('statsUpdated', (stats) => {
      if (this.teamIcon && this.teamIcon.updateTeamStats) {
        this.teamIcon.updateTeamStats(stats);
      }
    });
  }

  connectTeamUIData() {
    if (!this.teamUI) return;
    
    // Fournir les données initiales
    this.teamUI.updateTeamData({ team: this.teamData });
    
    // Connecter les actions SANS logique d'affichage
    this.teamUI.onActionRequest = (action, data) => {
      this.handleTeamUIAction(action, data);
    };
    
    // Connecter les updates de données
    this.on('teamDataUpdated', (data) => {
      if (this.teamUI && this.teamUI.updateTeamData) {
        this.teamUI.updateTeamData(data);
      }
    });
  }

  // ===== 📡 COMMUNICATION AVEC UIMANAGER =====

  requestUIManagerAction(action, data = null) {
    this.log(`📡 [Request] Demande action UIManager: ${action}`);
    
    // Notifier UIManager via événement global
    window.dispatchEvent(new CustomEvent('teamManagerRequest', {
      detail: { action, data, source: 'teamManager' }
    }));
    
    // Fallback si UIManager n'est pas disponible
    if (!window.uiManager && !window.pokemonUISystem?.uiManager) {
      this.warn("⚠️ UIManager non disponible - action directe");
      this.handleDirectAction(action, data);
    }
  }

  handleDirectAction(action, data) {
    // Actions de fallback si UIManager n'est pas disponible
    switch (action) {
      case 'toggleTeamUI':
        if (this.teamUI) {
          this.teamUI.isVisible ? this.teamUI.hide() : this.teamUI.show();
        }
        break;
      case 'showTeamUI':
        if (this.teamUI) {
          this.teamUI.show();
        }
        break;
      case 'hideTeamUI':
        if (this.teamUI) {
          this.teamUI.hide();
        }
        break;
    }
  }

  handleTeamUIAction(action, data) {
    this.log(`🎬 [Action] TeamUI action: ${action}`);
    
    switch (action) {
      case 'healTeam':
        this.healTeam();
        break;
      case 'healPokemon':
        this.healPokemon(data.pokemonId);
        break;
      case 'removePokemon':
        this.removePokemon(data.pokemonId);
        break;
      case 'swapPokemon':
        this.swapPokemon(data.fromSlot, data.toSlot);
        break;
      case 'close':
        this.requestUIManagerAction('hideTeamUI');
        break;
    }
  }

  // ===== 🎛️ MÉTHODES UIMANAGER (INTERFACE PRINCIPALE) =====

  /**
   * UIManager appelle cette méthode pour afficher
   */
  show() {
    this.log("👁️ [UIManager→TeamManager] show() appelée");
    
    this.uiManagerState.visible = true;
    
    // Afficher uniquement si les composants existent
    if (this.teamIcon && !this.teamIcon.isDestroyed) {
      this.teamIcon.show();
    }
    
    // TeamUI reste caché par défaut (sera affiché sur demande)
    return true;
  }

  /**
   * UIManager appelle cette méthode pour cacher
   */
  hide() {
    this.log("👻 [UIManager→TeamManager] hide() appelée");
    
    this.uiManagerState.visible = false;
    
    // Cacher tous les composants
    if (this.teamIcon && !this.teamIcon.isDestroyed) {
      this.teamIcon.hide();
    }
    
    if (this.teamUI && !this.teamUI.isDestroyed) {
      this.teamUI.hide();
    }
    
    return true;
  }

  /**
   * UIManager appelle cette méthode pour activer/désactiver
   */
  setEnabled(enabled) {
    this.log(`🔧 [UIManager→TeamManager] setEnabled(${enabled}) appelée`);
    
    this.uiManagerState.enabled = enabled;
    
    // Appliquer aux composants
    if (this.teamIcon && !this.teamIcon.isDestroyed) {
      this.teamIcon.setEnabled(enabled);
    }
    
    if (this.teamUI && !this.teamUI.isDestroyed) {
      this.teamUI.setEnabled(enabled);
    }
    
    return true;
  }

  /**
   * UIManager appelle cette méthode pour obtenir l'état
   */
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      teamStats: this.teamStats,
      hasTeamIcon: !!this.teamIcon && !this.teamIcon.isDestroyed,
      hasTeamUI: !!this.teamUI && !this.teamUI.isDestroyed,
      canBattle: this.canBattle(),
      isTeamFull: this.isTeamFull(),
      lastUpdate: this.lastDataUpdate
    };
  }

  /**
   * UIManager appelle cette méthode pour destruction
   */
  destroy() {
    this.log("🧹 [UIManager→TeamManager] destroy() appelée");
    
    try {
      // Détruire les composants UI
      this.destroyTeamIcon();
      this.destroyTeamUI();
      
      // Nettoyer les données
      this.cleanupData();
      
      // Reset état
      this.uiManagerState.initialized = false;
      this.uiManagerState.visible = false;
      this.uiManagerState.enabled = false;
      
      this.log("✅ [TeamManager] Destruction terminée");
      
    } catch (error) {
      console.error("❌ [TeamManager] Erreur destruction:", error);
    }
  }

  // ===== 🗑️ DESTRUCTION COMPOSANTS =====

  destroyTeamIcon() {
    if (this.teamIcon) {
      try {
        if (typeof this.teamIcon.destroy === 'function') {
          this.teamIcon.destroy();
        }
        this.teamIcon.isDestroyed = true;
        this.teamIcon = null;
        this.log("✅ TeamIcon détruit");
      } catch (error) {
        console.error("❌ Erreur destruction TeamIcon:", error);
        this.teamIcon = null;
      }
    }
  }

  destroyTeamUI() {
    if (this.teamUI) {
      try {
        if (typeof this.teamUI.destroy === 'function') {
          this.teamUI.destroy();
        }
        this.teamUI.isDestroyed = true;
        this.teamUI = null;
        this.log("✅ TeamUI détruit");
      } catch (error) {
        console.error("❌ Erreur destruction TeamUI:", error);
        this.teamUI = null;
      }
    }
  }

  cleanupData() {
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      faintedPokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    this.eventQueue = [];
    this.dataUpdateHandlers.clear();
  }

  // ===== 📊 GESTION DONNÉES (BUSINESS LOGIC PURE) =====

  handleTeamDataUpdate(data) {
    try {
      this.updateLocalTeamData(data);
      this.emit('teamDataUpdated', data);
      this.log("📊 Données équipe mises à jour");
    } catch (error) {
      this.handleError(error, 'team_data_update');
    }
  }

  handleTeamActionResult(data) {
    try {
      // Traiter le résultat d'action
      this.emit('actionResult', data);
      
      // Notifier via système global si disponible
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification(
          data.message, 
          data.success ? 'success' : 'error'
        );
      }
      
      // Rafraîchir les données après action
      setTimeout(() => this.requestTeamData(), 500);
      
    } catch (error) {
      this.handleError(error, 'team_action_result');
    }
  }

  handleTeamHealed(data) {
    try {
      this.emit('teamHealed', data);
      
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification('Équipe soignée!', 'success');
      }
      
      // Rafraîchir les données
      setTimeout(() => this.requestTeamData(), 500);
      
    } catch (error) {
      this.handleError(error, 'team_healed');
    }
  }

  handleTeamStats(data) {
    try {
      this.teamStats = { ...data };
      this.emit('statsUpdated', data);
    } catch (error) {
      this.handleError(error, 'team_stats');
    }
  }

  updateLocalTeamData(data) {
    this.teamData = Array.isArray(data.team) ? data.team : [];
    this.calculateStats();
    this.lastDataUpdate = Date.now();
  }

  calculateStats() {
    this.teamStats.totalPokemon = this.teamData.length;
    this.teamStats.alivePokemon = this.teamData.filter(p => p && p.currentHp > 0).length;
    this.teamStats.faintedPokemon = this.teamData.filter(p => p && p.currentHp === 0).length;
    this.teamStats.canBattle = this.teamStats.alivePokemon > 0;
    
    if (this.teamData.length > 0) {
      const totalLevel = this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0);
      this.teamStats.averageLevel = Math.round(totalLevel / this.teamData.length);
    } else {
      this.teamStats.averageLevel = 0;
    }
  }

  // ===== 🎬 ACTIONS ÉQUIPE (BUSINESS LOGIC) =====

  requestTeamData() {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("getTeam");
      this.lastTeamDataRequest = Date.now();
    }
  }

  healTeam() {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("healTeam");
    }
  }

  healPokemon(pokemonId) {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("healPokemon", { pokemonId });
    }
  }

  removePokemon(pokemonId) {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("removeFromTeam", { pokemonId });
    }
  }

  swapPokemon(fromSlot, toSlot) {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
    }
  }

  canSendRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - (this.lastTeamDataRequest || 0);
    return timeSinceLastRequest > 1000; // 1 seconde de cooldown
  }

  // ===== 🔍 GETTERS (LECTURE SEULE) =====

  getTeamData() {
    return [...this.teamData];
  }

  getTeamStats() {
    return { ...this.teamStats };
  }

  canBattle() {
    return this.teamStats.canBattle;
  }

  isTeamFull() {
    return this.teamData.length >= 6;
  }

  isTeamOpen() {
    return this.teamUI ? this.teamUI.isVisible : false;
  }

  getPokemonBySlot(slot) {
    return this.teamData[slot] || null;
  }

  getAlivePokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0);
  }

  // ===== 🆘 FALLBACKS =====

  createFallbackTeamIcon() {
    this.warn("🆘 Création TeamIcon de secours");
    
    return {
      show: () => this.log("Fallback TeamIcon show"),
      hide: () => this.log("Fallback TeamIcon hide"),
      setEnabled: (enabled) => this.log(`Fallback TeamIcon enabled: ${enabled}`),
      updateTeamStats: (stats) => this.log("Fallback TeamIcon stats update"),
      destroy: () => this.log("Fallback TeamIcon destroy"),
      isDestroyed: false,
      iconElement: document.createElement('div')
    };
  }

  createFallbackTeamUI() {
    this.warn("🆘 Création TeamUI de secours");
    
    return {
      show: () => this.log("Fallback TeamUI show"),
      hide: () => this.log("Fallback TeamUI hide"),
      setEnabled: (enabled) => this.log(`Fallback TeamUI enabled: ${enabled}`),
      updateTeamData: (data) => this.log("Fallback TeamUI data update"),
      destroy: () => this.log("Fallback TeamUI destroy"),
      isDestroyed: false,
      isVisible: false
    };
  }

  // ===== 🛠️ UTILITAIRES =====

  cleanupStaleData() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    // Nettoyer les événements anciens
    this.eventQueue = this.eventQueue.filter(event => 
      now - event.timestamp < maxAge
    );
  }

  handleError(error, context = 'unknown') {
    console.error(`❌ [TeamManager:${context}]`, error);
    
    // En mode UIManager-controlled, on ne fait PAS de récupération automatique
    // On laisse UIManager gérer les erreurs
    this.emit('error', { error, context });
  }

  // ===== 📢 SYSTÈME D'ÉVÉNEMENTS SIMPLE =====

  on(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = new Map();
    }
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners && this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners && this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.warn(`⚠️ Erreur callback événement ${event}:`, error);
        }
      });
    }
  }

  // ===== 🐛 LOGGING CONTRÔLÉ =====

  log(...args) {
    if (!this.silentMode) {
      console.log('[TeamManager]', ...args);
    }
  }

  warn(...args) {
    console.warn('[TeamManager]', ...args);
  }

  error(...args) {
    console.error('[TeamManager]', ...args);
  }

  // ===== 🔧 MODE LEGACY (NE PAS UTILISER) =====

  async initLegacy() {
    this.warn("⚠️ Mode legacy - utiliser UIManager à la place");
    
    // Ancienne initialisation pour compatibilité
    this.teamUI = new TeamUI(this.gameRoom);
    this.teamIcon = new TeamIcon(this.teamUI);
    
    this.setupServerListeners();
    
    return this;
  }

  // ===== 🎯 MÉTHODES PUBLIQUES LEGACY (DÉPRÉCIÉ) =====

  toggleTeam() {
    this.warn("⚠️ toggleTeam() déprécié - utiliser UIManager");
    this.requestUIManagerAction('toggleTeamUI');
  }

  openTeam() {
    this.warn("⚠️ openTeam() déprécié - utiliser UIManager");
    this.requestUIManagerAction('showTeamUI');
  }

  closeTeam() {
    this.warn("⚠️ closeTeam() déprécié - utiliser UIManager");
    this.requestUIManagerAction('hideTeamUI');
  }

  // ===== 📊 DEBUG =====

  debugInfo() {
    return {
      mode: 'UIManager-controlled',
      uiManagerState: this.uiManagerState,
      hasTeamIcon: !!this.teamIcon && !this.teamIcon.isDestroyed,
      hasTeamUI: !!this.teamUI && !this.teamUI.isDestroyed,
      teamStats: this.teamStats,
      teamData: this.teamData.length,
      lastUpdate: this.lastDataUpdate,
      eventListeners: this.eventListeners ? this.eventListeners.size : 0
    };
  }

  enableSilentMode() {
    this.silentMode = true;
    this.log("🔇 Mode silencieux activé");
  }

  disableSilentMode() {
    this.silentMode = false;
    this.log("🔊 Mode silencieux désactivé");
  }
}

// ===== 🏭 FONCTIONS FACTORY POUR UIMANAGER =====

/**
 * Factory function pour créer TeamManager contrôlé par UIManager
 */
export function createUIManagerControlledTeamManager(scene, gameRoom) {
  console.log("🏭 [Factory] Création TeamManager UIManager-controlled");
  
  const teamManager = new TeamManager(scene, gameRoom);
  teamManager.isUIManagerControlled = true;
  teamManager.preventAutoActions = true;
  
  return teamManager;
}

/**
 * Factory function pour TeamIcon à utiliser dans UIManager
 */
export function createTeamIconForUIManager(teamManager) {
  if (!teamManager) {
    throw new Error("TeamManager requis pour créer TeamIcon");
  }
  
  return teamManager.createTeamIconForUIManager();
}

/**
 * Factory function pour TeamUI à utiliser dans UIManager
 */
export function createTeamUIForUIManager(teamManager) {
  if (!teamManager) {
    throw new Error("TeamManager requis pour créer TeamUI");
  }
  
  return teamManager.createTeamUIForUIManager();
}

/**
 * Setup listener pour les requêtes TeamManager → UIManager
 */
export function setupTeamManagerUIManagerBridge() {
  window.addEventListener('teamManagerRequest', (event) => {
    const { action, data } = event.detail;
    
    console.log(`🌉 [Bridge] TeamManager → UIManager: ${action}`);
    
    const uiManager = window.uiManager || window.pokemonUISystem?.uiManager;
    
    if (!uiManager) {
      console.warn("⚠️ [Bridge] UIManager non disponible");
      return;
    }
    
    // Router l'action vers UIManager
    switch (action) {
      case 'toggleTeamUI':
        uiManager.toggleModule?.('teamUI');
        break;
      case 'showTeamUI':
        uiManager.showModule?.('teamUI');
        break;
      case 'hideTeamUI':
        uiManager.hideModule?.('teamUI');
        break;
      default:
        console.warn(`⚠️ [Bridge] Action inconnue: ${action}`);
    }
  });
  
  console.log("🌉 [Bridge] TeamManager ↔ UIManager configuré");
}

export default TeamManager;

// ===== 📋 INSTRUCTIONS D'UTILISATION =====

console.log(`
🎯 === TEAMMANAGER UIMANAGER-CONTROLLED ===

✅ NOUVELLE ARCHITECTURE:
- TeamManager = BUSINESS LOGIC seulement
- UIManager = MAÎTRE qui contrôle tout
- Modules UI = SERVANTS obéissants

🏭 UTILISATION DANS UIMANAGER:
uiManager.registerModule('teamIcon', {
  factory: () => createTeamIconForUIManager(teamManager)
});

uiManager.registerModule('teamUI', {
  factory: () => createTeamUIForUIManager(teamManager)
});

🚫 PLUS DE SPAM:
- Un seul maître: UIManager
- Modules passifs qui obéissent
- Communication via événements contrôlés

🔧 SETUP:
1. Créer TeamManager: createUIManagerControlledTeamManager()
2. Setup bridge: setupTeamManagerUIManagerBridge()
3. Enregistrer modules dans UIManager
4. UIManager contrôle tout !
`);
