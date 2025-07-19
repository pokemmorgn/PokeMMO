// src/interactions/modules/object/submodules/GroundItemSubModule.ts
// Sous-module pour gérer les objets au sol avec auto-détection + cooldowns MongoDB
// VERSION FINALE INTÉGRÉE

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { PlayerData, IPlayerData, ObjectStateEntry } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";
import { ObjectNameMapper, MappingResult } from "../utils/ObjectNameMapper";

/**
 * Sous-module pour les objets ramassables au sol avec système complet
 * Type: "ground_item"
 * 
 * FONCTIONNALITÉS COMPLÈTES :
 * - Auto-détection par nom : "pokeball" → "poke_ball"
 * - Intégration ItemDB pour validation
 * - Cooldowns par joueur stockés en MongoDB
 * - Configuration flexible (cooldownHours dans Tiled)
 * - Fallback avec suggestions si nom non reconnu
 * - Rétrocompatibilité avec itemId manuel
 * 
 * Gère :
 * - Objets brillants visibles (Pokéballs, potions, etc.)
 * - Cooldowns par joueur (24h par défaut, configurable)
 * - Persistance en base de données MongoDB
 * - Ajout automatique à l'inventaire
 */
export default class GroundItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "GroundItem";
  readonly version = "3.0.0"; // Version avec cooldowns MongoDB

  // === MÉTHODES PRINCIPALES ===

  canHandle(objectDef: ObjectDefinition): boolean {
    return objectDef.type === 'ground_item';
  }

  async handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `Ramassage objet au sol`, { 
        objectId: objectDef.id, 
        player: player.name,
        objectName: objectDef.name,
        zone: objectDef.zone,
        manualItemId: objectDef.itemId 
      });

      // === ÉTAPE 1 : AUTO-DÉTECTION PAR NOM ===
      
      let itemId: string;
      let autoDetected = false;
      let mappingResult: MappingResult | null = null;

      if (objectDef.itemId) {
        // Cas 1: itemId défini manuellement dans Tiled (rétrocompatibilité)
        itemId = objectDef.itemId;
        this.log('info', `ItemId manuel utilisé: ${itemId}`);
        
      } else {
        // Cas 2: Auto-détection par nom
        mappingResult = ObjectNameMapper.mapObjectName(objectDef.name);
        
        if (mappingResult.found && mappingResult.mapping) {
          itemId = mappingResult.mapping.itemId;
          autoDetected = true;
          
          this.log('info', `✅ Auto-détecté: "${objectDef.name}" → "${itemId}"`, {
            pocket: mappingResult.itemData?.pocket,
            price: mappingResult.itemData?.price
          });
          
        } else {
          // Cas 3: Objet non reconnu
          const processingTime = Date.now() - startTime;
          this.updateStats(false, processingTime);
          
          const suggestions = mappingResult.suggestions || [];
          const suggestionText = suggestions.length > 0 
            ? `Suggestions: ${suggestions.join(', ')}` 
            : 'Aucune suggestion disponible';
            
          this.log('warn', `❌ Objet non reconnu: "${objectDef.name}"`, { 
            suggestions,
            validationError: mappingResult.validationError
          });
          
          return this.createErrorResult(
            `Objet "${objectDef.name}" non reconnu. ${suggestionText}`,
            'UNKNOWN_OBJECT'
          );
        }
      }

      // === ÉTAPE 2 : RÉCUPÉRER LE JOUEUR DEPUIS MONGODB ===
      
      const playerDataDoc = await PlayerData.findOne({ username: player.name });
      if (!playerDataDoc) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('error', 'Joueur non trouvé en base', { player: player.name });
        return this.createErrorResult(
          "Données joueur non trouvées.",
          'PLAYER_NOT_FOUND'
        );
      }

      // Cast pour accéder aux méthodes personnalisées
      const playerData = playerDataDoc as IPlayerData;

      // === ÉTAPE 3 : VÉRIFIER LE COOLDOWN ===
      
      const canCollect = playerData.canCollectObject(objectDef.id, objectDef.zone);
      
      if (!canCollect) {
        const cooldownInfo = playerData.getObjectCooldownInfo(objectDef.id, objectDef.zone);
        const hoursRemaining = Math.ceil(cooldownInfo.cooldownRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.ceil((cooldownInfo.cooldownRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('info', `⏰ Cooldown actif pour objet`, {
          objectId: objectDef.id,
          player: player.name,
          hoursRemaining,
          minutesRemaining,
          nextAvailable: new Date(cooldownInfo.nextAvailableTime!).toISOString()
        });
        
        const timeText = hoursRemaining > 0 
          ? `${hoursRemaining}h ${minutesRemaining}min`
          : `${minutesRemaining}min`;
        
        return this.createErrorResult(
          `Cooldown actif. Disponible dans ${timeText}.`,
          'COOLDOWN_ACTIVE'
        );
      }

      // === ÉTAPE 4 : VALIDATION ET TRAITEMENT ===

      // Vérifier que l'item existe (double sécurité)
      if (!itemId) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Objet sans contenu valide.",
          'NO_ITEM_CONTENT'
        );
      }

      try {
        // Ajouter à l'inventaire du joueur
        const quantity = this.getProperty(objectDef, 'quantity', mappingResult?.mapping?.defaultQuantity || 1);
        await InventoryManager.addItem(player.name, itemId, quantity);
        
        this.log('info', `✅ Item ajouté à l'inventaire`, { 
          player: player.name,
          itemId, 
          quantity,
          autoDetected,
          source: autoDetected ? 'auto-detection' : 'manual'
        });

        // === ÉTAPE 5 : ENREGISTRER LE COOLDOWN ===
        
        const cooldownHours = this.getProperty(objectDef, 'cooldownHours', 24); // 24h par défaut
        await playerData.recordObjectCollection(objectDef.id, objectDef.zone, cooldownHours);
        
        this.log('info', `🕒 Cooldown enregistré`, {
          objectId: objectDef.id,
          zone: objectDef.zone,
          player: player.name,
          cooldownHours,
          nextAvailable: new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString()
        });

        // === ÉTAPE 6 : DÉTERMINER LA RARETÉ ===
        
        let rarity = this.getProperty(objectDef, 'rarity', 'common');
        
        // Si auto-détecté, calculer rareté depuis prix ItemDB
        if (autoDetected && mappingResult?.itemData) {
          rarity = ObjectNameMapper.calculateRarityFromPrice(mappingResult.itemData);
          this.log('info', `Rareté calculée depuis prix: ${rarity}`, {
            price: mappingResult.itemData.price
          });
        }

        // === SUCCÈS ===
        
        const processingTime = Date.now() - startTime;
        this.updateStats(true, processingTime);
        
        return this.createSuccessResult(
          "objectCollected",
          `Vous avez trouvé ${this.getDisplayName(objectDef, mappingResult)} !`,
          {
            objectId: objectDef.id.toString(),
            objectType: objectDef.type,
            collected: true,
            newState: "collected"
          },
          {
            metadata: {
              itemReceived: {
                itemId,
                quantity,
                rarity,
                autoDetected,
                pocket: mappingResult?.itemData?.pocket || 'items'
              },
              cooldown: {
                duration: cooldownHours,
                nextAvailable: Date.now() + cooldownHours * 60 * 60 * 1000,
                storedInMongoDB: true
              },
              processingTime,
              timestamp: Date.now(),
              detectionMethod: autoDetected ? 'name-mapping' : 'manual-itemId'
            }
          }
        );

      } catch (inventoryError) {
        // Erreur d'inventaire (inventaire plein, item invalide, etc.)
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('error', 'Erreur ajout inventaire', {
          error: inventoryError,
          itemId,
          player: player.name
        });
        
        return this.createErrorResult(
          inventoryError instanceof Error 
            ? inventoryError.message 
            : "Impossible d'ajouter l'objet à l'inventaire",
          'INVENTORY_ERROR'
        );
      }

    } catch (error) {
      // Erreur générale
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', 'Erreur traitement ground_item', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // === VALIDATION SPÉCIFIQUE (optionnelle) ===

  async validateAccess(
    player: Player, 
    objectDef: ObjectDefinition
  ): Promise<{ valid: boolean; reason?: string }> {
    
    // Vérifier les requirements si définis
    if (objectDef.requirements) {
      const req = objectDef.requirements;
      
      // Niveau requis
      if (req.level && player.level < req.level) {
        return {
          valid: false,
          reason: `Niveau ${req.level} requis (vous êtes niveau ${player.level})`
        };
      }
      
      // Badge requis
      if (req.badge) {
        // TODO: Implémenter vérification des badges
        this.log('info', `Badge requis: ${req.badge} (vérification non implémentée)`);
      }
      
      // Item requis en inventaire
      if (req.item) {
        try {
          const hasItem = await InventoryManager.getItemCount(player.name, req.item);
          if (hasItem <= 0) {
            return {
              valid: false,
              reason: `Objet requis: ${req.item}`
            };
          }
        } catch (error) {
          this.log('error', 'Erreur vérification item requis', error);
          return {
            valid: false,
            reason: `Impossible de vérifier les prérequis`
          };
        }
      }
      
      // Quête requise
      if (req.quest) {
        // TODO: Implémenter vérification des quêtes
        this.log('info', `Quête requise: ${req.quest} (vérification non implémentée)`);
      }
    }
    
    return { valid: true };
  }

  // === HOOK POST-SUCCÈS (optionnel) ===

  async onInteractionSuccess(
    player: Player, 
    objectDef: ObjectDefinition, 
    result: ObjectInteractionResult
  ): Promise<void> {
    
    // Log analytics avec détails de l'auto-détection et cooldown
    const metadata = result.data?.metadata;
    
    this.log('info', '🎉 Objet collecté avec succès', {
      player: player.name,
      objectId: objectDef.id,
      objectName: objectDef.name,
      itemId: metadata?.itemReceived?.itemId,
      autoDetected: metadata?.itemReceived?.autoDetected,
      detectionMethod: metadata?.detectionMethod,
      pocket: metadata?.itemReceived?.pocket,
      cooldownHours: metadata?.cooldown?.duration,
      zone: objectDef.zone
    });
    
    // TODO: Ici on pourrait :
    // - Envoyer des events pour analytics
    // - Déclencher des achievements selon la rareté
    // - Notifier d'autres systèmes
    // - Jouer des sons/effets spéciaux selon la rareté
    // - Logger pour système anti-cheat (fréquence de collecte)
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  /**
   * Obtenir le nom d'affichage de l'objet
   */
  private getDisplayName(objectDef: ObjectDefinition, mappingResult: MappingResult | null): string {
    // Si auto-détecté, utiliser le nom original de l'objet
    if (mappingResult?.found) {
      return objectDef.name || mappingResult.mapping!.itemId;
    }
    
    // Sinon utiliser le nom de l'objet ou l'itemId
    return objectDef.name || objectDef.itemId || `Objet #${objectDef.id}`;
  }

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION ===

  /**
   * Tester l'auto-détection pour un nom donné
   */
  testAutoDetection(objectName: string): MappingResult {
    const result = ObjectNameMapper.mapObjectName(objectName);
    
    this.log('info', `Test auto-détection: "${objectName}"`, {
      found: result.found,
      itemId: result.mapping?.itemId,
      suggestions: result.suggestions,
      validationError: result.validationError
    });
    
    return result;
  }

  /**
   * Vérifier le cooldown d'un joueur pour un objet
   */
  async checkPlayerCooldown(
    playerName: string, 
    objectId: number, 
    zone: string
  ): Promise<{
    canCollect: boolean;
    cooldownRemaining: number;
    nextAvailableTime?: number;
    lastCollectedTime?: number;
  }> {
    try {
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc) {
        return { canCollect: true, cooldownRemaining: 0 };
      }
      
      const playerData = playerDataDoc as IPlayerData;
      return playerData.getObjectCooldownInfo(objectId, zone);
    } catch (error) {
      this.log('error', 'Erreur vérification cooldown', { error, playerName, objectId, zone });
      return { canCollect: true, cooldownRemaining: 0 };
    }
  }

  /**
   * Réinitialiser le cooldown d'un joueur pour un objet (admin)
   */
  async resetPlayerCooldown(
    playerName: string, 
    objectId: number, 
    zone: string
  ): Promise<boolean> {
    try {
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc) {
        this.log('warn', 'Joueur non trouvé pour reset cooldown', { playerName });
        return false;
      }
      
      const playerData = playerDataDoc as IPlayerData;
      
      // Retirer l'état d'objet spécifique
      const initialLength = playerData.objectStates.length;
      
      // Utiliser splice pour modifier le DocumentArray correctement
      const indicesToRemove: number[] = [];
      playerData.objectStates.forEach((state: ObjectStateEntry, index: number) => {
        if (state.objectId === objectId && state.zone === zone) {
          indicesToRemove.push(index);
        }
      });
      
      // Supprimer en ordre inverse pour ne pas décaler les indices
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        playerData.objectStates.splice(indicesToRemove[i], 1);
      }
      
      if (playerData.objectStates.length !== initialLength) {
        await playerData.save();
        this.log('info', 'Cooldown réinitialisé', { playerName, objectId, zone });
        return true;
      }
      
      this.log('info', 'Aucun cooldown à réinitialiser', { playerName, objectId, zone });
      return false;
      
    } catch (error) {
      this.log('error', 'Erreur reset cooldown', { error, playerName, objectId, zone });
      return false;
    }
  }

  /**
   * Obtenir tous les cooldowns actifs d'un joueur
   */
  async getPlayerCooldowns(playerName: string): Promise<Array<{
    objectId: number;
    zone: string;
    hoursRemaining: number;
    nextAvailable: Date;
  }>> {
    try {
      const playerDataDoc = await PlayerData.findOne({ username: playerName });
      if (!playerDataDoc || !playerDataDoc.objectStates.length) {
        return [];
      }
      
      const playerData = playerDataDoc as IPlayerData;
      const now = Date.now();
      
      return playerData.objectStates
        .filter((state: ObjectStateEntry) => state.nextAvailableTime > now)
        .map((state: ObjectStateEntry) => ({
          objectId: state.objectId,
          zone: state.zone,
          hoursRemaining: Math.ceil((state.nextAvailableTime - now) / (1000 * 60 * 60)),
          nextAvailable: new Date(state.nextAvailableTime)
        }));
        
    } catch (error) {
      this.log('error', 'Erreur récupération cooldowns', { error, playerName });
      return [];
    }
  }

  /**
   * Nettoyer les cooldowns expirés de tous les joueurs (tâche de maintenance)
   */
  async cleanupAllExpiredCooldowns(): Promise<{
    playersProcessed: number;
    cooldownsRemoved: number;
    errors: number;
  }> {
    let playersProcessed = 0;
    let cooldownsRemoved = 0;
    let errors = 0;
    
    try {
      // Traiter par batch pour éviter la surcharge mémoire
      const batchSize = 100;
      let skip = 0;
      
      while (true) {
        const players = await PlayerData.find({
          'objectStates.0': { $exists: true } // Seulement ceux avec des objectStates
        })
        .skip(skip)
        .limit(batchSize)
        .exec();
        
        if (players.length === 0) break;
        
        for (const playerDoc of players) {
          try {
            const player = playerDoc as IPlayerData;
            const initialCount = player.objectStates.length;
            await player.cleanupExpiredCooldowns();
            const finalCount = player.objectStates.length;
            
            cooldownsRemoved += initialCount - finalCount;
            playersProcessed++;
            
          } catch (playerError) {
            this.log('error', 'Erreur nettoyage joueur', { 
              error: playerError, 
              player: playerDoc.username 
            });
            errors++;
          }
        }
        
        skip += batchSize;
      }
      
      this.log('info', 'Nettoyage cooldowns terminé', {
        playersProcessed,
        cooldownsRemoved,
        errors
      });
      
    } catch (error) {
      this.log('error', 'Erreur nettoyage global cooldowns', error);
      errors++;
    }
    
    return { playersProcessed, cooldownsRemoved, errors };
  }

  // === STATISTIQUES SPÉCIALISÉES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'GroundItem',
      version: this.version,
      features: [
        'auto_detection_by_name',
        'itemdb_integration',
        'inventory_integration',
        'mongodb_cooldowns',
        'per_player_cooldowns',
        'configurable_cooldown_duration',
        'requirements_validation',
        'rarity_calculation',
        'error_handling_with_suggestions',
        'admin_cooldown_management'
      ],
      storageMethod: 'mongodb_player_document'
    };
  }

  // === SANTÉ DU MODULE ===

  getHealth() {
    const baseHealth = super.getHealth();
    
    // Test de santé de l'auto-détection et MongoDB
    let autoDetectionHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let mongodbHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    try {
      // Test rapide de l'auto-détection
      const testResult = ObjectNameMapper.mapObjectName("pokeball");
      if (!testResult.found) {
        autoDetectionHealth = 'critical';
      }
      
      // Test validation ItemDB
      const validation = ObjectNameMapper.validateAllMappings();
      if (validation.invalid > 0) {
        autoDetectionHealth = validation.invalid > validation.valid ? 'critical' : 'warning';
      }
      
    } catch (error) {
      autoDetectionHealth = 'critical';
    }
    
    // Test MongoDB (asynchrone mais on fait un test simple)
    try {
      // Test basique de disponibilité MongoDB via PlayerData
      if (!PlayerData) {
        mongodbHealth = 'critical';
      }
    } catch (error) {
      mongodbHealth = 'critical';
    }
    
    const details = {
      ...baseHealth.details,
      inventoryManagerAvailable: !!InventoryManager,
      objectNameMapperAvailable: !!ObjectNameMapper,
      playerDataModelAvailable: !!PlayerData,
      autoDetectionHealth,
      mongodbHealth,
      lastSuccessfulInteraction: this.stats.lastInteraction
    };
    
    // Santé globale basée sur la pire santé
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, autoDetectionHealth, mongodbHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, autoDetectionHealth, mongodbHealth].includes('warning') 
          ? 'warning' 
          : 'healthy';
    
    return {
      ...baseHealth,
      status: globalHealth,
      details
    };
  }

  // === INITIALISATION SPÉCIALISÉE ===

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Vérifier que InventoryManager est disponible
    if (!InventoryManager) {
      throw new Error('InventoryManager non disponible');
    }
    
    // Vérifier que PlayerData est disponible
    if (!PlayerData) {
      throw new Error('PlayerData model non disponible');
    }
    
    // Vérifier que ObjectNameMapper fonctionne
    try {
      const testResult = ObjectNameMapper.mapObjectName("pokeball");
      if (!testResult.found) {
        this.log('warn', 'Auto-détection ne fonctionne pas correctement lors de l\'initialisation');
      }
    } catch (error) {
      throw new Error(`ObjectNameMapper non fonctionnel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    // Test validation ItemDB
    const validation = ObjectNameMapper.validateAllMappings();
    if (validation.invalid > 0) {
      this.log('warn', `${validation.invalid} mappings invalides détectés`, {
        errors: validation.errors.slice(0, 3) // Premiers 3 erreurs
      });
    }
    
    this.log('info', 'GroundItemSubModule avec cooldowns MongoDB initialisé', {
      validMappings: validation.valid,
      invalidMappings: validation.invalid,
      inventoryManagerReady: !!InventoryManager,
      playerDataModelReady: !!PlayerData,
      storageMethod: 'mongodb'
    });
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage GroundItemSubModule avec cooldowns MongoDB');
    
    // Optionnel : Nettoyer les cooldowns expirés avant arrêt
    try {
      const cleanupResult = await this.cleanupAllExpiredCooldowns();
      this.log('info', 'Nettoyage final cooldowns', cleanupResult);
    } catch (error) {
      this.log('warn', 'Erreur nettoyage final cooldowns', error);
    }
    
    await super.cleanup();
  }
}

// ✅ EXEMPLE D'UTILISATION AVEC COOLDOWNS MONGODB

/*
// Dans Tiled, pour créer un objet au sol avec cooldown personnalisé :
{
  "id": 1,
  "name": "pokeball",              // ← AUTO-DÉTECTION : "pokeball" → "poke_ball"
  "type": "ground_item",           // ← Type requis
  "x": 400,
  "y": 200,
  "properties": [
    {"name": "type", "value": "ground_item"},
    {"name": "quantity", "value": 1},          // Optionnel
    {"name": "cooldownHours", "value": 6}      // ← COOLDOWN : 6 heures au lieu de 24h
  ]
}

// Côté client (Phaser), pour interagir :
this.socket.emit("objectInteract", { 
  objectId: "1" 
});

// Résultat avec cooldown :
{
  "success": true,
  "type": "objectCollected",
  "message": "Vous avez trouvé pokeball !",
  "data": {
    "objectData": {
      "objectId": "1",
      "objectType": "ground_item", 
      "collected": true,
      "newState": "collected"
    },
    "metadata": {
      "itemReceived": {
        "itemId": "poke_ball",
        "quantity": 1,
        "rarity": "common",
        "autoDetected": true,
        "pocket": "balls"
      },
      "cooldown": {
        "duration": 6,                    // 6 heures
        "nextAvailable": 1234567890123,   // Timestamp
        "storedInMongoDB": true
      },
      "detectionMethod": "name-mapping",
      "processingTime": 15,
      "timestamp": 1234567890
    }
  }
}

// Si interaction pendant cooldown :
{
  "success": false,
  "type": "error",
  "message": "Cooldown actif. Disponible dans 3h 25min.",
  "data": {
    "metadata": {
      "errorCode": "COOLDOWN_ACTIVE"
    }
  }
}

// Méthodes admin disponibles :
const module = new GroundItemSubModule();

// Vérifier cooldown joueur
await module.checkPlayerCooldown("alice", 83, "road1");

// Reset cooldown (admin)
await module.resetPlayerCooldown("alice", 83, "road1");

// Voir tous cooldowns actifs
await module.getPlayerCooldowns("alice");

// Nettoyage global (tâche cron)
await module.cleanupAllExpiredCooldowns();
*/
