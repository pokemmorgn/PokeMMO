// server/src/managers/battle/DamageManager.ts
// Gestionnaire centralisé pour tous les dégâts, soins et changements de HP

import { BattlePokemon } from "../../schema/BattleState";
import { BattleContext, BattleParticipant } from "./BattleEndManager";

export interface DamageResult {
  pokemonId: string;
  oldHp: number;
  newHp: number;
  damage: number;
  wasKnockedOut: boolean;
  targetPlayerId: string;
  attackerId: string;
  pokemonName: string;
  isHealing: boolean;
  targetPlayer?: string;
}

export interface DamageEvent {
  type: 'damage' | 'healing' | 'status_damage' | 'recoil';
  source: 'attack' | 'item' | 'status' | 'weather' | 'ability';
  pokemonId: string;
  amount: number;
  attackerId?: string;
  moveId?: string;
  timestamp: number;
}

export interface DamageStatistics {
  totalDamageDealt: Map<string, number>;
  totalDamageReceived: Map<string, number>;
  totalHealing: Map<string, number>;
  pokemonKnockedOut: Map<string, number>;
  damageEvents: DamageEvent[];
}

/**
 * GESTIONNAIRE CENTRALISÉ DES DÉGÂTS
 * 
 * Responsabilités :
 * - Application synchronisée des dégâts/soins
 * - Tracking automatique des statistiques
 * - Synchronisation state/context parfaite
 * - Détection des K.O. fiable
 * - Gestion des effets secondaires
 */
export class DamageManager {
  
  // Statistiques du combat en cours
  private static statistics: DamageStatistics = {
    totalDamageDealt: new Map(),
    totalDamageReceived: new Map(),
    totalHealing: new Map(),
    pokemonKnockedOut: new Map(),
    damageEvents: []
  };

  /**
   * ✅ MÉTHODE PRINCIPALE: Met à jour les HP d'un Pokémon de façon synchronisée
   */
  static updatePokemonHP(
    pokemonId: string,
    newHp: number,
    battleState: any,
    battleContext: BattleContext,
    source: DamageEvent['source'] = 'attack',
    attackerId?: string
  ): DamageResult | null {
    console.log(`🩹 [DamageManager] === MISE À JOUR HP SYNCHRONISÉE ===`);
    console.log(`🩹 [DamageManager] Pokémon: ${pokemonId}, newHp: ${newHp}`);
    
    try {
      // 1. Trouver le Pokémon dans le state
      const stateResult = this.findAndUpdateInState(pokemonId, newHp, battleState);
      if (!stateResult) {
        console.error(`❌ [DamageManager] Pokémon ${pokemonId} non trouvé dans le state`);
        return null;
      }

      // 2. Trouver et mettre à jour dans le contexte
      const contextResult = this.findAndUpdateInContext(pokemonId, newHp, battleContext);
      if (!contextResult) {
        console.error(`❌ [DamageManager] Pokémon ${pokemonId} non trouvé dans le contexte`);
        return null;
      }

      // 3. Calculer les informations de dégâts
      const damageInfo = this.calculateDamageInfo(
        stateResult, 
        contextResult, 
        attackerId
      );

      // 4. Mettre à jour les statistiques
      this.updateStatistics(damageInfo, source);

      // 5. Logger l'événement
      this.logDamageEvent(damageInfo, source);

      console.log(`✅ [DamageManager] HP synchronisés: ${damageInfo.pokemonName} ${damageInfo.oldHp} → ${damageInfo.newHp}`);
      
      return damageInfo;

    } catch (error) {
      console.error(`💥 [DamageManager] Erreur mise à jour HP:`, error);
      return null;
    }
  }

  /**
   * ✅ Applique des dégâts directs à un Pokémon
   */
  static applyDamage(
    pokemonId: string,
    damage: number,
    battleState: any,
    battleContext: BattleContext,
    attackerId?: string,
    moveId?: string
  ): DamageResult | null {
    console.log(`💥 [DamageManager] Application dégâts: ${damage} à ${pokemonId}`);
    
    // Récupérer les HP actuels
    const currentHp = this.getCurrentHP(pokemonId, battleState);
    if (currentHp === null) return null;

    // Calculer les nouveaux HP
    const newHp = Math.max(0, currentHp - damage);
    
    // Appliquer via updatePokemonHP
    const result = this.updatePokemonHP(pokemonId, newHp, battleState, battleContext, 'attack', attackerId);
    
    if (result && moveId) {
      // Ajouter l'événement avec le moveId
      this.statistics.damageEvents.push({
        type: 'damage',
        source: 'attack',
        pokemonId,
        amount: damage,
        attackerId,
        moveId,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * ✅ Applique des soins à un Pokémon
   */
  static applyHealing(
    pokemonId: string,
    healing: number,
    battleState: any,
    battleContext: BattleContext,
    source: DamageEvent['source'] = 'item'
  ): DamageResult | null {
    console.log(`💚 [DamageManager] Application soins: +${healing} à ${pokemonId}`);
    
    // Récupérer les HP actuels et max
    const currentHp = this.getCurrentHP(pokemonId, battleState);
    const maxHp = this.getMaxHP(pokemonId, battleState);
    
    if (currentHp === null || maxHp === null) return null;

    // Calculer les nouveaux HP (sans dépasser le max)
    const newHp = Math.min(maxHp, currentHp + healing);
    
    return this.updatePokemonHP(pokemonId, newHp, battleState, battleContext, source);
  }

  /**
   * ✅ Applique des dégâts de statut (poison, brûlure...)
   */
  static applyStatusDamage(
    pokemonId: string,
    statusType: string,
    battleState: any,
    battleContext: BattleContext
  ): DamageResult | null {
    console.log(`🟣 [DamageManager] Dégâts de statut: ${statusType} sur ${pokemonId}`);
    
    const maxHp = this.getMaxHP(pokemonId, battleState);
    if (!maxHp) return null;

    let damage = 0;
    switch (statusType) {
      case 'poison':
        damage = Math.floor(maxHp / 8); // 12.5% HP max
        break;
      case 'badly_poison':
        // TODO: Augmente chaque tour
        damage = Math.floor(maxHp / 16);
        break;
      case 'burn':
        damage = Math.floor(maxHp / 8); // 12.5% HP max
        break;
      default:
        return null;
    }

    return this.applyDamage(pokemonId, damage, battleState, battleContext, undefined, `status_${statusType}`);
  }

  /**
   * ✅ Vérifie si un Pokémon est K.O. après des dégâts
   */
  static checkKnockOut(pokemonId: string, battleState: any, battleContext: BattleContext): boolean {
    const currentHp = this.getCurrentHP(pokemonId, battleState);
    const isKO = currentHp !== null && currentHp <= 0;
    
    if (isKO) {
      console.log(`💀 [DamageManager] ✅ Pokémon ${pokemonId} confirmé K.O. (HP: ${currentHp})`);
    }
    
    return isKO;
  }

  // === MÉTHODES PRIVÉES DE RECHERCHE ET MISE À JOUR ===

  private static findAndUpdateInState(pokemonId: string, newHp: number, battleState: any): any {
    console.log(`🔍 [DamageManager] Recherche dans state...`);
    
    // Player 1
    if (battleState.player1Pokemon?.pokemonId.toString() === pokemonId) {
      const oldHp = battleState.player1Pokemon.currentHp;
      battleState.player1Pokemon.currentHp = newHp;
      
      console.log(`🔍 [DamageManager] Trouvé Player1: ${battleState.player1Pokemon.name}`);
      return {
        pokemon: battleState.player1Pokemon,
        oldHp,
        newHp,
        playerId: 'player1',
        pokemonName: battleState.player1Pokemon.name
      };
    }

    // Player 2
    if (battleState.player2Pokemon?.pokemonId.toString() === pokemonId) {
      const oldHp = battleState.player2Pokemon.currentHp;
      battleState.player2Pokemon.currentHp = newHp;
      
      console.log(`🔍 [DamageManager] Trouvé Player2: ${battleState.player2Pokemon.name}`);
      return {
        pokemon: battleState.player2Pokemon,
        oldHp,
        newHp,
        playerId: 'player2',
        pokemonName: battleState.player2Pokemon.name
      };
    }

    return null;
  }

  private static findAndUpdateInContext(pokemonId: string, newHp: number, battleContext: BattleContext): any {
    console.log(`🔍 [DamageManager] Recherche dans context...`);
    
    for (const participant of battleContext.participants) {
      // Vérifier le Pokémon actif
      if (participant.activePokemon.pokemonId.toString() === pokemonId) {
        const oldHp = participant.activePokemon.currentHp;
        participant.activePokemon.currentHp = newHp;
        
        console.log(`🔍 [DamageManager] Mis à jour dans context: ${participant.name}`);
        return {
          participant,
          oldHp,
          newHp,
          sessionId: participant.sessionId
        };
      }

      // Vérifier l'équipe complète
      for (const teamPokemon of participant.team) {
        if (teamPokemon.pokemonId.toString() === pokemonId) {
          const oldHp = teamPokemon.currentHp;
          teamPokemon.currentHp = newHp;
          
          console.log(`🔍 [DamageManager] Mis à jour dans équipe: ${participant.name}`);
          return {
            participant,
            oldHp,
            newHp,
            sessionId: participant.sessionId
          };
        }
      }
    }

    return null;
  }

  private static calculateDamageInfo(stateResult: any, contextResult: any, attackerId?: string): DamageResult {
    const damage = Math.max(0, stateResult.oldHp - stateResult.newHp);
    const isHealing = stateResult.newHp > stateResult.oldHp;
    const wasKnockedOut = stateResult.newHp <= 0;

    // Déterminer l'attaquant et la cible
    let targetPlayerId = contextResult.sessionId;
    let finalAttackerId = attackerId;

    if (!finalAttackerId) {
      // Déterminer l'attaquant selon la cible
      if (targetPlayerId === 'ai') {
        finalAttackerId = 'player1'; // IA attaquée par le joueur
      } else {
        finalAttackerId = 'ai'; // Joueur attaqué par l'IA
      }
    }

    return {
      pokemonId: stateResult.pokemon.pokemonId.toString(),
      oldHp: stateResult.oldHp,
      newHp: stateResult.newHp,
      damage: isHealing ? 0 : damage,
      wasKnockedOut,
      targetPlayerId,
      attackerId: finalAttackerId,
      pokemonName: stateResult.pokemonName,
      isHealing,
      targetPlayer: stateResult.playerId
    };
  }

  private static updateStatistics(damageInfo: DamageResult, source: DamageEvent['source']): void {
    if (damageInfo.isHealing) {
      // Tracking des soins
      const currentHealing = this.statistics.totalHealing.get(damageInfo.targetPlayerId) || 0;
      this.statistics.totalHealing.set(damageInfo.targetPlayerId, currentHealing + (damageInfo.newHp - damageInfo.oldHp));
    } else if (damageInfo.damage > 0) {
      // Tracking des dégâts reçus
      const currentDamageReceived = this.statistics.totalDamageReceived.get(damageInfo.targetPlayerId) || 0;
      this.statistics.totalDamageReceived.set(damageInfo.targetPlayerId, currentDamageReceived + damageInfo.damage);

      // Tracking des dégâts infligés
      const currentDamageDealt = this.statistics.totalDamageDealt.get(damageInfo.attackerId) || 0;
      this.statistics.totalDamageDealt.set(damageInfo.attackerId, currentDamageDealt + damageInfo.damage);

      // Tracking des K.O.
      if (damageInfo.wasKnockedOut) {
        const currentKOs = this.statistics.pokemonKnockedOut.get(damageInfo.attackerId) || 0;
        this.statistics.pokemonKnockedOut.set(damageInfo.attackerId, currentKOs + 1);
      }
    }

    console.log(`📊 [DamageManager] Stats mises à jour:`, {
      damageDealt: this.statistics.totalDamageDealt.get(damageInfo.attackerId) || 0,
      damageReceived: this.statistics.totalDamageReceived.get(damageInfo.targetPlayerId) || 0,
      kos: this.statistics.pokemonKnockedOut.get(damageInfo.attackerId) || 0
    });
  }

  private static logDamageEvent(damageInfo: DamageResult, source: DamageEvent['source']): void {
    if (damageInfo.isHealing) {
      console.log(`💚 [DamageManager] ${damageInfo.pokemonName} récupère ${damageInfo.newHp - damageInfo.oldHp} HP`);
    } else if (damageInfo.damage > 0) {
      console.log(`💥 [DamageManager] ${damageInfo.damage} dégâts infligés à ${damageInfo.pokemonName} par ${damageInfo.attackerId}`);
      
      if (damageInfo.wasKnockedOut) {
        console.log(`💀 [DamageManager] ✅ ${damageInfo.pokemonName} mis K.O. !`);
      }
    }
  }

  // === MÉTHODES UTILITAIRES ===

  private static getCurrentHP(pokemonId: string, battleState: any): number | null {
    if (battleState.player1Pokemon?.pokemonId.toString() === pokemonId) {
      return battleState.player1Pokemon.currentHp;
    }
    if (battleState.player2Pokemon?.pokemonId.toString() === pokemonId) {
      return battleState.player2Pokemon.currentHp;
    }
    return null;
  }

  private static getMaxHP(pokemonId: string, battleState: any): number | null {
    if (battleState.player1Pokemon?.pokemonId.toString() === pokemonId) {
      return battleState.player1Pokemon.maxHp;
    }
    if (battleState.player2Pokemon?.pokemonId.toString() === pokemonId) {
      return battleState.player2Pokemon.maxHp;
    }
    return null;
  }

  /**
   * ✅ Synchronise les statistiques avec le BattleContext
   */
  static syncStatisticsToContext(battleContext: BattleContext): void {
    console.log(`🔄 [DamageManager] Synchronisation statistiques → BattleContext`);
    
    // Vider les maps du context et les remplir avec nos stats
    battleContext.damageDealt.clear();
    battleContext.damageReceived.clear();
    battleContext.pokemonDefeated.clear();

    this.statistics.totalDamageDealt.forEach((value, key) => {
      battleContext.damageDealt.set(key, value);
    });

    this.statistics.totalDamageReceived.forEach((value, key) => {
      battleContext.damageReceived.set(key, value);
    });

    this.statistics.pokemonKnockedOut.forEach((value, key) => {
      battleContext.pokemonDefeated.set(key, value);
    });

    console.log(`✅ [DamageManager] Statistiques synchronisées`);
  }

  /**
   * ✅ Initialise les statistiques pour un nouveau combat
   */
  static initializeForBattle(playerIds: string[]): void {
    console.log(`🔄 [DamageManager] Initialisation pour nouveau combat`);
    
    this.statistics = {
      totalDamageDealt: new Map(),
      totalDamageReceived: new Map(),
      totalHealing: new Map(),
      pokemonKnockedOut: new Map(),
      damageEvents: []
    };

    // Initialiser les compteurs pour chaque joueur
    playerIds.forEach(playerId => {
      this.statistics.totalDamageDealt.set(playerId, 0);
      this.statistics.totalDamageReceived.set(playerId, 0);
      this.statistics.totalHealing.set(playerId, 0);
      this.statistics.pokemonKnockedOut.set(playerId, 0);
    });

    console.log(`✅ [DamageManager] Initialisé pour ${playerIds.length} joueurs`);
  }

  /**
   * ✅ Récupère les statistiques actuelles
   */
  static getStatistics(): DamageStatistics {
    return { ...this.statistics };
  }

  /**
   * ✅ Récupère les dégâts totaux infligés par un joueur
   */
  static getTotalDamageDealt(playerId: string): number {
    return this.statistics.totalDamageDealt.get(playerId) || 0;
  }

  /**
   * ✅ Récupère les dégâts totaux reçus par un joueur
   */
  static getTotalDamageReceived(playerId: string): number {
    return this.statistics.totalDamageReceived.get(playerId) || 0;
  }

  /**
   * ✅ Récupère le nombre de Pokémon mis K.O. par un joueur
   */
  static getPokemonKnockedOut(playerId: string): number {
    return this.statistics.pokemonKnockedOut.get(playerId) || 0;
  }

  /**
   * ✅ Calcule le pourcentage de HP restant d'un Pokémon
   */
  static getHPPercentage(pokemonId: string, battleState: any): number {
    const currentHp = this.getCurrentHP(pokemonId, battleState);
    const maxHp = this.getMaxHP(pokemonId, battleState);
    
    if (currentHp === null || maxHp === null || maxHp === 0) return 0;
    
    return Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  }

  /**
   * ✅ Vérifie si un Pokémon peut être soigné
   */
  static canHeal(pokemonId: string, battleState: any): boolean {
    const currentHp = this.getCurrentHP(pokemonId, battleState);
    const maxHp = this.getMaxHP(pokemonId, battleState);
    
    if (currentHp === null || maxHp === null) return false;
    
    return currentHp > 0 && currentHp < maxHp;
  }

  /**
   * ✅ Nettoie les statistiques (fin de combat)
   */
  static cleanup(): void {
    console.log(`🧹 [DamageManager] Nettoyage des statistiques`);
    
    this.statistics = {
      totalDamageDealt: new Map(),
      totalDamageReceived: new Map(),
      totalHealing: new Map(),
      pokemonKnockedOut: new Map(),
      damageEvents: []
    };
  }

  // === MÉTHODES DE DEBUG ===

  static debugStatistics(): void {
    console.log(`🔍 [DamageManager] === STATISTIQUES DEBUG ===`);
    console.log(`Dégâts infligés:`, Object.fromEntries(this.statistics.totalDamageDealt));
    console.log(`Dégâts reçus:`, Object.fromEntries(this.statistics.totalDamageReceived));
    console.log(`Soins:`, Object.fromEntries(this.statistics.totalHealing));
    console.log(`K.O.:`, Object.fromEntries(this.statistics.pokemonKnockedOut));
    console.log(`Événements:`, this.statistics.damageEvents.length);
  }

  static debugPokemonState(pokemonId: string, battleState: any, battleContext: BattleContext): void {
    console.log(`🔍 [DamageManager] === DEBUG POKÉMON ${pokemonId} ===`);
    console.log(`State HP:`, this.getCurrentHP(pokemonId, battleState));
    console.log(`Max HP:`, this.getMaxHP(pokemonId, battleState));
    console.log(`HP %:`, this.getHPPercentage(pokemonId, battleState));
    console.log(`K.O.:`, this.checkKnockOut(pokemonId, battleState, battleContext));
  }
}

export default DamageManager;
