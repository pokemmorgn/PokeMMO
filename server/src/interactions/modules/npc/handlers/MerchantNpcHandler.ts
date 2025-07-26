// server/src/interactions/modules/npc/handlers/MerchantNpcHandler.ts
// Handler spécialisé pour les NPCs marchands - VERSION HYBRIDE avec MongoDB + Localisation

import { Player } from "../../../../schema/PokeWorldState";
import { ShopManager, ShopDefinition, ShopDataSource } from "../../../../managers/ShopManager";

// ===== INTERFACES MISES À JOUR =====

interface NpcData {
  id: number;
  name: string;
  sprite: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
  
  // Propriétés JSON (nouvelles)
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
  
  // Support localisation
  nameKey?: string;
  shopKeeper?: {
    nameKey?: string;
    personalityKey?: string;
  };
  
  // Métadonnées
  sourceType?: 'tiled' | 'json' | 'mongodb';
  sourceFile?: string;
}

interface MerchantInteractionResult {
  success: boolean;
  type: "shop" | "error" | "dialogue";
  message?: string;
  messageKey?: string;       // ✅ ID de localisation
  shopId?: string;
  shopData?: {
    shopInfo: any;
    availableItems: any[];
    playerGold: number;
    playerLevel: number;
    npcName?: string;
    npcNameKey?: string;     // ✅ ID de localisation
  };
  lines?: string[];
  dialogueKeys?: string[];   // ✅ IDs de localisation
  npcId?: number;
  npcName?: string;
  npcNameKey?: string;       // ✅ ID de localisation
  questProgress?: any[];
}

interface MerchantHandlerConfig {
  debugMode: boolean;
  enableLocalization: boolean;
  defaultShopType: string;
  waitForShopManager: boolean;
  shopManagerTimeout: number;
  fallbackDialogues: {
    welcome: string[];
    welcomeKeys: string[];   // ✅ IDs de localisation
    error: string[];
    errorKeys: string[];     // ✅ IDs de localisation
    closed: string[];
    closedKeys: string[];    // ✅ IDs de localisation
  };
}

// ===== HANDLER PRINCIPAL =====

export class MerchantNpcHandler {
  
  private shopManager: ShopManager;
  private config: MerchantHandlerConfig;
  private isShopManagerReady: boolean = false;

  constructor(shopManager: ShopManager, config?: Partial<MerchantHandlerConfig>) {
    this.shopManager = shopManager;
    
    this.config = {
      debugMode: process.env.NODE_ENV === 'development',
      enableLocalization: process.env.SHOP_LOCALIZATION !== 'false',
      defaultShopType: 'pokemart',
      waitForShopManager: true,
      shopManagerTimeout: 10000, // 10s timeout
      fallbackDialogues: {
        welcome: ["Bienvenue dans ma boutique !"],
        welcomeKeys: ["shop.dialogue.generic.welcome.1"],
        error: ["Ma boutique est temporairement fermée."],
        errorKeys: ["shop.error.temporarily_closed"],
        closed: ["Désolé, nous sommes fermés."],
        closedKeys: ["shop.error.closed"]
      },
      ...config
    };
    
    this.log('info', '🛒 MerchantNpcHandler v2.0 initialisé', { 
      config: this.config,
      localization: this.config.enableLocalization,
      shopManagerReady: this.isShopManagerReady
    });
    
    // ✅ NOUVEAU : Vérifier si ShopManager est prêt de manière asynchrone
    this.initializeShopManagerConnection();
  }

  // ✅ NOUVELLE MÉTHODE : Initialisation asynchrone de la connexion ShopManager
  private async initializeShopManagerConnection(): Promise<void> {
    if (!this.config.waitForShopManager) {
      this.isShopManagerReady = true;
      return;
    }

    try {
      this.log('info', '⏳ [MerchantHandler] Attente ShopManager...');
      
      const ready = await this.shopManager.waitForLoad(this.config.shopManagerTimeout);
      
      if (ready) {
        this.isShopManagerReady = true;
        this.log('info', '✅ [MerchantHandler] ShopManager prêt !');
        
        // ✅ NOUVEAU : S'abonner aux changements Hot Reload
        this.shopManager.onShopChange((event, shopData) => {
          this.handleShopHotReload(event, shopData);
        });
        
      } else {
        this.log('warn', '⚠️ [MerchantHandler] ShopManager timeout - mode dégradé');
        this.isShopManagerReady = false;
      }
      
    } catch (error) {
      this.log('error', '❌ [MerchantHandler] Erreur connexion ShopManager:', error);
      this.isShopManagerReady = false;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Gestion Hot Reload
  private handleShopHotReload(event: string, shopData?: any): void {
    this.log('info', `🔥 [MerchantHandler] Hot Reload: ${event}`, {
      shopId: shopData?.id,
      shopName: shopData?.nameKey || shopData?.name
    });
    
    // Ici on pourrait notifier les clients connectés que le shop a changé
    // Pour l'instant, on log juste pour le debug
  }

  // === MÉTHODE PRINCIPALE MISE À JOUR ===

  async handle(player: Player, npc: NpcData, npcId: number): Promise<MerchantInteractionResult> {
    const startTime = Date.now();
    
    try {
      this.log('info', `🛒 [Merchant v2] Traitement NPC ${npcId} pour ${player.name}`, {
        npcName: npc.nameKey || npc.name,
        sourceType: npc.sourceType,
        shopId: this.getShopId(npc),
        shopManagerReady: this.isShopManagerReady
      });
      
      // === VALIDATION ===
      if (!this.isMerchantNpc(npc)) {
        return this.createErrorResult(
          `NPC ${npcId} n'est pas un marchand`,
          "shop.error.not_merchant",
          npcId,
          npc.nameKey || npc.name
        );
      }
      
      const shopId = this.getShopId(npc);
      if (!shopId) {
        return this.createErrorResult(
          "Ce marchand n'a pas de boutique configurée",
          "shop.error.no_shop_configured",
          npcId,
          npc.nameKey || npc.name
        );
      }

      // ✅ NOUVEAU : Vérification ShopManager prêt
      if (!this.isShopManagerReady) {
        this.log('warn', `⚠️ [Merchant v2] ShopManager pas prêt - tentative directe`);
        
        // Tentative de chargement direct
        try {
          const ready = await this.shopManager.waitForLoad(2000); // 2s seulement
          if (ready) {
            this.isShopManagerReady = true;
            this.log('info', '✅ [Merchant v2] ShopManager récupéré !');
          }
        } catch (error) {
          this.log('error', '❌ [Merchant v2] ShopManager indisponible');
          return this.createErrorResult(
            "Système de boutique temporairement indisponible",
            "shop.error.system_unavailable",
            npcId,
            npc.nameKey || npc.name
          );
        }
      }
      
      // === VÉRIFICATION SHOP ===
      const shopCatalog = this.shopManager.getShopCatalog(shopId, player.level || 1);
      if (!shopCatalog) {
        this.log('error', `🛒 [Merchant v2] Shop ${shopId} introuvable`);
        return this.createErrorResult(
          "Boutique temporairement indisponible",
          "shop.error.temporarily_unavailable",
          npcId,
          npc.nameKey || npc.name
        );
      }
      
      // === RÉCUPÉRATION DIALOGUES LOCALISÉS ===
      const welcomeDialogues = this.getWelcomeDialogues(npc);
      const welcomeKeys = this.getWelcomeDialogueKeys(npc);
      
      // === CONSTRUCTION RÉPONSE AVEC LOCALISATION ===
      const result: MerchantInteractionResult = {
        success: true,
        type: "shop",
        shopId: shopId,
        shopData: {
          shopInfo: shopCatalog.shopInfo,
          availableItems: shopCatalog.availableItems,
          playerGold: player.gold || 1000,
          playerLevel: player.level || 1,
          npcName: npc.name,
          npcNameKey: npc.nameKey || npc.shopKeeper?.nameKey
        },
        npcId: npcId,
        npcName: npc.name,
        npcNameKey: npc.nameKey,
        lines: welcomeDialogues,
        dialogueKeys: welcomeKeys,
        message: `Bienvenue dans ${shopCatalog.shopInfo.name || 'la boutique'} !`,
        messageKey: "shop.dialogue.welcome.default"
      };
      
      const processingTime = Date.now() - startTime;
      this.log('info', `✅ [Merchant v2] Shop ${shopId} ouvert`, { 
        itemCount: shopCatalog.availableItems.length,
        localization: !!result.npcNameKey,
        processingTime: `${processingTime}ms`
      });
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.log('error', `❌ [Merchant v2] Erreur traitement NPC ${npcId}`, {
        error: error instanceof Error ? error.message : error,
        processingTime: `${processingTime}ms`
      });
      
      return this.createErrorResult(
        "Erreur lors de l'ouverture de la boutique",
        "shop.error.opening_failed",
        npcId,
        npc.nameKey || npc.name
      );
    }
  }

  // === MÉTHODES DE DÉTECTION MISES À JOUR ===

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

  // === MÉTHODES DE DIALOGUE LOCALISÉES ===

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

  // ✅ NOUVELLE MÉTHODE : IDs de localisation pour dialogues
  private getWelcomeDialogueKeys(npc: NpcData): string[] {
    if (!this.config.enableLocalization) {
      return [];
    }

    const shopType = npc.shopType || npc.properties?.shopType || this.config.defaultShopType;
    const shopId = this.getShopId(npc);
    
    // Générer IDs hiérarchiques : spécifique → type → générique
    return [
      `shop.dialogue.${shopId}.welcome.1`,       // Spécifique au shop
      `shop.dialogue.${shopType}.welcome.1`,     // Spécifique au type
      `shop.dialogue.generic.welcome.1`,         // Générique
      `shop.dialogue.${shopType}.welcome.2`,     // Alternative type
      `shop.dialogue.generic.welcome.2`          // Alternative générique
    ].filter(Boolean);
  }

  private getDefaultDialogueByShopType(npc: NpcData): string[] {
    const shopType = npc.shopType || npc.properties?.shopType || this.config.defaultShopType;
    
    const dialoguesByType: Record<string, string[]> = {
      'pokemart': [
        "Bienvenue au Poké Mart !",
        "Nous avons tout ce qu'il faut pour votre aventure !"
      ],
      'department': [
        "Bienvenue au Grand Magasin !",
        "Découvrez notre vaste sélection d'articles !"
      ],
      'specialist': [
        "Bienvenue dans ma boutique spécialisée !",
        "J'ai des objets rares et utiles !"
      ],
      'gym_shop': [
        "Bienvenue dans la boutique de l'Arène !",
        "Préparez-vous pour les combats !"
      ],
      'contest_shop': [
        "Bienvenue dans la boutique Concours !",
        "Tout pour briller en concours !"
      ],
      'game_corner': [
        "Bienvenue au Casino !",
        "Tentez votre chance pour des prix fabuleux !"
      ],
      'black_market': [
        "Psst... vous cherchez des objets rares ?",
        "J'ai ce qu'il vous faut... pour le bon prix."
      ],
      'trainer_shop': [
        "Salut ! Je vends mes objets d'entraînement !",
        "Ces objets m'ont bien servi !"
      ],
      'temporary': [
        "Bonjour ! Je suis de passage dans la région !",
        "Profitez-en, je repars bientôt !"
      ],
      'vending_machine': [
        "DISTRIBUTEUR AUTOMATIQUE",
        "Sélectionnez votre choix."
      ]
    };
    
    return dialoguesByType[shopType] || this.config.fallbackDialogues.welcome;
  }

  // === MÉTHODES PUBLIQUES POUR SHOP TRANSACTIONS MISES À JOUR ===

  async handleShopTransaction(
    player: Player,
    npc: NpcData,
    action: 'buy' | 'sell',
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    messageKey?: string;        // ✅ ID de localisation
    newGold?: number;
    itemsChanged?: any[];
    shopStockChanged?: any[];
    dialogues?: string[];
    dialogueKeys?: string[];    // ✅ IDs de localisation
  }> {
    
    const shopId = this.getShopId(npc);
    if (!shopId) {
      return {
        success: false,
        message: "Boutique non configurée",
        messageKey: "shop.error.not_configured"
      };
    }
    
    this.log('info', `🛒 [Transaction v2] ${action} ${quantity}x ${itemId} par ${player.name}`);
    
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
      
      // ✅ NOUVEAU : Ajouter dialogues contextuels localisés
      const dialogues = result.success 
        ? this.getTransactionDialogues(npc, action, 'success')
        : this.getTransactionDialogues(npc, action, 'failure');

      const dialogueKeys = result.success 
        ? this.getTransactionDialogueKeys(npc, action, 'success')
        : this.getTransactionDialogueKeys(npc, action, 'failure');

      this.log('info', `${result.success ? '✅' : '❌'} [Transaction v2] ${action} résultat`, {
        success: result.success,
        message: result.message,
        messageKey: result.messageKey,
        hasDialogueKeys: dialogueKeys.length > 0
      });

      return {
        ...result,
        dialogues,
        dialogueKeys
      };
      
    } catch (error) {
      this.log('error', `❌ [Transaction v2] Erreur ${action}`, error);
      return {
        success: false,
        message: "Erreur lors de la transaction",
        messageKey: "shop.error.transaction_failed",
        dialogues: this.getTransactionDialogues(npc, action, 'error'),
        dialogueKeys: this.getTransactionDialogueKeys(npc, action, 'error')
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

  // ✅ NOUVELLE MÉTHODE : IDs de localisation pour transactions
  private getTransactionDialogueKeys(npc: NpcData, action: 'buy' | 'sell', result: 'success' | 'failure' | 'error'): string[] {
    if (!this.config.enableLocalization) {
      return [];
    }

    const shopType = npc.shopType || this.config.defaultShopType;
    const shopId = this.getShopId(npc);
    
    const keyMappings: Record<string, Record<string, string[]>> = {
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
    
    return keyMappings[action]?.[result] || [];
  }

  // === MÉTHODES UTILITAIRES MISES À JOUR ===

  private createErrorResult(message: string, messageKey: string, npcId: number, npcName?: string): MerchantInteractionResult {
    return {
      success: false,
      type: "error",
      message,
      messageKey,
      npcId,
      npcName: npcName || `NPC #${npcId}`,
      npcNameKey: this.config.enableLocalization ? `npc.name.${npcId}` : undefined,
      lines: this.config.fallbackDialogues.error,
      dialogueKeys: this.config.enableLocalization ? this.config.fallbackDialogues.errorKeys : []
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

  // === MÉTHODES D'ADMINISTRATION MISES À JOUR ===

  getStats(): any {
    const shopManagerStats = this.isShopManagerReady ? this.shopManager.getSystemStats() : null;
    
    return {
      handlerType: 'merchant',
      version: '2.0.0',
      config: this.config,
      shopManagerReady: this.isShopManagerReady,
      shopManagerStats: shopManagerStats ? {
        totalShops: shopManagerStats.totalShops,
        sources: shopManagerStats.sources,
        hotReload: shopManagerStats.hotReload
      } : null,
      supportedFeatures: [
        'json_npcs',
        'mongodb_npcs', 
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

  debugNpc(npc: NpcData): void {
    console.log(`🔍 [MerchantNpcHandler v2] === DEBUG NPC ${npc.id} ===`);
    console.log(`📋 Nom: ${npc.nameKey || npc.name}`);
    console.log(`📦 Source: ${npc.sourceType}`);
    console.log(`🛒 Est marchand: ${this.isMerchantNpc(npc)}`);
    console.log(`🏪 Shop ID: ${this.getShopId(npc)}`);
    console.log(`💬 Dialogues: ${JSON.stringify(this.getWelcomeDialogues(npc), null, 2)}`);
    console.log(`🌍 Dialogue Keys: ${JSON.stringify(this.getWelcomeDialogueKeys(npc), null, 2)}`);
    console.log(`⚙️ Config: Localisation=${this.config.enableLocalization}, ShopManager=${this.isShopManagerReady}`);
    console.log(`=======================================`);
  }
}
