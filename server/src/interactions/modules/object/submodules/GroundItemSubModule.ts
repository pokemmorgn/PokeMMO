// src/interactions/modules/object/submodules/GroundItemSubModule.ts
// Sous-module pour gérer les objets au sol (Pokéballs, potions, etc.)
// VERSION AVEC AUTO-DÉTECTION PAR NOM

import { Player } from "../../../../schema/PokeWorldState";
import { InventoryManager } from "../../../../managers/InventoryManager";
import { 
  BaseObjectSubModule, 
  ObjectDefinition, 
  ObjectInteractionResult 
} from "../core/IObjectSubModule";
import { ObjectNameMapper, MappingResult } from "../utils/ObjectNameMapper";

/**
 * Sous-module pour les objets ramassables au sol avec auto-détection intelligente
 * Type: "ground_item"
 * 
 * NOUVELLES FONCTIONNALITÉS :
 * - Auto-détection par nom : "pokeball" → "poke_ball"
 * - Intégration ItemDB pour validation
 * - Fallback avec suggestions si nom non reconnu
 * - Rétrocompatibilité avec itemId manuel
 * 
 * Gère :
 * - Objets brillants visibles (Pokéballs, potions, etc.)
 * - Vérification si déjà collecté
 * - Ajout automatique à l'inventaire
 * - Gestion du respawn (optionnel)
 */
export default class GroundItemSubModule extends BaseObjectSubModule {
  
  readonly typeName = "GroundItem";
  readonly version = "2.0.0"; // Version avec auto-détection

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
        manualItemId: objectDef.itemId 
      });

      // === NOUVELLE LOGIQUE : AUTO-DÉTECTION PAR NOM ===
      
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

      // === VALIDATION SPÉCIFIQUE ===
      
      // 1. Vérifier si déjà collecté
      if (objectDef.state.collected) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Cet objet a déjà été ramassé.",
          'ALREADY_COLLECTED'
        );
      }

      // 2. Vérifier que l'item existe (double vérification)
      if (!itemId) {
        const processingTime = Date.now() - startTime;
        this.updateStats(false, processingTime);
        
        return this.createErrorResult(
          "Objet sans contenu valide.",
          'NO_ITEM_CONTENT'
        );
      }

      // === TRAITEMENT PRINCIPAL ===

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

        // === PROGRAMMATION DU RESPAWN (si configuré) ===
        
        const respawnTime = this.getProperty(objectDef, 'respawnTime', 0);
        if (respawnTime > 0) {
          this.scheduleRespawn(objectDef, respawnTime);
          this.log('info', `⏰ Respawn programmé`, { 
            objectId: objectDef.id, 
            respawnTime 
          });
        }

        // === DÉTERMINER LA RARETÉ ===
        
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
    
    // Log analytics avec détails de l'auto-détection
    const metadata = result.data?.metadata;
    
    this.log('info', '🎉 Objet collecté avec succès', {
      player: player.name,
      objectId: objectDef.id,
      objectName: objectDef.name,
      itemId: metadata?.itemReceived?.itemId,
      autoDetected: metadata?.itemReceived?.autoDetected,
      detectionMethod: metadata?.detectionMethod,
      pocket: metadata?.itemReceived?.pocket,
      zone: objectDef.zone
    });
    
    // TODO: Ici on pourrait :
    // - Envoyer des events pour analytics
    // - Déclencher des achievements
    // - Notifier d'autres systèmes
    // - Jouer des sons/effets spéciaux selon la rareté
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

  /**
   * Programmer le respawn d'un objet
   */
  private scheduleRespawn(objectDef: ObjectDefinition, respawnTimeMs: number): void {
    setTimeout(() => {
      // Réinitialiser l'état de l'objet
      objectDef.state.collected = false;
      objectDef.state.lastCollectedTime = undefined;
      objectDef.state.collectedBy = [];
      
      this.log('info', `🔄 Objet respawné`, { 
        objectId: objectDef.id, 
        zone: objectDef.zone,
        name: objectDef.name
      });
      
    }, respawnTimeMs);
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
   * Obtenir les statistiques d'auto-détection
   */
  getAutoDetectionStats(): {
    totalInteractions: number;
    autoDetectedCount: number;
    manualItemIdCount: number;
    failedDetectionCount: number;
    autoDetectionRate: number;
  } {
    // Pour une vraie implémentation, il faudrait tracker ces stats
    // Ici c'est juste un exemple de structure
    
    const baseStats = this.getStats();
    
    // Simulation de stats (remplacer par vraie logique)
    const autoDetectedCount = Math.floor(baseStats.successfulInteractions * 0.7);
    const manualItemIdCount = baseStats.successfulInteractions - autoDetectedCount;
    const failedDetectionCount = Math.floor(baseStats.failedInteractions * 0.3);
    
    return {
      totalInteractions: baseStats.totalInteractions,
      autoDetectedCount,
      manualItemIdCount,
      failedDetectionCount,
      autoDetectionRate: baseStats.totalInteractions > 0 
        ? (autoDetectedCount / baseStats.totalInteractions) * 100 
        : 0
    };
  }

  // === STATISTIQUES SPÉCIALISÉES ===

  getStats() {
    const baseStats = super.getStats();
    const autoDetectionStats = this.getAutoDetectionStats();
    
    return {
      ...baseStats,
      specializedType: 'GroundItem',
      version: this.version,
      features: [
        'auto_detection_by_name',
        'itemdb_integration',
        'inventory_integration',
        'respawn_support', 
        'requirements_validation',
        'rarity_calculation',
        'error_handling_with_suggestions'
      ],
      autoDetection: autoDetectionStats
    };
  }

  // === SANTÉ DU MODULE ===

  getHealth() {
    const baseHealth = super.getHealth();
    
    // Test de santé de l'auto-détection
    let autoDetectionHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
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
    
    const details = {
      ...baseHealth.details,
      inventoryManagerAvailable: !!InventoryManager,
      objectNameMapperAvailable: !!ObjectNameMapper,
      autoDetectionHealth,
      lastSuccessfulInteraction: this.stats.lastInteraction
    };
    
    // Santé globale basée sur la pire santé
    const globalHealth = [baseHealth.status, autoDetectionHealth].includes('critical') 
      ? 'critical' 
      : [baseHealth.status, autoDetectionHealth].includes('warning') 
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
    
    this.log('info', 'GroundItemSubModule avec auto-détection initialisé', {
      validMappings: validation.valid,
      invalidMappings: validation.invalid,
      inventoryManagerReady: !!InventoryManager
    });
  }

  // === NETTOYAGE ===

  async cleanup(): Promise<void> {
    this.log('info', 'Nettoyage GroundItemSubModule avec auto-détection');
    
    // Ici on pourrait :
    // - Annuler les timers de respawn en cours
    // - Sauvegarder des stats d'auto-détection
    // - Libérer des ressources
    
    await super.cleanup();
  }
}

// ✅ EXEMPLE D'UTILISATION AVEC AUTO-DÉTECTION

/*
// Dans Tiled, pour créer un objet au sol avec auto-détection :
{
  "id": 1,
  "name": "pokeball",        // ← AUTO-DÉTECTION : "pokeball" → "poke_ball"
  "type": "ground_item",     // ← Type requis
  "x": 400,
  "y": 200,
  "properties": [
    {"name": "type", "value": "ground_item"},
    {"name": "quantity", "value": 1},        // Optionnel
    {"name": "respawnTime", "value": 300000} // Optionnel - 5 minutes
    // PLUS BESOIN de {"name": "itemId", "value": "poke_ball"} !
  ]
}

// Ou avec itemId manuel (rétrocompatibilité) :
{
  "id": 2,
  "name": "special_potion",
  "type": "ground_item",
  "properties": [
    {"name": "type", "value": "ground_item"},
    {"name": "itemId", "value": "max_potion"}, // ← Manuel, priorité
    {"name": "quantity", "value": 2}
  ]
}

// Côté client (Phaser), pour interagir :
this.socket.emit("objectInteract", { 
  objectId: "1" 
});

// Résultat avec auto-détection :
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
      "detectionMethod": "name-mapping",
      "processingTime": 12,
      "timestamp": 1234567890
    }
  }
}
*/
