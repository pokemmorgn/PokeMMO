// server/src/services/PlayerSyncService.ts

import { Client } from "@colyseus/core";
import { Player } from "../schema/PokeWorldState";
import { NpcInteractionModule } from "../interactions/modules/NpcInteractionModule";
import { ObjectInteractionHandlers } from "../handlers/ObjectInteractionHandlers";
import { getDbZoneName } from "../config/ZoneMapping";

export interface SyncOptions {
  includeNpcs?: boolean;
  includeObjects?: boolean;
  includeQuests?: boolean;
  specificNpcId?: number;
  specificObjectId?: string;
}

export class PlayerSyncService {
  private npcInteractionModule: NpcInteractionModule;
  private objectHandlers: ObjectInteractionHandlers;
  private getNpcManager: (zoneName: string) => any;
  private questManager: any;

  constructor(
    npcInteractionModule: NpcInteractionModule,
    objectHandlers: ObjectInteractionHandlers,
    getNpcManager: (zoneName: string) => any,
    questManager: any
  ) {
    this.npcInteractionModule = npcInteractionModule;
    this.objectHandlers = objectHandlers;
    this.getNpcManager = getNpcManager;
    this.questManager = questManager;
  }

  // ===== MÉTHODES PRINCIPALES D'ENVOI =====

  /**
   * Synchronise tous les éléments pour un joueur (connexion initiale)
   */
  async syncAllForPlayer(client: Client, player: Player, zoneName: string): Promise<void> {
    console.log(`🔄 [PlayerSync] Synchronisation complète pour ${player.name} dans ${zoneName}`);
    
    const mappedZone = getDbZoneName(zoneName);
    
    // Envoyer NPCs enrichis
    await this.sendEnrichedNpcs(client, player, mappedZone);
    
    // Envoyer objets de zone
    await this.sendZoneObjects(client, mappedZone);
    
    // Envoyer statuts quêtes
    await this.sendQuestStatuses(client, player);
    
    console.log(`✅ [PlayerSync] Synchronisation complète terminée pour ${player.name}`);
  }

  /**
   * Met à jour uniquement les NPCs du joueur
   */
  async refreshNpcsForPlayer(client: Client, player: Player, zoneName?: string): Promise<void> {
    const zone = zoneName || player.currentZone;
    const mappedZone = getDbZoneName(zone);
    
    console.log(`🔄 [PlayerSync] Actualisation NPCs pour ${player.name} dans ${mappedZone}`);
    await this.sendEnrichedNpcs(client, player, mappedZone);
  }

  /**
   * Met à jour un NPC spécifique (après completion quête par exemple)
   */
  async refreshSpecificNpc(client: Client, player: Player, npcId: number): Promise<void> {
    console.log(`🔄 [PlayerSync] Actualisation NPC ${npcId} pour ${player.name}`);
    
    const mappedZone = getDbZoneName(player.currentZone);
    const npcManager = this.getNpcManager(mappedZone);
    
    if (!npcManager) {
      console.error(`❌ [PlayerSync] NPC Manager non trouvé pour zone ${mappedZone}`);
      return;
    }

    const npc = npcManager.getNpcById(npcId, mappedZone);
    if (!npc) {
      console.error(`❌ [PlayerSync] NPC ${npcId} non trouvé dans ${mappedZone}`);
      return;
    }

    // Enrichir et envoyer ce NPC spécifique
    const enrichedNpc = await this.enrichSingleNpc(npc, player);
    
    client.send("npcUpdate", {
      type: "single",
      npc: enrichedNpc,
      timestamp: Date.now()
    });
    
    console.log(`✅ [PlayerSync] NPC ${npcId} actualisé avec capacités:`, enrichedNpc.capabilities);
  }

  /**
   * Met à jour les objets d'une zone
   */
  async refreshObjectsForPlayer(client: Client, zoneName?: string): Promise<void> {
    const mappedZone = getDbZoneName(zoneName || client.sessionId);
    console.log(`🔄 [PlayerSync] Actualisation objets pour zone ${mappedZone}`);
    await this.sendZoneObjects(client, mappedZone);
  }

  // ===== MÉTHODES INTERNES =====

  /**
   * Envoie tous les NPCs enrichis d'une zone
   */
  private async sendEnrichedNpcs(client: Client, player: Player, mappedZone: string): Promise<void> {
    const npcManager = this.getNpcManager(mappedZone);
    if (!npcManager) {
      console.error(`❌ [PlayerSync] NPC Manager non trouvé pour ${mappedZone}`);
      return;
    }

    const npcs = npcManager.getNpcsByZone(mappedZone);
    console.log(`📊 [PlayerSync] ${npcs.length} NPCs trouvés dans ${mappedZone}`);

    if (npcs.length === 0) {
      console.warn(`⚠️ [PlayerSync] Aucun NPC dans ${mappedZone}`);
      client.send("npcList", []);
      return;
    }

    // Enrichir tous les NPCs
    const enrichedNpcs = [];
    for (const npc of npcs) {
      const enrichedNpc = await this.enrichSingleNpc(npc, player);
      enrichedNpcs.push(enrichedNpc);
    }

    // Statistiques
    const questNpcs = enrichedNpcs.filter(npc => npc.capabilities.includes('quest'));
    if (questNpcs.length > 0) {
      console.log(`📜 [PlayerSync] ${questNpcs.length} NPCs avec quêtes:`, 
        questNpcs.map(npc => `${npc.id}(${npc.name})`));
    }

    // Envoyer au client
    client.send("npcList", enrichedNpcs);
    console.log(`✅ [PlayerSync] ${enrichedNpcs.length} NPCs enrichis envoyés`);
  }

  /**
   * Enrichit un seul NPC avec ses capacités
   */
  private async enrichSingleNpc(npc: any, player: Player): Promise<any> {
    let capabilities = ['dialogue'];
    let contextualData = {
      hasShop: false,
      hasQuests: false,
      hasHealing: false,
      defaultAction: 'dialogue',
      quickActions: []
    };

    try {
      // Utiliser le NpcInteractionModule pour analyser
      const mockContext = {
        player: player,
        request: {
          type: 'npc' as const,
          data: { npcId: npc.id }
        }
      };

      const result = await this.npcInteractionModule.handle(mockContext);
      
      if (result.success && 'capabilities' in result) {
        capabilities = (result as any).capabilities || ['dialogue'];
        contextualData = (result as any).contextualData || contextualData;
      } else {
        // Fallback vers analyse manuelle
        capabilities = this.analyzeNpcCapabilitiesManual(npc);
        contextualData = this.buildContextualData(capabilities);
      }

    } catch (error) {
      console.warn(`⚠️ [PlayerSync] Erreur analyse NPC ${npc.id}, fallback manuel`);
      capabilities = this.analyzeNpcCapabilitiesManual(npc);
      contextualData = this.buildContextualData(capabilities);
    }

    return {
      ...npc,
      capabilities: capabilities,
      contextualData: contextualData
    };
  }

  /**
   * Analyse manuelle des capacités (fallback)
   */
  private analyzeNpcCapabilitiesManual(npc: any): string[] {
    const capabilities = ['dialogue'];

    // Vérifier quêtes
    if (npc.questsToGive && Array.isArray(npc.questsToGive) && npc.questsToGive.length > 0) {
      capabilities.push('quest');
    }
    if (npc.questsToEnd && Array.isArray(npc.questsToEnd) && npc.questsToEnd.length > 0) {
      if (!capabilities.includes('quest')) capabilities.push('quest');
    }

    // Vérifier boutique
    if (npc.shopId || (npc.properties && npc.properties.shop)) {
      capabilities.push('merchant');
    }

    // Vérifier soins
    if (npc.type === 'healer' || (npc.properties && npc.properties.healer)) {
      capabilities.push('healer');
    }

    return capabilities;
  }

  /**
   * Construit les données contextuelles
   */
  private buildContextualData(capabilities: string[]) {
    const hasShop = capabilities.includes('merchant');
    const hasQuests = capabilities.includes('quest');
    const hasHealing = capabilities.includes('healer');
    
    let defaultAction = 'dialogue';
    if (hasQuests) defaultAction = 'quest';
    else if (hasShop) defaultAction = 'merchant';
    else if (hasHealing) defaultAction = 'healer';
    
    return {
      hasShop,
      hasQuests,
      hasHealing,
      defaultAction,
      quickActions: capabilities.map(cap => ({
        id: cap,
        label: this.getCapabilityLabel(cap),
        action: cap,
        enabled: true
      }))
    };
  }

  private getCapabilityLabel(capability: string): string {
    const labels: Record<string, string> = {
      'dialogue': 'Parler',
      'merchant': 'Boutique',
      'quest': 'Quêtes',
      'healer': 'Soins',
      'trainer': 'Combat'
    };
    return labels[capability] || capability;
  }

  /**
   * Envoie les objets d'une zone
   */
  private async sendZoneObjects(client: Client, mappedZone: string): Promise<void> {
    try {
      await this.objectHandlers.sendZoneObjectsToClient(client, mappedZone);
      console.log(`✅ [PlayerSync] Objets de zone ${mappedZone} envoyés`);
    } catch (error) {
      console.error(`❌ [PlayerSync] Erreur envoi objets zone ${mappedZone}:`, error);
    }
  }

  /**
   * Envoie les statuts de quêtes
   */
  private async sendQuestStatuses(client: Client, player: Player): Promise<void> {
    try {
      if (!this.questManager) return;
      
      const availableQuests = await this.questManager.getAvailableQuests(player.name);
      const activeQuests = await this.questManager.getActiveQuests(player.name);
      
      const questStatuses: any[] = [];
      
      // Quêtes disponibles
      for (const quest of availableQuests) {
        if (quest.startNpcId) {
          questStatuses.push({
            npcId: quest.startNpcId,
            type: 'questAvailable'
          });
        }
      }
      
      // Quêtes actives
      for (const quest of activeQuests) {
        if (quest.status === 'readyToComplete' && quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questReadyToComplete'
          });
        } else if (quest.endNpcId) {
          questStatuses.push({
            npcId: quest.endNpcId,
            type: 'questInProgress'
          });
        }
      }
      
      if (questStatuses.length > 0) {
        client.send("questStatuses", { questStatuses });
        console.log(`✅ [PlayerSync] ${questStatuses.length} statuts de quêtes envoyés`);
      }
      
    } catch (error) {
      console.error(`❌ [PlayerSync] Erreur envoi statuts quêtes:`, error);
    }
  }

  // ===== MÉTHODES UTILITAIRES PUBLIQUES =====

  /**
   * Actualise après completion de quête
   */
  async onQuestCompleted(client: Client, player: Player, questId: string, npcId?: number): Promise<void> {
    console.log(`🎉 [PlayerSync] Quête ${questId} terminée pour ${player.name}`);
    
    // Actualiser le NPC spécifique si fourni
    if (npcId) {
      await this.refreshSpecificNpc(client, player, npcId);
    } else {
      // Sinon actualiser tous les NPCs (au cas où)
      await this.refreshNpcsForPlayer(client, player);
    }
    
    // Actualiser les statuts de quêtes
    await this.sendQuestStatuses(client, player);
  }

  /**
   * Actualise après changement de zone
   */
  async onZoneChanged(client: Client, player: Player, newZone: string): Promise<void> {
    console.log(`🌍 [PlayerSync] ${player.name} change de zone vers ${newZone}`);
    await this.syncAllForPlayer(client, player, newZone);
  }

  /**
   * Actualise un élément spécifique
   */
  async refreshElement(client: Client, player: Player, elementType: 'npc' | 'object' | 'quest', elementId?: string | number): Promise<void> {
    switch (elementType) {
      case 'npc':
        if (typeof elementId === 'number') {
          await this.refreshSpecificNpc(client, player, elementId);
        } else {
          await this.refreshNpcsForPlayer(client, player);
        }
        break;
        
      case 'object':
        await this.refreshObjectsForPlayer(client, player.currentZone);
        break;
        
      case 'quest':
        await this.sendQuestStatuses(client, player);
        break;
    }
  }
}
