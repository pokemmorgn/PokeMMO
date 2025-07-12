// server/src/services/PokédexIntegrationService.ts
import { EventEmitter } from 'events';
import { pokédexService } from './PokédexService';
import { PokédexProgressService } from './PokédexProgressService';
import { pokédexNotificationService } from './PokédexNotificationService';
import { IOwnedPokemon } from '../models/OwnedPokemon';
import { getPokemonById } from '../data/PokemonData';

// Créer l'instance du service de progression
const pokédexProgressService = PokédexProgressService.getInstance();

// ===== TYPES & INTERFACES =====

export interface PokédexIntegrationConfig {
  enabled: boolean;
  autoUpdateOnCapture: boolean;
  autoUpdateOnEncounter: boolean;
  enableNotifications: boolean;
  enableAchievements: boolean;
  enableStreaks: boolean;
  debugMode: boolean;
}

export interface EncounterContext {
  playerId: string;
  pokemonId: number;
  level: number;
  location: string;
  method: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special';
  weather?: string;
  timeOfDay?: string;
  sessionId?: string;
}

export interface CaptureContext extends EncounterContext {
  ownedPokemonId: string;
  isShiny: boolean;
  captureTime?: number;
  ballType?: string;
  isFirstAttempt?: boolean;
}

// ===== SERVICE D'INTÉGRATION POKÉDEX =====

export class PokédexIntegrationService extends EventEmitter {
  private static instance: PokédexIntegrationService;
  
  // Configuration
  private config: PokédexIntegrationConfig = {
    enabled: true,
    autoUpdateOnCapture: true,
    autoUpdateOnEncounter: true,
    enableNotifications: true,
    enableAchievements: true,
    enableStreaks: true,
    debugMode: false
  };
  
  // Cache des rencontres récentes pour éviter les doublons
  private recentEncounters = new Map<string, Set<number>>();
  
  // Cache des notifications envoyées récemment
  private recentNotifications = new Map<string, Set<string>>();
  
  constructor() {
    super();
    this.initializeEventListeners();
    console.log('🔗 [PokédexIntegrationService] Service d\'intégration Pokédx initialisé');
  }
  
  // Singleton pattern
  static getInstance(): PokédexIntegrationService {
    if (!PokédexIntegrationService.instance) {
      PokédexIntegrationService.instance = new PokédexIntegrationService();
    }
    return PokédexIntegrationService.instance;
  }
  
  // ===== INITIALISATION =====
  
  /**
   * Initialise les listeners d'événements
   */
  private initializeEventListeners(): void {
    // Écouter les événements du service Pokédx
    pokédexService.on('pokemonDiscovered', this.handlePokemonDiscovered.bind(this));
    pokédexService.on('pokemonCaptured', this.handlePokemonCaptured.bind(this));
    
    // Écouter les événements de progression
    pokédexProgressService.on('streakUpdated', this.handleStreakUpdated.bind(this));
    
    console.log('✅ [PokédexIntegrationService] Listeners d\'événements configurés');
  }
  
  // ===== MÉTHODES PRINCIPALES D'INTÉGRATION =====
  
  /**
   * Intègre une rencontre Pokémon dans le Pokédx
   * À appeler lors des rencontres sauvages, combats, etc.
   */
  async handlePokemonEncounter(context: EncounterContext): Promise<{
    success: boolean;
    isNewDiscovery: boolean;
    notifications: string[];
    error?: string;
  }> {
    try {
      if (!this.config.enabled || !this.config.autoUpdateOnEncounter) {
        return { success: false, isNewDiscovery: false, notifications: [], error: 'Intégration désactivée' };
      }
      
      this.debugLog(`🔍 Rencontre Pokémon: ${context.playerId} vs #${context.pokemonId} (${context.method})`);
      
      // Vérifier les doublons récents
      if (this.isRecentEncounter(context.playerId, context.pokemonId)) {
        this.debugLog(`⏭️ Rencontre récente ignorée: ${context.pokemonId}`);
        return { success: true, isNewDiscovery: false, notifications: [] };
      }
      
      // Récupérer les données du Pokémon
      const pokemonData = await getPokemonById(context.pokemonId);
      if (!pokemonData) {
        throw new Error(`Données Pokémon introuvables pour ID ${context.pokemonId}`);
      }
      
      // Marquer comme vu dans le Pokédx
      const discoveryResult = await pokédexService.markPokemonAsSeen(context.playerId, {
        pokemonId: context.pokemonId,
        level: context.level,
        location: context.location,
        method: context.method,
        weather: context.weather,
        timeOfDay: context.timeOfDay
      });
      
      // Vérifier les accomplissements si nouvelle découverte
      let achievementNotifications: string[] = [];
      if (discoveryResult.isNewDiscovery && this.config.enableAchievements) {
        achievementNotifications = await pokédexProgressService.checkPokédexAchievements(
          context.playerId,
          {
            action: 'seen',
            pokemonId: context.pokemonId,
            pokemonData,
            isNewDiscovery: true
          }
        );
      }
      
      // Mettre à jour les streaks si activé
      let streakNotifications: string[] = [];
      if (discoveryResult.isNewDiscovery && this.config.enableStreaks) {
        const streakResult = await pokédexProgressService.updatePokédexStreaks(
          context.playerId,
          'seen'
        );
        streakNotifications = streakResult.notifications;
      }
      
      // Générer notifications visuelles
      let visualNotifications: string[] = [];
      if (this.config.enableNotifications) {
        await this.createEncounterNotifications(context, pokemonData, discoveryResult.isNewDiscovery);
      }
      
      // Marquer comme rencontre récente
      this.markAsRecentEncounter(context.playerId, context.pokemonId);
      
      // Émettre événement d'intégration
      this.emit('encounterIntegrated', {
        context,
        isNewDiscovery: discoveryResult.isNewDiscovery,
        pokemonData
      });
      
      const allNotifications = [
        ...discoveryResult.notifications,
        ...achievementNotifications,
        ...streakNotifications,
        ...visualNotifications
      ];
      
      this.debugLog(`✅ Rencontre intégrée: ${discoveryResult.isNewDiscovery ? 'NOUVELLE' : 'déjà vue'} - ${allNotifications.length} notifications`);
      
      return {
        success: true,
        isNewDiscovery: discoveryResult.isNewDiscovery,
        notifications: allNotifications
      };
      
    } catch (error) {
      console.error(`❌ [PokédexIntegrationService] Erreur handleEncounter:`, error);
      return {
        success: false,
        isNewDiscovery: false,
        notifications: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * Intègre une capture Pokémon dans le Pokédx
   * À appeler lors des captures réussies
   */
  async handlePokemonCapture(context: CaptureContext): Promise<{
    success: boolean;
    isNewCapture: boolean;
    isNewBestSpecimen: boolean;
    notifications: string[];
    error?: string;
  }> {
    try {
      if (!this.config.enabled || !this.config.autoUpdateOnCapture) {
        return { 
          success: false, 
          isNewCapture: false, 
          isNewBestSpecimen: false, 
          notifications: [], 
          error: 'Intégration désactivée' 
        };
      }
      
      this.debugLog(`🎯 Capture Pokémon: ${context.playerId} capture #${context.pokemonId} ${context.isShiny ? '✨' : ''}`);
      
      // Récupérer les données du Pokémon
      const pokemonData = await getPokemonById(context.pokemonId);
      if (!pokemonData) {
        throw new Error(`Données Pokémon introuvables pour ID ${context.pokemonId}`);
      }
      
      // Marquer comme capturé dans le Pokédx
      const captureResult = await pokédexService.markPokemonAsCaught(context.playerId, {
        pokemonId: context.pokemonId,
        level: context.level,
        location: context.location,
        method: context.method,
        weather: context.weather,
        timeOfDay: context.timeOfDay,
        isShiny: context.isShiny,
        ownedPokemonId: context.ownedPokemonId,
        captureTime: context.captureTime
      });
      
      // Vérifier les accomplissements
      let achievementNotifications: string[] = [];
      if (this.config.enableAchievements) {
        // Accomplissement de capture
        if (captureResult.isNewCapture) {
          const captureAchievements = await pokédexProgressService.checkPokédexAchievements(
            context.playerId,
            {
              action: 'caught',
              pokemonId: context.pokemonId,
              pokemonData,
              isNewCapture: true
            }
          );
          achievementNotifications.push(...captureAchievements);
        }
        
        // Accomplissement shiny
        if (context.isShiny) {
          const shinyAchievements = await pokédexProgressService.checkPokédexAchievements(
            context.playerId,
            {
              action: 'shiny',
              pokemonId: context.pokemonId,
              pokemonData
            }
          );
          achievementNotifications.push(...shinyAchievements);
        }
      }
      
      // Mettre à jour les streaks
      let streakNotifications: string[] = [];
      if (captureResult.isNewCapture && this.config.enableStreaks) {
        const streakResult = await pokédexProgressService.updatePokédexStreaks(
          context.playerId,
          'caught'
        );
        streakNotifications = streakResult.notifications;
      }
      
      // Générer notifications visuelles
      if (this.config.enableNotifications) {
        await this.createCaptureNotifications(context, pokemonData, captureResult);
      }
      
      // Émettre événement d'intégration
      this.emit('captureIntegrated', {
        context,
        isNewCapture: captureResult.isNewCapture,
        isNewBestSpecimen: captureResult.isNewBestSpecimen,
        pokemonData
      });
      
      const allNotifications = [
        ...captureResult.notifications,
        ...achievementNotifications,
        ...streakNotifications
      ];
      
      this.debugLog(`✅ Capture intégrée: ${captureResult.isNewCapture ? 'NOUVELLE' : 'déjà capturé'} - ${captureResult.isNewBestSpecimen ? 'MEILLEUR SPÉCIMEN' : ''} - ${allNotifications.length} notifications`);
      
      return {
        success: true,
        isNewCapture: captureResult.isNewCapture,
        isNewBestSpecimen: captureResult.isNewBestSpecimen,
        notifications: allNotifications
      };
      
    } catch (error) {
      console.error(`❌ [PokédexIntegrationService] Erreur handleCapture:`, error);
      return {
        success: false,
        isNewCapture: false,
        isNewBestSpecimen: false,
        notifications: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  /**
   * Intègre une évolution Pokémon
   */
  async handlePokemonEvolution(
    playerId: string,
    fromPokemonId: number,
    toPokemonId: number,
    ownedPokemonId: string,
    location: string = 'Évolution'
  ): Promise<{
    success: boolean;
    notifications: string[];
  }> {
    try {
      this.debugLog(`🌟 Évolution Pokémon: ${playerId} - #${fromPokemonId} → #${toPokemonId}`);
      
      // Marquer l'évolution comme vue ET capturée si c'est une nouvelle forme
      const [encounterResult, captureResult] = await Promise.all([
        this.handlePokemonEncounter({
          playerId,
          pokemonId: toPokemonId,
          level: 1, // Niveau d'évolution générique
          location,
          method: 'evolution'
        }),
        this.handlePokemonCapture({
          playerId,
          pokemonId: toPokemonId,
          level: 1,
          location,
          method: 'evolution',
          ownedPokemonId,
          isShiny: false // TODO: Récupérer le statut shiny du Pokémon original
        })
      ]);
      
      const allNotifications = [
        ...encounterResult.notifications,
        ...captureResult.notifications
      ];
      
      // Notification spéciale d'évolution si nouvelle forme
      if (encounterResult.isNewDiscovery && this.config.enableNotifications) {
        const evolutionData = await getPokemonById(toPokemonId);
        if (evolutionData) {
          await pokédexNotificationService.createDiscoveryNotification(playerId, {
            pokemonId: toPokemonId,
            pokemonName: evolutionData.name,
            isFirstDiscovery: true,
            level: 1,
            location
          });
          
          allNotifications.push(`🌟 Nouvelle forme découverte par évolution : ${evolutionData.name} !`);
        }
      }
      
      this.emit('evolutionIntegrated', {
        playerId,
        fromPokemonId,
        toPokemonId,
        isNewForm: encounterResult.isNewDiscovery
      });
      
      return {
        success: true,
        notifications: allNotifications
      };
      
    } catch (error) {
      console.error(`❌ [PokédexIntegrationService] Erreur handleEvolution:`, error);
      return {
        success: false,
        notifications: []
      };
    }
  }
  
  // ===== HOOKS POUR OWNEDPOKEMON =====
  
  /**
   * Hook à appeler depuis OwnedPokemon lors de la création
   */
  async onOwnedPokemonCreated(ownedPokemon: IOwnedPokemon, context?: {
    location?: string;
    method?: string;
    weather?: string;
    timeOfDay?: string;
    captureTime?: number;
  }): Promise<void> {
    try {
      await this.handlePokemonCapture({
        playerId: ownedPokemon.owner,
        pokemonId: ownedPokemon.pokemonId,
        level: ownedPokemon.level,
        location: context?.location || 'Inconnu',
        method: (context?.method as any) || 'wild',
        weather: context?.weather,
        timeOfDay: context?.timeOfDay,
        ownedPokemonId: ownedPokemon._id.toString(),
        isShiny: ownedPokemon.shiny,
        captureTime: context?.captureTime
      });
    } catch (error) {
      console.error(`❌ [PokédexIntegrationService] Erreur onOwnedPokemonCreated:`, error);
    }
  }
  
  /**
   * Hook à appeler lors des rencontres de combat sauvage
   */
  async onWildPokemonEncountered(
    playerId: string,
    pokemonId: number,
    level: number,
    location: string,
    context?: {
      weather?: string;
      timeOfDay?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      await this.handlePokemonEncounter({
        playerId,
        pokemonId,
        level,
        location,
        method: 'wild',
        weather: context?.weather,
        timeOfDay: context?.timeOfDay,
        sessionId: context?.sessionId
      });
    } catch (error) {
      console.error(`❌ [PokédexIntegrationService] Erreur onWildPokemonEncountered:`, error);
    }
  }
  
  // ===== NOTIFICATIONS =====
  
  /**
   * Crée les notifications pour une rencontre
   */
  private async createEncounterNotifications(
    context: EncounterContext,
    pokemonData: any,
    isNewDiscovery: boolean
  ): Promise<void> {
    if (isNewDiscovery) {
      await pokédexNotificationService.createDiscoveryNotification(context.playerId, {
        pokemonId: context.pokemonId,
        pokemonName: pokemonData.name,
        isFirstDiscovery: true,
        level: context.level,
        location: context.location
      });
    }
  }

  /**
 * ✅ NOUVEAU: Finalise la progression Pokédx en fin de combat
 */
private finalizePokédxProgression(): void {
  // Ne traiter que les combats sauvages
  if (this.gameState.type !== 'wild') {
    return;
  }
  
  const player1 = this.gameState.player1;
  const player2Pokemon = this.gameState.player2.pokemon;
  
  if (!player1 || !player2Pokemon) {
    return;
  }
  
  // Traitement asynchrone en arrière-plan
  pokédexIntegrationService.finalizeBattleProgression({
    playerId: player1.sessionId,
    pokemonId: player2Pokemon.id,
    battleResult: this.gameState.winner === 'player1' ? 'victory' : 'defeat',
    battleType: 'wild'
  }).then((result: any) => {
    if (result.achievements?.length > 0) {
      this.emit('pokédxAchievements', {
        playerId: player1.sessionId,
        achievements: result.achievements
      });
    }
  }).catch((error: any) => {
    console.error(`❌ [BattleEngine] Erreur finalisation Pokédx:`, error);
  });
}
  
  /**
   * Crée les notifications pour une capture
   */
  private async createCaptureNotifications(
    context: CaptureContext,
    pokemonData: any,
    captureResult: any
  ): Promise<void> {
    // Notification de capture
    await pokédexNotificationService.createCaptureNotification(context.playerId, {
      pokemonId: context.pokemonId,
      pokemonName: pokemonData.name,
      isFirstCapture: captureResult.isNewCapture,
      isShiny: context.isShiny,
      isPerfectCapture: context.isFirstAttempt,
      level: context.level,
      location: context.location,
      captureTime: context.captureTime
    });
    
    // Notification shiny spéciale
    if (context.isShiny) {
      await pokédexNotificationService.createShinyNotification(context.playerId, {
        pokemonId: context.pokemonId,
        pokemonName: pokemonData.name,
        action: 'captured',
        location: context.location
      });
    }
  }
  
  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====
  
  /**
   * Gestionnaire d'événement pour les découvertes
   */
  private handlePokemonDiscovered(data: any): void {
    this.debugLog(`📢 Événement découverte reçu: ${data.pokemonName} par ${data.playerId}`);
    // Logique additionnelle si nécessaire
  }
  
  /**
   * Gestionnaire d'événement pour les captures
   */
  private handlePokemonCaptured(data: any): void {
    this.debugLog(`📢 Événement capture reçu: ${data.pokemonName} par ${data.playerId}`);
    // Logique additionnelle si nécessaire
  }
  
  /**
   * Gestionnaire d'événement pour les streaks
   */
  private handleStreakUpdated(data: any): void {
    this.debugLog(`📢 Événement streak reçu: ${data.type} pour ${data.playerId}`);
    // Logique additionnelle si nécessaire
  }
  
  // ===== GESTION DES DOUBLONS =====
  
  /**
   * Vérifie si c'est une rencontre récente
   */
  private isRecentEncounter(playerId: string, pokemonId: number): boolean {
    const playerEncounters = this.recentEncounters.get(playerId);
    return playerEncounters?.has(pokemonId) || false;
  }
  
  /**
   * Marque comme rencontre récente
   */
  private markAsRecentEncounter(playerId: string, pokemonId: number): void {
    if (!this.recentEncounters.has(playerId)) {
      this.recentEncounters.set(playerId, new Set());
    }
    
    this.recentEncounters.get(playerId)!.add(pokemonId);
    
    // Auto-nettoyage après 5 minutes
    setTimeout(() => {
      this.recentEncounters.get(playerId)?.delete(pokemonId);
    }, 5 * 60 * 1000);
  }
  
  // ===== CONFIGURATION =====
  
  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<PokédexIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`⚙️ [PokédexIntegrationService] Configuration mise à jour:`, this.config);
  }
  
  /**
   * Récupère la configuration actuelle
   */
  getConfig(): PokédexIntegrationConfig {
    return { ...this.config };
  }
  
  /**
   * Active/désactive l'intégration
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} [PokédexIntegrationService] Intégration ${enabled ? 'activée' : 'désactivée'}`);
  }
  
  // ===== UTILITAIRES =====
  
  /**
   * Log de debug si activé
   */
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [PokédexIntegration] ${message}`);
    }
  }
  
  /**
   * Nettoie les caches
   */
  clearCaches(): void {
    this.recentEncounters.clear();
    this.recentNotifications.clear();
    console.log('🧹 [PokédexIntegrationService] Caches nettoyés');
  }
  
  /**
   * Récupère les statistiques d'intégration
   */
  getIntegrationStats(): {
    isEnabled: boolean;
    config: PokédexIntegrationConfig;
    cacheStats: {
      recentEncounters: number;
      recentNotifications: number;
    };
  } {
    return {
      isEnabled: this.config.enabled,
      config: this.config,
      cacheStats: {
        recentEncounters: Array.from(this.recentEncounters.values()).reduce((sum, set) => sum + set.size, 0),
        recentNotifications: Array.from(this.recentNotifications.values()).reduce((sum, set) => sum + set.size, 0)
      }
    };
  }
}

// ===== EXPORT SINGLETON =====
export const pokédexIntegrationService = PokédexIntegrationService.getInstance();
export default pokédexIntegrationService;
