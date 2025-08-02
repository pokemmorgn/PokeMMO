// server/src/interactions/modules/npc/handlers/MerchantNpcHandler.ts
import { Player } from "../../../../schema/PokeWorldState";
import { ShopManager } from "../../../../managers/ShopManager";
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
      
      const welcomeDialogues = await this.getWelcomeDialogues(shopDataDocument, player, 'fr');
      
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

  private async getWelcomeDialogues(shopData: IShopData, player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      const dialogPatterns = [
        `${shopData.shopId}.shop.welcome`,
        `${shopData.type}.shop.welcome`,
        `generic.shop.welcome`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          const text = dialogue.replaceVariables(language, player.name);
          return [text];
        }
      }

      return [`Bienvenue dans ma boutique, ${player.name} !`];
    } catch (error) {
      return [`Bienvenue dans ma boutique, ${player.name} !`];
    }
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
        message: "Boutique non configurée",
        messageKey: "shop.error.not_configured"
      };
    }
    
    try {
      const shopData = await this.loadShopData(shopId);
      if (!shopData) {
        return {
          success: false,
          message: "Boutique temporairement indisponible",
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
      
      const dialogues = await this.getTransactionDialogues(shopData, action, result.success ? 'success' : 'failure', player);

      return {
        ...result,
        dialogues
      };
      
    } catch (error) {
      return {
        success: false,
        message: "Erreur lors de la transaction",
        messageKey: "shop.error.transaction_failed"
      };
    }
  }

  private async getTransactionDialogues(shopData: IShopData, action: 'buy' | 'sell', result: 'success' | 'failure', player: Player, language: SupportedLanguage = 'fr'): Promise<string[]> {
    try {
      const dialogPatterns = [
        `${shopData.shopId}.shop.${action}.${result}`,
        `${shopData.type}.shop.${action}.${result}`,
        `generic.shop.${action}.${result}`
      ];

      for (const pattern of dialogPatterns) {
        const dialogue = await DialogStringModel.findOne({
          dialogId: pattern,
          isActive: true
        });

        if (dialogue) {
          const text = dialogue.replaceVariables(language, player.name);
          return [text];
        }
      }

      const defaultDialogues: Record<string, Record<string, string[]>> = {
        buy: {
          success: [`Merci pour votre achat, ${player.name} !`],
          failure: [`Vous n'avez pas assez d'argent, ${player.name}.`]
        },
        sell: {
          success: [`Merci, cet objet m'intéresse, ${player.name} !`],
          failure: [`Je ne peux pas acheter cet objet, ${player.name}.`]
        }
      };

      return defaultDialogues[action]?.[result] || ["Hmm..."];
    } catch (error) {
      return [`Merci, ${player.name} !`];
    }
  }

  private createErrorResult(messageKey: string, npcId: number, npcName?: string): MerchantInteractionResult {
    return {
      success: false,
      type: "error",
      messageKey,
      npcId,
      npcName: npcName || `NPC #${npcId}`,
      npcNameKey: this.config.enableLocalization ? `npc.name.${npcId}` : undefined,
      lines: [],
      dialogueKeys: []
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
        'dialogstring_integration',
        'shop_transactions',
        'localization_support',
        'hot_reload_support'
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
