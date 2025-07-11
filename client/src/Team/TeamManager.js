// Team/TeamManager.js - Business Logic Team Simplifié
// 🎯 Gère UNIQUEMENT la logique métier, pas l'UI

export class TeamManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    
    // === DONNÉES ===
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    // === CALLBACKS ===
    this.onStatsUpdate = null;      // Appelé quand stats changent
    this.onTeamDataUpdate = null;   // Appelé quand données changent
    this.onPokemonUpdate = null;    // Appelé quand un Pokémon change
    
    // === ÉTAT ===
    this.initialized = false;
    this.lastDataRequest = 0;
    
    console.log('⚔️ [TeamManager] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
async init() {
  try {
    console.log('🚀 [TeamManager] Initialisation...');
    console.log('🔍 [TeamManager] GameRoom disponible:', !!this.gameRoom);
    
    if (!this.gameRoom) {
      console.error('❌ [TeamManager] ERREUR: Pas de gameRoom pour initialiser !');
      throw new Error('GameRoom requis pour TeamManager');
    }
    
    // ✅ FIX: Forcer l'appel avec vérification
    console.log('📡 [TeamManager] Configuration des listeners...');
    this.setupServerListeners();
    
    // ✅ FIX: Vérifier que les listeners sont bien configurés
    setTimeout(() => {
      this.verifyListeners();
    }, 100);
    
    // ✅ FIX: Demander les données après configuration
    setTimeout(() => {
      console.log('📤 [TeamManager] Demande initiale de données...');
      this.requestTeamData();
    }, 200);
    
    this.initialized = true;
    
    console.log('✅ [TeamManager] Initialisé');
    return this;
    
  } catch (error) {
    console.error('❌ [TeamManager] Erreur initialisation:', error);
    throw error;
  }
}
  
  // === 📡 COMMUNICATION SERVEUR ===
  
// ===== FIX TEAMMANAGER - CORRECTION DES LISTENERS =====
// À modifier dans client/src/Team/TeamManager.js

// PROBLÈME IDENTIFIÉ : setupServerListeners() ne fonctionne pas
// SOLUTION : Forcer l'appel et ajouter des vérifications

// Dans la méthode init(), AJOUTER des logs et forcer l'appel :
async init() {
  try {
    console.log('🚀 [TeamManager] Initialisation...');
    console.log('🔍 [TeamManager] GameRoom disponible:', !!this.gameRoom);
    
    if (!this.gameRoom) {
      console.error('❌ [TeamManager] ERREUR: Pas de gameRoom pour initialiser !');
      throw new Error('GameRoom requis pour TeamManager');
    }
    
    // ✅ FIX: Forcer l'appel avec vérification
    console.log('📡 [TeamManager] Configuration des listeners...');
    this.setupServerListeners();
    
    // ✅ FIX: Vérifier que les listeners sont bien configurés
    setTimeout(() => {
      this.verifyListeners();
    }, 100);
    
    // ✅ FIX: Demander les données après configuration
    setTimeout(() => {
      console.log('📤 [TeamManager] Demande initiale de données...');
      this.requestTeamData();
    }, 200);
    
    this.initialized = true;
    
    console.log('✅ [TeamManager] Initialisé');
    return this;
    
  } catch (error) {
    console.error('❌ [TeamManager] Erreur initialisation:', error);
    throw error;
  }
}

// AMÉLIORER setupServerListeners() avec plus de logs et vérifications :
setupServerListeners() {
  if (!this.gameRoom) {
    console.error('⚠️ [TeamManager] setupServerListeners: Pas de gameRoom');
    return;
  }

  console.log('📡 [TeamManager] Configuration des listeners pour gameRoom...');
  console.log('🔍 [TeamManager] GameRoom type:', this.gameRoom.constructor.name);
  console.log('🔍 [TeamManager] GameRoom hasJoined:', this.gameRoom.hasJoined);

  try {
    // ✅ FIX: Vérifier que onMessage existe
    if (typeof this.gameRoom.onMessage !== 'function') {
      console.error('❌ [TeamManager] gameRoom.onMessage n\'est pas une fonction !');
      return;
    }

    // Données d'équipe - AVEC LOGS
    this.gameRoom.onMessage("teamData", (data) => {
      console.log('📊 [TeamManager] ✅ MESSAGE teamData REÇU:', data);
      this.handleTeamDataReceived(data);
    });

    // Résultat d'action - AVEC LOGS  
    this.gameRoom.onMessage("teamActionResult", (data) => {
      console.log('🎬 [TeamManager] ✅ MESSAGE teamActionResult REÇU:', data);
      this.handleActionResult(data);
    });

    // Pokémon mis à jour - AVEC LOGS
    this.gameRoom.onMessage("pokemonUpdate", (data) => {
      console.log('🐾 [TeamManager] ✅ MESSAGE pokemonUpdate REÇU:', data);
      this.handlePokemonUpdate(data);
    });

    // Équipe soignée - AVEC LOGS
    this.gameRoom.onMessage("teamHealed", (data) => {
      console.log('💊 [TeamManager] ✅ MESSAGE teamHealed REÇU:', data);
      this.handleTeamHealed(data);
    });

    console.log('✅ [TeamManager] Listeners serveur configurés avec succès');
    
  } catch (error) {
    console.error('❌ [TeamManager] Erreur configuration listeners:', error);
  }
}
  verifyListeners() {
  if (!this.gameRoom) {
    console.error('❌ [TeamManager] Vérification impossible: pas de gameRoom');
    return;
  }

  console.log('🔍 [TeamManager] === VÉRIFICATION LISTENERS ===');
  
  try {
    // Vérifier les handlers configurés
    const handlers = this.gameRoom._messageHandlers || {};
    const handlerKeys = Object.keys(handlers);
    
    console.log('📋 [TeamManager] Listeners configurés:', handlerKeys);
    
    // Vérifier les listeners Team spécifiques
    const requiredListeners = ['teamData', 'teamActionResult', 'pokemonUpdate', 'teamHealed'];
    const missingListeners = requiredListeners.filter(listener => !handlerKeys.includes(listener));
    
    if (missingListeners.length === 0) {
      console.log('✅ [TeamManager] Tous les listeners Team sont configurés');
    } else {
      console.error('❌ [TeamManager] Listeners manquants:', missingListeners);
      
      // ✅ FIX: Reconfigurer les listeners manquants
      console.log('🔧 [TeamManager] Tentative de reconfiguration...');
      this.setupServerListeners();
    }
    
  } catch (error) {
    console.error('❌ [TeamManager] Erreur vérification listeners:', error);
  }
}
  
  
requestTeamData() {
  if (!this.gameRoom || !this.canSendRequest()) {
    console.warn('⚠️ [TeamManager] Impossible d\'envoyer requestTeamData');
    console.log('🔍 [TeamManager] GameRoom exists:', !!this.gameRoom);
    console.log('🔍 [TeamManager] Can send request:', this.canSendRequest());
    return;
  }

  console.log('📤 [TeamManager] ===== ENVOI DEMANDE ÉQUIPE =====');
  console.log('🎯 [TeamManager] Message: "getTeam"');
  
  try {
    this.gameRoom.send("getTeam");
    this.lastDataRequest = Date.now();
    console.log('✅ [TeamManager] Demande envoyée avec succès');
  } catch (error) {
    console.error('❌ [TeamManager] Erreur envoi demande:', error);
  }
}
  
  canSendRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastDataRequest;
    return timeSinceLastRequest > 1000; // 1 seconde de cooldown
  }
  
  // === 📊 GESTION DONNÉES ===
  
handleTeamDataReceived(data) {
  try {
    console.log('📊 [TeamManager] ===== DONNÉES ÉQUIPE REÇUES =====');
    console.log('📊 [TeamManager] Data brute:', data);
    
    // ✅ FIX: Parsing robuste des données
    let teamArray = [];
    
    if (data && data.team && Array.isArray(data.team)) {
      teamArray = data.team;
      console.log('✅ [TeamManager] Format: data.team (array)');
    } else if (data && Array.isArray(data.pokemon)) {
      teamArray = data.pokemon;
      console.log('✅ [TeamManager] Format: data.pokemon (array)');
    } else if (Array.isArray(data)) {
      teamArray = data;
      console.log('✅ [TeamManager] Format: data direct (array)');
    } else {
      console.warn('⚠️ [TeamManager] Format données inattendu:', data);
      teamArray = [];
    }
    
    // Filtrer les null/undefined et valider
    this.teamData = teamArray.filter(pokemon => {
      if (!pokemon) return false;
      
      // Validation basique
      if (!pokemon._id && !pokemon.id) {
        console.warn('⚠️ [TeamManager] Pokémon sans ID:', pokemon);
        return false;
      }
      
      return true;
    });
    
    console.log('📊 [TeamManager] Équipe parsée:', {
      count: this.teamData.length,
      pokemon: this.teamData.map(p => ({
        id: p._id || p.id,
        name: p.nickname || p.name || 'Unknown',
        level: p.level || '?',
        hp: `${p.currentHp || 0}/${p.maxHp || 0}`
      }))
    });
    
    // Calculer les stats
    this.calculateStats();
    
    // ✅ FIX: S'assurer que les callbacks sont appelés
    console.log('📤 [TeamManager] Envoi callbacks...');
    
    if (this.onTeamDataUpdate && typeof this.onTeamDataUpdate === 'function') {
      console.log('📤 [TeamManager] Appel onTeamDataUpdate');
      this.onTeamDataUpdate({ team: this.teamData });
    } else {
      console.warn('⚠️ [TeamManager] onTeamDataUpdate non configuré');
    }
    
    if (this.onStatsUpdate && typeof this.onStatsUpdate === 'function') {
      console.log('📤 [TeamManager] Appel onStatsUpdate');
      this.onStatsUpdate(this.teamStats);
    } else {
      console.warn('⚠️ [TeamManager] onStatsUpdate non configuré');
    }
    
    console.log('✅ [TeamManager] Traitement données terminé');
    
  } catch (error) {
    console.error('❌ [TeamManager] Erreur traitement données:', error);
  }
}

// ✅ AJOUTER une méthode de diagnostic :
debugNetworkConnection() {
  console.log('🔍 [TeamManager] === DEBUG CONNEXION RÉSEAU ===');
  
  console.log('📊 État:', {
    hasGameRoom: !!this.gameRoom,
    gameRoomType: this.gameRoom?.constructor.name,
    hasJoined: this.gameRoom?.hasJoined,
    initialized: this.initialized,
    teamDataLength: this.teamData.length,
    hasCallbacks: {
      onStatsUpdate: !!this.onStatsUpdate,
      onTeamDataUpdate: !!this.onTeamDataUpdate
    }
  });
  
  if (this.gameRoom) {
    const handlers = this.gameRoom._messageHandlers || {};
    console.log('📋 Listeners configurés:', Object.keys(handlers));
  }
  
  console.log('📊 Stats actuelles:', this.teamStats);
  
  // Test de demande
  console.log('🧪 Test demande données...');
  this.requestTeamData();
}
  
  calculateStats() {
    this.teamStats.totalPokemon = this.teamData.length;
    this.teamStats.alivePokemon = this.teamData.filter(p => p && p.currentHp > 0).length;
    this.teamStats.canBattle = this.teamStats.alivePokemon > 0;
    
    if (this.teamData.length > 0) {
      const totalLevel = this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0);
      this.teamStats.averageLevel = Math.round(totalLevel / this.teamData.length);
    } else {
      this.teamStats.averageLevel = 0;
    }
    
    console.log('📊 [TeamManager] Stats calculées:', this.teamStats);
  }
  
  handleActionResult(data) {
    console.log('🎬 [TeamManager] Résultat action:', data);
    
    // Afficher notification si disponible
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(
        data.message || 'Action terminée',
        data.success ? 'success' : 'error',
        { duration: 2000 }
      );
    }
    
    // Rafraîchir les données après action
    if (data.success) {
      setTimeout(() => {
        this.requestTeamData();
      }, 500);
    }
  }
  
  handlePokemonUpdate(data) {
    console.log('🐾 [TeamManager] Pokémon mis à jour:', data);
    
    // Mettre à jour le Pokémon dans l'équipe
    const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
    
    if (pokemonIndex !== -1) {
      this.teamData[pokemonIndex] = { 
        ...this.teamData[pokemonIndex], 
        ...data.updates 
      };
      
      this.calculateStats();
      
      // Notifier les composants
      if (this.onPokemonUpdate) {
        this.onPokemonUpdate(data);
      }
      
      if (this.onStatsUpdate) {
        this.onStatsUpdate(this.teamStats);
      }
    }
  }
  
  handleTeamHealed(data) {
    console.log('💊 [TeamManager] Équipe soignée');
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Équipe soignée !', 'success', { duration: 2000 });
    }
    
    // Rafraîchir les données
    setTimeout(() => {
      this.requestTeamData();
    }, 500);
  }
  
  handlePokemonCaught(pokemonData) {
    console.log('🎉 [TeamManager] Pokémon capturé:', pokemonData);
    
    if (typeof window.showGameNotification === 'function') {
      const name = pokemonData.nickname || pokemonData.name || 'Pokémon';
      window.showGameNotification(`${name} ajouté à l'équipe !`, 'success', { duration: 3000 });
    }
    
    // Rafraîchir les données
    setTimeout(() => {
      this.requestTeamData();
    }, 1000);
  }
  
  // === 🎬 ACTIONS UTILISATEUR ===
  
  handleAction(action, data) {
    console.log(`🎬 [TeamManager] Action: ${action}`, data);
    
    if (!this.gameRoom) {
      console.warn('⚠️ [TeamManager] Pas de gameRoom pour action');
      return;
    }
    
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
        
      case 'requestData':
        this.requestTeamData();
        break;
        
      default:
        console.warn(`⚠️ [TeamManager] Action inconnue: ${action}`);
    }
  }
  
  healTeam() {
    if (!this.canSendRequest()) return;
    
    console.log('💊 [TeamManager] Soigne équipe');
    this.gameRoom.send("healTeam");
  }
  
  healPokemon(pokemonId) {
    if (!this.canSendRequest()) return;
    
    console.log('💊 [TeamManager] Soigne Pokémon:', pokemonId);
    this.gameRoom.send("healPokemon", { pokemonId });
  }
  
  removePokemon(pokemonId) {
    if (!this.canSendRequest()) return;
    
    console.log('📦 [TeamManager] Retire Pokémon:', pokemonId);
    this.gameRoom.send("removeFromTeam", { pokemonId });
  }
  
  swapPokemon(fromSlot, toSlot) {
    if (!this.canSendRequest()) return;
    
    console.log(`🔄 [TeamManager] Échange slots: ${fromSlot} ↔ ${toSlot}`);
    this.gameRoom.send("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
  }
  
  // === 📖 GETTERS (LECTURE SEULE) ===
  
  getTeamData() {
    return [...this.teamData]; // Copie pour éviter mutations
  }
  
  getTeamStats() {
    return { ...this.teamStats }; // Copie pour éviter mutations
  }
  
  getTeamCount() {
    return this.teamData.length;
  }
  
  canBattle() {
    return this.teamStats.canBattle;
  }
  
  isTeamFull() {
    return this.teamData.length >= 6;
  }
  
  getPokemonBySlot(slot) {
    return this.teamData[slot] || null;
  }
  
  getAlivePokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0);
  }
  
  getFaintedPokemon() {
    return this.teamData.filter(p => p && p.currentHp === 0);
  }
  
  getAverageLevel() {
    return this.teamStats.averageLevel;
  }
  
  getTotalHP() {
    return this.teamData.reduce((total, p) => total + (p?.currentHp || 0), 0);
  }
  
  getMaxHP() {
    return this.teamData.reduce((total, p) => total + (p?.maxHp || 0), 0);
  }
  
  // === 🔍 RECHERCHE ET FILTRES ===
  
  findPokemonById(pokemonId) {
    return this.teamData.find(p => p._id === pokemonId) || null;
  }
  
  findPokemonByName(name) {
    return this.teamData.find(p => 
      p.nickname?.toLowerCase() === name.toLowerCase() ||
      p.name?.toLowerCase() === name.toLowerCase()
    ) || null;
  }
  
  getPokemonByType(type) {
    return this.teamData.filter(p => 
      p.types && p.types.some(t => t.toLowerCase() === type.toLowerCase())
    );
  }
  
  getTypeCoverage() {
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    return Array.from(types);
  }
  
  // === 🎯 UTILITAIRES MÉTIER ===
  
  needsHealing() {
    return this.teamData.some(p => p && p.currentHp < p.maxHp);
  }
  
  hasStatusConditions() {
    return this.teamData.some(p => p && p.status && p.status !== 'normal');
  }
  
  getTeamHealthPercentage() {
    const totalHP = this.getTotalHP();
    const maxHP = this.getMaxHP();
    return maxHP > 0 ? Math.round((totalHP / maxHP) * 100) : 0;
  }
  
  canUseMove(pokemonSlot, moveIndex) {
    const pokemon = this.getPokemonBySlot(pokemonSlot);
    if (!pokemon || !pokemon.moves || !pokemon.moves[moveIndex]) {
      return false;
    }
    
    const move = pokemon.moves[moveIndex];
    return move.currentPp > 0;
  }
  
  hasUsableMoves(pokemonSlot) {
    const pokemon = this.getPokemonBySlot(pokemonSlot);
    if (!pokemon || !pokemon.moves) {
      return false;
    }
    
    return pokemon.moves.some(move => move.currentPp > 0);
  }
  
  // === 📊 STATISTIQUES AVANCÉES ===
  
  getTeamAnalysis() {
    return {
      teamSize: this.getTeamCount(),
      aliveCount: this.teamStats.alivePokemon,
      faintedCount: this.teamData.length - this.teamStats.alivePokemon,
      averageLevel: this.teamStats.averageLevel,
      healthPercentage: this.getTeamHealthPercentage(),
      typeCoverage: this.getTypeCoverage(),
      canBattle: this.canBattle(),
      needsHealing: this.needsHealing(),
      hasStatusConditions: this.hasStatusConditions(),
      isTeamFull: this.isTeamFull()
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamManager] Destruction...');
    
    // Reset callbacks
    this.onStatsUpdate = null;
    this.onTeamDataUpdate = null;
    this.onPokemonUpdate = null;
    
    // Reset données
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    // Reset état
    this.initialized = false;
    this.gameRoom = null;
    
    console.log('✅ [TeamManager] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.initialized,
      teamCount: this.getTeamCount(),
      teamStats: this.teamStats,
      hasGameRoom: !!this.gameRoom,
      lastDataRequest: this.lastDataRequest,
      callbacks: {
        onStatsUpdate: !!this.onStatsUpdate,
        onTeamDataUpdate: !!this.onTeamDataUpdate,
        onPokemonUpdate: !!this.onPokemonUpdate
      },
      teamAnalysis: this.getTeamAnalysis()
    };
  }
}

export default TeamManager;

console.log(`
⚔️ === TEAM MANAGER SIMPLIFIÉ ===

✅ RESPONSABILITÉS:
- Gestion données équipe
- Communication serveur
- Calcul statistiques
- Actions Pokémon

🚫 PAS D'UI:
- Pas de DOM
- Pas d'affichage
- Callbacks pour notifier

📡 ACTIONS SERVEUR:
- getTeam → requestTeamData()
- healTeam → healTeam()
- healPokemon → healPokemon(id)
- removeFromTeam → removePokemon(id)
- swapTeamSlots → swapPokemon(from, to)

📊 API LECTURE:
- getTeamData() → données complètes
- getTeamStats() → statistiques
- canBattle() → peut combattre
- getTypeCoverage() → types équipe
- getTeamAnalysis() → analyse complète

🔗 CALLBACKS:
- onStatsUpdate(stats) → pour TeamIcon
- onTeamDataUpdate(data) → pour TeamUI
- onPokemonUpdate(data) → mises à jour

🎯 SIMPLE ET EFFICACE !
`);
