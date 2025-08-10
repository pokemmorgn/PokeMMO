// server/src/services/ExperienceService.ts
import { EventEmitter } from 'events';
import { IOwnedPokemon } from '../models/OwnedPokemon';
import { getPokemonById } from '../data/PokemonData';
import { evolutionService } from './EvolutionService';

// ===== TYPES =====

interface IPokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface ExperienceGainContext {
  gainedBy: string;
  source:
    | 'wild_battle'
    | 'trainer_battle'
    | 'evolution'
    | 'rare_candy'
    | 'day_care'
    | 'trade'
    | 'special_event';
  amount?: number;
  defeatedPokemon?: {
    pokemonId: number;
    level: number;
    baseExperience: number;
    isWild: boolean;
    isTrainerOwned: boolean;
    trainerLevel?: number;
  };
  modifiers?: {
    isTraded?: boolean;
    hasLuckyEgg?: boolean;
    isInternational?: boolean;
    affectionLevel?: number;
    expShare?: boolean;
    isParticipant?: boolean;
    modernExpShare?: boolean;
  };
  location?: string;
  battleType?: 'single' | 'double' | 'triple' | 'rotation' | 'horde';
  participants?: string[];
  isCriticalHit?: boolean;
  isTypeAdvantage?: boolean;
}

export interface ExperienceResult {
  success: boolean;
  error?: string;
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
  leveledUp: boolean;
  levelsGained: number;
  hasEvolved?: boolean;
  evolutionData?: {
    fromPokemonId: number;
    toPokemonId: number;
    evolutionMethod: string;
  };
  newMoves: Array<{
    moveId: string;
    moveName: string;
    learnedAtLevel: number;
    replacedMove?: string;
    wasLearned: boolean;
  }>;
  statGains?: Record<string, number>;
  notifications: string[];
  achievements: string[];
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
  forgetMove?: string;
  autoLearn?: boolean;
}

export interface ExperienceServiceConfig {
  enabled: boolean;
  debugMode: boolean;
  autoEvolution: boolean;
  autoMoveLearn: boolean;
  modernExpFormula: boolean;
  expShareMode: 'classic' | 'modern';
  maxLevel: number;
  enableNotifications: boolean;
  enableAchievements: boolean;
  batchProcessing: boolean;
}

// ===== SERVICE =====

export class ExperienceService extends EventEmitter {
  private static instance: ExperienceService;

  private config: ExperienceServiceConfig = {
    enabled: true,
    debugMode: false,
    autoEvolution: true,
    autoMoveLearn: false,
    modernExpFormula: true,
    expShareMode: 'modern',
    maxLevel: 100,
    enableNotifications: true,
    enableAchievements: true,
    batchProcessing: true,
  };

  private stats = {
    totalExpGained: 0,
    totalLevelsGained: 0,
    totalEvolutions: 0,
    totalMovesLearned: 0,
    operationsCount: 0,
    averageProcessingTime: 0,
  };

  private pokemonDataCache = new Map<number, any>();
  private pendingMoveChoices = new Map<string, MoveLearnChoice[]>();
  private ongoingOperations = new Set<string>();

  constructor() {
    super();
    this.initializeService();
    console.log("📈 [ExperienceService] Service d'expérience initialisé");
  }

  static getInstance(): ExperienceService {
    if (!ExperienceService.instance) {
      ExperienceService.instance = new ExperienceService();
    }
    return ExperienceService.instance;
  }

  private initializeService(): void {
    setInterval(() => this.cleanupService(), 10 * 60 * 1000);
    this.on('error', (error) => {
      console.error('❌ [ExperienceService] Erreur service:', error);
    });
    this.setupEvolutionServiceIntegration();
    this.debugLog("Service d'expérience initialisé avec succès");
  }

  // ===== CONFIG & STATS =====

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
    console.log(
      `${enabled ? '✅' : '❌'} [ExperienceService] Auto-évolution ${
        enabled ? 'activée' : 'désactivée'
      }`
    );
  }

  setAutoMoveLearn(enabled: boolean): void {
    this.config.autoMoveLearn = enabled;
    console.log(
      `${enabled ? '✅' : '❌'} [ExperienceService] Auto-apprentissage ${
        enabled ? 'activé' : 'désactivé'
      }`
    );
  }

  clearPendingChoices(pokemonId?: string): void {
    if (pokemonId) this.pendingMoveChoices.delete(pokemonId);
    else this.pendingMoveChoices.clear();
    console.log(
      `🧹 [ExperienceService] Choix en attente nettoyés${
        pokemonId ? ` pour ${pokemonId}` : ''
      }`
    );
  }
}

// ===== EXPORT SINGLETON =====
export const experienceService = ExperienceService.getInstance();
export default experienceService;

// ===== 🎯 EXPORTS DIRECTS API SIMPLE =====

export const givePlayerWildXP = (
  playerPokemon: string | IOwnedPokemon,
  pokemonAdvanced: { pokemonId: number; level: number } | number,
  level?: number
): Promise<boolean> =>
  experienceService.givePlayerWildXP(playerPokemon, pokemonAdvanced, level);

export const givePlayerXP = (
  playerPokemon: string | IOwnedPokemon,
  amount: number
): Promise<boolean> => experienceService.givePlayerXP(playerPokemon, amount);

export const givePlayerTrainerXP = (
  playerPokemon: string | IOwnedPokemon,
  trainerPokemon: { pokemonId: number; level: number } | number,
  trainerLevel?: number
): Promise<boolean> =>
  experienceService.givePlayerTrainerXP(playerPokemon, trainerPokemon, trainerLevel);

export const useRareCandy = (
  playerPokemon: string | IOwnedPokemon
): Promise<boolean> => experienceService.useRareCandy(playerPokemon);

export const giveTeamWildXP = (
  playerPokemonIds: string[],
  defeatedPokemon: { pokemonId: number; level: number },
  isWildBattle?: boolean
): Promise<{ success: boolean; results: boolean[] }> =>
  experienceService.giveTeamWildXP(playerPokemonIds, defeatedPokemon, isWildBattle);

export const giveXPWithLuckyEgg = (
  playerPokemon: string | IOwnedPokemon,
  defeatedPokemon: { pokemonId: number; level: number }
): Promise<boolean> =>
  experienceService.giveXPWithLuckyEgg(playerPokemon, defeatedPokemon);

export const giveTradedPokemonXP = (
  tradedPokemon: string | IOwnedPokemon,
  defeatedPokemon: { pokemonId: number; level: number },
  isInternational?: boolean
): Promise<boolean> =>
  experienceService.giveTradedPokemonXP(tradedPokemon, defeatedPokemon, isInternational);

export const evolvePokemon = (
  playerPokemon: string | IOwnedPokemon,
  location?: string
): Promise<boolean> => experienceService.evolvePokemon(playerPokemon, location);

export const evolveWithStone = (
  playerPokemon: string | IOwnedPokemon,
  stone: string,
  location?: string
): Promise<boolean> => experienceService.evolveWithStone(playerPokemon, stone, location);

export const canEvolve = (
  playerPokemon: string | IOwnedPokemon
): Promise<{
  canEvolve: boolean;
  method?: string;
  requirement?: any;
  missingRequirements?: string[];
}> => experienceService.canEvolve(playerPokemon);

export const learnMove = (
  playerPokemon: string | IOwnedPokemon,
  newMove: string,
  forgetMove?: string
): Promise<boolean> => experienceService.learnMove(playerPokemon, newMove, forgetMove);

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
  missingRequirements?: string[];
}> => experienceService.getPokemonStatus(playerPokemon);

export const setLevel = (
  playerPokemon: string | IOwnedPokemon,
  targetLevel: number
): Promise<boolean> => experienceService.setLevel(playerPokemon, targetLevel);== 🎯 API PUBLIQUE ULTRA-SIMPLE =====

  async givePlayerWildXP(
    playerPokemon: string | IOwnedPokemon,
    pokemonAdvanced: { pokemonId: number; level: number } | number,
    level?: number
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      let defeatedPokemon: { pokemonId: number; level: number };
      if (typeof pokemonAdvanced === 'number') {
        defeatedPokemon = { pokemonId: pokemonAdvanced, level: level || 1 };
      } else {
        defeatedPokemon = pokemonAdvanced;
      }

      this.debugLog(
        `🎯 givePlayerWildXP: ${pokemonId} vs #${defeatedPokemon.pokemonId} niveau ${defeatedPokemon.level}`
      );

      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false,
        },
        modifiers: {
          isParticipant: true,
          expShare: false,
        },
        location: 'Wild Battle',
      });

      return result.success;
    } catch (error) {
      console.error(`❌ [ExperienceService] givePlayerWildXP failed:`, error);
      return false;
    }
  }

  async givePlayerXP(
    playerPokemon: string | IOwnedPokemon,
    amount: number
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(`🎯 givePlayerXP: ${pokemonId} +${amount} XP`);

      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'special_event',
        amount: Math.max(0, amount),
        location: 'Manual XP Grant',
      });

      return result.success;
    } catch (error) {
      console.error(`❌ [ExperienceService] givePlayerXP failed:`, error);
      return false;
    }
  }

  async givePlayerTrainerXP(
    playerPokemon: string | IOwnedPokemon,
    trainerPokemon: { pokemonId: number; level: number } | number,
    trainerLevel: number = 1
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      let defeatedPokemon: { pokemonId: number; level: number };
      if (typeof trainerPokemon === 'number') {
        defeatedPokemon = { pokemonId: trainerPokemon, level: trainerLevel };
      } else {
        defeatedPokemon = trainerPokemon;
      }

      this.debugLog(
        `🎯 givePlayerTrainerXP: ${pokemonId} vs Dresseur #${defeatedPokemon.pokemonId}`
      );

      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'trainer_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: false,
          isTrainerOwned: true,
          trainerLevel,
        },
        modifiers: {
          isParticipant: true,
          expShare: false,
        },
        location: 'Trainer Battle',
      });

      return result.success;
    } catch (error) {
      console.error(
        `❌ [ExperienceService] givePlayerTrainerXP failed:`,
        error
      );
      return false;
    }
  }

  async useRareCandy(
    playerPokemon: string | IOwnedPokemon
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(`🎯 useRareCandy: ${pokemonId}`);

      // TODO: remplacer par calcul exact en fonction du taux de croissance
      const expForNextLevel = 1000;

      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'rare_candy',
        amount: expForNextLevel,
        location: 'Rare Candy Usage',
      });

      return result.success;
    } catch (error) {
      console.error(`❌ [ExperienceService] useRareCandy failed:`, error);
      return false;
    }
  }

  async giveTeamWildXP(
    playerPokemonIds: string[],
    defeatedPokemon: { pokemonId: number; level: number },
    isWildBattle: boolean = true
  ): Promise<{ success: boolean; results: boolean[] }> {
    try {
      this.debugLog(
        `🎯 giveTeamWildXP: ${playerPokemonIds.length} Pokémon vs #${defeatedPokemon.pokemonId}`
      );

      const results = await Promise.all(
        playerPokemonIds.map((pokemonId) =>
          isWildBattle
            ? this.givePlayerWildXP(pokemonId, defeatedPokemon)
            : this.givePlayerTrainerXP(pokemonId, defeatedPokemon)
        )
      );

      const success = results.every((r) => r);

      this.debugLog(
        `✅ giveTeamWildXP: ${results.filter((r) => r).length}/${
          results.length
        } succès`
      );

      return { success, results };
    } catch (error) {
      console.error(`❌ [ExperienceService] giveTeamWildXP failed:`, error);
      return { success: false, results: [] };
    }
  }

  async giveXPWithExpShare(
    activePokemon: string,
    teamPokemonIds: string[],
    defeatedPokemon: { pokemonId: number; level: number }
  ): Promise<{ success: boolean; activeResult: boolean; teamResults: boolean[] }> {
    try {
      this.debugLog(
        `🎯 giveXPWithExpShare: Actif ${activePokemon} + ${teamPokemonIds.length} équipiers`
      );

      const activeResult = await this.processExperienceGain({
        gainedBy: activePokemon,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false,
        },
        modifiers: {
          isParticipant: true,
          expShare: true,
          modernExpShare: true,
        },
        location: 'Wild Battle (Active)',
      });

      const teamResults = await Promise.all(
        teamPokemonIds.map((pokemonId) =>
          this.processExperienceGain({
            gainedBy: pokemonId,
            source: 'wild_battle',
            defeatedPokemon: {
              pokemonId: defeatedPokemon.pokemonId,
              level: defeatedPokemon.level,
              baseExperience: 0,
              isWild: true,
              isTrainerOwned: false,
            },
            modifiers: {
              isParticipant: false,
              expShare: true,
              modernExpShare: true,
            },
            location: 'Wild Battle (Exp Share)',
          })
        )
      );

      const teamSuccess = teamResults.map((r) => r.success);
      const success = activeResult.success && teamSuccess.every((s) => s);

      this.debugLog(
        `✅ giveXPWithExpShare: Actif=${activeResult.success}, Équipe=${
          teamSuccess.filter((s) => s).length
        }/${teamSuccess.length}`
      );

      return { success, activeResult: activeResult.success, teamResults: teamSuccess };
    } catch (error) {
      console.error(`❌ [ExperienceService] giveXPWithExpShare failed:`, error);
      return { success: false, activeResult: false, teamResults: [] };
    }
  }

  async giveXPWithLuckyEgg(
    playerPokemon: string | IOwnedPokemon,
    defeatedPokemon: { pokemonId: number; level: number }
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(`🎯 giveXPWithLuckyEgg: ${pokemonId} avec Œuf Chance`);

      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false,
        },
        modifiers: {
          isParticipant: true,
          hasLuckyEgg: true,
          expShare: false,
        },
        location: 'Wild Battle (Lucky Egg)',
      });

      return result.success;
    } catch (error) {
      console.error(`❌ [ExperienceService] giveXPWithLuckyEgg failed:`, error);
      return false;
    }
  }

  async giveTradedPokemonXP(
    tradedPokemon: string | IOwnedPokemon,
    defeatedPokemon: { pokemonId: number; level: number },
    isInternational: boolean = false
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof tradedPokemon === 'string'
          ? tradedPokemon
          : tradedPokemon._id?.toString() || '';

      this.debugLog(
        `🎯 giveTradedPokemonXP: ${pokemonId} échangé ${
          isInternational ? '(international)' : ''
        }`
      );

      const result = await this.processExperienceGain({
        gainedBy: pokemonId,
        source: 'wild_battle',
        defeatedPokemon: {
          pokemonId: defeatedPokemon.pokemonId,
          level: defeatedPokemon.level,
          baseExperience: 0,
          isWild: true,
          isTrainerOwned: false,
        },
        modifiers: {
          isParticipant: true,
          isTraded: true,
          isInternational,
          expShare: false,
        },
        location: 'Wild Battle (Traded)',
      });

      return result.success;
    } catch (error) {
      console.error(
        `❌ [ExperienceService] giveTradedPokemonXP failed:`,
        error
      );
      return false;
    }
  }

  async canLevelUp(
    playerPokemon: string | IOwnedPokemon
  ): Promise<{
    canLevel: boolean;
    currentLevel: number;
    currentExp: number;
    expNeeded: number;
    expForNextLevel: number;
  }> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);

      if (!ownedPokemon) {
        return {
          canLevel: false,
          currentLevel: 0,
          currentExp: 0,
          expNeeded: 0,
          expForNextLevel: 0,
        };
      }

      const expForNextLevel = this.calculateExpForLevel(
        ownedPokemon.level + 1,
        ownedPokemon
      );
      const expNeeded = expForNextLevel - ownedPokemon.experience;

      return {
        canLevel:
          ownedPokemon.level < this.config.maxLevel && expNeeded > 0,
        currentLevel: ownedPokemon.level,
        currentExp: ownedPokemon.experience,
        expNeeded: Math.max(0, expNeeded),
        expForNextLevel,
      };
    } catch (error) {
      console.error(`❌ [ExperienceService] canLevelUp failed:`, error);
      return {
        canLevel: false,
        currentLevel: 0,
        currentExp: 0,
        expNeeded: 0,
        expForNextLevel: 0,
      };
    }
  }

  async setLevel(
    playerPokemon: string | IOwnedPokemon,
    targetLevel: number
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';
      const level = Math.max(1, Math.min(this.config.maxLevel, targetLevel));

      this.debugLog(`🎯 setLevel: ${pokemonId} → niveau ${level}`);

      const ownedPokemon = await this.getOwnedPokemon(pokemonId);
      if (!ownedPokemon) return false;

      const expNeeded = this.calculateExpForLevel(level, ownedPokemon);
      const currentExp = ownedPokemon.experience;

      if (expNeeded > currentExp) {
        const expToGive = expNeeded - currentExp;
        return await this.givePlayerXP(pokemonId, expToGive);
      } else {
        return true;
      }
    } catch (error) {
      console.error(`❌ [ExperienceService] setLevel failed:`, error);
      return false;
    }
  }

  // ===== 🌟 API ÉVOLUTION INTÉGRÉE (dans la classe) =====

  async evolvePokemon(
    playerPokemon: string | IOwnedPokemon,
    location: string = 'Evolution'
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(`🎯 evolvePokemon: ${pokemonId}`);

      return await evolutionService.evolve(pokemonId, location);
    } catch (error) {
      console.error(`❌ [ExperienceService] evolvePokemon failed:`, error);
      return false;
    }
  }

  async evolveWithStone(
    playerPokemon: string | IOwnedPokemon,
    stone: string,
    location: string = 'Evolution'
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(`🎯 evolveWithStone: ${pokemonId} avec ${stone}`);

      return await evolutionService.evolveWithItem(pokemonId, stone, location);
    } catch (error) {
      console.error(
        `❌ [ExperienceService] evolveWithStone failed:`,
        error
      );
      return false;
    }
  }

  async canEvolve(
    playerPokemon: string | IOwnedPokemon
  ): Promise<{
    canEvolve: boolean;
    method?: string;
    requirement?: any;
    missingRequirements?: string[];
  }> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      const result = await evolutionService.canEvolve(pokemonId);

      return {
        canEvolve: result.canEvolve,
        method: result.evolutionData?.method,
        requirement: result.evolutionData?.requirement,
        missingRequirements: result.missingRequirements,
      };
    } catch (error) {
      console.error(`❌ [ExperienceService] canEvolve failed:`, error);
      return { canEvolve: false };
    }
  }

  // ===== 📚 API APPRENTISSAGE DE SORTS =====

  getPendingMoves(
    playerPokemon: string | IOwnedPokemon
  ): Array<{ moveId: string; moveName: string; level: number }> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      return this.getPendingMoveChoices(pokemonId);
    } catch (error) {
      console.error(`❌ [ExperienceService] getPendingMoves failed:`, error);
      return [];
    }
  }

  async learnMove(
    playerPokemon: string | IOwnedPokemon,
    newMove: string,
    forgetMove?: string
  ): Promise<boolean> {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(
        `🎯 learnMove: ${pokemonId} apprend ${newMove}${
          forgetMove ? ` (oublie ${forgetMove})` : ''
        }`
      );

      const result = await this.processMoveChoice(
        pokemonId,
        newMove,
        forgetMove
      );
      return result.success;
    } catch (error) {
      console.error(`❌ [ExperienceService] learnMove failed:`, error);
      return false;
    }
  }

  rejectMove(playerPokemon: string | IOwnedPokemon, moveId: string): void {
    try {
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      this.debugLog(`🎯 rejectMove: ${pokemonId} rejette ${moveId}`);
      this.rejectMoveChoice(pokemonId, moveId);
    } catch (error) {
      console.error(`❌ [ExperienceService] rejectMove failed:`, error);
    }
  }

  // ===== 📊 STATUS & TOOLS =====

  async getPokemonStatus(
    playerPokemon: string | IOwnedPokemon
  ): Promise<{
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
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';

      const [levelInfo, evolutionInfo, pendingMoves] = await Promise.all([
        this.canLevelUp(pokemonId),
        this.canEvolve(pokemonId),
        Promise.resolve(this.getPendingMoves(pokemonId)),
      ]);

      return {
        level: levelInfo.currentLevel,
        experience: levelInfo.currentExp,
        expToNext: levelInfo.expNeeded,
        canLevelUp: levelInfo.canLevel,
        canEvolve: evolutionInfo.canEvolve,
        pendingMoves: pendingMoves.length,
        evolutionMethod: evolutionInfo.method,
        missingRequirements: evolutionInfo.missingRequirements,
      };
    } catch (error) {
      console.error(`❌ [ExperienceService] getPokemonStatus failed:`, error);
      return {
        level: 0,
        experience: 0,
        expToNext: 0,
        canLevelUp: false,
        canEvolve: false,
        pendingMoves: 0,
      };
    }
  }

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
      const pokemonId =
        typeof playerPokemon === 'string'
          ? playerPokemon
          : playerPokemon._id?.toString() || '';
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);

      if (!ownedPokemon) {
        return {
          willLevelUp: false,
          newLevel: 0,
          levelsGained: 0,
          willEvolve: false,
          newMovesCount: 0,
        };
      }

      const currentLevel = ownedPokemon.level;
      const newExp = ownedPokemon.experience + amount;
      let newLevel = currentLevel;

      while (newLevel < this.config.maxLevel) {
        const expForNextLevel = this.calculateExpForLevel(
          newLevel + 1,
          ownedPokemon
        );
        if (newExp < expForNextLevel) break;
        newLevel++;
      }

      const levelsGained = newLevel - currentLevel;
      const willLevelUp = levelsGained > 0;

      let willEvolve = false;
      if (willLevelUp) {
        const evolutionInfo = await this.canEvolve(pokemonId);
        willEvolve = evolutionInfo.canEvolve;
      }

      let newMovesCount = 0;
      if (willLevelUp) {
        newMovesCount = levelsGained; // approx
      }

      return {
        willLevelUp,
        newLevel,
        levelsGained,
        willEvolve,
        newMovesCount,
      };
    } catch (error) {
      console.error(`❌ [ExperienceService] simulateXPGain failed:`, error);
      return {
        willLevelUp: false,
        newLevel: 0,
        levelsGained: 0,
        willEvolve: false,
        newMovesCount: 0,
      };
    }
  }

  // ===== COEUR DU TRAITEMENT =====

  async processExperienceGain(context: ExperienceGainContext): Promise<ExperienceResult> {
    const startTime = Date.now();

    this.debugLog(`📈 Début traitement XP: ${context.gainedBy} (${context.source})`);

    try {
      if (!this.config.enabled) return this.createFailureResult('Service désactivé');

      if (this.ongoingOperations.has(context.gainedBy)) {
        return this.createFailureResult('Opération en cours pour ce Pokémon');
      }

      this.ongoingOperations.add(context.gainedBy);
      this.stats.operationsCount++;

      try {
        const ownedPokemon = await this.getOwnedPokemon(context.gainedBy);
        if (!ownedPokemon) throw new Error('Pokémon introuvable');

        if (ownedPokemon.level >= this.config.maxLevel) {
          return this.createSuccessResult({
            pokemon: this.createPokemonSummary(ownedPokemon as any, ownedPokemon as any, 0),
            leveledUp: false,
            levelsGained: 0,
            newMoves: [],
            notifications: ['Ce Pokémon est déjà au niveau maximum !'],
          });
        }

        const beforePokemon = JSON.parse(JSON.stringify(ownedPokemon));

        const expToGain = await this.calculateExperienceGain(context, ownedPokemon);
        if (expToGain <= 0) {
          return this.createSuccessResult({
            pokemon: this.createPokemonSummary(beforePokemon, ownedPokemon, 0),
            leveledUp: false,
            levelsGained: 0,
            newMoves: [],
            notifications: ['Aucune expérience gagnée'],
          });
        }

        this.debugLog(
          `💎 XP calculée: ${expToGain} pour ${ownedPokemon.nickname || 'Pokemon'}`
        );

        const levelUpResult = await this.applyExperienceAndLevelUp(
          ownedPokemon,
          expToGain
        );

        let evolutionData: any = undefined;
        let hasEvolved = false;

        if (this.config.autoEvolution && levelUpResult.leveledUp) {
          const evolutionResult = await this.checkAndProcessEvolution(ownedPokemon);
          if (evolutionResult.evolved) {
            hasEvolved = true;
            evolutionData = evolutionResult.evolutionData;
            levelUpResult.notifications.push(
              `🌟 ${ownedPokemon.nickname || 'Votre Pokémon'} a évolué !`
            );
          }
        }

        await this.saveOwnedPokemon(ownedPokemon);

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
            operationsCount: 1,
          },
        };

        this.emitEvents(context, result);
        this.updateStats(expToGain, levelUpResult.levelsGained, hasEvolved, levelUpResult.newMoves.length);

        this.debugLog(
          `✅ XP traitée: +${expToGain} XP, ${levelUpResult.levelsGained} niveaux, ${levelUpResult.newMoves.length} sorts`
        );

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

  private async calculateExperienceGain(
    context: ExperienceGainContext,
    ownedPokemon: IOwnedPokemon
  ): Promise<number> {
    if (context.amount !== undefined) return Math.max(0, context.amount);

    if (context.source === 'wild_battle' || context.source === 'trainer_battle') {
      return await this.calculateBattleExperience(context, ownedPokemon);
    }

    if (context.source === 'evolution') {
      return Math.floor(ownedPokemon.level * 5);
    }

    return 0;
  }

  private async calculateBattleExperience(
    context: ExperienceGainContext,
    ownedPokemon: IOwnedPokemon
  ): Promise<number> {
    if (!context.defeatedPokemon) return 0;

    const defeated = context.defeatedPokemon;
    const defeatedData = await this.getPokemonData(defeated.pokemonId);
    if (!defeatedData) return 0;

    let baseExp = defeated.baseExperience || defeatedData.baseExperience || 60;

    let experience: number;
    if (this.config.modernExpFormula) {
      const levelRatio =
        (defeated.level * 2 + 10) /
        (defeated.level + ownedPokemon.level + 10);
      experience = Math.floor((baseExp * defeated.level * levelRatio) / 5);
    } else {
      experience = Math.floor((baseExp * defeated.level) / 7);
    }

    const modifiers = context.modifiers || {};

    if (context.source === 'trainer_battle' || defeated.isTrainerOwned) {
      experience = Math.floor(experience * 1.5);
    }
    if (modifiers.isTraded) experience = Math.floor(experience * 1.5);
    if (modifiers.hasLuckyEgg) experience = Math.floor(experience * 2.0);
    if (modifiers.isInternational) experience = Math.floor(experience * 1.7);
    if (modifiers.affectionLevel && modifiers.affectionLevel >= 5) {
      experience = Math.floor(experience * 1.2);
    }
    if (modifiers.expShare && !modifiers.isParticipant) {
      if (this.config.expShareMode === 'classic') {
        experience = Math.floor(experience * 0.5);
      }
    }

    return Math.max(1, experience);
  }

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

    ownedPokemon.experience += expToGain;

    const notifications: string[] = [];
    const newMoves: Array<{
      moveId: string;
      moveName: string;
      learnedAtLevel: number;
      wasLearned: boolean;
    }> = [];
    let totalLevelsGained = 0;

    while (ownedPokemon.level < this.config.maxLevel) {
      const expForNextLevel = this.calculateExpForLevel(
        ownedPokemon.level + 1,
        ownedPokemon
      );
      if (ownedPokemon.experience < expForNextLevel) break;

      ownedPokemon.level++;
      totalLevelsGained++;

      this.debugLog(
        `🆙 Niveau up! ${ownedPokemon.nickname || 'Pokemon'} niveau ${ownedPokemon.level}`
      );

      await ownedPokemon.recalculateStats();
      ownedPokemon.currentHp = ownedPokemon.maxHp;

      const movesThisLevel = await this.checkNewMovesAtLevel(
        ownedPokemon,
        ownedPokemon.level
      );
      for (const moveData of movesThisLevel) {
        const learned = await this.handleMoveLearn(ownedPokemon, moveData);
        newMoves.push({
          moveId: moveData.moveId,
          moveName: moveData.moveName,
          learnedAtLevel: ownedPokemon.level,
          wasLearned: learned,
        });
      }

      notifications.push(
        `🆙 ${ownedPokemon.nickname || 'Votre Pokémon'} est maintenant niveau ${ownedPokemon.level} !`
      );
    }

    const statGains =
      totalLevelsGained > 0
        ? await this.estimateStatGains(ownedPokemon, totalLevelsGained)
        : undefined;

    return {
      leveledUp: totalLevelsGained > 0,
      levelsGained: totalLevelsGained,
      newMoves,
      statGains,
      notifications,
    };
  }

  private calculateExpForLevel(level: number, _ownedPokemon: IOwnedPokemon): number {
    const growthRate: string = 'medium_fast'; // TODO: lire depuis les data du Pokémon

    switch (growthRate) {
      case 'fast':
        return Math.floor((4 * Math.pow(level, 3)) / 5);
      case 'medium_fast':
        return Math.pow(level, 3);
      case 'medium_slow':
        return Math.floor((6 / 5) * Math.pow(level, 3) - 15 * Math.pow(level, 2) + 100 * level - 140);
      case 'slow':
        return Math.floor((5 * Math.pow(level, 3)) / 4);
      case 'erratic':
        if (level <= 50) {
          return Math.floor((Math.pow(level, 3) * (100 - level)) / 50);
        } else if (level <= 68) {
          return Math.floor((Math.pow(level, 3) * (150 - level)) / 100);
        } else if (level <= 98) {
          return Math.floor(
            (Math.pow(level, 3) * Math.floor((1911 - 10 * level) / 3)) / 500
          );
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
        return Math.pow(level, 3);
    }
  }

  // ===== APPRENTISSAGE DE SORTS (helpers) =====

  private async checkNewMovesAtLevel(
    ownedPokemon: IOwnedPokemon,
    level: number
  ): Promise<Array<{ moveId: string; moveName: string }>> {
    try {
      const pokemonData = await this.getPokemonData(ownedPokemon.pokemonId);
      if (!pokemonData) return [];

      const movesAtLevel: string[] = pokemonData.levelMoves?.[level] || [];

      if (movesAtLevel.length === 0) {
        const learnsetMoves = (pokemonData.learnset || [])
          .filter((move: any) => move.method === 'level' && move.level === level)
          .map((move: any) => move.moveId);

        return learnsetMoves.map((moveId: string) => ({
          moveId,
          moveName: moveId, // TODO: nom réel via table des moves
        }));
      }

      return movesAtLevel.map((moveId: string) => ({
        moveId,
        moveName: moveId, // TODO: nom réel
      }));
    } catch (error) {
      console.error('❌ Erreur checkNewMovesAtLevel:', error);
      return [];
    }
  }

  private async handleMoveLearn(
    ownedPokemon: IOwnedPokemon,
    moveData: { moveId: string; moveName: string }
  ): Promise<boolean> {
    if (ownedPokemon.moves.some((m) => m.moveId === moveData.moveId)) {
      this.debugLog(`🔄 Sort déjà connu: ${moveData.moveName}`);
      return false;
    }

    if (ownedPokemon.moves.length < 4) {
      await this.addMoveInternal(ownedPokemon, moveData.moveId);
      this.debugLog(`✅ Sort appris: ${moveData.moveName}`);
      return true;
    }

    if (this.config.autoMoveLearn) {
      await this.replaceMove(ownedPokemon, 0, moveData.moveId);
      this.debugLog(`🔄 Sort remplacé automatiquement: ${moveData.moveName}`);
      return true;
    } else {
      this.addPendingMoveChoice(ownedPokemon._id.toString(), {
        pokemonId: ownedPokemon._id.toString(),
        moveId: moveData.moveId,
        moveName: moveData.moveName,
        level: ownedPokemon.level,
        autoLearn: false,
      });
      this.debugLog(`⏳ Sort en attente de choix: ${moveData.moveName}`);
      return false;
    }
  }

  private async addMoveInternal(ownedPokemon: IOwnedPokemon, moveId: string): Promise<void> {
    const newMove = {
      moveId,
      currentPp: 20, // TODO: PP réel depuis data moves
      maxPp: 20,
    };
    ownedPokemon.moves.push(newMove);
  }

  private async replaceMove(
    ownedPokemon: IOwnedPokemon,
    slotIndex: number,
    newMoveId: string
  ): Promise<void> {
    if (slotIndex >= 0 && slotIndex < ownedPokemon.moves.length) {
      const newMove = {
        moveId: newMoveId,
        currentPp: 20, // TODO: PP réel
        maxPp: 20,
      };
      ownedPokemon.moves[slotIndex] = newMove;
    }
  }

  // ===== EVOLUTIONS (helpers) =====

  private async checkAndProcessEvolution(
    ownedPokemon: IOwnedPokemon
  ): Promise<{ evolved: boolean; evolutionData?: any }> {
    try {
      const pokemonData = await this.getPokemonData(ownedPokemon.pokemonId);
      if (!pokemonData?.evolution?.canEvolve) return { evolved: false };

      const evolution = pokemonData.evolution;

      const canEvolve = this.checkEvolutionConditions(ownedPokemon, evolution);
      if (!canEvolve) return { evolved: false };

      this.debugLog(
        `🌟 Évolution détectée: ${pokemonData.nameKey} → #${evolution.evolvesInto}`
      );

      try {
        const evolutionSuccess = await evolutionService.evolve(
          ownedPokemon._id?.toString() || 'unknown',
          'Level Up'
        );

        if (evolutionSuccess) {
          this.debugLog(`🎉 Évolution réussie via EvolutionService !`);
          this.emit('pokemonEvolvedFromLevelUp', {
            ownedPokemonId: ownedPokemon._id?.toString(),
            fromPokemonId: ownedPokemon.pokemonId,
            toPokemonId: evolution.evolvesInto,
            level: ownedPokemon.level,
            method: 'level',
          });

          return {
            evolved: true,
            evolutionData: {
              fromPokemonId: ownedPokemon.pokemonId,
              toPokemonId: evolution.evolvesInto,
              evolutionMethod: evolution.method,
            },
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

  private checkEvolutionConditions(ownedPokemon: IOwnedPokemon, evolution: any): boolean {
    switch (evolution.method) {
      case 'level':
        return typeof evolution.requirement === 'number' &&
          ownedPokemon.level >= evolution.requirement;
      case 'friendship':
        return (ownedPokemon.friendship || 0) >= 220;
      default:
        return false;
    }
  }

  // ===== API PUBLIQUE CHOIX DE SORTS =====

  getPendingMoveChoices(pokemonId: string): MoveLearnChoice[] {
    return this.pendingMoveChoices.get(pokemonId) || [];
  }

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

      const choiceIndex = pendingChoices.findIndex((c) => c.moveId === moveId);
      if (choiceIndex === -1) {
        return { success: false, error: 'Choix de sort introuvable' };
      }

      const choice = pendingChoices[choiceIndex];
      const ownedPokemon = await this.getOwnedPokemon(pokemonId);
      if (!ownedPokemon) {
        return { success: false, error: 'Pokémon introuvable' };
      }

      if (forgetMove) {
        const forgetIndex = ownedPokemon.moves.findIndex((m) => m.moveId === forgetMove);
        if (forgetIndex !== -1) {
          await this.replaceMove(ownedPokemon, forgetIndex, moveId);
        }
      } else if (ownedPokemon.moves.length < 4) {
        await this.addMoveInternal(ownedPokemon, moveId);
      }

      await this.saveOwnedPokemon(ownedPokemon);
      pendingChoices.splice(choiceIndex, 1);
      if (pendingChoices.length === 0) this.pendingMoveChoices.delete(pokemonId);

      this.debugLog(`✅ Choix de sort traité: ${choice.moveName}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur processMoveChoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  rejectMoveChoice(pokemonId: string, moveId: string): void {
    const pendingChoices = this.pendingMoveChoices.get(pokemonId);
    if (pendingChoices) {
      const choiceIndex = pendingChoices.findIndex((c) => c.moveId === moveId);
      if (choiceIndex !== -1) {
        pendingChoices.splice(choiceIndex, 1);
        if (pendingChoices.length === 0) this.pendingMoveChoices.delete(pokemonId);
        this.debugLog(`❌ Choix de sort rejeté: ${moveId}`);
      }
    }
  }

  // ===== UTILITAIRES =====

  private addPendingMoveChoice(pokemonId: string, choice: MoveLearnChoice): void {
    if (!this.pendingMoveChoices.has(pokemonId)) {
      this.pendingMoveChoices.set(pokemonId, []);
    }
    this.pendingMoveChoices.get(pokemonId)!.push(choice);
  }

  private async estimateStatGains(
    _ownedPokemon: IOwnedPokemon,
    levelsGained: number
  ): Promise<Record<string, number>> {
    const base = 3;
    return {
      hp: levelsGained * base,
      attack: levelsGained * base,
      defense: levelsGained * base,
      spAttack: levelsGained * base,
      spDefense: levelsGained * base,
      speed: levelsGained * base,
    };
  }

  private async checkAchievements(
    _context: ExperienceGainContext,
    levelUpResult: any
  ): Promise<string[]> {
    const achievements: string[] = [];
    if (levelUpResult.levelsGained >= 5) {
      achievements.push('🏆 Accomplissement : Montée Spectaculaire !');
    }
    if (levelUpResult.newMoves.length >= 3) {
      achievements.push('📚 Accomplissement : Apprenant Rapide !');
    }
    return achievements;
  }

  private createPokemonSummary(
    before: any,
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
      expToNextLevel:
        this.calculateExpForLevel(after.level + 1, after) - after.experience,
    };
  }

  private emitEvents(context: ExperienceGainContext, result: ExperienceResult): void {
    this.emit('experienceGained', { context, result });

    if (result.leveledUp) {
      this.emit('levelUp', {
        pokemonId: context.gainedBy,
        fromLevel: result.pokemon.beforeLevel,
        toLevel: result.pokemon.afterLevel,
        levelsGained: result.levelsGained,
      });
    }

    if (result.hasEvolved) {
      this.emit('evolutionTriggered', {
        pokemonId: context.gainedBy,
        evolutionData: result.evolutionData,
      });
    }

    if (result.newMoves.length > 0) {
      this.emit('newMovesAvailable', {
        pokemonId: context.gainedBy,
        moves: result.newMoves,
      });
    }
  }

  private updateStats(
    expGained: number,
    levelsGained: number,
    hasEvolved: boolean,
    movesLearned: number
  ): void {
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
        expToNextLevel: 0,
      },
      leveledUp: false,
      levelsGained: 0,
      newMoves: [],
      notifications: [],
      achievements: [],
      ...data,
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
        expToNextLevel: 0,
      },
      leveledUp: false,
      levelsGained: 0,
      newMoves: [],
      notifications: [],
      achievements: [],
    };
  }

  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [ExperienceService] ${message}`);
    }
  }

  private cleanupService(): void {
    for (const [pokemonId, choices] of this.pendingMoveChoices.entries()) {
      if (choices.length === 0) {
        this.pendingMoveChoices.delete(pokemonId);
      }
    }
    this.debugLog(
      `🧹 Service nettoyé - Choix en attente: ${this.pendingMoveChoices.size}`
    );
  }

  // ===== 🚀 FIX ACCÈS DONNÉES (CORRECTION PRINCIPALE) =====

  /**
   * 🚀 MÉTHODE CORRIGÉE: getOwnedPokemon avec support objet direct
   */
  private async getOwnedPokemon(pokemonId: string | IOwnedPokemon): Promise<IOwnedPokemon | null> {
    try {
      // 🆕 SI C'EST DÉJÀ UN OBJET OWNEDPOKEMON, LE RETOURNER DIRECTEMENT
      if (typeof pokemonId === 'object' && pokemonId._id) {
        console.log(`✅ [ExperienceService] OwnedPokemon objet reçu directement: ${pokemonId.nickname || 'Pokemon'}`);
        return pokemonId as IOwnedPokemon;
      }
      
      // 🆕 SINON, CHERCHER PAR ID MONGODB
      console.log(`🔍 [ExperienceService] Recherche OwnedPokemon par ID: ${pokemonId}`);
      
      const { OwnedPokemon } = require('../models/OwnedPokemon');
      const found = await OwnedPokemon.findById(pokemonId);
      
      if (found) {
        console.log(`✅ [ExperienceService] OwnedPokemon trouvé: ${found.nickname || 'Pokemon'} (owner: ${found.owner})`);
        return found;
      } else {
        console.log(`❌ [ExperienceService] OwnedPokemon non trouvé pour ID: ${pokemonId}`);
        return null;
      }
      
    } catch (error) {
      console.error('❌ [ExperienceService] Erreur getOwnedPokemon:', error);
      return null;
    }
  }

  private async saveOwnedPokemon(ownedPokemon: IOwnedPokemon): Promise<void> {
    try {
      await ownedPokemon.save();
      this.debugLog(`💾 Pokémon sauvegardé: ${ownedPokemon.nickname || 'Pokemon'}`);
    } catch (error) {
      console.error('❌ [ExperienceService] Erreur sauvegarde:', error);
      throw error;
    }
  }

  private async getPokemonData(pokemonId: number): Promise<any> {
    if (this.pokemonDataCache.has(pokemonId)) {
      return this.pokemonDataCache.get(pokemonId)!;
    }
    const data = await getPokemonById(pokemonId);
    if (data) this.pokemonDataCache.set(pokemonId, data as any);
    return data;
  }

  // ===== INTÉGRATION EVOLUTIONSERVICE =====

  async checkLevelEvolutionRequirements(
    ownedPokemonId: string
  ): Promise<{
    canEvolve: boolean;
    evolutionData?: any;
    missingRequirements?: string[];
  }> {
    try {
      const ownedPokemon = await this.getOwnedPokemon(ownedPokemonId);
      if (!ownedPokemon) return { canEvolve: false };

      const pokemonData = await this.getPokemonData(ownedPokemon.pokemonId);
      if (!pokemonData?.evolution?.canEvolve) return { canEvolve: false };

      const evolution = pokemonData.evolution;
      const requirements: string[] = [];

      if (evolution.method === 'level') {
        if (
          typeof evolution.requirement === 'number' &&
          ownedPokemon.level < evolution.requirement
        ) {
          requirements.push(
            `Niveau ${evolution.requirement} requis (actuellement ${ownedPokemon.level})`
          );
        }
      } else {
        return { canEvolve: false };
      }

      return {
        canEvolve: requirements.length === 0,
        evolutionData: evolution,
        missingRequirements: requirements.length > 0 ? requirements : undefined,
      };
    } catch (error) {
      console.error('❌ Erreur checkLevelEvolutionRequirements:', error);
      return { canEvolve: false };
    }
  }

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
      const expResult = await this.processExperienceGain({
        gainedBy: pokemonId,
        source:
          source === 'battle'
            ? 'wild_battle'
            : source === 'candy'
            ? 'rare_candy'
            : 'special_event',
        amount,
        location,
      });

      if (!expResult.success) {
        return {
          success: false,
          leveledUp: false,
          evolved: false,
          notifications: [expResult.error || "Erreur lors du gain d'expérience"],
        };
      }

      let evolved = false;
      let evolutionData: any = undefined;
      const notifications = [...expResult.notifications];

      if (expResult.leveledUp && !this.config.autoEvolution) {
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
        notifications,
      };
    } catch (error) {
      console.error('❌ Erreur giveExperienceWithEvolutionCheck:', error);
      return {
        success: false,
        leveledUp: false,
        evolved: false,
        notifications: [error instanceof Error ? error.message : 'Erreur inconnue'],
      };
    }
  }

  private setupEvolutionServiceIntegration(): void {
    evolutionService.on('pokemonEvolved', (data: any) => {
      this.debugLog(
        `🔄 Évolution détectée par EvolutionService: ${data.fromPokemonId} → ${data.toPokemonId}`
      );
      this.stats.totalEvolutions++;
      this.emit('evolutionCompleted', {
        source: 'evolution_service',
        ownedPokemonId: data.ownedPokemonId,
        fromPokemonId: data.fromPokemonId,
        toPokemonId: data.toPokemonId,
        result: data.result,
      });
    });

    this.debugLog('🔗 Intégration avec EvolutionService configurée');
  }

  // ===
