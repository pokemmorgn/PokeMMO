// ===== 🌟 API ÉVOLUTION INTÉGRÉE =====
  
  /**
   * Tente d'évoluer un Pokémon par niveau
   * @param playerPokemon - Pokémon à faire évoluer
   * @param location - Lieu de l'évolution
   */
  async evolvePokemon(
    playerPokemon: string | IOwnedPokemon,
    location: string = 'Evolution'
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 evolvePokemon: ${pokemonId}`);
      
      return await evolutionService.evolve(pokemonId, location);
      
    } catch (error) {
      console.error(`❌ [ExperienceService] evolvePokemon failed:`, error);
      return false;
    }
  }
  
  /**
   * Évolue un Pokémon avec une pierre d'évolution
   * @param playerPokemon - Pokémon à faire évoluer
   * @param stone - Type de pierre (ex: "fire_stone", "water_stone")
   * @param location - Lieu de l'évolution
   */
  async evolveWithStone(
    playerPokemon: string | IOwnedPokemon,
    stone: string,
    location: string = 'Evolution'
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 evolveWithStone: ${pokemonId} avec ${stone}`);
      
      return await evolutionService.evolveWithItem(pokemonId, stone, location);
      
    } catch (error) {
      console.error(`❌ [ExperienceService] evolveWithStone failed:`, error);
      return false;
    }
  }
  
  /**
   * Vérifie si un Pokémon peut évoluer
   * @param playerPokemon - Pokémon à vérifier
   */
  async canEvolve(playerPokemon: string | IOwnedPokemon): Promise<{
    canEvolve: boolean;
    method?: string;
    requirement?: any;
    missingRequirements?: string[];
  }> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      const result = await evolutionService.canEvolve(pokemonId);
      
      return {
        canEvolve: result.canEvolve,
        method: result.evolutionData?.method,
        requirement: result.evolutionData?.requirement,
        missingRequirements: result.missingRequirements
      };
      
    } catch (error) {
      console.error(`❌ [ExperienceService] canEvolve failed:`, error);
      return { canEvolve: false };
    }
  }
  
  // ===== 📚 API APPRENTISSAGE DE SORTS =====
  
  /**
   * Récupère les choix de sorts en attente
   * @param playerPokemon - Pokémon à vérifier
   */
  getPendingMoves(playerPokemon: string | IOwnedPokemon): Array<{
    moveId: string;
    moveName: string;
    level: number;
  }> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      return this.getPendingMoveChoices(pokemonId);
      
    } catch (error) {
      console.error(`❌ [ExperienceService] getPendingMoves failed:`, error);
      return [];
    }
  }
  
  /**
   * Apprend un sort en remplaçant un ancien
   * @param playerPokemon - Pokémon qui apprend
   * @param newMove - ID du nouveau sort
   * @param forgetMove - ID du sort à oublier (optionnel)
   */
  async learnMove(
    playerPokemon: string | IOwnedPokemon,
    newMove: string,
    forgetMove?: string
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 learnMove: ${pokemonId} apprend ${newMove}${forgetMove ? ` (oublie ${forgetMove})` : ''}`);
      
      const result = await this.processMoveChoice(pokemonId, newMove, forgetMove);
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] learnMove failed:`, error);
      return false;
    }
  }
  
  /**
   * Rejette l'apprentissage d'un sort
   * @param playerPokemon - Pokémon concerné
   * @param moveId - ID du sort à rejeter
   */
  rejectMove(playerPokemon: string | IOwnedPokemon, moveId: string): void {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 rejectMove: ${pokemonId} rejette ${moveId}`);
      
      this.rejectMoveChoice(pokemonId, moveId);
      
    } catch (error) {
      console.error(`❌ [ExperienceService] rejectMove failed:`, error);
    }
  }
  
  // ===== 📊 API STATUS ET UTILITAIRES =====
  
  /**
   * Récupère le statut complet d'un Pokémon
   * @param playerPokemon - Pokémon à analyser
   */
  async getPokemonStatus(playerPokemon: string | IOwnedPokemon): Promise<{
    level: number;
    experience: number;
    expToNext: number;
    canLevelUp: boolean;
    canEvolve: boolean;
    pendingMoves: number;
    evolutionMethod?: string;
    missingRequirements?: string[];
  }> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      const [levelInfo, evolutionInfo, pendingMoves] = await Promise.all([
        this.canLevelUp(pokemonId),
        this.canEvolve(pokemonId),
        Promise.resolve(this.getPendingMoves(pokemonId))
      ]);
      
      return {
        level: levelInfo.currentLevel,
        experience: levelInfo.currentExp,
        expToNext: levelInfo.expNeeded,
        canLevelUp: levelInfo.canLevel,
        canEvolve: evolutionInfo.canEvolve,
        pendingMoves: pendingMoves.length,
        evolutionMethod: evolutionInfo.method,
        missingRequirements: evolutionInfo.missingRequirements
      };
      
    } catch (error) {
      console.error(`❌ [ExperienceService] getPokemonStatus failed:`, error);
      return {
        level: 0,
        experience: 0,
        expToNext: 0,
        canLevelUp: false,
        canEvolve: false,
        pendingMoves: 0
      };
    }
  }
  
  /**
   * Simule le gain d'XP sans l'appliquer
   * @param playerPokemon - Pokémon à simuler
   * @param amount - Quantité d'XP à simuler
   */
  async simulateXPGain(
    playerPokemon: string | IOwnedPokemon,
    amount: number
  ): Promise<{
    willLevelUp: boolean;
    newLevel: number;
    levelsGained: number;
    willEvolve: boolean;
    newMovesCount: number;
  }> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);
      
      if (!ownedPokemon) {
        return {
          willLevelUp: false,
          newLevel: 0,
          levelsGained: 0,
          willEvolve: false,
          newMovesCount: 0
        };
      }
      
      // Simulation du gain d'XP
      const currentLevel = ownedPokemon.level;
      const newExp = ownedPokemon.experience + amount;
      let newLevel = currentLevel;
      
      // Calculer le nouveau niveau
      while (newLevel < this.config.maxLevel) {
        const expForNextLevel = this.calculateExpForLevel(newLevel + 1, ownedPokemon);
        if (newExp < expForNextLevel) break;
        newLevel++;
      }
      
      const levelsGained = newLevel - currentLevel;
      const willLevelUp = levelsGained > 0;
      
      // Vérifier l'évolution possible
      let willEvolve = false;
      if (willLevelUp) {
        const evolutionInfo = await this.canEvolve(pokemonId);
        willEvolve = evolutionInfo.canEvolve;
      }
      
      // Estimer les nouveaux sorts
      let newMovesCount = 0;
      if (willLevelUp) {
        // TODO: Calculer les sorts entre currentLevel et newLevel
        newMovesCount = levelsGained; // Approximation
      }
      
      return {
        willLevelUp,
        newLevel,
        levelsGained,
        willEvolve,
        newMovesCount
      };
      
    } catch (error) {
      console.error(`❌ [ExperienceService] simulateXPGain failed:`, error);
      return {
        willLevelUp: false,
        newLevel: 0,
        levelsGained: 0,
        willEvolve: false,
        newMovesCount: 0
      };
    }
  }  
  // ===== API PUBLIQUE DE CONFIGURATION =====// server/src/services/ExperienceService.ts
import { EventEmitter } from 'events';
import { Types } from 'mongoose';
import { IOwnedPokemon } from '../models/OwnedPokemon';
import { IPokemonData } from '../models/PokemonData';
import { getPokemonById } from '../data/PokemonData';
import { evolutionService } from './EvolutionService';

// ===== TYPES ET INTERFACES =====

// Interface pour les stats Pokémon (utilisée dans le service)
interface IPokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface ExperienceGainContext {
  // === DONNÉES DE BASE ===
  gainedBy: string;                    // ID du Pokémon qui gagne l'XP
  source: 'wild_battle' | 'trainer_battle' | 'evolution' | 'rare_candy' | 'day_care' | 'trade' | 'special_event';
  amount?: number;                     // XP spécifique (pour rare candy, etc.)
  
  // === CONTEXTE DE COMBAT ===
  defeatedPokemon?: {
    pokemonId: number;
    level: number;
    baseExperience: number;
    isWild: boolean;
    isTrainerOwned: boolean;
    trainerLevel?: number;
  };
  
  // === MODIFICATEURS D'XP ===
  modifiers?: {
    isTraded?: boolean;                // +50% XP si échangé
    hasLuckyEgg?: boolean;            // +50% XP avec Œuf Chance
    isInternational?: boolean;         // +70% XP si échangé international
    affectionLevel?: number;           // +20% XP niveau affection max
    expShare?: boolean;                // Partage XP activé
    isParticipant?: boolean;           // A participé au combat
    modernExpShare?: boolean;          // Système moderne (Gen 6+)
  };
  
  // === CONTEXTE ADDITIONNEL ===
  location?: string;
  battleType?: 'single' | 'double' | 'triple' | 'rotation' | 'horde';
  participants?: string[];             // IDs des autres Pokémon participants
  isCriticalHit?: boolean;
  isTypeAdvantage?: boolean;
}

export interface ExperienceResult {
  // === RÉSULTAT PRINCIPAL ===
  success: boolean;
  error?: string;
  
  // === CHANGEMENTS DU POKÉMON ===
  pokemon: {
    id: string;
    name: string;
    beforeLevel: number;
    afterLevel: number;
    beforeExp: number;
    afterExp: number;
    expGained: number;
    expToNextLevel: number;
  };
  
  // === ÉVÉNEMENTS DÉCLENCHÉS ===
  leveledUp: boolean;
  levelsGained: number;
  hasEvolved?: boolean;
  evolutionData?: {
    fromPokemonId: number;
    toPokemonId: number;
    evolutionMethod: string;
  };
  
  // === APPRENTISSAGE DE SORTS ===
  newMoves: Array<{
    moveId: string;
    moveName: string;
    learnedAtLevel: number;
    replacedMove?: string;
    wasLearned: boolean;
  }>;
  
  // === AMÉLIORATION DES STATS ===
  statGains?: Record<string, number>;
  
  // === NOTIFICATIONS ===
  notifications: string[];
  achievements: string[];
  
  // === MÉTADONNÉES ===
  performance?: {
    executionTime: number;
    operationsCount: number;
  };
}

export interface LevelUpData {
  pokemon: IOwnedPokemon;
  fromLevel: number;
  toLevel: number;
  newMoves: string[];
  canEvolve: boolean;
  evolutionData?: any;
  statIncreases: Record<string, number>;
}

export interface MoveLearnChoice {
  pokemonId: string;
  moveId: string;
  moveName: string;
  level: number;
  forgetMove?: string;        // Move à oublier si limite de 4 atteinte
  autoLearn?: boolean;        // Apprentissage automatique
}

export interface ExperienceServiceConfig {
  enabled: boolean;
  debugMode: boolean;
  autoEvolution: boolean;        // Évolution automatique
  autoMoveLearn: boolean;        // Apprentissage automatique des sorts
  modernExpFormula: boolean;     // Utilise la formule moderne d'XP
  expShareMode: 'classic' | 'modern';  // Mode partage XP
  maxLevel: number;
  enableNotifications: boolean;
  enableAchievements: boolean;
  batchProcessing: boolean;      // Traitement en lot pour performances
}

// ===== SERVICE D'EXPÉRIENCE PRINCIPAL =====

export class ExperienceService extends EventEmitter {
  private static instance: ExperienceService;
  
  // Configuration du service
  private config: ExperienceServiceConfig = {
    enabled: true,
    debugMode: false,
    autoEvolution: true,
    autoMoveLearn: false,        // Choix du joueur par défaut
    modernExpFormula: true,      // Utilise Gen 5+ par défaut
    expShareMode: 'modern',      // Partage moderne par défaut
    maxLevel: 100,
    enableNotifications: true,
    enableAchievements: true,
    batchProcessing: true
  };
  
  // Statistiques du service
  private stats = {
    totalExpGained: 0,
    totalLevelsGained: 0,
    totalEvolutions: 0,
    totalMovesLearned: 0,
    operationsCount: 0,
    averageProcessingTime: 0
  };
  
  // Cache des données Pokémon
  private pokemonDataCache = new Map<number, any>(); // Simplifié pour éviter les conflits de types
  
  // Queue des choix d'apprentissage en attente
  private pendingMoveChoices = new Map<string, MoveLearnChoice[]>();
  
  // Opérations en cours pour éviter les conflits
  private ongoingOperations = new Set<string>();
  
  constructor() {
    super();
    this.initializeService();
    console.log('📈 [ExperienceService] Service d\'expérience initialisé');
  }
  
  static getInstance(): ExperienceService {
    if (!ExperienceService.instance) {
      ExperienceService.instance = new ExperienceService();
    }
    return ExperienceService.instance;
  }
  
  private initializeService(): void {
    // Nettoyage périodique
    setInterval(() => this.cleanupService(), 10 * 60 * 1000); // 10 minutes
    
    // Gestion des erreurs
    this.on('error', (error) => {
      console.error('❌ [ExperienceService] Erreur service:', error);
    });
    
    // ✅ INTEGRATION AVEC EVOLUTIONSERVICE
    this.setupEvolutionServiceIntegration();
    
    this.debugLog('Service d\'expérience initialisé avec succès');
  }
  
  // ===== 🎯 API PUBLIQUE ULTRA-SIMPLE =====
  
  /**
   * Donne de l'XP pour un combat sauvage (API simple)
   * @param playerPokemon - Pokémon du joueur (ID string ou objet)
   * @param pokemonAdvanced - Pokémon vaincu { pokemonId, level }
   * @param level - Niveau du Pokémon vaincu (optionnel si dans pokemonAdvanced)
   */
  async givePlayerWildXP(
    playerPokemon: string | IOwnedPokemon,
    pokemonAdvanced: { pokemonId: number; level: number } | number,
    level?: number
  ): Promise<boolean> {
    try {
      // Normaliser les paramètres
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      let defeatedPokemon: { pokemonId: number; level: number };
      if (typeof pokemonAdvanced === 'number') {
        defeatedPokemon = { pokemonId: pokemonAdvanced, level: level || 1 };
      } else {
        defeatedPokemon = pokemonAdvanced;
      }
      
      this.debugLog(`🎯 givePlayerWildXP: ${pokemonId} vs #${defeatedPokemon.pokemonId} niveau ${defeatedPokemon.level}`);
      
      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0, // Sera calculé automatiquement
          isWild: true,
          isTrainerOwned: false
        },
        modifiers: {
          isParticipant: true,
          expShare: false
        },
        location: 'Wild Battle'
      });
      
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] givePlayerWildXP failed:`, error);
      return false;
    }
  }
  
  /**
   * Donne une quantité fixe d'XP (API simple)
   * @param playerPokemon - Pokémon du joueur (ID string ou objet)
   * @param amount - Quantité d'XP à donner
   */
  async givePlayerXP(
    playerPokemon: string | IOwnedPokemon,
    amount: number
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 givePlayerXP: ${pokemonId} +${amount} XP`);
      
      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'special_event',
        amount: Math.max(0, amount),
        location: 'Manual XP Grant'
      });
      
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] givePlayerXP failed:`, error);
      return false;
    }
  }
  
  /**
   * Donne de l'XP pour un combat de dresseur (API simple)
   * @param playerPokemon - Pokémon du joueur
   * @param trainerPokemon - Pokémon du dresseur vaincu
   * @param trainerLevel - Niveau du dresseur (optionnel, défaut 1)
   */
  async givePlayerTrainerXP(
    playerPokemon: string | IOwnedPokemon,
    trainerPokemon: { pokemonId: number; level: number } | number,
    trainerLevel: number = 1
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      let defeatedPokemon: { pokemonId: number; level: number };
      if (typeof trainerPokemon === 'number') {
        defeatedPokemon = { pokemonId: trainerPokemon, level: trainerLevel };
      } else {
        defeatedPokemon = trainerPokemon;
      }
      
      this.debugLog(`🎯 givePlayerTrainerXP: ${pokemonId} vs Dresseur #${defeatedPokemon.pokemonId}`);
      
      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'trainer_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: false,
          isTrainerOwned: true,
          trainerLevel
        },
        modifiers: {
          isParticipant: true,
          expShare: false
        },
        location: 'Trainer Battle'
      });
      
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] givePlayerTrainerXP failed:`, error);
      return false;
    }
  }
  
  /**
   * Utilise un Rare Candy (API simple)
   * @param playerPokemon - Pokémon du joueur
   */
  async useRareCandy(playerPokemon: string | IOwnedPokemon): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 useRareCandy: ${pokemonId}`);
      
      // Calculer l'XP nécessaire pour le niveau suivant
      // TODO: Améliorer avec le calcul exact depuis le Pokémon
      const expForNextLevel = 1000; // Approximation pour l'instant
      
      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'rare_candy',
        amount: expForNextLevel,
        location: 'Rare Candy Usage'
      });
      
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] useRareCandy failed:`, error);
      return false;
    }
  }
  
  /**
   * Donne de l'XP à plusieurs Pokémon (combat en équipe)
   * @param playerPokemonIds - Liste des IDs des Pokémon participants
   * @param defeatedPokemon - Pokémon vaincu
   * @param isWildBattle - Si c'est un combat sauvage (défaut true)
   */
  async giveTeamWildXP(
    playerPokemonIds: string[],
    defeatedPokemon: { pokemonId: number; level: number },
    isWildBattle: boolean = true
  ): Promise<{ success: boolean; results: boolean[] }> {
    try {
      this.debugLog(`🎯 giveTeamWildXP: ${playerPokemonIds.length} Pokémon vs #${defeatedPokemon.pokemonId}`);
      
      const results = await Promise.all(
        playerPokemonIds.map(pokemonId => 
          isWildBattle 
            ? this.givePlayerWildXP(pokemonId, defeatedPokemon)
            : this.givePlayerTrainerXP(pokemonId, defeatedPokemon)
        )
      );
      
      const success = results.every(result => result);
      
      this.debugLog(`✅ giveTeamWildXP: ${results.filter(r => r).length}/${results.length} succès`);
      
      return { success, results };
      
    } catch (error) {
      console.error(`❌ [ExperienceService] giveTeamWildXP failed:`, error);
      return { success: false, results: [] };
    }
  }
  
  /**
   * Donne de l'XP avec partage d'expérience moderne
   * @param activePokemon - Pokémon actif au combat
   * @param teamPokemonIds - Autres Pokémon de l'équipe
   * @param defeatedPokemon - Pokémon vaincu
   */
  async giveXPWithExpShare(
    activePokemon: string,
    teamPokemonIds: string[],
    defeatedPokemon: { pokemonId: number; level: number }
  ): Promise<{ success: boolean; activeResult: boolean; teamResults: boolean[] }> {
    try {
      this.debugLog(`🎯 giveXPWithExpShare: Actif ${activePokemon} + ${teamPokemonIds.length} équipiers`);
      
      // XP complète pour le Pokémon actif
      const activeResult = await this.processExperienceGain({
        gainedBy: activePokemon,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false
        },
        modifiers: {
          isParticipant: true,
          expShare: true,
          modernExpShare: true
        },
        location: 'Wild Battle (Active)'
      });
      
      // XP réduite pour l'équipe (mode moderne = XP complète aussi)
      const teamResults = await Promise.all(
        teamPokemonIds.map(pokemonId => 
          this.processExperienceGain({
            gainedBy: pokemonId,
            source: 'wild_battle',
            defeatedPokemon: {
              pokemonId: defeatedPokemon.pokemonId,
              level: defeatedPokemon.level,
              baseExperience: 0,
              isWild: true,
              isTrainerOwned: false
            },
            modifiers: {
              isParticipant: false,
              expShare: true,
              modernExpShare: true
            },
            location: 'Wild Battle (Exp Share)'
          })
        )
      );
      
      const teamSuccess = teamResults.map(r => r.success);
      const success = activeResult.success && teamSuccess.every(s => s);
      
      this.debugLog(`✅ giveXPWithExpShare: Actif=${activeResult.success}, Équipe=${teamSuccess.filter(s => s).length}/${teamSuccess.length}`);
      
      return { success, activeResult: activeResult.success, teamResults: teamSuccess };
      
    } catch (error) {
      console.error(`❌ [ExperienceService] giveXPWithExpShare failed:`, error);
      return { success: false, activeResult: false, teamResults: [] };
    }
  }
  
  /**
   * Donne de l'XP avec Œuf Chance (bonus +100%)
   * @param playerPokemon - Pokémon du joueur avec Œuf Chance
   * @param defeatedPokemon - Pokémon vaincu
   */
  async giveXPWithLuckyEgg(
    playerPokemon: string | IOwnedPokemon,
    defeatedPokemon: { pokemonId: number; level: number }
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 giveXPWithLuckyEgg: ${pokemonId} avec Œuf Chance`);
      
      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false
        },
        modifiers: {
          isParticipant: true,
          hasLuckyEgg: true, // +100% XP
          expShare: false
        },
        location: 'Wild Battle (Lucky Egg)'
      });
      
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] giveXPWithLuckyEgg failed:`, error);
      return false;
    }
  }
  
  /**
   * Donne de l'XP pour un Pokémon échangé (bonus +50%)
   * @param tradedPokemon - Pokémon échangé
   * @param defeatedPokemon - Pokémon vaincu
   * @param isInternational - Si c'est un échange international (+70%)
   */
  async giveTradedPokemonXP(
    tradedPokemon: string | IOwnedPokemon,
    defeatedPokemon: { pokemonId: number; level: number },
    isInternational: boolean = false
  ): Promise<boolean> {
    try {
      const pokemonId = typeof tradedPokemon === 'string' ? tradedPokemon : tradedPokemon._id?.toString() || '';
      
      this.debugLog(`🎯 giveTradedPokemonXP: ${pokemonId} échangé ${isInternational ? '(international)' : ''}`);
      
      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false
        },
        modifiers: {
          isParticipant: true,
          isTraded: true, // +50% XP
          isInternational, // +70% XP si true
          expShare: false
        },
        location: 'Wild Battle (Traded)'
      });
      
      return result.success;
      
    } catch (error) {
      console.error(`❌ [ExperienceService] giveTradedPokemonXP failed:`, error);
      return false;
    }
  }
  
  /**
   * Vérifie si un Pokémon peut monter de niveau
   * @param playerPokemon - Pokémon à vérifier
   */
  async canLevelUp(playerPokemon: string | IOwnedPokemon): Promise<{
    canLevel: boolean;
    currentLevel: number;
    currentExp: number;
    expNeeded: number;
    expForNextLevel: number;
  }> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);
      
      if (!ownedPokemon) {
        return {
          canLevel: false,
          currentLevel: 0,
          currentExp: 0,
          expNeeded: 0,
          expForNextLevel: 0
        };
      }
      
      const expForNextLevel = this.calculateExpForLevel(ownedPokemon.level + 1, ownedPokemon);
      const expNeeded = expForNextLevel - ownedPokemon.experience;
      
      return {
        canLevel: ownedPokemon.level < this.config.maxLevel && expNeeded > 0,
        currentLevel: ownedPokemon.level,
        currentExp: ownedPokemon.experience,
        expNeeded: Math.max(0, expNeeded),
        expForNextLevel
      };
      
    } catch (error) {
      console.error(`❌ [ExperienceService] canLevelUp failed:`, error);
      return {
        canLevel: false,
        currentLevel: 0,
        currentExp: 0,
        expNeeded: 0,
        expForNextLevel: 0
      };
    }
  }
  
  /**
   * Force un Pokémon à un niveau spécifique (pour les tests/admin)
   * @param playerPokemon - Pokémon à modifier
   * @param targetLevel - Niveau cible (1-100)
   */
  async setLevel(
    playerPokemon: string | IOwnedPokemon,
    targetLevel: number
  ): Promise<boolean> {
    try {
      const pokemonId = typeof playerPokemon === 'string' ? playerPokemon : playerPokemon._id?.toString() || '';
      const level = Math.max(1, Math.min(this.config.maxLevel, targetLevel));
      
      this.debugLog(`🎯 setLevel: ${pokemonId} → niveau ${level}`);
      
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);
      if (!ownedPokemon) return false;
      
      // Calculer l'XP nécessaire pour ce niveau
      const expNeeded = this.calculateExpForLevel(level, ownedPokemon);
      const currentExp = ownedPokemon.experience;
      
      if (expNeeded > currentExp) {
        // Donner l'XP manquante
        const expToGive = expNeeded - currentExp;
        return await this.givePlayerXP(pokemonId, expToGive);
      } else {
        // Niveau déjà atteint ou dépassé
        return true;
      }
      
    } catch (error) {
      console.error(`❌ [ExperienceService] setLevel failed:`, error);
      return false;
    }
  }
  
  // ===== MÉTHODE PRINCIPALE DE TRAITEMENT =====
  
  /**
   * Traite le gain d'expérience avec toute la logique associée
   */
  async processExperienceGain(context: ExperienceGainContext): Promise<ExperienceResult> {
    const startTime = Date.now();
    const operationId = `exp_${context.gainedBy}_${Date.now()}`;
    
    this.debugLog(`📈 Début traitement XP: ${context.gainedBy} (${context.source})`);
    
    try {
      // Validation et sécurité
      if (!this.config.enabled) {
        return this.createFailureResult('Service désactivé');
      }
      
      if (this.ongoingOperations.has(context.gainedBy)) {
        return this.createFailureResult('Opération en cours pour ce Pokémon');
      }
      
      this.ongoingOperations.add(context.gainedBy);
      this.stats.operationsCount++;
      
      try {
        // 1. Récupérer le Pokémon
        const ownedPokemon = await this.getOwnedPokemon(context.gainedBy);
        if (!ownedPokemon) {
          throw new Error('Pokémon introuvable');
        }
        
        // Vérifier niveau max
        if (ownedPokemon.level >= this.config.maxLevel) {
          return this.createSuccessResult({
            pokemon: this.createPokemonSummary(ownedPokemon as any, ownedPokemon as any, 0),
            leveledUp: false,
            levelsGained: 0,
            newMoves: [],
            notifications: ['Ce Pokémon est déjà au niveau maximum !']
          });
        }
        
        const beforePokemon = JSON.parse(JSON.stringify(ownedPokemon)); // Deep copy pour éviter les problèmes de référence
        
        // 2. Calculer l'XP à gagner
        const expToGain = await this.calculateExperienceGain(context, ownedPokemon);
        if (expToGain <= 0) {
          return this.createSuccessResult({
            pokemon: this.createPokemonSummary(beforePokemon, ownedPokemon, 0),
            leveledUp: false,
            levelsGained: 0,
            newMoves: [],
            notifications: ['Aucune expérience gagnée']
          });
        }
        
        this.debugLog(`💎 XP calculée: ${expToGain} pour ${ownedPokemon.nickname || 'Pokemon'}`);
        
        // 3. Appliquer l'XP et gérer les montées de niveau
        const levelUpResult = await this.applyExperienceAndLevelUp(ownedPokemon, expToGain);
        
        // 4. Traiter les évolutions si auto-évolution activée
        let evolutionData: any = undefined;
        let hasEvolved = false;
        
        if (this.config.autoEvolution && levelUpResult.leveledUp) {
          const evolutionResult = await this.checkAndProcessEvolution(ownedPokemon);
          if (evolutionResult.evolved) {
            hasEvolved = true;
            evolutionData = evolutionResult.evolutionData;
            levelUpResult.notifications.push(`🌟 ${ownedPokemon.nickname || 'Votre Pokémon'} a évolué !`);
          }
        }
        
        // 5. Sauvegarder les changements
        await this.saveOwnedPokemon(ownedPokemon);
        
        // 6. Créer le résultat final
        const result: ExperienceResult = {
          success: true,
          pokemon: this.createPokemonSummary(beforePokemon, ownedPokemon as any, expToGain),
          leveledUp: levelUpResult.leveledUp,
          levelsGained: levelUpResult.levelsGained,
          hasEvolved,
          evolutionData,
          newMoves: levelUpResult.newMoves,
          statGains: levelUpResult.statGains,
          notifications: levelUpResult.notifications,
          achievements: await this.checkAchievements(context, levelUpResult),
          performance: {
            executionTime: Date.now() - startTime,
            operationsCount: 1
          }
        };
        
        // 7. Émettre les événements
        this.emitEvents(context, result);
        
        // 8. Mettre à jour les statistiques
        this.updateStats(expToGain, levelUpResult.levelsGained, hasEvolved, levelUpResult.newMoves.length);
        
        this.debugLog(`✅ XP traitée: +${expToGain} XP, ${levelUpResult.levelsGained} niveaux, ${levelUpResult.newMoves.length} sorts`);
        
        return result;
        
      } finally {
        this.ongoingOperations.delete(context.gainedBy);
      }
      
    } catch (error) {
      this.emit('error', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`❌ [ExperienceService] Erreur processExperienceGain:`, error);
      
      return this.createFailureResult(errorMessage);
    }
  }
  
  // ===== CALCUL D'EXPÉRIENCE =====
  
  /**
   * Calcule l'XP à gagner selon les différentes sources et modificateurs
   */
  private async calculateExperienceGain(
    context: ExperienceGainContext,
    ownedPokemon: IOwnedPokemon
  ): Promise<number> {
    
    // XP fixe pour certaines sources
    if (context.amount !== undefined) {
      return Math.max(0, context.amount);
    }
    
    // XP de combat
    if (context.source === 'wild_battle' || context.source === 'trainer_battle') {
      return await this.calculateBattleExperience(context, ownedPokemon);
    }
    
    // XP d'évolution (bonus)
    if (context.source === 'evolution') {
      return Math.floor(ownedPokemon.level * 5); // Bonus d'évolution
    }
    
    // Autres sources
    return 0;
  }
  
  /**
   * Calcule l'XP de combat avec la formule moderne
   */
  private async calculateBattleExperience(
    context: ExperienceGainContext,
    ownedPokemon: IOwnedPokemon
  ): Promise<number> {
    
    if (!context.defeatedPokemon) return 0;
    
    const defeated = context.defeatedPokemon;
    
    // Récupérer les données du Pokémon vaincu
    const defeatedData = await this.getPokemonData(defeated.pokemonId);
    if (!defeatedData) return 0;
    
    // Base XP du Pokémon vaincu
    let baseExp = defeated.baseExperience || defeatedData.baseExperience || 60;
    
    // Formule moderne (Gen 5+) ou classique
    let experience: number;
    
    if (this.config.modernExpFormula) {
      // Formule Gen 5+: plus équilibrée
      const levelRatio = (defeated.level * 2 + 10) / (defeated.level + ownedPokemon.level + 10);
      experience = Math.floor((baseExp * defeated.level * levelRatio) / 5);
    } else {
      // Formule classique Gen 1-4
      experience = Math.floor((baseExp * defeated.level) / 7);
    }
    
    // Aplicar modificadores
    const modifiers = context.modifiers || {};
    
    // Combat de dresseur (+50%)
    if (context.source === 'trainer_battle' || defeated.isTrainerOwned) {
      experience = Math.floor(experience * 1.5);
    }
    
    // Pokémon échangé (+50%)
    if (modifiers.isTraded) {
      experience = Math.floor(experience * 1.5);
    }
    
    // Œuf Chance (+100%)
    if (modifiers.hasLuckyEgg) {
      experience = Math.floor(experience * 2.0);
    }
    
    // Échange international (+70%)
    if (modifiers.isInternational) {
      experience = Math.floor(experience * 1.7);
    }
    
    // Affection maximale (+20%)
    if (modifiers.affectionLevel && modifiers.affectionLevel >= 5) {
      experience = Math.floor(experience * 1.2);
    }
    
    // Partage d'expérience (réduction si pas participant direct)
    if (modifiers.expShare && !modifiers.isParticipant) {
      if (this.config.expShareMode === 'modern') {
        // Mode moderne: XP complète pour tous
        // Pas de réduction
      } else {
        // Mode classique: division de l'XP
        experience = Math.floor(experience * 0.5);
      }
    }
    
    return Math.max(1, experience);
  }
  
  // ===== GESTION DES MONTÉES DE NIVEAU =====
  
  /**
   * Applique l'XP et gère les montées de niveau successives
   */
  private async applyExperienceAndLevelUp(
    ownedPokemon: IOwnedPokemon,
    expToGain: number
  ): Promise<{
    leveledUp: boolean;
    levelsGained: number;
    newMoves: Array<{ moveId: string; moveName: string; learnedAtLevel: number; wasLearned: boolean }>;
    statGains?: Record<string, number>;
    notifications: string[];
  }> {
    
    const initialLevel = ownedPokemon.level;
    const initialExp = ownedPokemon.experience;
    
    // Ajouter l'expérience
    ownedPokemon.experience += expToGain;
    
    const notifications: string[] = [];
    const newMoves: Array<{ moveId: string; moveName: string; learnedAtLevel: number; wasLearned: boolean }> = [];
    let totalLevelsGained = 0;
    
    // Vérifier les montées de niveau successives
    while (ownedPokemon.level < this.config.maxLevel) {
      const expForNextLevel = this.calculateExpForLevel(ownedPokemon.level + 1, ownedPokemon);
      
      if (ownedPokemon.experience < expForNextLevel) {
        break; // Plus assez d'XP pour le niveau suivant
      }
      
      // Montée de niveau !
      ownedPokemon.level++;
      totalLevelsGained++;
      
      this.debugLog(`🆙 Niveau up! ${ownedPokemon.nickname || 'Pokemon'} niveau ${ownedPokemon.level}`);
      
      // Recalculer les stats
      await ownedPokemon.recalculateStats();
      
      // Soigner le Pokémon (HP complet)
      ownedPokemon.currentHp = ownedPokemon.maxHp;
      
      // Vérifier les nouveaux sorts
      const movesThisLevel = await this.checkNewMovesAtLevel(ownedPokemon, ownedPokemon.level);
      for (const moveData of movesThisLevel) {
        const learned = await this.handleMoveLearn(ownedPokemon, moveData);
        newMoves.push({
          moveId: moveData.moveId,
          moveName: moveData.moveName,
          learnedAtLevel: ownedPokemon.level,
          wasLearned: learned
        });
      }
      
      // Notification de niveau
      notifications.push(`🆙 ${ownedPokemon.nickname || 'Votre Pokémon'} est maintenant niveau ${ownedPokemon.level} !`);
    }
    
    // Calculer les gains de stats (estimation)
    const statGains = totalLevelsGained > 0 ? await this.estimateStatGains(ownedPokemon, totalLevelsGained) : undefined;
    
    return {
      leveledUp: totalLevelsGained > 0,
      levelsGained: totalLevelsGained,
      newMoves,
      statGains,
      notifications
    };
  }
  
  /**
   * Calcule l'XP nécessaire pour un niveau donné
   */
  private calculateExpForLevel(level: number, ownedPokemon: IOwnedPokemon): number {
    // Récupérer le taux de croissance depuis les données du Pokémon
    // Pour l'instant, utiliser Medium Fast comme défaut
    const growthRate: string = 'medium_fast'; // TODO: récupérer depuis les données
    
    switch (growthRate) {
      case 'fast':
        return Math.floor((4 * Math.pow(level, 3)) / 5);
      case 'medium_fast':
        return Math.pow(level, 3);
      case 'medium_slow':
        return Math.floor((6/5) * Math.pow(level, 3) - 15 * Math.pow(level, 2) + 100 * level - 140);
      case 'slow':
        return Math.floor((5 * Math.pow(level, 3)) / 4);
      case 'erratic':
        if (level <= 50) {
          return Math.floor((Math.pow(level, 3) * (100 - level)) / 50);
        } else if (level <= 68) {
          return Math.floor((Math.pow(level, 3) * (150 - level)) / 100);
        } else if (level <= 98) {
          return Math.floor((Math.pow(level, 3) * Math.floor((1911 - 10 * level) / 3)) / 500);
        } else {
          return Math.floor((Math.pow(level, 3) * (160 - level)) / 100);
        }
      case 'fluctuating':
        if (level <= 15) {
          return Math.floor(Math.pow(level, 3) * ((Math.floor((level + 1) / 3) + 24) / 50));
        } else if (level <= 36) {
          return Math.floor(Math.pow(level, 3) * ((level + 14) / 50));
        } else {
          return Math.floor(Math.pow(level, 3) * ((Math.floor(level / 2) + 32) / 50));
        }
      default:
        return Math.pow(level, 3); // Medium Fast par défaut
    }
  }
  
  // ===== GESTION DE L'APPRENTISSAGE DE SORTS =====
  
  /**
   * Vérifie les nouveaux sorts disponibles à un niveau
   */
  private async checkNewMovesAtLevel(ownedPokemon: IOwnedPokemon, level: number): Promise<Array<{ moveId: string; moveName: string }>> {
    try {
      const pokemonData = await this.getPokemonData(ownedPokemon.pokemonId);
      if (!pokemonData) return [];
      
      // Récupérer les sorts de ce niveau depuis levelMoves optimisé
      const movesAtLevel = pokemonData.levelMoves?.[level] || [];
      
      if (movesAtLevel.length === 0) {
        // Fallback: rechercher dans learnset complet
        const learnsetMoves = pokemonData.learnset
          .filter((move: any) => move.method === 'level' && move.level === level)
          .map((move: any) => move.moveId);
        
        return learnsetMoves.map((moveId: string) => ({
          moveId,
          moveName: moveId // TODO: récupérer le nom réel du sort
        }));
      }
      
      return movesAtLevel.map((moveId: string) => ({
        moveId,
        moveName: moveId // TODO: récupérer le nom réel du sort
      }));
      
    } catch (error) {
      console.error('❌ Erreur checkNewMovesAtLevel:', error);
      return [];
    }
  }
  
  /**
   * Gère l'apprentissage d'un nouveau sort
   */
  private async handleMoveLearn(
    ownedPokemon: IOwnedPokemon,
    moveData: { moveId: string; moveName: string }
  ): Promise<boolean> {
    
    // Vérifier si le Pokémon connaît déjà ce sort
    if (ownedPokemon.moves.some(move => move.moveId === moveData.moveId)) {
      this.debugLog(`🔄 Sort déjà connu: ${moveData.moveName}`);
      return false;
    }
    
    // Si moins de 4 sorts, apprendre directement
    if (ownedPokemon.moves.length < 4) {
      await this.learnMove(ownedPokemon, moveData.moveId);
      this.debugLog(`✅ Sort appris: ${moveData.moveName}`);
      return true;
    }
    
    // 4 sorts déjà connus
    if (this.config.autoMoveLearn) {
      // Remplacer le premier sort automatiquement
      await this.replaceMove(ownedPokemon, 0, moveData.moveId);
      this.debugLog(`🔄 Sort remplacé automatiquement: ${moveData.moveName}`);
      return true;
    } else {
      // Ajouter à la queue des choix en attente
      this.addPendingMoveChoice(ownedPokemon._id.toString(), {
        pokemonId: ownedPokemon._id.toString(),
        moveId: moveData.moveId,
        moveName: moveData.moveName,
        level: ownedPokemon.level,
        autoLearn: false
      });
      this.debugLog(`⏳ Sort en attente de choix: ${moveData.moveName}`);
      return false;
    }
  }
  
  /**
   * Apprend un nouveau sort (slot libre)
   */
  private async learnMove(ownedPokemon: IOwnedPokemon, moveId: string): Promise<void> {
    // TODO: Récupérer les données du sort pour les PP
    const newMove = {
      moveId,
      currentPp: 20, // TODO: récupérer PP réel
      maxPp: 20
    };
    
    ownedPokemon.moves.push(newMove);
  }
  
  /**
   * Remplace un sort existant
   */
  private async replaceMove(ownedPokemon: IOwnedPokemon, slotIndex: number, newMoveId: string): Promise<void> {
    if (slotIndex >= 0 && slotIndex < ownedPokemon.moves.length) {
      const newMove = {
        moveId: newMoveId,
        currentPp: 20, // TODO: récupérer PP réel
        maxPp: 20
      };
      
      ownedPokemon.moves[slotIndex] = newMove;
    }
  }
  
  // ===== GESTION DES ÉVOLUTIONS =====
  
  /**
   * Vérifie et traite les évolutions possibles avec intégration complète
   */
  private async checkAndProcessEvolution(ownedPokemon: IOwnedPokemon): Promise<{
    evolved: boolean;
    evolutionData?: any;
  }> {
    try {
      const pokemonData = await this.getPokemonData(ownedPokemon.pokemonId);
      if (!pokemonData?.evolution?.canEvolve) {
        return { evolved: false };
      }
      
      const evolution = pokemonData.evolution;
      
      // Vérifier les conditions d'évolution
      const canEvolve = this.checkEvolutionConditions(ownedPokemon, evolution);
      if (!canEvolve) {
        return { evolved: false };
      }
      
      this.debugLog(`🌟 Évolution détectée: ${pokemonData.nameKey} → #${evolution.evolvesInto}`);
      
      // ✅ INTÉGRATION AVEC VOTRE EVOLUTIONSERVICE
      try {
        const evolutionSuccess = await evolutionService.evolve(
          ownedPokemon._id?.toString() || 'unknown',
          'Level Up'
        );
        
        if (evolutionSuccess) {
          this.debugLog(`🎉 Évolution réussie via EvolutionService !`);
          
          // Émettre événement personnalisé pour l'ExperienceService
          this.emit('pokemonEvolvedFromLevelUp', {
            ownedPokemonId: ownedPokemon._id?.toString(),
            fromPokemonId: ownedPokemon.pokemonId,
            toPokemonId: evolution.evolvesInto,
            level: ownedPokemon.level,
            method: 'level'
          });
          
          return {
            evolved: true,
            evolutionData: {
              fromPokemonId: ownedPokemon.pokemonId,
              toPokemonId: evolution.evolvesInto,
              evolutionMethod: evolution.method
            }
          };
        } else {
          this.debugLog(`❌ Évolution échouée via EvolutionService`);
          return { evolved: false };
        }
        
      } catch (evolutionError) {
        console.error('❌ Erreur lors de l\'évolution:', evolutionError);
        return { evolved: false };
      }
      
    } catch (error) {
      console.error('❌ Erreur checkAndProcessEvolution:', error);
      return { evolved: false };
    }
  }
  
  /**
   * Vérifie les conditions d'évolution par niveau
   */
  private checkEvolutionConditions(ownedPokemon: IOwnedPokemon, evolution: any): boolean {
    switch (evolution.method) {
      case 'level':
        return typeof evolution.requirement === 'number' && 
               ownedPokemon.level >= evolution.requirement;
      
      case 'friendship':
        return (ownedPokemon.friendship || 0) >= 220;
      
      // Autres méthodes d'évolution nécessitent des déclencheurs externes
      default:
        return false;
    }
  }
  
  // ===== API PUBLIQUE POUR LES CHOIX DE SORTS =====
  
  /**
   * Récupère les choix de sorts en attente pour un Pokémon
   */
  getPendingMoveChoices(pokemonId: string): MoveLearnChoice[] {
    return this.pendingMoveChoices.get(pokemonId) || [];
  }
  
  /**
   * Traite un choix de sort du joueur
   */
  async processMoveChoice(
    pokemonId: string,
    moveId: string,
    forgetMove?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pendingChoices = this.pendingMoveChoices.get(pokemonId);
      if (!pendingChoices || pendingChoices.length === 0) {
        return { success: false, error: 'Aucun choix en attente' };
      }
      
      const choiceIndex = pendingChoices.findIndex(choice => choice.moveId === moveId);
      if (choiceIndex === -1) {
        return { success: false, error: 'Choix de sort introuvable' };
      }
      
      const choice = pendingChoices[choiceIndex];
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);
      if (!ownedPokemon) {
        return { success: false, error: 'Pokémon introuvable' };
      }
      
      // Apprendre le sort
      if (forgetMove) {
        const forgetIndex = ownedPokemon.moves.findIndex(move => move.moveId === forgetMove);
        if (forgetIndex !== -1) {
          await this.replaceMove(ownedPokemon, forgetIndex, moveId);
        }
      } else if (ownedPokemon.moves.length < 4) {
        await this.learnMove(ownedPokemon, moveId);
      }
      
      // Sauvegarder et nettoyer
      await this.saveOwnedPokemon(ownedPokemon);
      pendingChoices.splice(choiceIndex, 1);
      
      if (pendingChoices.length === 0) {
        this.pendingMoveChoices.delete(pokemonId);
      }
      
      this.debugLog(`✅ Choix de sort traité: ${choice.moveName}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erreur processMoveChoice:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
  
  /**
   * Rejette un choix de sort (ne pas apprendre)
   */
  rejectMoveChoice(pokemonId: string, moveId: string): void {
    const pendingChoices = this.pendingMoveChoices.get(pokemonId);
    if (pendingChoices) {
      const choiceIndex = pendingChoices.findIndex(choice => choice.moveId === moveId);
      if (choiceIndex !== -1) {
        pendingChoices.splice(choiceIndex, 1);
        if (pendingChoices.length === 0) {
          this.pendingMoveChoices.delete(pokemonId);
        }
        this.debugLog(`❌ Choix de sort rejeté: ${moveId}`);
      }
    }
  }
  
  // ===== UTILITAIRES PRIVÉS =====
  
  private addPendingMoveChoice(pokemonId: string, choice: MoveLearnChoice): void {
    if (!this.pendingMoveChoices.has(pokemonId)) {
      this.pendingMoveChoices.set(pokemonId, []);
    }
    this.pendingMoveChoices.get(pokemonId)!.push(choice);
  }
  
  private async estimateStatGains(ownedPokemon: IOwnedPokemon, levelsGained: number): Promise<Record<string, number>> {
    // Estimation basique des gains de stats
    const baseGainPerLevel = 3; // Moyenne approximative
    return {
      hp: levelsGained * baseGainPerLevel,
      attack: levelsGained * baseGainPerLevel,
      defense: levelsGained * baseGainPerLevel,
      specialAttack: levelsGained * baseGainPerLevel,
      specialDefense: levelsGained * baseGainPerLevel,
      speed: levelsGained * baseGainPerLevel
    };
  }
  
  private async checkAchievements(context: ExperienceGainContext, levelUpResult: any): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Implémenter système d'accomplissements complet
    if (levelUpResult.levelsGained >= 5) {
      achievements.push('🏆 Accomplissement : Montée Spectaculaire !');
    }
    
    if (levelUpResult.newMoves.length >= 3) {
      achievements.push('📚 Accomplissement : Apprenant Rapide !');
    }
    
    return achievements;
  }
  
  private createPokemonSummary(
    before: any, // Simplifié pour éviter les problèmes de type Document
    after: IOwnedPokemon,
    expGained: number
  ): ExperienceResult['pokemon'] {
    return {
      id: after._id?.toString() || 'unknown',
      name: after.nickname || `Pokemon #${after.pokemonId}`,
      beforeLevel: before.level || 0,
      afterLevel: after.level,
      beforeExp: before.experience || 0,
      afterExp: after.experience,
      expGained,
      expToNextLevel: this.calculateExpForLevel(after.level + 1, after) - after.experience
    };
  }
  
  private emitEvents(context: ExperienceGainContext, result: ExperienceResult): void {
    // Événement principal
    this.emit('experienceGained', {
      context,
      result
    });
    
    // Événements spécifiques
    if (result.leveledUp) {
      this.emit('levelUp', {
        pokemonId: context.gainedBy,
        fromLevel: result.pokemon.beforeLevel,
        toLevel: result.pokemon.afterLevel,
        levelsGained: result.levelsGained
      });
    }
    
    if (result.hasEvolved) {
      this.emit('evolutionTriggered', {
        pokemonId: context.gainedBy,
        evolutionData: result.evolutionData
      });
    }
    
    if (result.newMoves.length > 0) {
      this.emit('newMovesAvailable', {
        pokemonId: context.gainedBy,
        moves: result.newMoves
      });
    }
  }
  
  private updateStats(expGained: number, levelsGained: number, hasEvolved: boolean, movesLearned: number): void {
    this.stats.totalExpGained += expGained;
    this.stats.totalLevelsGained += levelsGained;
    if (hasEvolved) this.stats.totalEvolutions++;
    this.stats.totalMovesLearned += movesLearned;
  }
  
  private createSuccessResult(data: Partial<ExperienceResult>): ExperienceResult {
    return {
      success: true,
      pokemon: {
        id: '',
        name: '',
        beforeLevel: 0,
        afterLevel: 0,
        beforeExp: 0,
        afterExp: 0,
        expGained: 0,
        expToNextLevel: 0
      },
      leveledUp: false,
      levelsGained: 0,
      newMoves: [],
      notifications: [],
      achievements: [],
      ...data
    };
  }
  
  private createFailureResult(error: string): ExperienceResult {
    return {
      success: false,
      error,
      pokemon: {
        id: '',
        name: '',
        beforeLevel: 0,
        afterLevel: 0,
        beforeExp: 0,
        afterExp: 0,
        expGained: 0,
        expToNextLevel: 0
      },
      leveledUp: false,
      levelsGained: 0,
      newMoves: [],
      notifications: [],
      achievements: []
    };
  }
  
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [ExperienceService] ${message}`);
    }
  }
  
  private cleanupService(): void {
    // Nettoyer les choix de sorts anciens (>1 heure)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [pokemonId, choices] of this.pendingMoveChoices.entries()) {
      // TODO: ajouter timestamp aux choix pour nettoyer les anciens
      if (choices.length === 0) {
        this.pendingMoveChoices.delete(pokemonId);
      }
    }
    
    this.debugLog(`🧹 Service nettoyé - Choix en attente: ${this.pendingMoveChoices.size}`);
  }
  
  // ===== MÉTHODES D'ACCÈS AUX DONNÉES (À IMPLÉMENTER) =====
  
  /**
   * Récupère un Pokémon possédé par son ID
   * TODO: Intégrer avec votre modèle OwnedPokemon
   */
  private async getOwnedPokemon(pokemonId: string): Promise<IOwnedPokemon | null> {
    // TODO: Remplacer par la vraie requête
    // return await OwnedPokemon.findById(pokemonId);
    
    // Simulation pour l'instant
    return null;
  }
  
  /**
   * Sauvegarde un Pokémon possédé
   * TODO: Intégrer avec votre modèle OwnedPokemon
   */
  private async saveOwnedPokemon(ownedPokemon: IOwnedPokemon): Promise<void> {
    // TODO: Remplacer par la vraie sauvegarde
    // await ownedPokemon.save();
    this.debugLog(`💾 Sauvegarde simulée du Pokémon ${ownedPokemon.pokemonId}`);
  }
  
  /**
   * Récupère les données d'un Pokémon avec cache
   */
  private async getPokemonData(pokemonId: number): Promise<any> { // Simplifié pour éviter les conflits de types
    if (this.pokemonDataCache.has(pokemonId)) {
      return this.pokemonDataCache.get(pokemonId)!;
    }
    
    const data = await getPokemonById(pokemonId);
    if (data) {
      this.pokemonDataCache.set(pokemonId, data as any);
    }
    
    return data;
  }
  
  // ===== API PUBLIQUE POUR INTEGRATION AVEC EVOLUTIONSERVICE =====
  
  /**
   * Vérifie si un Pokémon peut évoluer par niveau (appelé depuis EvolutionService)
   */
  async checkLevelEvolutionRequirements(ownedPokemonId: string): Promise<{
    canEvolve: boolean;
    evolutionData?: any;
    missingRequirements?: string[];
  }> {
    try {
      const ownedPokemon = await this.getOwnedPokemon(ownedPokemonId);
      if (!ownedPokemon) {
        return { canEvolve: false };
      }
      
      const pokemonData = await this.getPokemonData(ownedPokemon.pokemonId);
      if (!pokemonData?.evolution?.canEvolve) {
        return { canEvolve: false };
      }
      
      const evolution = pokemonData.evolution;
      const requirements: string[] = [];
      
      // Vérifier uniquement les évolutions par niveau
      if (evolution.method === 'level') {
        if (typeof evolution.requirement === 'number' && ownedPokemon.level < evolution.requirement) {
          requirements.push(`Niveau ${evolution.requirement} requis (actuellement ${ownedPokemon.level})`);
        }
      } else {
        return { canEvolve: false }; // Pas une évolution par niveau
      }
      
      return {
        canEvolve: requirements.length === 0,
        evolutionData: evolution,
        missingRequirements: requirements.length > 0 ? requirements : undefined
      };
      
    } catch (error) {
      console.error('❌ Erreur checkLevelEvolutionRequirements:', error);
      return { canEvolve: false };
    }
  }
  
  /**
   * Donne de l'XP et tente une évolution si conditions remplies
   */
  async giveExperienceWithEvolutionCheck(
    pokemonId: string,
    amount: number,
    source: 'battle' | 'candy' | 'special' = 'battle',
    location: string = 'Unknown'
  ): Promise<{
    success: boolean;
    leveledUp: boolean;
    evolved: boolean;
    newLevel?: number;
    evolutionData?: any;
    notifications: string[];
  }> {
    try {
      // 1. Donner l'expérience
      const expResult = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: source === 'battle' ? 'wild_battle' : source === 'candy' ? 'rare_candy' : 'special_event',
        amount,
        location
      });
      
      if (!expResult.success) {
        return {
          success: false,
          leveledUp: false,
          evolved: false,
          notifications: [expResult.error || 'Erreur lors du gain d\'expérience']
        };
      }
      
      // 2. Tenter l'évolution si montée de niveau et auto-évolution désactivée
      let evolved = false;
      let evolutionData: any = undefined;
      const notifications = [...expResult.notifications];
      
      if (expResult.leveledUp && !this.config.autoEvolution) {
        // Vérifier manuellement l'évolution
        const evolutionCheck = await this.checkLevelEvolutionRequirements(pokemonId);
        if (evolutionCheck.canEvolve) {
          const evolutionSuccess = await evolutionService.evolve(pokemonId, location);
          if (evolutionSuccess) {
            evolved = true;
            evolutionData = evolutionCheck.evolutionData;
            notifications.push('🌟 Évolution déclenchée !');
          }
        }
      }
      
      return {
        success: true,
        leveledUp: expResult.leveledUp,
        evolved: evolved || (expResult.hasEvolved || false),
        newLevel: expResult.pokemon.afterLevel,
        evolutionData: evolutionData || expResult.evolutionData,
        notifications
      };
      
    } catch (error) {
      console.error('❌ Erreur giveExperienceWithEvolutionCheck:', error);
      return {
        success: false,
        leveledUp: false,
        evolved: false,
        notifications: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
    }
  }
  
  /**
   * Écoute les événements d'évolution du service d'évolution
   */
  private setupEvolutionServiceIntegration(): void {
    // Écouter les évolutions réussies
    evolutionService.on('pokemonEvolved', (data: any) => {
      this.debugLog(`🔄 Évolution détectée par EvolutionService: ${data.fromPokemonId} → ${data.toPokemonId}`);
      
      // Mettre à jour nos stats
      this.stats.totalEvolutions++;
      
      // Réémettre l'événement avec notre contexte
      this.emit('evolutionCompleted', {
        source: 'evolution_service',
        ownedPokemonId: data.ownedPokemonId,
        fromPokemonId: data.fromPokemonId,
        toPokemonId: data.toPokemonId,
        result: data.result
      });
    });
    
    this.debugLog('🔗 Intégration avec EvolutionService configurée');
  }
  
  updateConfig(newConfig: Partial<ExperienceServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugLog('⚙️ Configuration mise à jour');
  }
  
  getConfig(): ExperienceServiceConfig {
    return { ...this.config };
  }
  
  getStats(): typeof this.stats {
    return { ...this.stats };
  }
  
  setAutoEvolution(enabled: boolean): void {
    this.config.autoEvolution = enabled;
    console.log(`${enabled ? '✅' : '❌'} [ExperienceService] Auto-évolution ${enabled ? 'activée' : 'désactivée'}`);
  }
  
  setAutoMoveLearn(enabled: boolean): void {
    this.config.autoMoveLearn = enabled;
    console.log(`${enabled ? '✅' : '❌'} [ExperienceService] Auto-apprentissage ${enabled ? 'activé' : 'désactivé'}`);
  }
  
  clearPendingChoices(pokemonId?: string): void {
    if (pokemonId) {
      this.pendingMoveChoices.delete(pokemonId);
    } else {
      this.pendingMoveChoices.clear();
    }
    console.log(`🧹 [ExperienceService] Choix en attente nettoyés${pokemonId ? ` pour ${pokemonId}` : ''}`);
  }
}

// ===== EXPORT SINGLETON =====
export const experienceService = ExperienceService.getInstance();
export default experienceService;

// ===== 🎯 EXPORTS DIRECTS POUR API SIMPLE =====

/**
 * Donne de l'XP pour un combat sauvage
 * @param playerPokemon - Pokémon du joueur (ID ou objet)
 * @param pokemonAdvanced - Pokémon vaincu { pokemonId, level } ou juste pokemonId
 * @param level - Niveau du Pokémon vaincu (si pokemonAdvanced est un nombre)
 */
export const givePlayerWildXP = (
  playerPokemon: string | IOwnedPokemon,
  pokemonAdvanced: { pokemonId: number; level: number } | number,
  level?: number
): Promise<boolean> => experienceService.givePlayerWildXP(playerPokemon, pokemonAdvanced, level);

/**
 * Donne une quantité fixe d'XP
 * @param playerPokemon - Pokémon du joueur
 * @param amount - Quantité d'XP à donner
 */
export const givePlayerXP = (
  playerPokemon: string | IOwnedPokemon,
  amount: number
): Promise<boolean> => experienceService.givePlayerXP(playerPokemon, amount);

/**
 * Donne de l'XP pour un combat de dresseur
 * @param playerPokemon - Pokémon du joueur
 * @param trainerPokemon - Pokémon du dresseur vaincu
 * @param trainerLevel - Niveau du dresseur
 */
export const givePlayerTrainerXP = (
  playerPokemon: string | IOwnedPokemon,
  trainerPokemon: { pokemonId: number; level: number } | number,
  trainerLevel?: number
): Promise<boolean> => experienceService.givePlayerTrainerXP(playerPokemon, trainerPokemon, trainerLevel);

/**
 * Utilise un Rare Candy
 * @param playerPokemon - Pokémon du joueur
 */
export const useRareCandy = (
  playerPokemon: string | IOwnedPokemon
): Promise<boolean> => experienceService.useRareCandy(playerPokemon);

/**
 * Donne de l'XP à une équipe de Pokémon
 * @param playerPokemonIds - Liste des IDs des Pokémon
 * @param defeatedPokemon - Pokémon vaincu
 * @param isWildBattle - Si c'est un combat sauvage
 */
export const giveTeamWildXP = (
  playerPokemonIds: string[],
  defeatedPokemon: { pokemonId: number; level: number },
  isWildBattle?: boolean
): Promise<{ success: boolean; results: boolean[] }> => 
  experienceService.giveTeamWildXP(playerPokemonIds, defeatedPokemon, isWildBattle);

/**
 * Donne de l'XP avec Œuf Chance (+100% XP)
 * @param playerPokemon - Pokémon avec Œuf Chance
 * @param defeatedPokemon - Pokémon vaincu
 */
export const giveXPWithLuckyEgg = (
  playerPokemon: string | IOwnedPokemon,
  defeatedPokemon: { pokemonId: number; level: number }
): Promise<boolean> => experienceService.giveXPWithLuckyEgg(playerPokemon, defeatedPokemon);

/**
 * Donne de l'XP avec bonus Pokémon échangé
 * @param tradedPokemon - Pokémon échangé
 * @param defeatedPokemon - Pokémon vaincu
 * @param isInternational - Si échange international (+70% au lieu de +50%)
 */
export const giveTradedPokemonXP = (
  tradedPokemon: string | IOwnedPokemon,
  defeatedPokemon: { pokemonId: number; level: number },
  isInternational?: boolean
): Promise<boolean> => experienceService.giveTradedPokemonXP(tradedPokemon, defeatedPokemon, isInternational);

/**
 * Tente d'évoluer un Pokémon
 * @param playerPokemon - Pokémon à faire évoluer
 * @param location - Lieu de l'évolution
 */
export const evolvePokemon = (
  playerPokemon: string | IOwnedPokemon,
  location?: string
): Promise<boolean> => experienceService.evolvePokemon(playerPokemon, location);

/**
 * Évolue avec une pierre d'évolution
 * @param playerPokemon - Pokémon à faire évoluer
 * @param stone - Type de pierre
 * @param location - Lieu de l'évolution
 */
export const evolveWithStone = (
  playerPokemon: string | IOwnedPokemon,
  stone: string,
  location?: string
): Promise<boolean> => experienceService.evolveWithStone(playerPokemon, stone, location);

/**
 * Vérifie si un Pokémon peut évoluer
 * @param playerPokemon - Pokémon à vérifier
 */
export const canEvolve = (
  playerPokemon: string | IOwnedPokemon
): Promise<{ canEvolve: boolean; method?: string; requirement?: any; missingRequirements?: string[] }> => 
  experienceService.canEvolve(playerPokemon);

/**
 * Apprend un sort à un Pokémon
 * @param playerPokemon - Pokémon qui apprend
 * @param newMove - ID du nouveau sort
 * @param forgetMove - ID du sort à oublier
 */
export const learnMove = (
  playerPokemon: string | IOwnedPokemon,
  newMove: string,
  forgetMove?: string
): Promise<boolean> => experienceService.learnMove(playerPokemon, newMove, forgetMove);

/**
 * Récupère le statut complet d'un Pokémon
 * @param playerPokemon - Pokémon à analyser
 */
export const getPokemonStatus = (
  playerPokemon: string | IOwnedPokemon
): Promise<{
  level: number;
  experience: number;
  expToNext: number;
  canLevelUp: boolean;
  canEvolve: boolean;
  pendingMoves: number;
  evolutionMethod?: string;
}> => experienceService.getPokemonStatus(playerPokemon);

/**
 * Force un Pokémon à un niveau (admin/test)
 * @param playerPokemon - Pokémon à modifier
 * @param targetLevel - Niveau cible
 */
export const setLevel = (
  playerPokemon: string | IOwnedPokemon,
  targetLevel: number
): Promise<boolean> => experienceService.setLevel(playerPokemon, targetLevel);

// ===== GUIDE D'UTILISATION ULTRA-SIMPLE =====
//
// // Donner XP de combat sauvage
// import { givePlayerWildXP } from './services/ExperienceService';
// await givePlayerWildXP(pokemonId, { pokemonId: 25, level: 15 });
// await givePlayerWildXP(pokemonId, 25, 15); // Version courte
//
// // Donner XP fixe
// import { givePlayerXP } from './services/ExperienceService';
// await givePlayerXP(pokemonId, 1000);
//
// // Rare Candy
// import { useRareCandy } from './services/ExperienceService';
// await useRareCandy(pokemonId);
//
// // XP équipe
// import { giveTeamWildXP } from './services/ExperienceService';
// await giveTeamWildXP([id1, id2, id3], { pokemonId: 150, level: 50 });
//
// // XP avec bonus
// import { giveXPWithLuckyEgg } from './services/ExperienceService';
// await giveXPWithLuckyEgg(pokemonId, { pokemonId: 144, level: 60 });
//
// // Évolution
// import { evolvePokemon, evolveWithStone } from './services/ExperienceService';
// await evolvePokemon(pokemonId);
// await evolveWithStone(pokemonId, "fire_stone");
//
// // Apprentissage
// import { learnMove } from './services/ExperienceService';
// await learnMove(pokemonId, "flamethrower", "ember");
//
// // Status
// import { getPokemonStatus } from './services/ExperienceService';
// const status = await getPokemonStatus(pokemonId);
// console.log(`Niveau ${status.level}, ${status.expToNext} XP restante`);
//
