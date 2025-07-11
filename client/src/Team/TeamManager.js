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
      
      this.setupServerListeners();
      this.requestTeamData();
      
      this.initialized = true;
      
      console.log('✅ [TeamManager] Initialisé');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 📡 COMMUNICATION SERVEUR ===
  
  setupServerListeners() {
    if (!this.gameRoom) {
      console.warn('⚠️ [TeamManager] Pas de gameRoom');
      return;
    }
    
    // Données d'équipe
    this.gameRoom.onMessage("teamData", (data) => {
      this.handleTeamDataReceived(data);
    });
    
    // Résultat d'action
    this.gameRoom.onMessage("teamActionResult", (data) => {
      this.handleActionResult(data);
    });
    
    // Pokémon mis à jour
    this.gameRoom.onMessage("pokemonUpdate", (data) => {
      this.handlePokemonUpdate(data);
    });
    
    // Équipe soignée
    this.gameRoom.onMessage("teamHealed", (data) => {
      this.handleTeamHealed(data);
    });
    
    console.log('📡 [TeamManager] Listeners serveur configurés');
  }
  
  requestTeamData() {
    if (!this.gameRoom || !this.canSendRequest()) {
      return;
    }
    
    this.gameRoom.send("getTeam");
    this.lastDataRequest = Date.now();
    
    console.log('📡 [TeamManager] Demande données équipe');
  }
  
  canSendRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastDataRequest;
    return timeSinceLastRequest > 1000; // 1 seconde de cooldown
  }
  
  // === 📊 GESTION DONNÉES ===
  
  handleTeamDataReceived(data) {
    try {
      console.log('📊 [TeamManager] Données équipe reçues:', data);
      
      this.teamData = Array.isArray(data.team) ? data.team : [];
      this.calculateStats();
      
      // Notifier les composants
      if (this.onTeamDataUpdate) {
        this.onTeamDataUpdate(data);
      }
      
      if (this.onStatsUpdate) {
        this.onStatsUpdate(this.teamStats);
      }
      
    } catch (error) {
      console.error('❌ [TeamManager] Erreur traitement données:', error);
    }
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
