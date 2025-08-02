// server/src/interactions/modules/npc/handlers/MerchantNpcHandler.ts
import { Player } from "../../../../schema/PokeWorldState";
import { ShopManager, ShopDefinition, ShopDataSource } from "../../../../managers/ShopManager";
import { ShopData, IShopData } from "../../../../models/ShopData";
import { DialogStringModel, SupportedLanguage } from "../../../../models/DialogString";

interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  type?: string;
  shopId?: string;
  nameKey?: string;
  sourceType?: 'tiled' | 'json' | 'mongodb';
  sourceFile?: string;
}

interface MerchantInteractionResult {
  success: boolean;
  type: "shop" | "error" | "dialogue";
  message?: string;
  messageKey?: string;
  shopId?: string;
  shopData?: {
    shopInfo: any;
    availableItems: any[];
    playerGold: number;
    playerLevel: number;
    npcName?: string;
    npcNameKey?: string;
  };
  lines?: string[];
  dialogueKeys?: string[];
  npcId?: number;
  npcName?: string;
  npcNameKey?: string;
  questProgress?: any[];
}

interface MerchantHandlerConfig {
  debugMode: boolean;
  enableLocalization: boolean;
  waitForShopManager: boolean;
  shopManagerTimeout: number;
  cacheShopData: boolean;
  cacheTTL: number;
  fallbackDialogues: {
    welcome: string[];
    welcomeKeys: string[];
    error: string[];
    errorKeys: string[];
    closed: string[];
    closedKeys: string[];
  };
}

export class MerchantNpcHandler {
  
  private shopManager: ShopManager;
  private config: MerchantHandlerConfig;
  private isShopManagerReady: boolean = false;
  private shopDataCache: Map<string, { data: IShopData; timestamp: number }> = new Map();

  constructor(shopManager: ShopManager, config?: Partial<MerchantHandlerConfig>) {
    this.shopManager = shopManager;
    
    this.config = {
      debugMode: process.env.NODE_ENV === 'development',
      enableLocalization: process.env.SHOP_LOCALIZATION !== 'false',
      waitForShopManager: true,
      shopManagerTimeout: 10000,
      cacheShopData: process.env.SHOP_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.SHOP_CACHE_TTL || '300000'),
      fallbackDialogues: {
        welcome: ["shop.dialogue.generic.welcome.1"],
        welcomeKeys: ["shop.dialogue.generic.welcome.1"],
        error: ["shop.error.temporarily_closed"],
        errorKeys: ["shop.error.temporarily_closed"],
        closed: ["shop.error.closed"],
        closedKeys: ["shop.error.closed"]
      },
      ...config
    };
    
    this.initializeShopManagerConnection();
  }

  private async initializeShopManagerConnection(): Promise<void> {
    if (!this.config.waitForShopManager) {
      this.isShopManagerReady = true;
      return;
    }

    try {
      const ready = await this.shopManager.waitForLoad(this.config.shopManagerTimeout);
      
      if (ready) {
        this.isShopManagerReady = true;
        this.shopManager.onShopChange((event, shopData) => {
          this.handleShopHotReload(event, shopData);
        });
      } else {
        this.isShopManagerReady = false;
      }
      
    } catch (error) {
      this.isShopManagerReady = false;
    }
  }

  private handleShopHotReload(event: string, shopData?: any): void {
    if (shopData?.id) {
      this.shopDataCache.delete(shopData.id);
    }
  }

  async handle(player: Player, npc: NpcData, npcId: number): Promise<MerchantInteractionResult> {
    try {
      if (!this.isMerchantNpc(npc)) {
        return this.createErrorResult(
          "shop.error.not_merchant",
          npcId,
          npc.nameKey || npc.name
        );
      }
      
      const shopId = this.getShopId(npc);
      if (!shopId) {
        return this.createErrorResult(
          "shop.error.no_shop_configured",
          npcId,
          npc.nameKey || npc.name
        );
      }

      if (!this.isShopManagerReady) {
        try {
          const ready = await this.shopManager.waitForLoad(2000);
          if (ready) {
            this.isShopManagerReady = true;
          }
        } catch (error) {
          return this.createErrorResult(
            "shop.error.system_unavailable",
            npcId,
            npc.nameKey || npc.name
          );
        }
      }
      
      const shopDataDocument = await this.loadShopData(shopId);
      if (!shopDataDocument) {
        return this.createErrorResult(
          "shop.error.temporarily_unavailable",
          npcId,
          npc.nameKey || npc.name
        );
      }
      
      const canAccess = shopDataDocument.isAccessibleToPlayer(
        player.level || 1,
        [],
        []
      );
      
      if (!canAccess) {
        return this.createErrorResult(
          "shop.error.access_denied",
          npcId,
          npc.nameKey || npc.name
        );
      }
      
      let shopCatalog;
      try {
        shopCatalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
      } catch (error) {
        shopCatalog = this.buildCatalogFromShopData(shopDataDocument, player.level || 1);
      }
      
      if (!shopCatalog) {
        return this.createErrorResult(
          "shop.error.catalog_unavailable",
          npcId,
          npc.nameKey || npc.name
        );
      }
      
      const welcomeDialogues = await this.getWelcomeDialoguesFromShopData(shopDataDocument);
      const welcomeKeys = this.getWelcomeDialogueKeysFromShopData(shopDataDocument);
      
      const result: MerchantInteractionResult = {
        success: true,
        type: "shop",
        shopId: shopId,
        shopData: {
          shopInfo: {
            ...shopCatalog.shopInfo,
            nameKey: shopDataDocument.nameKey,
            type: shopDataDocument.type,
            currency: shopDataDocument.currency
          },
          availableItems: shopCatalog.availableItems,
          playerGold: player.gold || 1000,
          playerLevel: player.level || 1,
          npcName: npc.name,
          npcNameKey: npc.nameKey || shopDataDocument.shopKeeper?.nameKey
        },
        npcId: npcId,
        npcName: npc.name,
        npcNameKey: npc.nameKey,
        lines: welcomeDialogues,
        dialogueKeys: welcomeKeys,
        messageKey: "shop.dialogue.welcome.default"
      };
      
      return result;
      
    } catch (error) {
      return this.createErrorResult(
        "shop.error.opening_failed",
        npcId,
        npc.nameKey || npc.name
      );
    }
  }

  private async loadShopData(shopId: string): Promise<IShopData | null> {
    if (this.config.cacheShopData) {
      const cached = this.shopDataCache.get(shopId);
      if (cached && (Date.now() - cached.timestamp) < this.config.cacheTTL) {
        return cached.data;
      }
    }
    
    try {
      const shopData = await ShopData.findOne({ 
        shopId: shopId, 
        isActive: true 
      });
      
      if (!shopData) {
        return null;
      }
      
      if (this.config.cacheShopData) {
        this.shopDataCache.set(shopId, {
          data: shopData,
          timestamp: Date.now()
        });
      }
      
      return shopData;
      
    } catch (error) {
      return null;
    }
  }

  private buildCatalogFromShopData(shopData: IShopData, playerLevel: number): any {
    const availableItems = shopData.items
      .filter(item => !item.unlockLevel || playerLevel >= item.unlockLevel)
      .map(item => ({
        itemId: item.itemId,
        name: item.itemId,
        category: item.category,
        buyPrice: item.basePrice || 0,
        sellPrice: Math.floor((item.basePrice || 0) * shopData.sellMultiplier),
        stock: item.stock,
        unlockLevel: item.unlockLevel,
        description: item.descriptionKey || `Description for ${item.itemId}`
      }));
    
    return {
      shopInfo: {
        id: shopData.shopId,
        nameKey: shopData.nameKey,
        name: shopData.nameKey,
        type: shopData.type,
        currency: shopData.currency,
        buyMultiplier: shopData.buyMultiplier,
        sellMultiplier: shopData.sellMultiplier
      },
      availableItems: availableItems
    };
  }

  private async getWelcomeDialoguesFromShopData(shopData: IShopData): Promise<string[]> {
    if (shopData.dialogues?.welcomeKeys && shopData.dialogues.welcomeKeys.length > 0) {
      try {
        const dialogStrings = await DialogStringModel.find({
          dialogId: { $in: shopData.dialogues.welcomeKeys },
          isActive: true
        });
        
        if (dialogStrings.length > 0) {
          return dialogStrings.map(d => d.getLocalizedText('fr'));
        }
      } catch (error) {
        // Fallback to keys
      }
      return shopData.dialogues.welcomeKeys;
    }
    
    return this.getDefaultDialogueByShopType(shopData.type);
  }

  private getWelcomeDialogueKeysFromShopData(shopData: IShopData): string[] {
    if (!this.config.enableLocalization) {
      return [];
    }

    if (shopData.dialogues?.welcomeKeys) {
      return shopData.dialogues.welcomeKeys;
    }
    
    const shopType = shopData.type;
    const shopId = shopData.shopId;
    
    return [
      `shop.dialogue.${shopId}.welcome.1`,
      `shop.dialogue.${shopType}.welcome.1`,
      `shop.dialogue.generic.welcome.1`,
      `shop.dialogue.${shopType}.welcome.2`,
      `shop.dialogue.generic.welcome.2`
    ];
  }

  isMerchantNpc(npc: NpcData): boolean {
    if (npc.type === 'merchant') return true;
    if (npc.shopId) return true;
    if (npc.properties?.npcType === 'merchant') return true;
    if (npc.properties?.shopId || npc.properties?.shop) return true;
    return false;
  }

  private getShopId(npc: NpcData): string | null {
    if (npc.shopId) return npc.shopId;
    if (npc.properties?.shopId) return npc.properties.shopId;
    if (npc.properties?.shop) return npc.properties.shop;
    return null;
  }

  private getDefaultDialogueByShopType(shopType: string): string[] {
    const dialoguesByType: Record<string, string[]> = {
      'pokemart': ["shop.dialogue.pokemart.welcome.1"],
      'department': ["shop.dialogue.department.welcome.1"],
      'specialist': ["shop.dialogue.specialist.welcome.1"],
      'gym_shop': ["shop.dialogue.gym_shop.welcome.1"],
      'contest_shop': ["shop.dialogue.contest_shop.welcome.1"],
      'game_corner': ["shop.dialogue.game_corner.welcome.1"],
      'black_market': ["shop.dialogue.black_market.welcome.1"],
      'trainer_shop': ["shop.dialogue.trainer_shop.welcome.1"],
      'temporary': ["shop.dialogue.temporary.welcome.1"],
      'vending_machine': ["shop.dialogue.vending_machine.welcome.1"]
    };
    
    return dialoguesByType[shopType] || this.config.fallbackDialogues.welcome;
  }

  async handleShopTransaction(
    player: Player,
    npc: NpcData,
    action: 'buy' | 'sell',
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    messageKey?: string;
    newGold?: number;
    itemsChanged?: any[];
    shopStockChanged?: any[];
    dialogues?: string[];
    dialogueKeys?: string[];
  }> {
    
    const shopId = this.getShopId(npc);
    if (!shopId) {
      return {
        success: false,
        message: "shop.error.not_configured",
        messageKey: "shop.error.not_configured"
      };
    }
    
    try {
      const shopData = await this.loadShopData(shopId);
      if (!shopData) {
        return {
          success: false,
          message: "shop.error.temporarily_unavailable",
          messageKey: "shop.error.temporarily_unavailable"
        };
      }

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
      
      const dialogues = result.success 
        ? await this.getTransactionDialoguesFromShopData(shopData, action, 'success')
        : await this.getTransactionDialoguesFromShopData(shopData, action, 'failure');

      const dialogueKeys = result.success 
        ? this.getTransactionDialogueKeysFromShopData(shopData, action, 'success')
        : this.getTransactionDialogueKeysFromShopData(shopData, action, 'failure');

      return {
        ...result,
        dialogues,
        dialogueKeys
      };
      
    } catch (error) {
      return {
        success: false,
        message: "shop.error.transaction_failed",
        messageKey: "shop.error.transaction_failed",
        dialogues: this.config.fallbackDialogues.error,
        dialogueKeys: this.config.fallbackDialogues.errorKeys
      };
    }
  }

  private async getTransactionDialoguesFromShopData(shopData: IShopData, action: 'buy' | 'sell', result: 'success' | 'failure' | 'error'): Promise<string[]> {
    const dialogues = shopData.dialogues;
    if (!dialogues) {
      return this.getDefaultTransactionDialogues(action, result);
    }

    const dialogueMap: Record<string, Record<string, string[] | undefined>> = {
      buy: {
        success: dialogues.purchaseKeys,
        failure: dialogues.notEnoughMoneyKeys,
        error: dialogues.restrictedKeys
      },
      sell: {
        success: dialogues.saleKeys,
        failure: dialogues.restrictedKeys,
        error: dialogues.restrictedKeys
      }
    };

    const keys = dialogueMap[action]?.[result];
    if (keys && keys.length > 0) {
      try {
        const dialogStrings = await DialogStringModel.find({
          dialogId: { $in: keys },
          isActive: true
        });
        
        if (dialogStrings.length > 0) {
          return dialogStrings.map(d => d.getLocalizedText('fr'));
        }
      } catch (error) {
        // Fallback to keys
      }
      return keys;
    }

    return this.getDefaultTransactionDialogues(action, result);
  }

  private getTransactionDialogueKeysFromShopData(shopData: IShopData, action: 'buy' | 'sell', result: 'success' | 'failure' | 'error'): string[] {
    if (!this.config.enableLocalization) {
      return [];
    }

    const dialogues = shopData.dialogues;
    if (dialogues) {
      const keyMap: Record<string, Record<string, string[] | undefined>> = {
        buy: {
          success: dialogues.purchaseKeys,
          failure: dialogues.notEnoughMoneyKeys,
          error: dialogues.restrictedKeys
        },
        sell: {
          success: dialogues.saleKeys,
          failure: dialogues.restrictedKeys,
          error: dialogues.restrictedKeys
        }
      };

      const keys = keyMap[action]?.[result];
      if (keys && keys.length > 0) {
        return keys;
      }
    }

    const shopType = shopData.type;
    const shopId = shopData.shopId;
    
    const defaultKeyMappings: Record<string, Record<string, string[]>> = {
      buy: {
        success: [
          `shop.dialogue.${shopId}.purchase.success.1`,
          `shop.dialogue.${shopType}.purchase.success.1`,
          `shop.dialogue.generic.purchase.success.1`
        ],
        failure: [
          `shop.dialogue.${shopId}.no_money.1`,
          `shop.dialogue.${shopType}.no_money.1`,
          `shop.dialogue.generic.no_money.1`
        ],
        error: [
          `shop.dialogue.${shopType}.error.1`,
          `shop.dialogue.generic.error.1`
        ]
      },
      sell: {
        success: [
          `shop.dialogue.${shopId}.sale.success.1`,
          `shop.dialogue.${shopType}.sale.success.1`,
          `shop.dialogue.generic.sale.success.1`
        ],
        failure: [
          `shop.dialogue.${shopType}.sale.failure.1`,
          `shop.dialogue.generic.sale.failure.1`
        ],
        error: [
          `shop.dialogue.${shopType}.error.1`,
          `shop.dialogue.generic.error.1`
        ]
      }
    };
    
    return defaultKeyMappings[action]?.[result] || [];
  }

  private getDefaultTransactionDialogues(action: 'buy' | 'sell', result: 'success' | 'failure' | 'error'): string[] {
    const defaultDialogues: Record<string, Record<string, string[]>> = {
      buy: {
        success: ["shop.dialogue.generic.purchase.success.1"],
        failure: ["shop.dialogue.generic.no_money.1"],
        error: ["shop.dialogue.generic.error.1"]
      },
      sell: {
        success: ["shop.dialogue.generic.sale.success.1"],
        failure: ["shop.dialogue.generic.sale.failure.1"],
        error: ["shop.dialogue.generic.error.1"]
      }
    };
    
    return defaultDialogues[action]?.[result] || ["shop.dialogue.generic.error.1"];
  }

  private createErrorResult(messageKey: string, npcId: number, npcName?: string): MerchantInteractionResult {
    return {
      success: false,
      type: "error",
      messageKey,
      npcId,
      npcName: npcName || `NPC #${npcId}`,
      npcNameKey: this.config.enableLocalization ? `npc.name.${npcId}` : undefined,
      lines: this.config.fallbackDialogues.error,
      dialogueKeys: this.config.enableLocalization ? this.config.fallbackDialogues.errorKeys : []
    };
  }

  getStats(): any {
    const shopManagerStats = this.isShopManagerReady ? this.shopManager.getSystemStats() : null;
    
    return {
      handlerType: 'merchant',
      version: '3.0.0',
      config: this.config,
      shopManagerReady: this.isShopManagerReady,
      shopDataCache: {
        size: this.shopDataCache.size,
        ttl: this.config.cacheTTL,
        enabled: this.config.cacheShopData
      },
      shopManagerStats: shopManagerStats ? {
        totalShops: shopManagerStats.totalShops,
        sources: shopManagerStats.sources,
        hotReload: shopManagerStats.hotReload
      } : null,
      supportedFeatures: [
        'shopdata_integration',
        'mongodb_direct_access',
        'shopdata_cache',
        'shop_transactions',
        'contextual_dialogues',
        'shop_type_detection',
        'localization_support',
        'hot_reload_support',
        'async_initialization'
      ]
    };
  }

  async waitForReady(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.isShopManagerReady && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.isShopManagerReady;
  }

  clearShopDataCache(): void {
    this.shopDataCache.clear();
  }

  async preloadShopData(shopId: string): Promise<boolean> {
    try {
      const shopData = await this.loadShopData(shopId);
      return !!shopData;
    } catch (error) {
      return false;
    }
  }
}
 * - getTransactionDialoguesFromShopData() : Dialogues transaction depuis ShopData
 * - Cache local ShopData avec TTL configurable
 * - Support complet des IDs de localisation depuis ShopData
 * - Méthodes debug améliorées avec ShopData
 * - Hot reload avec invalidation cache
 * 
 * 🔄 MODIFIÉ :
 * - handle() : Utilise ShopData comme source principale
 * - handleShopTransaction() : Intègre règles depuis ShopData
 * - isMerchantNpc() : Détection basée sur shopId simple
 * - getShopId() : Priorité au nouveau format shopId
 * 
 * ❌ RETIRÉ :
 * - Toute logique ShopConfig complexe
 * - Dépendance aux propriétés shop dans NpcData
 * - Génération manuelle de configurations shop
 * 
 * 🎯 RÉSULTAT :
 * - ShopData devient la source unique pour TOUTES les données shop
 * - Performance améliorée avec cache intelligent
 * - Cohérence garantie des données shop
 * - Facilite la maintenance et les mises à jour
 * - Support complet des fonctionnalités ShopData (horaires, restrictions, etc.)
 */
