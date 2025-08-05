// src/interactions/modules/object/submodules/GroundItemSubModule.ts
// VERSION COMPLÈTE AVEC PATCH DE NORMALISATION DES ITEM IDs

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { PlayerData, IPlayerData, ObjectStateEntry } from "../../../../models/PlayerData";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";

// ✅ IMPORT SIMPLIFIÉ : Juste pour validation
import { ItemService } from "../../../../services/ItemService";

// ✅ IMPORT QuestManager pour progression automatique
import { QuestManager } from "../../../../managers/QuestManager";

export default class GroundItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "GroundItem";
  readonly version = "4.1.0"; // ✨ Version avec normalisation automatique des IDs

  // ✅ Instance QuestManager
  private questManager: QuestManager | null = null;

  canHandle(objectDef: ObjectDefinition): boolean {
    return objectDef.type === 'ground_item';
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Normalise un itemID selon les conventions
   */
  private normalizeItemId(itemId: string): string {
    if (!itemId) return itemId;
    
    return itemId
      .toLowerCase()                    // Minuscules
      .replace(/\s+/g, '_')            // Espaces → underscores
      .replace(/[^a-z0-9_-]/g, '')     // Supprimer caractères spéciaux
      .replace(/_+/g, '_')             // Fusionner underscores multiples
      .replace(/^_|_$/g, '');          // Supprimer underscores de début/fin
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Vérification intelligente de l'existence d'un item
   */
  private async checkItemExists(itemId: string): Promise<{ exists: boolean; actualItemId?: string; itemData?: any }> {
    try {
      // 1. Essayer l'ID exact
      let exists = await ItemService.itemExists(itemId);
      if (exists) {
        const itemData = await ItemService.getItemById(itemId);
        return { exists: true, actualItemId: itemId, itemData };
      }

      // 2. Essayer l'ID normalisé
      const normalizedId = this.normalizeItemId(itemId);
      if (normalizedId !== itemId) {
        exists = await ItemService.itemExists(normalizedId);
        if (exists) {
          const itemData = await ItemService.getItemById(normalizedId);
          this.log('info', `🔧 Item trouvé avec ID normalisé: ${itemId} → ${normalizedId}`);
          return { exists: true, actualItemId: normalizedId, itemData };
        }
      }

      // 3. Essayer une recherche case-insensitive manuelle
      try {
        const { ItemData } = await import('../../../../models/ItemData');
        const item = await ItemData.findOne({ 
          itemId: { $regex: new RegExp(`^${itemId}$`, 'i') }, 
          isActive: true 
        });
        
        if (item) {
          this.log('info', `🔧 Item trouvé avec recherche insensible à la casse: ${itemId} → ${item.itemId}`);
          return { exists: true, actualItemId: item.itemId, itemData: item };
        }
      } catch (searchError) {
        this.log('warn', 'Erreur recherche case-insensitive', searchError);
      }

      return { exists: false };

    } catch (error) {
      this.log('error', 'Erreur vérification existence item', { error, itemId });
      return { exists: false };
    }
  }

  async handle(
    player: Player, 
    objectDef: ObjectDefinition, 
    actionData?: any
  ): Promise<ObjectInteractionResult> {
    
    const startTime = Date.now();
    
    try {
      this.log('info', `🎯 Ramassage objet avec validation ItemService`, { 
        objectId: objectDef.id, 
        player: player.name,
        itemId: objectDef.itemId,
        zone: objectDef.zone
      });

      const itemId = objectDef.itemId;
      
      if (!itemId) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        this.log('error', 'Objet sans itemId', { objectId: objectDef.id });
        return this.createErrorResult("Objet mal configuré.", 'INVALID_OBJECT');
      }

      // ✅ ÉTAPE 1 MODIFIÉE : VÉRIFICATION INTELLIGENTE DE L'ITEM
      const itemCheck = await this.checkItemExists(itemId);
      if (!itemCheck.exists) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        this.log('error', 'Item non trouvé même après normalisation', { 
          originalItemId: itemId, 
          normalizedItemId: this.normalizeItemId(itemId),
          objectId: objectDef.id 
        });
        return this.createErrorResult("Cet objet n'existe pas.", 'INVALID_ITEM');
      }

      // ✅ UTILISER L'ID CORRECT TROUVÉ
      const actualItemId = itemCheck.actualItemId!;
      const itemData = itemCheck.itemData;

      this.log('info', `✅ Item validé avec succès`, { 
        originalItemId: itemId,
        actualItemId,
        itemName: itemData?.name || 'Unknown',
        objectId: objectDef.id
      });

      // ✅ ÉTAPE 2 : RÉCUPÉRER LES DONNÉES JOUEUR
      const playerDataDoc = await PlayerData.findOne({ username: player.name });
      if (!playerDataDoc) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        this.log('error', 'Joueur non trouvé en base', { player: player.name });
        return this.createErrorResult("Données joueur non trouvées.", 'PLAYER_NOT_FOUND');
      }

      const playerData = playerDataDoc as IPlayerData;

      // ✅ ÉTAPE 3 : VÉRIFIER COOLDOWN (bypass en mode dev)
      const { getServerConfig } = require('../../../../config/serverConfig');
      const serverConfig = getServerConfig();

      if (serverConfig.bypassObjectCooldowns) {
        this.log('info', '🛠️ Mode dev: Bypass cooldown objet', {
          objectId: objectDef.id,
          player: player.name,
          zone: objectDef.zone
        });
      } else {
        const canCollect = playerData.canCollectObject(objectDef.id, objectDef.zone);
        
        if (!canCollect) {
          const cooldownInfo = playerData.getObjectCooldownInfo(objectDef.id, objectDef.zone);
          const hoursRemaining = Math.ceil(cooldownInfo.cooldownRemaining / (1000 * 60 * 60));
          const minutesRemaining = Math.ceil((cooldownInfo.cooldownRemaining % (1000 * 60 * 60)) / (1000 * 60));
          
          const processingTime = Date.now() - startTime;
          this.updateStats(false, processingTime);
          
          const timeText = hoursRemaining > 0 
            ? `${hoursRemaining}h ${minutesRemaining}min`
            : `${minutesRemaining}min`;
          
          return this.createErrorResult(
            `Cooldown actif. Disponible dans ${timeText}.`,
            'COOLDOWN_ACTIVE'
          );
        }
      }

      // ✅ ÉTAPE 4 MODIFIÉE : AJOUTER L'ITEM AVEC L'ID CORRECT
      try {
        const quantity = objectDef.quantity || 1;
        await InventoryManager.addItem(player.name, actualItemId, quantity);
        
        this.log('info', `✅ Item ajouté à l'inventaire`, { 
          player: player.name,
          originalItemId: itemId,
          actualItemId, 
          quantity
        });

      } catch (inventoryError) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        this.log('error', 'Erreur ajout inventaire', {
          error: inventoryError,
          originalItemId: itemId,
          actualItemId,
          player: player.name
        });
        
        return this.createErrorResult(
          inventoryError instanceof Error 
            ? inventoryError.message 
            : "Impossible d'ajouter l'objet à l'inventaire",
          'INVENTORY_ERROR'
        );
      }


      // ✅ ÉTAPE 6 : ENREGISTRER LE COOLDOWN
      const cooldownHours = this.getProperty(objectDef, 'cooldownHours', 24);

      if (!serverConfig.bypassObjectCooldowns) {
        await playerData.recordObjectCollection(objectDef.id, objectDef.zone, cooldownHours);
        
        this.log('info', `🕒 Cooldown enregistré`, {
          objectId: objectDef.id,
          zone: objectDef.zone,
          player: player.name,
          cooldownHours
        });
      }

      // ✅ ÉTAPE 7 MODIFIÉE : CONSTRUIRE LE RÉSULTAT AVEC LES BONNES DONNÉES
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);
      
      return this.createSuccessResult(
      "objectCollected",
      `${itemData?.name || actualItemId} ajouté à l'inventaire !`,
      {
        objectId: objectDef.id.toString(),
        objectType: objectDef.type,
        collected: !serverConfig.bypassObjectCooldowns,
        newState: serverConfig.bypassObjectCooldowns ? "available" : "collected"
      },
      {
        metadata: {
          itemReceived: {
            itemId: actualItemId,
            originalItemId: itemId,
            quantity: objectDef.quantity || 1,
            name: itemData?.name || actualItemId,
            category: itemData?.category || 'unknown',
            addedToInventory: true,
            idWasNormalized: actualItemId !== itemId
          },
          
          cooldown: {
            duration: cooldownHours,
            nextAvailable: Date.now() + cooldownHours * 60 * 60 * 1000,
            storedInMongoDB: !serverConfig.bypassObjectCooldowns
          },
          
          processingTime,
          timestamp: Date.now(),
          
          questProgression: {
            automatic: true, // ✅ NOUVEAU : Indique que c'est automatique via InventoryManager
            source: "InventoryManager.addItem"
          }
        }
      }
    );

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      this.log('error', '❌ Erreur traitement ground_item', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'PROCESSING_FAILED'
      );
    }
  }

  // ✅ MÉTHODE : Initialisation QuestManager
  private async initializeQuestManager(): Promise<void> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { QuestManager } = await import('../../../../managers/QuestManager');
      
      // Utiliser l'instance singleton ou créer une nouvelle instance
      this.questManager = new QuestManager();
      
      // Attendre que le QuestManager soit initialisé
      await this.questManager.initialize();
      
      // Vérifier que les quêtes sont chargées
      const loaded = await this.questManager.waitForLoad(5000); // 5s timeout
      
      if (loaded) {
        this.log('info', '🎯 QuestManager initialisé avec succès pour GroundItem', {
          questsLoaded: true
        });
      } else {
        this.log('warn', '⚠️ QuestManager chargement incomplet', {
          questsLoaded: false
        });
        this.questManager = null; // Désactiver si pas prêt
      }

    } catch (error) {
      this.log('warn', 'Impossible d\'initialiser QuestManager (non bloquant)', {
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      this.questManager = null;
    }
  }

  // === MÉTHODES PUBLIQUES POUR ADMINISTRATION ===

  async validateAccess(
    player: Player, 
    objectDef: ObjectDefinition
  ): Promise<{ valid: boolean; reason?: string }> {
    
    if (objectDef.requirements) {
      const req = objectDef.requirements;
      
      if (req.level && player.level < req.level) {
        return {
          valid: false,
          reason: `Niveau ${req.level} requis (vous êtes niveau ${player.level})`
        };
      }
      
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
    }
    
    return { valid: true };
  }

  async onInteractionSuccess(
    player: Player, 
    objectDef: ObjectDefinition, 
    result: ObjectInteractionResult
  ): Promise<void> {
    
    const metadata = result.data?.metadata;
    
    this.log('info', '🎉 Objet collecté avec succès', {
      player: player.name,
      objectId: objectDef.id,
      itemId: objectDef.itemId,
      actualItemId: metadata?.itemReceived?.itemId,
      idWasNormalized: metadata?.itemReceived?.idWasNormalized,
      cooldownHours: metadata?.cooldown?.duration,
      zone: objectDef.zone,
      questProgressionAttempted: metadata?.questProgression?.attempted,
      questManagerReady: metadata?.questProgression?.questManagerAvailable
    });
  }

  // === MÉTHODES DE GESTION COOLDOWN ===

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
      
      const initialLength = playerData.objectStates.length;
      
      const indicesToRemove: number[] = [];
      playerData.objectStates.forEach((state: ObjectStateEntry, index: number) => {
        if (state.objectId === objectId && state.zone === zone) {
          indicesToRemove.push(index);
        }
      });
      
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

  async cleanupAllExpiredCooldowns(): Promise<{
    playersProcessed: number;
    cooldownsRemoved: number;
    errors: number;
  }> {
    let playersProcessed = 0;
    let cooldownsRemoved = 0;
    let errors = 0;
    
    try {
      const batchSize = 100;
      let skip = 0;
      
      while (true) {
        const players = await PlayerData.find({
          'objectStates.0': { $exists: true }
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

  // === NOUVELLES MÉTHODES DE DIAGNOSTIC ===

  /**
   * ✅ NOUVELLE : Diagnostique les incohérences d'IDs d'items
   */
  async diagnoseItemIdInconsistencies(): Promise<{
    total_objects_checked: number;
    inconsistencies_found: number;
    missing_items: Array<{ objectId: number; zone: string; itemId: string }>;
    case_mismatches: Array<{ objectId: number; zone: string; originalId: string; foundId: string }>;
    normalization_suggestions: Array<{ originalId: string; suggestedId: string }>;
  }> {
    const result = {
      total_objects_checked: 0,
      inconsistencies_found: 0,
      missing_items: [] as Array<{ objectId: number; zone: string; itemId: string }>,
      case_mismatches: [] as Array<{ objectId: number; zone: string; originalId: string; foundId: string }>,
      normalization_suggestions: [] as Array<{ originalId: string; suggestedId: string }>
    };

    try {
      // Récupérer tous les objets de type ground_item via le module parent
      const { GameObjectData } = await import('../../../../models/GameObjectData');
      const groundObjects = await GameObjectData.find({ 
        type: 'ground',
        itemId: { $exists: true } 
      });

      result.total_objects_checked = groundObjects.length;

      for (const obj of groundObjects) {
        const itemId = obj.itemId;
        if (!itemId) continue;

        // Vérifier avec notre méthode intelligente
        const itemCheck = await this.checkItemExists(itemId);
        
        if (!itemCheck.exists) {
          result.missing_items.push({
            objectId: obj.objectId,
            zone: obj.zone,
            itemId
          });
          result.inconsistencies_found++;
        } else if (itemCheck.actualItemId !== itemId) {
          result.case_mismatches.push({
            objectId: obj.objectId,
            zone: obj.zone,
            originalId: itemId,
            foundId: itemCheck.actualItemId!
          });
          result.inconsistencies_found++;
        }

        // Suggérer normalisation si nécessaire
        const normalizedId = this.normalizeItemId(itemId);
        if (normalizedId !== itemId) {
          result.normalization_suggestions.push({
            originalId: itemId,
            suggestedId: normalizedId
          });
        }
      }

      this.log('info', 'Diagnostic terminé', result);
      return result;

    } catch (error) {
      this.log('error', 'Erreur diagnostic', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVELLE : Auto-répare les incohérences détectées
   */
  async autoFixItemIdInconsistencies(dryRun: boolean = true): Promise<{
    fixes_applied: number;
    errors: string[];
    changes: Array<{ objectId: number; zone: string; oldId: string; newId: string }>;
  }> {
    const result = {
      fixes_applied: 0,
      errors: [] as string[],
      changes: [] as Array<{ objectId: number; zone: string; oldId: string; newId: string }>
    };

    try {
      const diagnostic = await this.diagnoseItemIdInconsistencies();
      
      if (!dryRun) {
        const { GameObjectData } = await import('../../../../models/GameObjectData');
        
        // Réparer les case mismatches
        for (const mismatch of diagnostic.case_mismatches) {
          try {
            const obj = await GameObjectData.findOne({
              zone: mismatch.zone,
              objectId: mismatch.objectId
            });
            
            if (obj) {
              obj.itemId = mismatch.foundId;
              await obj.save();
              
              result.changes.push({
                objectId: mismatch.objectId,
                zone: mismatch.zone,
                oldId: mismatch.originalId,
                newId: mismatch.foundId
              });
              result.fixes_applied++;
            }
          } catch (error) {
            result.errors.push(`Fix ${mismatch.zone}:${mismatch.objectId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        // Mode dry run - juste compter les changements potentiels
        result.changes = diagnostic.case_mismatches.map(m => ({
          objectId: m.objectId,
          zone: m.zone,
          oldId: m.originalId,
          newId: m.foundId
        }));
      }

      this.log('info', `Auto-fix ${dryRun ? '(DRY RUN)' : 'APPLIED'}`, result);
      return result;

    } catch (error) {
      this.log('error', 'Erreur auto-fix', error);
      throw error;
    }
  }

  // === STATISTIQUES ===

  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      specializedType: 'GroundItem',
      version: this.version,
      features: [
        'itemservice_validation',
        'intelligent_item_id_resolution', // ✅ NOUVELLE FONCTIONNALITÉ
        'automatic_id_normalization',     // ✅ NOUVELLE FONCTIONNALITÉ
        'case_insensitive_search',        // ✅ NOUVELLE FONCTIONNALITÉ
        'inventory_integration',
        'mongodb_cooldowns',
        'per_player_cooldowns',
        'configurable_cooldown_duration',
        'requirements_validation',
        'admin_cooldown_management',
        'automatic_quest_progression',
        'diagnostic_tools'                // ✅ NOUVELLE FONCTIONNALITÉ
      ],
      integrations: {
        itemService: true,
        inventoryManager: true,
        questManager: !!this.questManager,
        playerData: true
      },
      storageMethod: 'mongodb_player_document',
      approach: 'intelligent_pickup_with_id_normalization' // ✅ APPROCHE MISE À JOUR
    };
  }

  getHealth() {
    const baseHealth = super.getHealth();
    
    let itemServiceHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    let questHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // ✅ Test ItemService
    try {
      if (!ItemService) {
        itemServiceHealth = 'critical';
      }
    } catch (error) {
      itemServiceHealth = 'critical';
    }

    // Health check QuestManager
    if (!this.questManager) {
      questHealth = 'warning'; // Non critique car non bloquant
    }
    
    const details = {
      ...baseHealth.details,
      // Services existants
      inventoryManagerAvailable: !!InventoryManager,
      playerDataModelAvailable: !!PlayerData,
      
      // ✅ Service ItemService
      itemServiceAvailable: !!ItemService,
      itemServiceHealth,
      
      // Quest system
      questManagerAvailable: !!this.questManager,
      questHealth,
      
      // ✅ Nouvelles capacités
      itemIdNormalizationEnabled: true,
      caseInsensitiveSearchEnabled: true,
      diagnosticToolsAvailable: true,
      
      lastSuccessfulInteraction: this.stats.lastInteraction
    };
    
    const globalHealth: 'healthy' | 'warning' | 'critical' = 
      [baseHealth.status, itemServiceHealth].includes('critical') 
        ? 'critical' 
        : [baseHealth.status, itemServiceHealth, questHealth].includes('warning') 
          ? 'warning' 
          : 'healthy';
    
    return {
      ...baseHealth,
      status: globalHealth,
      details
    };
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // ✅ Vérifier ItemService
    if (!ItemService) {
      throw new Error('ItemService non disponible');
    }
    
    if (!InventoryManager) {
      throw new Error('InventoryManager non disponible');
    }
    
    if (!PlayerData) {
      throw new Error('PlayerData model non disponible');
    }

    // Initialisation QuestManager (non bloquante)
    await this.initializeQuestManager();
    
    this.log('info', 'GroundItemSubModule avec normalisation automatique initialisé', {
      // Services existants
      inventoryManagerReady: !!InventoryManager,
      playerDataModelReady: !!PlayerData,
      
      // ✅ Service ItemService
      itemServiceReady: !!ItemService,
      
      // Quest system
      questManagerReady: !!this.questManager,
      
      // ✅ Nouvelles capacités
      itemIdNormalizationEnabled: true,
      caseInsensitiveSearchEnabled: true,
      diagnosticToolsEnabled: true,
      
      storageMethod: 'mongodb',
      approach: 'intelligent_pickup_with_id_normalization',
      version: this.version
    });
  }

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage GroundItemSubModule avec normalisation');
    
    try {
      const cleanupResult = await this.cleanupAllExpiredCooldowns();
      this.log('info', 'Nettoyage final cooldowns', cleanupResult);
    } catch (error) {
      this.log('warn', 'Erreur nettoyage final cooldowns', error);
    }

    // Cleanup QuestManager
    if (this.questManager) {
      try {
        this.questManager.cleanup();
        this.questManager = null;
        this.log('info', 'QuestManager nettoyé');
      } catch (error) {
        this.log('warn', 'Erreur nettoyage QuestManager', error);
      }
    }
    
    await super.cleanup();
  }
}
