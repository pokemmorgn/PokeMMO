// server/src/services/PokedexIntegrationService.ts
import { EventEmitter } from 'events';
import { pokedexService } from './PokedexService';
import { pokedexNotificationService } from './PokedexNotificationService';
import { getPokemonById } from '../data/PokemonData';
import { Types } from 'mongoose';

// ===== TYPES & INTERFACES =====

export interface PokedexIntegrationConfig {
  enabled: boolean;
  autoUpdateOnCapture: boolean;
  autoUpdateOnEncounter: boolean;
  enableNotifications: boolean;
  enableAchievements: boolean;
  enableStreaks: boolean;
  enableAnalytics: boolean;
  debugMode: boolean;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  duplicateWindow: number; // Fenêtre de détection des doublons en ms
}

export interface EncounterContext {
  playerId: string;
  pokemonId: number;
  level: number;
  location: string;
  method: 'wild' | 'trainer' | 'gift' | 'trade' | 'evolution' | 'egg' | 'special' | 'raid' | 'legendary';
  weather?: string;
  timeOfDay?: string;
  sessionId?: string;
  biome?: string;
  difficulty?: number;
  isEvent?: boolean;
}

export interface CaptureContext extends EncounterContext {
  ownedPokemonId: string;
  isShiny: boolean;
  captureTime?: number;
  ballType?: string;
  isFirstAttempt?: boolean;
  criticalCapture?: boolean;
  experienceGained?: number;
}

export interface EvolutionContext {
  playerId: string;
  fromPokemonId: number;
  toPokemonId: number;
  ownedPokemonId: string;
  location: string;
  method: 'level' | 'stone' | 'trade' | 'friendship' | 'special';
  triggeredBy?: string; // Item, time, etc.
}

export interface IntegrationResult {
  success: boolean;
  isNewDiscovery?: boolean;
  isNewCapture?: boolean;
  isNewBestSpecimen?: boolean;
  isNewForm?: boolean;
  notifications: string[];
  achievements: string[];
  milestones: string[];
  error?: string;
  performance?: {
    executionTime: number;
    cacheHit: boolean;
    operationsCount: number;
  };
}

// ===== SERVICE D'INTÉGRATION OPTIMISÉ =====

export class PokedexIntegrationService extends EventEmitter {
  private static instance: PokedexIntegrationService;
  
  // Configuration du service
  private config: PokedexIntegrationConfig = {
    enabled: true,
    autoUpdateOnCapture: true,
    autoUpdateOnEncounter: true,
    enableNotifications: true,
    enableAchievements: true,
    enableStreaks: true,
    enableAnalytics: true,
    debugMode: false,
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 1000,
    duplicateWindow: 30000 // 30 secondes
  };
  
  // Cache des rencontres récentes pour éviter les doublons
  private recentEncounters = new Map<string, Map<number, number>>(); // playerId -> pokemonId -> timestamp
  
  // Cache des opérations en cours pour éviter les conflits
  private ongoingOperations = new Map<string, Set<string>>(); // playerId -> operationIds
  
  // Cache des données Pokémon pour optimiser
  private pokemonDataCache = new Map<number, any>();
  
  // Statistiques de performance
  private performanceStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    duplicatesBlocked: 0,
    averageExecutionTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retries: 0
  };
  
  // Queue des opérations pour traitement en batch
  private operationQueue: Array<{
    id: string;
    type: 'encounter' | 'capture' | 'evolution';
    context: any;
    timestamp: number;
    retries: number;
  }> = [];
  
  constructor() {
    super();
    this.initializeService();
    console.log('🔗 [PokedexIntegrationService] Service d\'intégration Pokédex initialisé');
  }
  
  // Singleton pattern
  static getInstance(): PokedexIntegrationService {
    if (!PokedexIntegrationService.instance) {
      PokedexIntegrationService.instance = new PokedexIntegrationService();
    }
    return PokedexIntegrationService.instance;
  }
  
  // ===== INITIALISATION =====
  
  private initializeService(): void {
    // Nettoyage périodique du cache
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // 5 minutes
    
    // Traitement en batch de la queue
    setInterval(() => this.processBatchQueue(), 2000); // 2 secondes
    
    // Monitoring des performances
    setInterval(() => this.logPerformanceStats(), 60000); // 1 minute
    
    // Gestion des erreurs
    this.on('error', (error) => {
      this.performanceStats.failedOperations++;
      console.error('❌ [PokedexIntegrationService] Erreur service:', error);
    });
    
    this.debugLog('Service initialisé avec succès');
  }
  
  // ===== API PUBLIQUE SIMPLE =====
  
  /**
   * API ultra-simple pour marquer un Pokémon comme vu
   */
  async markSeen(
    playerId: string,
    pokemonId: number,
    level: number = 1,
    location: string = 'Unknown'
  ): Promise<boolean> {
    try {
      const result = await this.handlePokemonEncounter({
        playerId,
        pokemonId,
        level,
        location,
        method: 'wild'
      });
      return result.success && (result.isNewDiscovery || false);
    } catch (error) {
      console.error(`❌ [PokedexIntegrationService] markSeen failed:`, error);
      return false;
    }
  }
  
  /**
   * API ultra-simple pour marquer un Pokémon comme capturé
   */
  async markCaught(
    playerId: string,
    pokemonId: number,
    ownedPokemonId: string,
    level: number = 1,
    location: string = 'Unknown',
    isShiny: boolean = false
  ): Promise<boolean> {
    try {
      const result = await this.handlePokemonCapture({
        playerId,
        pokemonId,
        level,
        location,
        method: 'wild',
        ownedPokemonId,
        isShiny
      });
      return result.success && (result.isNewCapture || false);
    } catch (error) {
      console.error(`❌ [PokedexIntegrationService] markCaught failed:`, error);
      return false;
    }
  }
  
  // ===== MÉTHODES PRINCIPALES D'INTÉGRATION =====
  
  /**
   * Intègre une rencontre Pokémon avec validation complète
   */
async handlePokemonEncounter(context: EncounterContext): Promise<IntegrationResult> {
  const startTime = Date.now();
  const operationId = this.generateOperationId('encounter', context);
  
  console.log(`🔍 [POKÉDX DEBUG] === ENCOUNTER START ===`);
  console.log(`👤 PlayerId: "${context.playerId}"`);
  console.log(`🐾 PokemonId: ${context.pokemonId}`);
  console.log(`📍 Location: "${context.location}"`);
  console.log(`⚔️ Method: "${context.method}"`);
  console.log(`📊 Level: ${context.level}`);
  
  try {
    this.performanceStats.totalOperations++;
    
    // Validation des paramètres
    const validation = await this.validateEncounterContext(context);
    if (!validation.isValid) {
      console.log(`❌ [POKÉDX DEBUG] Validation échouée: ${validation.error}`);
      return this.createFailureResult(validation.error || 'Validation failed');
    }
    
    // Vérifier si le service est activé
    if (!this.config.enabled || !this.config.autoUpdateOnEncounter) {
      console.log(`❌ [POKÉDX DEBUG] Service désactivé`);
      return this.createFailureResult('Service désactivé');
    }
    
    // Vérifier les doublons récents
    if (this.isRecentEncounter(context.playerId, context.pokemonId)) {
      this.performanceStats.duplicatesBlocked++;
      this.debugLog(`⏭️ Rencontre récente ignorée: ${context.pokemonId} pour ${context.playerId}`);
      console.log(`⏭️ [POKÉDX DEBUG] Doublon récent ignoré`);
      return this.createSuccessResult({ isNewDiscovery: false });
    }
    
    // Vérifier les opérations en cours
    if (this.hasOngoingOperation(context.playerId, operationId)) {
      this.debugLog(`⏸️ Opération en cours ignorée: ${operationId}`);
      console.log(`⏸️ [POKÉDX DEBUG] Opération en cours ignorée`);
      return this.createFailureResult('Opération en cours');
    }
    
    // Marquer l'opération comme en cours
    this.markOperationAsOngoing(context.playerId, operationId);
    
    try {
      this.debugLog(`🔍 Traitement rencontre: ${context.playerId} vs #${context.pokemonId} (${context.method})`);
      console.log(`🔍 [POKÉDX DEBUG] Début traitement rencontre`);
      
      // Récupérer les données du Pokémon avec cache
      const pokemonData = await this.getPokemonData(context.pokemonId);
      if (!pokemonData) {
        console.log(`❌ [POKÉDX DEBUG] Données Pokémon introuvables pour ID ${context.pokemonId}`);
        throw new Error(`Données Pokémon introuvables pour ID ${context.pokemonId}`);
      }
      
      console.log(`✅ [POKÉDX DEBUG] Données Pokémon récupérées: ${pokemonData.name}`);
      
      // ✅ CORRECTION: Utiliser la bonne signature (2 paramètres seulement)
      const encounterData = {
        pokemonId: context.pokemonId,
        level: context.level,
        location: context.location,
        method: context.method || 'wild',
        weather: context.weather,
        timeOfDay: context.timeOfDay,
        sessionId: context.sessionId,
        biome: context.biome,
        difficulty: context.difficulty,
        isEvent: context.isEvent
      };
      
      console.log(`💾 [POKÉDX DEBUG] Appel markPokemonAsSeen avec:`, {
        playerId: context.playerId,
        encounterData
      });
      
      const discoveryResult = await pokedexService.markPokemonAsSeen(
        context.playerId,    // ✅ Paramètre 1: playerId
        encounterData        // ✅ Paramètre 2: objet avec toutes les données
      );
      
      console.log(`💾 [POKÉDX DEBUG] Résultat markPokemonAsSeen:`, {
        success: discoveryResult.success,
        isNewDiscovery: discoveryResult.isNewDiscovery,
        entry: discoveryResult.entry ? 'Entrée créée/mise à jour' : 'Pas d\'entrée',
        error: discoveryResult.error
      });
      
      if (!discoveryResult.success) {
        console.log(`❌ [POKÉDX DEBUG] Échec marquage vu: ${discoveryResult.error}`);
        throw new Error(discoveryResult.error || 'Échec marquage vu');
      }
      
      // ✅ VÉRIFICATION POST-SAUVEGARDE avec bons noms de propriétés
      setTimeout(async () => {
        console.log(`🔍 [POKÉDX DEBUG] === VÉRIFICATION POST-SAUVEGARDE ===`);
        
        try {
          const pokedexCheck = await pokedexService.getPlayerPokedex(context.playerId, {});
          console.log(`📊 [POKÉDX DEBUG] Pokédx après sauvegarde:`, {
            totalEntries: pokedexCheck.entries?.length || 0,
            entries: pokedexCheck.entries?.map(e => ({ 
              pokemonId: e.pokemonId, 
              isSeen: e.isSeen,           // ✅ Bon nom de propriété
              isCaught: e.isCaught,       // ✅ Bon nom de propriété
              firstSeenAt: e.firstSeenAt  // ✅ Bon nom de propriété
            })) || []
          });
          
          // Vérification spécifique de cette entrée
          const specificEntry = await pokedexService.getPokedexEntry(context.playerId, context.pokemonId);
          console.log(`📄 [POKÉDX DEBUG] Entrée spécifique #${context.pokemonId}:`, {
            exists: !!specificEntry.entry,
            isSeen: specificEntry.entry?.isSeen || false,              // ✅ Bon nom
            firstSeenAt: specificEntry.entry?.firstSeenAt || null,     // ✅ Bon nom
            timesEncountered: specificEntry.entry?.timesEncountered || 0
          });
          
        } catch (verifyError) {
          console.error(`❌ [POKÉDX DEBUG] Erreur vérification:`, verifyError);
        }
      }, 1000); // Vérification après 1 seconde
      
      // Collecter les notifications et accomplissements
      const notifications: string[] = [...(discoveryResult.notifications || [])];
      const achievements: string[] = [];
      const milestones: string[] = [];
      
      // Traitement des nouvelles découvertes
      if (discoveryResult.isNewDiscovery) {
        console.log(`🎉 [POKÉDX DEBUG] NOUVELLE DÉCOUVERTE détectée !`);
        
        // Marquer comme rencontre récente
        this.markAsRecentEncounter(context.playerId, context.pokemonId);
        
        // Créer notifications visuelles
        if (this.config.enableNotifications) {
          console.log(`🔔 [POKÉDX DEBUG] Création notifications visuelles...`);
          await this.createEncounterNotifications(context, pokemonData, true);
        }
        
        // Vérifier les accomplissements
        if (this.config.enableAchievements) {
          console.log(`🏆 [POKÉDX DEBUG] Vérification accomplissements...`);
          const achievementResults = await this.checkDiscoveryAchievements(context, pokemonData);
          achievements.push(...achievementResults);
        }
        
        // Vérifier les milestones
        console.log(`🎯 [POKÉDX DEBUG] Vérification milestones...`);
        const milestoneResults = await this.checkDiscoveryMilestones(context.playerId, pokemonData);
        milestones.push(...milestoneResults);
        
        // Analytics
        if (this.config.enableAnalytics) {
          console.log(`📊 [POKÉDX DEBUG] Enregistrement analytics...`);
          this.recordAnalyticsEvent('pokemon_discovered', context, pokemonData);
        }
      } else {
        console.log(`👁️ [POKÉDX DEBUG] Pokémon déjà vu, pas de nouvelle découverte`);
      }
      
      // Émettre événement d'intégration
      this.emit('encounterIntegrated', {
        context,
        isNewDiscovery: discoveryResult.isNewDiscovery,
        pokemonData,
        notifications,
        achievements,
        milestones
      });
      
      const executionTime = Date.now() - startTime;
      this.updatePerformanceStats(executionTime, true);
      
      this.debugLog(`✅ Rencontre intégrée: ${discoveryResult.isNewDiscovery ? 'NOUVELLE' : 'déjà vue'} - ${notifications.length} notifications`);
      console.log(`✅ [POKÉDX DEBUG] Rencontre intégrée avec succès`, {
        isNewDiscovery: discoveryResult.isNewDiscovery,
        notificationsCount: notifications.length,
        achievementsCount: achievements.length,
        milestonesCount: milestones.length,
        executionTime
      });
      
      return this.createSuccessResult({
        isNewDiscovery: discoveryResult.isNewDiscovery,
        notifications: [...notifications, ...achievements, ...milestones],
        performance: {
          executionTime,
          cacheHit: this.pokemonDataCache.has(context.pokemonId),
          operationsCount: 1
        }
      });
      
    } finally {
      // Libérer l'opération
      this.markOperationAsCompleted(context.playerId, operationId);
    }
    
  } catch (error) {
    this.emit('error', error);
    this.updatePerformanceStats(Date.now() - startTime, false);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error(`❌ [PokedexIntegrationService] Erreur handleEncounter:`, error);
    console.error(`❌ [POKÉDX DEBUG] Stack trace:`, error instanceof Error ? error.stack : 'Pas de stack');
    
    return this.createFailureResult(errorMessage);
  }
}
  
  /**
   * Intègre une capture Pokémon avec validation complète
   */
  async handlePokemonCapture(context: CaptureContext): Promise<IntegrationResult> {
    const startTime = Date.now();
    const operationId = this.generateOperationId('capture', context);
    
    try {
      this.performanceStats.totalOperations++;
      
      // Validation des paramètres
      const validation = await this.validateCaptureContext(context);
      if (!validation.isValid) {
        return this.createFailureResult(validation.error || 'Validation failed');
      }
      
      // Vérifier si le service est activé
      if (!this.config.enabled || !this.config.autoUpdateOnCapture) {
        return this.createFailureResult('Service désactivé');
      }
      
      // Vérifier les opérations en cours
      if (this.hasOngoingOperation(context.playerId, operationId)) {
        this.debugLog(`⏸️ Opération capture en cours ignorée: ${operationId}`);
        return this.createFailureResult('Opération en cours');
      }
      
      // Marquer l'opération comme en cours
      this.markOperationAsOngoing(context.playerId, operationId);
      
      try {
        this.debugLog(`🎯 Traitement capture: ${context.playerId} capture #${context.pokemonId} ${context.isShiny ? '✨' : ''}`);
        
        // Récupérer les données du Pokémon
        const pokemonData = await this.getPokemonData(context.pokemonId);
        if (!pokemonData) {
          throw new Error(`Données Pokémon introuvables pour ID ${context.pokemonId}`);
        }
        
        // Marquer comme capturé dans le Pokédex
        const captureResult = await pokedexService.markPokemonAsCaught(context.playerId, {
          pokemonId: context.pokemonId,
          level: context.level,
          location: context.location,
          method: context.method,
          weather: context.weather,
          timeOfDay: context.timeOfDay,
          ownedPokemonId: context.ownedPokemonId,
          isShiny: context.isShiny,
          captureTime: context.captureTime,
          isFirstAttempt: context.isFirstAttempt
        });
        
        if (!captureResult.success) {
          throw new Error(captureResult.error || 'Échec marquage capturé');
        }
        
        // Collecter les résultats
        const notifications: string[] = [...captureResult.notifications];
        const achievements: string[] = [];
        const milestones: string[] = [];
        
        // Traitement des nouvelles captures
        if (captureResult.isNewCapture || captureResult.isNewBestSpecimen) {
          // Créer notifications visuelles
          if (this.config.enableNotifications) {
            await this.createCaptureNotifications(context, pokemonData, captureResult);
          }
          
          // Vérifier les accomplissements de capture
          if (this.config.enableAchievements && captureResult.isNewCapture) {
            const captureAchievements = await this.checkCaptureAchievements(context, pokemonData);
            achievements.push(...captureAchievements);
            
            // Accomplissements shiny spéciaux
            if (context.isShiny) {
              const shinyAchievements = await this.checkShinyAchievements(context, pokemonData);
              achievements.push(...shinyAchievements);
            }
            
            // Accomplissements de capture parfaite
            if (context.isFirstAttempt) {
              achievements.push('🎯 Accomplissement : Capture Parfaite !');
            }
          }
          
          // Vérifier les milestones de capture
          const captureMilestones = await this.checkCaptureMilestones(context.playerId, pokemonData);
          milestones.push(...captureMilestones);
          
          // Analytics
          if (this.config.enableAnalytics) {
            this.recordAnalyticsEvent('pokemon_captured', context, pokemonData);
          }
        }
        
        // Émettre événement d'intégration
        this.emit('captureIntegrated', {
          context,
          isNewCapture: captureResult.isNewCapture,
          isNewBestSpecimen: captureResult.isNewBestSpecimen,
          pokemonData,
          notifications,
          achievements,
          milestones
        });
        
        const executionTime = Date.now() - startTime;
        this.updatePerformanceStats(executionTime, true);
        
        this.debugLog(`✅ Capture intégrée: ${captureResult.isNewCapture ? 'NOUVELLE' : 'déjà capturé'} - ${captureResult.isNewBestSpecimen ? 'MEILLEUR SPÉCIMEN' : ''}`);
        
        return this.createSuccessResult({
          isNewCapture: captureResult.isNewCapture,
          isNewBestSpecimen: captureResult.isNewBestSpecimen,
          notifications: [...notifications, ...achievements, ...milestones],
          performance: {
            executionTime,
            cacheHit: this.pokemonDataCache.has(context.pokemonId),
            operationsCount: 1
          }
        });
        
      } finally {
        // Libérer l'opération
        this.markOperationAsCompleted(context.playerId, operationId);
      }
      
    } catch (error) {
      this.emit('error', error);
      this.updatePerformanceStats(Date.now() - startTime, false);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`❌ [PokedexIntegrationService] Erreur handleCapture:`, error);
      
      return this.createFailureResult(errorMessage);
    }
  }
  
  /**
   * Intègre une évolution Pokémon
   */
  async handlePokemonEvolution(context: EvolutionContext): Promise<IntegrationResult> {
    const startTime = Date.now();
    const operationId = this.generateOperationId('evolution', context);
    
    try {
      this.performanceStats.totalOperations++;
      
      // Validation des paramètres
      const validation = await this.validateEvolutionContext(context);
      if (!validation.isValid) {
        return this.createFailureResult(validation.error || 'Validation failed');
      }
      
      // Vérifier les opérations en cours
      if (this.hasOngoingOperation(context.playerId, operationId)) {
        return this.createFailureResult('Opération en cours');
      }
      
      this.markOperationAsOngoing(context.playerId, operationId);
      
      try {
        this.debugLog(`🌟 Traitement évolution: ${context.playerId} - #${context.fromPokemonId} → #${context.toPokemonId}`);
        
        // Traiter l'évolution comme une rencontre ET une capture
        const [encounterResult, captureResult] = await Promise.all([
          this.handlePokemonEncounter({
            playerId: context.playerId,
            pokemonId: context.toPokemonId,
            level: 1, // Niveau d'évolution générique
            location: context.location,
            method: 'evolution'
          }),
          this.handlePokemonCapture({
            playerId: context.playerId,
            pokemonId: context.toPokemonId,
            level: 1,
            location: context.location,
            method: 'evolution',
            ownedPokemonId: context.ownedPokemonId,
            isShiny: false // TODO: Récupérer le statut shiny du Pokémon original
          })
        ]);
        
        const notifications = [
          ...encounterResult.notifications,
          ...captureResult.notifications
        ];
        
        // Notification spéciale d'évolution si nouvelle forme
        if (encounterResult.isNewDiscovery && this.config.enableNotifications) {
          const evolutionData = await this.getPokemonData(context.toPokemonId);
          if (evolutionData) {
            await pokedexNotificationService.createCustomNotification(context.playerId, {
              type: 'evolution',
              title: 'Nouvelle Forme Découverte !',
              message: `🌟 ${evolutionData.name} découvert par évolution !`,
              priority: 'high',
              icon: '🌟',
              data: {
                pokemonId: context.toPokemonId,
                fromPokemonId: context.fromPokemonId,
                method: context.method
              }
            });
            
            notifications.push(`🌟 Nouvelle forme découverte par évolution : ${evolutionData.name} !`);
          }
        }
        
        // Analytics d'évolution
        if (this.config.enableAnalytics) {
          this.recordAnalyticsEvent('pokemon_evolved', context);
        }
        
        this.emit('evolutionIntegrated', {
          context,
          isNewForm: encounterResult.isNewDiscovery,
          notifications
        });
        
        const executionTime = Date.now() - startTime;
        this.updatePerformanceStats(executionTime, true);
        
        return this.createSuccessResult({
          isNewForm: encounterResult.isNewDiscovery,
          notifications,
          performance: {
            executionTime,
            cacheHit: false,
            operationsCount: 2
          }
        });
        
      } finally {
        this.markOperationAsCompleted(context.playerId, operationId);
      }
      
    } catch (error) {
      this.emit('error', error);
      this.updatePerformanceStats(Date.now() - startTime, false);
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`❌ [PokedexIntegrationService] Erreur handleEvolution:`, error);
      
      return this.createFailureResult(errorMessage);
    }
  }
  
  // ===== HOOKS POUR INTÉGRATION EXTERNE =====
  
  /**
   * Hook optimisé pour OwnedPokemon lors de la création
   */
  async onOwnedPokemonCreated(
    ownedPokemon: any, // TODO: Typer avec IOwnedPokemon quand disponible
    context?: {
      location?: string;
      method?: string;
      weather?: string;
      timeOfDay?: string;
      captureTime?: number;
      isFirstAttempt?: boolean;
    }
  ): Promise<void> {
    try {
      if (!ownedPokemon || !ownedPokemon.owner || !ownedPokemon.pokemonId) {
        this.debugLog('⚠️ Données OwnedPokemon invalides pour intégration');
        return;
      }
      
      // Intégration asynchrone pour ne pas bloquer la création
      setImmediate(async () => {
        try {
          await this.handlePokemonCapture({
            playerId: ownedPokemon.owner,
            pokemonId: ownedPokemon.pokemonId,
            level: ownedPokemon.level || 1,
            location: context?.location || 'Unknown',
            method: (context?.method as any) || 'wild',
            weather: context?.weather,
            timeOfDay: context?.timeOfDay,
            ownedPokemonId: ownedPokemon._id?.toString() || ownedPokemon.id,
            isShiny: ownedPokemon.shiny || false,
            captureTime: context?.captureTime,
            isFirstAttempt: context?.isFirstAttempt
          });
        } catch (error) {
          console.error(`❌ [PokedexIntegrationService] Erreur onOwnedPokemonCreated async:`, error);
        }
      });
      
    } catch (error) {
      console.error(`❌ [PokedexIntegrationService] Erreur onOwnedPokemonCreated:`, error);
    }
  }
  
  /**
   * Hook pour les rencontres de combat sauvage
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
      biome?: string;
      difficulty?: number;
    }
  ): Promise<void> {
    try {
      // Validation rapide
      if (!playerId || !pokemonId || pokemonId < 1) {
        return;
      }
      
      // Intégration asynchrone
      setImmediate(async () => {
        try {
          await this.handlePokemonEncounter({
            playerId,
            pokemonId,
            level: Math.max(1, Math.min(100, level)),
            location: location || 'Wild Area',
            method: 'wild',
            weather: context?.weather,
            timeOfDay: context?.timeOfDay,
            sessionId: context?.sessionId,
            biome: context?.biome,
            difficulty: context?.difficulty
          });
        } catch (error) {
          console.error(`❌ [PokedexIntegrationService] Erreur onWildPokemonEncountered async:`, error);
        }
      });
      
    } catch (error) {
      console.error(`❌ [PokedexIntegrationService] Erreur onWildPokemonEncountered:`, error);
    }
  }
  
  // ===== VALIDATION DES CONTEXTES =====
  
  private async validateEncounterContext(context: EncounterContext): Promise<{ isValid: boolean; error?: string }> {
    // Validation de base
    if (!context.playerId || context.playerId.trim().length === 0) {
      return { isValid: false, error: 'Player ID requis' };
    }
    
    if (!context.pokemonId || context.pokemonId < 1 || context.pokemonId > 2000) {
      return { isValid: false, error: 'Pokemon ID invalide' };
    }
    
    if (!context.level || context.level < 1 || context.level > 100) {
      return { isValid: false, error: 'Niveau invalide' };
    }
    
    if (!context.location || context.location.trim().length === 0) {
      return { isValid: false, error: 'Location requise' };
    }
    
    // Validation des énums
    const validMethods = ['wild', 'trainer', 'gift', 'trade', 'evolution', 'egg', 'special', 'raid', 'legendary'];
    if (!validMethods.includes(context.method)) {
      return { isValid: false, error: 'Méthode invalide' };
    }
    
    return { isValid: true };
  }
  
  private async validateCaptureContext(context: CaptureContext): Promise<{ isValid: boolean; error?: string }> {
    // Validation de base (hérite de encounter)
    const baseValidation = await this.validateEncounterContext(context);
    if (!baseValidation.isValid) return baseValidation;
    
    // Validations spécifiques à la capture
    if (!context.ownedPokemonId) {
      return { isValid: false, error: 'Owned Pokemon ID requis' };
    }
    
    if (!Types.ObjectId.isValid(context.ownedPokemonId)) {
      return { isValid: false, error: 'Format Owned Pokemon ID invalide' };
    }
    
    if (context.captureTime !== undefined && (context.captureTime < 0 || context.captureTime > 3600)) {
      return { isValid: false, error: 'Temps de capture invalide' };
    }
    
    return { isValid: true };
  }
  
  private async validateEvolutionContext(context: EvolutionContext): Promise<{ isValid: boolean; error?: string }> {
    if (!context.playerId || context.playerId.trim().length === 0) {
      return { isValid: false, error: 'Player ID requis' };
    }
    
    if (!context.fromPokemonId || !context.toPokemonId) {
      return { isValid: false, error: 'Pokemon IDs requis pour évolution' };
    }
    
    if (context.fromPokemonId === context.toPokemonId) {
      return { isValid: false, error: 'Pokémon source et cible identiques' };
    }
    
    if (!context.ownedPokemonId || !Types.ObjectId.isValid(context.ownedPokemonId)) {
      return { isValid: false, error: 'Owned Pokemon ID invalide' };
    }
    
    return { isValid: true };
  }
  
  // ===== GESTION DES DOUBLONS ET CACHE =====
  
  private isRecentEncounter(playerId: string, pokemonId: number): boolean {
    const playerEncounters = this.recentEncounters.get(playerId);
    if (!playerEncounters) return false;
    
    const lastEncounter = playerEncounters.get(pokemonId);
    if (!lastEncounter) return false;
    
    return (Date.now() - lastEncounter) < this.config.duplicateWindow;
  }
  
  private markAsRecentEncounter(playerId: string, pokemonId: number): void {
    if (!this.recentEncounters.has(playerId)) {
      this.recentEncounters.set(playerId, new Map());
    }
    
    this.recentEncounters.get(playerId)!.set(pokemonId, Date.now());
  }
  
  private hasOngoingOperation(playerId: string, operationId: string): boolean {
    const playerOps = this.ongoingOperations.get(playerId);
    return playerOps?.has(operationId) || false;
  }
  
  private markOperationAsOngoing(playerId: string, operationId: string): void {
    if (!this.ongoingOperations.has(playerId)) {
      this.ongoingOperations.set(playerId, new Set());
    }
    this.ongoingOperations.get(playerId)!.add(operationId);
  }
  
  private markOperationAsCompleted(playerId: string, operationId: string): void {
    const playerOps = this.ongoingOperations.get(playerId);
    if (playerOps) {
      playerOps.delete(operationId);
      if (playerOps.size === 0) {
        this.ongoingOperations.delete(playerId);
      }
    }
  }
  
  private async getPokemonData(pokemonId: number): Promise<any> {
    if (this.pokemonDataCache.has(pokemonId)) {
      this.performanceStats.cacheHits++;
      return this.pokemonDataCache.get(pokemonId);
    }
    
    this.performanceStats.cacheMisses++;
    const data = await getPokemonById(pokemonId);
    
    if (data) {
      this.pokemonDataCache.set(pokemonId, data);
    }
    
    return data;
  }
  
  // ===== NOTIFICATIONS =====
  
  private async createEncounterNotifications(
    context: EncounterContext,
    pokemonData: any,
    isNewDiscovery: boolean
  ): Promise<void> {
    if (!isNewDiscovery) return;
    
    try {
      await pokedexNotificationService.createDiscoveryNotification(context.playerId, {
        pokemonId: context.pokemonId,
        pokemonName: pokemonData.name,
        isFirstDiscovery: true,
        isRare: pokemonData.rarity === 'rare',
        isLegendary: pokemonData.rarity === 'legendary',
        level: context.level,
        location: context.location
      });
    } catch (error) {
      console.error('❌ Erreur création notification discovery:', error);
    }
  }
  
  private async createCaptureNotifications(
    context: CaptureContext,
    pokemonData: any,
    captureResult: any
  ): Promise<void> {
    try {
      // Notification de capture
      await pokedexNotificationService.createCaptureNotification(context.playerId, {
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
        await pokedexNotificationService.createShinyNotification(context.playerId, {
          pokemonId: context.pokemonId,
          pokemonName: pokemonData.name,
          action: 'captured',
          location: context.location
        });
      }
    } catch (error) {
      console.error('❌ Erreur création notification capture:', error);
    }
  }
  
  // ===== ACCOMPLISSEMENTS ET MILESTONES =====
  
  private async checkDiscoveryAchievements(context: EncounterContext, pokemonData: any): Promise<string[]> {
    const achievements: string[] = [];
    
    // TODO: Implémenter système d'accomplissements complet
    // Pour l'instant, quelques vérifications basiques
    
    if (pokemonData.rarity === 'legendary') {
      achievements.push('👑 Accomplissement : Découvreur de Légendes !');
    }
    
    if (context.method === 'wild' && context.weather && pokemonData.preferredWeather?.includes(context.weather)) {
      achievements.push('🌤️ Accomplissement : Météo Parfaite !');
    }
    
    return achievements;
  }
  
  private async checkCaptureAchievements(context: CaptureContext, pokemonData: any): Promise<string[]> {
    const achievements: string[] = [];
    
    if (context.level >= 50) {
      achievements.push('📈 Accomplissement : Capture de Haut Niveau !');
    }
    
    if (context.captureTime && context.captureTime < 5) {
      achievements.push('⚡ Accomplissement : Capture Éclair !');
    }
    
    return achievements;
  }
  
  private async checkShinyAchievements(context: CaptureContext, pokemonData: any): Promise<string[]> {
    const achievements: string[] = [];
    
    achievements.push('✨ Accomplissement : Chasseur de Brillants !');
    
    if (pokemonData.rarity === 'legendary') {
      achievements.push('💎 Accomplissement : Légende Brillante !');
    }
    
    return achievements;
  }
  
  private async checkDiscoveryMilestones(playerId: string, pokemonData: any): Promise<string[]> {
    // TODO: Récupérer les stats du joueur et vérifier les milestones
    return [];
  }
  
  private async checkCaptureMilestones(playerId: string, pokemonData: any): Promise<string[]> {
    // TODO: Récupérer les stats du joueur et vérifier les milestones
    return [];
  }
  
  // ===== UTILITAIRES =====
  
  private generateOperationId(type: string, context: any): string {
    return `${type}_${context.playerId}_${context.pokemonId}_${Date.now()}`;
  }
  
  private createSuccessResult(data: Partial<IntegrationResult>): IntegrationResult {
    return {
      success: true,
      notifications: [],
      achievements: [],
      milestones: [],
      ...data
    };
  }
  
  private createFailureResult(error: string): IntegrationResult {
    return {
      success: false,
      notifications: [],
      achievements: [],
      milestones: [],
      error
    };
  }
  
  private updatePerformanceStats(executionTime: number, success: boolean): void {
    if (success) {
      this.performanceStats.successfulOperations++;
    } else {
      this.performanceStats.failedOperations++;
    }
    
    // Mise à jour moyenne temps d'exécution
    const totalOps = this.performanceStats.successfulOperations + this.performanceStats.failedOperations;
    this.performanceStats.averageExecutionTime = 
      (this.performanceStats.averageExecutionTime * (totalOps - 1) + executionTime) / totalOps;
  }
  
  private recordAnalyticsEvent(eventType: string, context: any, pokemonData?: any): void {
    // TODO: Implémenter système d'analytics complet
    this.debugLog(`📊 Analytics: ${eventType} - Pokemon #${context.pokemonId}`);
  }
  
  private debugLog(message: string): void {
    if (this.config.debugMode) {
      console.log(`🔧 [PokedexIntegration] ${message}`);
    }
  }
  
  private logPerformanceStats(): void {
    if (this.config.debugMode) {
      console.log('📈 [PokedexIntegrationService] Performance Stats:', {
        ...this.performanceStats,
        cacheHitRatio: this.performanceStats.cacheHits / (this.performanceStats.cacheHits + this.performanceStats.cacheMisses) * 100,
        successRate: this.performanceStats.successfulOperations / this.performanceStats.totalOperations * 100
      });
    }
  }
  
  // ===== NETTOYAGE ET MAINTENANCE =====
  
  private cleanupCache(): void {
    const now = Date.now();
    
    // Nettoyage des rencontres récentes
    for (const [playerId, encounters] of this.recentEncounters.entries()) {
      for (const [pokemonId, timestamp] of encounters.entries()) {
        if ((now - timestamp) > this.config.duplicateWindow * 2) {
          encounters.delete(pokemonId);
        }
      }
      
      if (encounters.size === 0) {
        this.recentEncounters.delete(playerId);
      }
    }
    
    // Nettoyage des opérations en cours anciennes (sécurité)
    for (const [playerId, operations] of this.ongoingOperations.entries()) {
      if (operations.size === 0) {
        this.ongoingOperations.delete(playerId);
      }
    }
    
    this.debugLog(`🧹 Cache nettoyé - Encounters: ${this.recentEncounters.size}, Operations: ${this.ongoingOperations.size}`);
  }
  
  private async processBatchQueue(): Promise<void> {
    if (this.operationQueue.length === 0) return;
    
    const batch = this.operationQueue.splice(0, this.config.batchSize);
    
    // TODO: Implémenter traitement en batch si nécessaire
    this.debugLog(`⚡ Traitement batch: ${batch.length} opérations`);
  }
  
  // ===== CONFIGURATION ET MONITORING =====
  
  updateConfig(newConfig: Partial<PokedexIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugLog('⚙️ Configuration mise à jour');
  }
  
  getConfig(): PokedexIntegrationConfig {
    return { ...this.config };
  }
  
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} [PokedexIntegrationService] Intégration ${enabled ? 'activée' : 'désactivée'}`);
  }
  
  getIntegrationStats(): any {
    return {
      isEnabled: this.config.enabled,
      config: this.config,
      performance: this.performanceStats,
      cacheStats: {
        recentEncounters: Array.from(this.recentEncounters.values()).reduce((sum, map) => sum + map.size, 0),
        ongoingOperations: Array.from(this.ongoingOperations.values()).reduce((sum, set) => sum + set.size, 0),
        pokemonDataCache: this.pokemonDataCache.size
      },
      queueSize: this.operationQueue.length
    };
  }
  
  clearCaches(): void {
    this.recentEncounters.clear();
    this.ongoingOperations.clear();
    this.pokemonDataCache.clear();
    this.operationQueue.length = 0;
    console.log('🧹 [PokedexIntegrationService] Tous les caches nettoyés');
  }
  
  clearPlayerData(playerId: string): void {
    this.recentEncounters.delete(playerId);
    this.ongoingOperations.delete(playerId);
    this.operationQueue = this.operationQueue.filter(op => 
      !op.context.playerId || op.context.playerId !== playerId
    );
    console.log(`🗑️ [PokedexIntegrationService] Données supprimées pour ${playerId}`);
  }
}

// ===== EXPORT SINGLETON =====
export const pokedexIntegrationService = PokedexIntegrationService.getInstance();
export default pokedexIntegrationService;
