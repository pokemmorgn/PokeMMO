// server/src/interactions/modules/npc/handlers/MerchantNpcHandler.ts
// Handler spécialisé pour les NPCs marchands - Support JSON + Tiled

import { Player } from "../../../../schema/PokeWorldState";
import { ShopManager } from "../../../../managers/ShopManager";

// ===== INTERFACES =====

interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  
  // Propriétés JSON
  type?: string;
  shopId?: string;
  shopType?: string;
  shopDialogueIds?: {
    shopOpen?: string[];
    shopClose?: string[];
    noMoney?: string[];
    purchaseSuccess?: string[];
    stockEmpty?: string[];
    bulkDiscount?: string[];
    vipWelcome?: string[];
  };
  shopConfig?: Record<string, any>;
  
  // Métadonnées
  sourceType?: 'tiled' | 'json';
  sourceFile?: string;
}

interface MerchantInteractionResult {
  success: boolean;
  type: "shop" | "error" | "dialogue";
  message?: string;
  shopId?: string;
  shopData?: any;
  lines?: string[];
  npcId?: number;
  npcName?: string;
  questProgress?: any[];
}

interface MerchantHandlerConfig {
  debugMode: boolean;
  defaultShopType: string;
  fallbackDialogues: {
    welcome: string[];
    error: string[];
    closed: string[];
  };
}

// ===== HANDLER PRINCIPAL =====

export class MerchantNpcHandler {
  
  private shopManager: ShopManager;
  private config: MerchantHandlerConfig;

  constructor(shopManager: ShopManager, config?: Partial<MerchantHandlerConfig>) {
    this.shopManager = shopManager;
    
    this.config = {
      debugMode: process.env.NODE_ENV === 'development',
      defaultShopType: 'pokemart',
      fallbackDialogues: {
        welcome: ["Bienvenue dans ma boutique !"],
        error: ["Ma boutique est temporairement fermée."],
        closed: ["Désolé, nous sommes fermés."]
      },
      ...config
    };
    
    this.log('info', '🛒 MerchantNpcHandler initialisé', { config: this.config });
  }

  // === MÉTHODE PRINCIPALE ===

  async handle(player: Player, npc: NpcData, npcId: number): Promise<MerchantInteractionResult> {
    const startTime = Date.now();
    
    try {
      this.log('info', `🛒 [Merchant] Traitement NPC ${npcId} pour ${player.name}`, {
        npcName: npc.name,
        sourceType: npc.sourceType,
        shopId: this.getShopId(npc)
      });
      
      // === VALIDATION ===
      if (!this.isMerchantNpc(npc)) {
        return this.createErrorResult(
          `NPC ${npcId} n'est pas un marchand`,
          npcId,
          npc.name
        );
      }
      
      const shopId = this.getShopId(npc);
      if (!shopId) {
        return this.createErrorResult(
          "Ce marchand n'a pas de boutique configurée",
          npcId,
          npc.name
        );
      }
      
      // === VÉRIFICATION SHOP ===
      const shopCatalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
      if (!shopCatalog) {
        this.log('error', `🛒 [Merchant] Shop ${shopId} introuvable`);
        return this.createErrorResult(
          "Boutique temporairement indisponible",
          npcId,
          npc.name
        );
      }
      
      // === RÉCUPÉRATION DIALOGUES ===
      const welcomeDialogues = this.getWelcomeDialogues(npc);
      
      // === CONSTRUCTION RÉPONSE ===
      const result: MerchantInteractionResult = {
        success: true,
        type: "shop",
        shopId: shopId,
        shopData: {
          shopInfo: shopCatalog.shopInfo,
          availableItems: shopCatalog.availableItems,
          playerGold: player.gold || 1000,
          playerLevel: player.level || 1,
          npcName: npc.name || "Marchand"
        },
        npcId: npcId,
        npcName: npc.name,
        lines: welcomeDialogues,
        message: `Bienvenue dans ${shopCatalog.shopInfo.name || 'la boutique'} !`
      };
      
      const processingTime = Date.now() - startTime;
      this.log('info', `✅ [Merchant] Shop ${shopId} ouvert`, { 
        itemCount: shopCatalog.availableItems.length,
        processingTime: `${processingTime}ms`
      });
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.log('error', `❌ [Merchant] Erreur traitement NPC ${npcId}`, {
        error: error instanceof Error ? error.message : error,
        processingTime: `${processingTime}ms`
      });
      
      return this.createErrorResult(
        "Erreur lors de l'ouverture de la boutique",
        npcId,
        npc.name
      );
    }
  }

  // === MÉTHODES DE DÉTECTION ===

  isMerchantNpc(npc: NpcData): boolean {
    // JSON : type explicite
    if (npc.type === 'merchant') return true;
    
    // JSON : shopId direct
    if (npc.shopId) return true;
    
    // Tiled : propriétés legacy
    if (npc.properties?.npcType === 'merchant') return true;
    if (npc.properties?.shopId || npc.properties?.shop) return true;
    
    return false;
  }

  private getShopId(npc: NpcData): string | null {
    // JSON : shopId direct (priorité)
    if (npc.shopId) return npc.shopId;
    
    // Tiled : propriétés legacy
    if (npc.properties?.shopId) return npc.properties.shopId;
    if (npc.properties?.shop) return npc.properties.shop;
    
    return null;
  }

  // === MÉTHODES DE DIALOGUE ===

  private getWelcomeDialogues(npc: NpcData): string[] {
    // JSON : dialogues structurés
    if (npc.shopDialogueIds?.shopOpen && npc.shopDialogueIds.shopOpen.length > 0) {
      return npc.shopDialogueIds.shopOpen;
    }
    
    // Tiled : dialogues dans properties
    if (npc.properties?.shopDialogue) {
      const dialogue = npc.properties.shopDialogue;
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    
    if (npc.properties?.dialogue) {
      const dialogue = npc.properties.dialogue;
      return Array.isArray(dialogue) ? dialogue : [dialogue];
    }
    
    // Fallback par type de shop
    return this.getDefaultDialogueByShopType(npc);
  }

  private getDefaultDialogueByShopType(npc: NpcData): string[] {
    const shopType = npc.shopType || npc.properties?.shopType || this.config.defaultShopType;
    
    const dialoguesByType: Record<string, string[]> = {
      'pokemart': [
        "Bienvenue au Poké Mart !",
        "Nous avons tout ce qu'il faut pour votre aventure !"
      ],
      'items': [
        "Bienvenue dans ma boutique d'objets !",
        "J'ai des objets rares et utiles !"
      ],
      'tms': [
        "Bienvenue chez le vendeur de CTs !",
        "Découvrez de nouvelles attaques pour vos Pokémon !"
      ],
      'berries': [
        "Bienvenue chez l'herboriste !",
        "Mes baies sont les plus fraîches de la région !"
      ],
      'clothes': [
        "Bienvenue dans ma boutique de vêtements !",
        "Trouvez le style qui vous convient !"
      ],
      'black_market': [
        "Psst... vous cherchez des objets rares ?",
        "J'ai ce qu'il vous faut... pour le bon prix."
      ]
    };
    
    return dialoguesByType[shopType] || this.config.fallbackDialogues.welcome;
  }

  // === MÉTHODES PUBLIQUES POUR SHOP TRANSACTIONS ===

  async handleShopTransaction(
    player: Player,
    npc: NpcData,
    action: 'buy' | 'sell',
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    newGold?: number;
    itemsChanged?: any[];
    shopStockChanged?: any[];
    dialogues?: string[];
  }> {
    
    const shopId = this.getShopId(npc);
    if (!shopId) {
      return {
        success: false,
        message: "Boutique non configurée"
      };
    }
    
    this.log('info', `🛒 [Transaction] ${action} ${quantity}x ${itemId} par ${player.name}`);
    
    try {
      const playerGold = player.gold || 1000;
      const playerLevel = player.level || 1;
      
      let result;
      if (action === 'buy') {
        result = await this.shopManager.buyItem(
          player.name,
          shopId,
          itemId,
          quantity,
          playerGold,
          playerLevel
        );
      } else {
        result = await this.shopManager.sellItem(
          player.name,
          shopId,
          itemId,
          quantity
        );
      }
      
      // Ajouter dialogues contextuels
      if (result.success) {
        result.dialogues = this.getTransactionDialogues(npc, action, 'success');
      } else {
        result.dialogues = this.getTransactionDialogues(npc, action, 'failure');
      }
      
      this.log('info', `${result.success ? '✅' : '❌'} [Transaction] ${action} résultat`, {
        success: result.success,
        message: result.message
      });
      
      return result;
      
    } catch (error) {
      this.log('error', `❌ [Transaction] Erreur ${action}`, error);
      return {
        success: false,
        message: "Erreur lors de la transaction",
        dialogues: this.getTransactionDialogues(npc, action, 'error')
      };
    }
  }

  private getTransactionDialogues(npc: NpcData, action: 'buy' | 'sell', result: 'success' | 'failure' | 'error'): string[] {
    // JSON : dialogues structurés
    if (npc.shopDialogueIds) {
      if (result === 'success' && action === 'buy' && npc.shopDialogueIds.purchaseSuccess) {
        return npc.shopDialogueIds.purchaseSuccess;
      }
      if (result === 'failure' && npc.shopDialogueIds.noMoney) {
        return npc.shopDialogueIds.noMoney;
      }
    }
    
    // Dialogues par défaut
    const defaultDialogues: Record<string, Record<string, string[]>> = {
      buy: {
        success: ["Merci pour votre achat !", "Revenez quand vous voulez !"],
        failure: ["Vous n'avez pas assez d'argent.", "Revenez avec plus d'or !"],
        error: ["Désolé, il y a eu un problème.", "Essayez à nouveau plus tard."]
      },
      sell: {
        success: ["Merci, cet objet m'intéresse !", "Voici votre argent."],
        failure: ["Je ne peux pas acheter cet objet.", "Désolé !"],
        error: ["Il y a eu un problème.", "Réessayez plus tard."]
      }
    };
    
    return defaultDialogues[action]?.[result] || ["Hmm..."];
  }

  // === MÉTHODES UTILITAIRES ===

  private createErrorResult(message: string, npcId: number, npcName?: string): MerchantInteractionResult {
    return {
      success: false,
      type: "error",
      message,
      npcId,
      npcName: npcName || `NPC #${npcId}`,
      lines: this.config.fallbackDialogues.error
    };
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.debugMode && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }

  // === MÉTHODES D'ADMINISTRATION ===

  getStats(): any {
    return {
      handlerType: 'merchant',
      config: this.config,
      version: '1.0.0',
      supportedFeatures: [
        'json_npcs',
        'tiled_npcs', 
        'shop_transactions',
        'contextual_dialogues',
        'shop_type_detection'
      ]
    };
  }

  debugNpc(npc: NpcData): void {
    console.log(`🔍 [MerchantNpcHandler] === DEBUG NPC ${npc.id} ===`);
    console.log(`📋 Nom: ${npc.name}`);
    console.log(`📦 Source: ${npc.sourceType} (${npc.sourceFile})`);
    console.log(`🛒 Est marchand: ${this.isMerchantNpc(npc)}`);
    console.log(`🏪 Shop ID: ${this.getShopId(npc)}`);
    console.log(`💬 Dialogues: ${JSON.stringify(this.getWelcomeDialogues(npc), null, 2)}`);
    console.log(`=======================================`);
  }
}
