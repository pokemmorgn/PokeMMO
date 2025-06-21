// server/src/services/TransitionService.ts
// ✅ VERSION SIMPLIFIÉE SANS TARGET SPAWN - COORDONNÉES FIXES SEULEMENT

import { Client } from "@colyseus/core";
import { NpcManager } from "../managers/NPCManager";
import { Player } from "../schema/PokeWorldState";
import { TeleportConfig, TransitionRule, ValidationContext } from "../config/TeleportConfig";
import fs from "fs";
import path from "path";

export interface TransitionRequest {
  fromZone: string;
  targetZone: string;
  playerX: number;
  playerY: number;
  teleportId?: string;
}

export interface TransitionResult {
  success: boolean;
  reason?: string;
  position?: { x: number; y: number };
  currentZone?: string;
  rollback?: boolean;
  validatedTeleport?: TeleportData;
}

export interface TeleportData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetZone: string;
}

export class TransitionService {
  private npcManagers: Map<string, NpcManager>;
  private teleportData: Map<string, TeleportData[]> = new Map();
  private config: TeleportConfig;

  constructor(npcManagers: Map<string, NpcManager>) {
    this.npcManagers = npcManagers;
    this.config = new TeleportConfig();
    this.loadAllMapsData();
    
    console.log(`🔄 [TransitionService] Initialisé avec ${this.teleportData.size} zones`);
  }

  // ✅ VALIDATION SIMPLIFIÉE - PAS DE TARGETSPAWN
  async validateTransition(client: Client, player: Player, request: TransitionRequest): Promise<TransitionResult> {
    console.log(`🔍 [TransitionService] === VALIDATION TRANSITION SIMPLIFIÉE ===`);
    console.log(`👤 Joueur: ${player.name} (${client.sessionId})`);
    console.log(`📍 ${request.fromZone} → ${request.targetZone}`);
    console.log(`📊 Position: (${request.playerX}, ${request.playerY})`);

    try {
      // 1. Vérifier que les zones existent
      if (!this.teleportData.has(request.fromZone)) {
        console.error(`❌ [TransitionService] Zone source inconnue: ${request.fromZone}`);
        return {
          success: false,
          reason: `Zone source inconnue: ${request.fromZone}`,
          rollback: true
        };
      }

      // 2. Validation physique du téléport (collision + destination)
      const teleportValidation = this.validateTeleportCollision(request);
      if (!teleportValidation.success) {
        return teleportValidation;
      }

      // 3. Récupérer le téléport validé
      const validatedTeleport = teleportValidation.validatedTeleport!;
      console.log(`✅ [TransitionService] Téléport validé: ${validatedTeleport.id}`);

      // 4. Vérifier les règles de configuration
      const configValidation = await this.validateConfigRules(player, request);
      if (!configValidation.success) {
        return configValidation;
      }

      // 5. Calculer la position de spawn FIXE selon la zone de destination
      const spawnPosition = this.calculateFixedSpawnPosition(request.targetZone, request.fromZone);
      if (!spawnPosition) {
        console.error(`❌ [TransitionService] Position de spawn introuvable pour: ${request.targetZone}`);
        return {
          success: false,
          reason: `Position de spawn introuvable pour: ${request.targetZone}`,
          rollback: true
        };
      }

      // 6. Validation réussie
      console.log(`✅ [TransitionService] === TRANSITION VALIDÉE ===`);
      console.log(`📍 Position finale FIXE: (${spawnPosition.x}, ${spawnPosition.y})`);
      
      return {
        success: true,
        position: spawnPosition,
        currentZone: request.targetZone,
        validatedTeleport: validatedTeleport
      };

    } catch (error) {
      console.error(`❌ [TransitionService] Erreur validation:`, error);
      return {
        success: false,
        reason: "Erreur serveur lors de la validation",
        rollback: true
      };
    }
  }

  // ✅ VALIDATION TÉLÉPORT SIMPLIFIÉE (collision + destination)
  private validateTeleportCollision(request: TransitionRequest): TransitionResult & { validatedTeleport?: TeleportData } {
    console.log(`🔒 [TransitionService] === VALIDATION COLLISION TÉLÉPORT ===`);
    
    const teleports = this.teleportData.get(request.fromZone);
    if (!teleports) {
      console.error(`❌ [TransitionService] Aucun téléport trouvé dans ${request.fromZone}`);
      return {
        success: false,
        reason: "Aucun téléport trouvé dans cette zone",
        rollback: true
      };
    }

    console.log(`🔍 [TransitionService] Vérification de ${teleports.length} téléports dans ${request.fromZone}`);

    // Chercher un téléport valide à proximité ET avec la bonne destination
    const validTeleport = teleports.find(teleport => {
      console.log(`🔍 [TransitionService] Test téléport ${teleport.id}:`);
      console.log(`  📍 Position: (${teleport.x}, ${teleport.y}) taille: ${teleport.width}x${teleport.height}`);
      console.log(`  🌍 Zone cible: ${teleport.targetZone} (demandé: ${request.targetZone})`);
      
      // Vérification 1: Zone de destination
      if (teleport.targetZone !== request.targetZone) {
        console.log(`  ❌ Zone mismatch: téléport → ${teleport.targetZone}, demandé → ${request.targetZone}`);
        return false;
      }
      
      // Vérification 2: Proximité physique
      const teleportCenterX = teleport.x + (teleport.width / 2);
      const teleportCenterY = teleport.y + (teleport.height / 2);
      const playerCenterX = request.playerX + 16;
      const playerCenterY = request.playerY + 16;
      
      const distance = Math.sqrt(
        Math.pow(playerCenterX - teleportCenterX, 2) + 
        Math.pow(playerCenterY - teleportCenterY, 2)
      );
      
      const maxDistance = Math.max(teleport.width, teleport.height) + 50;
      
      console.log(`  📏 Distance: ${distance.toFixed(2)}px (max: ${maxDistance}px)`);
      
      if (distance > maxDistance) {
        console.log(`  ❌ Trop éloigné: ${distance.toFixed(2)} > ${maxDistance}`);
        return false;
      }
      
      console.log(`  ✅ Téléport VALIDE : collision + destination OK`);
      return true;
    });

    if (!validTeleport) {
      console.error(`❌ [TransitionService] === AUCUN TÉLÉPORT VALIDE ===`);
      console.error(`  Zone: ${request.fromZone} → ${request.targetZone}`);
      console.error(`  Position: (${request.playerX}, ${request.playerY})`);
      console.error(`  Téléports disponibles:`);
      teleports.forEach(t => {
        console.error(`    - ${t.id}: (${t.x}, ${t.y}) → ${t.targetZone}`);
      });
      
      return {
        success: false,
        reason: "Aucun téléport valide à cette position avec cette destination",
        rollback: true
      };
    }

    console.log(`✅ [TransitionService] === TÉLÉPORT TROUVÉ ===`);
    console.log(`  ID: ${validTeleport.id}`);
    console.log(`  Zone: ${validTeleport.targetZone}`);

    return { 
      success: true,
      validatedTeleport: validTeleport
    };
  }

  // ✅ CALCUL DE SPAWN AVEC COORDONNÉES FIXES SELON ZONE DE DESTINATION ET D'ORIGINE
  private calculateFixedSpawnPosition(targetZone: string, fromZone: string): { x: number; y: number } | null {
    console.log(`[TransitionService] Calcul spawn FIXE: ${fromZone} → ${targetZone}`);
    
    // ✅ BEACH - Position fixe unique
    if (targetZone === "beach") {
      console.log(`[TransitionService] => SPAWN FIXE beach : (61.33, 40.67)`);
      return { x: 61.33, y: 40.67 };
    }
    
    // ✅ VILLAGE - Position selon zone d'origine
    if (targetZone === "village") {
      if (fromZone === "beach") {
        console.log(`[TransitionService] => SPAWN FIXE village depuis beach : (430.00, 438.67)`);
        return { x: 430.00, y: 438.67 };
      }
      if (fromZone === "villagelab") {
        console.log(`[TransitionService] => SPAWN FIXE village depuis villagelab : (160.67, 248.00)`);
        return { x: 160.67, y: 248.00 };
      }
      if (fromZone === "villagehouse1") {
        console.log(`[TransitionService] => SPAWN FIXE village depuis villagehouse1 : (47.33, 98.67)`);
        return { x: 47.33, y: 98.67 };
      }
      if (fromZone === "road1") {
        console.log(`[TransitionService] => SPAWN FIXE village depuis road1 : (200, 150)`);
        return { x: 200, y: 150 };
      }
      console.log(`[TransitionService] => SPAWN village par défaut : (130, 270)`);
      return { x: 130, y: 270 };
    }
    
    // ✅ VILLAGELAB - Position fixe unique
    if (targetZone === "villagelab") {
      console.log(`[TransitionService] => SPAWN FIXE villagelab : (242.52, 358.00)`);
      return { x: 242.52, y: 358.00 };
    }
    
    // ✅ VILLAGEHOUSE1 - Position fixe unique
    if (targetZone === "villagehouse1") {
      console.log(`[TransitionService] => SPAWN FIXE villagehouse1 : (181.00, 278.00)`);
      return { x: 181.00, y: 278.00 };
    }
    
    // ✅ ROAD1 - Position selon zone d'origine
    if (targetZone === "road1") {
      if (fromZone === "village") {
        console.log(`[TransitionService] => SPAWN FIXE road1 depuis village : (100, 400)`);
        return { x: 100, y: 400 };
      }
      if (fromZone === "lavandia") {
        console.log(`[TransitionService] => SPAWN FIXE road1 depuis lavandia : (800, 200)`);
        return { x: 800, y: 200 };
      }
      console.log(`[TransitionService] => SPAWN road1 par défaut : (150, 350)`);
      return { x: 150, y: 350 };
    }
    
    // ✅ LAVANDIA - Position fixe unique
    if (targetZone === "lavandia") {
      console.log(`[TransitionService] => SPAWN FIXE lavandia : (300, 300)`);
      return { x: 300, y: 300 };
    }
    
    // Fallback par défaut
    console.log(`[TransitionService] => SPAWN fallback pour zone inconnue ${targetZone} : (100, 100)`);
    return { x: 100, y: 100 };
  }

  // ✅ CHARGEMENT DES TÉLÉPORTS SANS TARGETSPAWN
  private loadAllMapsData() {
    console.log(`🔄 [TransitionService] Chargement téléports depuis NPCManagers...`);
    
    this.npcManagers.forEach((npcManager, zoneName) => {
      try {
        this.extractTeleportsFromNpcManager(zoneName, npcManager);
      } catch (error) {
        console.warn(`⚠️ [TransitionService] Erreur extraction ${zoneName}:`, error);
      }
    });

    console.log(`✅ [TransitionService] Téléports extraits de ${this.teleportData.size} NPCManagers`);
  }

  private extractTeleportsFromNpcManager(zoneName: string, npcManager: NpcManager) {
    const mapPath = path.resolve(__dirname, `../assets/maps/${zoneName}.tmj`);
    
    if (!fs.existsSync(mapPath)) {
      console.warn(`⚠️ [TransitionService] Map non trouvée: ${mapPath}`);
      return;
    }

    const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    
    const teleports: TeleportData[] = [];

    if (!mapData.layers) return;

    mapData.layers.forEach((layer: any) => {
      if (layer.type === 'objectgroup' && layer.objects) {
        layer.objects.forEach((obj: any) => {
          const objName = (obj.name || '').toLowerCase();
          
          // ✅ CHARGER SEULEMENT LES TÉLÉPORTS (pas les spawns)
          if (objName === 'teleport') {
            const targetZone = this.getProperty(obj, 'targetzone');
            
            if (targetZone) {
              teleports.push({
                id: `${zoneName}_${obj.id}`,
                x: obj.x,
                y: obj.y,
                width: obj.width || 32,
                height: obj.height || 32,
                targetZone: targetZone
              });
              console.log(`📍 [TransitionService] Téléport ${zoneName}_${obj.id}: (${obj.x}, ${obj.y}) → ${targetZone}`);
            }
          }
          // ✅ IGNORER LES SPAWNS - coordonnées fixes utilisées
        });
      }
    });

    this.teleportData.set(zoneName, teleports);
    
    console.log(`📊 [TransitionService] ${zoneName}: ${teleports.length} téléports chargés (coordonnées fixes utilisées)`);
  }

  // ✅ MÉTHODES CONSERVÉES SANS CHANGEMENT
  private async validateConfigRules(player: Player, request: TransitionRequest): Promise<TransitionResult> {
    const context: ValidationContext = {
      playerName: player.name,
      playerLevel: player.level || 1,
      currentZone: request.fromZone,
      targetZone: request.targetZone,
      playerX: request.playerX,
      playerY: request.playerY,
      hasVipAccess: false,
      completedQuests: [],
      inventory: [],
      badges: []
    };

    const canTransition = await this.config.canPlayerTransition(context);
    
    if (!canTransition.allowed) {
      console.log(`❌ [TransitionService] Transition refusée par config: ${canTransition.reason}`);
      return {
        success: false,
        reason: canTransition.reason,
        rollback: true
      };
    }

    return { success: true };
  }

  private getProperty(object: any, propertyName: string): any {
    if (!object.properties) return null;
    const prop = object.properties.find((p: any) => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ MÉTHODES DE DEBUG SIMPLIFIÉES
  public debugZoneData(zoneName: string): void {
    console.log(`🔍 [TransitionService] === DEBUG ${zoneName.toUpperCase()} ===`);
    
    const teleports = this.teleportData.get(zoneName);
    
    console.log(`📍 TÉLÉPORTS (${teleports?.length || 0}):`);
    teleports?.forEach(teleport => {
      console.log(`  - ${teleport.id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}`);
    });
    
    console.log(`🎯 SPAWNS: Coordonnées fixes utilisées dans calculateFixedSpawnPosition()`);
    console.log(`=======================================`);
  }

  public getAllZoneData(): any {
    const result: any = {};
    
    this.teleportData.forEach((teleports, zoneName) => {
      result[zoneName] = {
        teleports: teleports,
        spawns: "Coordonnées fixes utilisées"
      };
    });
    
    return result;
  }

  public getZoneStats(): any {
    const stats: any = {};
    
    this.teleportData.forEach((teleports, zoneName) => {
      stats[zoneName] = {
        teleportCount: teleports.length,
        spawnMode: "coordonnées fixes"
      };
    });
    
    return stats;
  }
}
