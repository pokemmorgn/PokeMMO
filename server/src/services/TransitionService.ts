// server/src/services/TransitionService.ts
// ✅ VERSION SÉCURISÉE AVEC VALIDATION CROISÉE TÉLÉPORT-SPAWN

import { Client } from "@colyseus/core";
import { NpcManager } from "../managers/NPCManager";
import { Player } from "../schema/PokeWorldState";
import { TeleportConfig, TransitionRule, ValidationContext } from "../config/TeleportConfig";
import fs from "fs";
import path from "path";

export interface TransitionRequest {
  fromZone: string;
  targetZone: string;
  targetSpawn?: string;
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
  // ✅ NOUVEAUX CHAMPS POUR DEBUG
  validatedTeleport?: TeleportData;
  originalSpawn?: string;
  finalSpawn?: string;
}

export interface TeleportData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetZone: string;
  targetSpawn?: string;
}

export class TransitionService {
  private npcManagers: Map<string, NpcManager>;
  private teleportData: Map<string, TeleportData[]> = new Map();
  private spawnData: Map<string, any[]> = new Map();
  private config: TeleportConfig;

  constructor(npcManagers: Map<string, NpcManager>) {
    this.npcManagers = npcManagers;
    this.config = new TeleportConfig();
    this.loadAllMapsData();
    
    console.log(`🔄 [TransitionService] Initialisé avec ${this.teleportData.size} zones`);
  }

  // ✅ VALIDATION PRINCIPALE AVEC SÉCURITÉ RENFORCÉE
  async validateTransition(client: Client, player: Player, request: TransitionRequest): Promise<TransitionResult> {
    console.log(`🔍 [TransitionService] === VALIDATION TRANSITION SÉCURISÉE ===`);
    console.log(`👤 Joueur: ${player.name} (${client.sessionId})`);
    console.log(`📍 ${request.fromZone} → ${request.targetZone}`);
    console.log(`📊 Position: (${request.playerX}, ${request.playerY})`);
    console.log(`🎯 Spawn demandé par client: "${request.targetSpawn || 'AUCUN'}"`);

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

      if (!this.teleportData.has(request.targetZone)) {
        console.error(`❌ [TransitionService] Zone de destination inconnue: ${request.targetZone}`);
        return {
          success: false,
          reason: `Zone de destination inconnue: ${request.targetZone}`,
          rollback: true
        };
      }

      // 2. ✅ NOUVELLE ÉTAPE : Validation croisée téléport-spawn (SÉCURITÉ CRITIQUE)
      const teleportValidation = this.validateTeleportAndSpawn(request);
      if (!teleportValidation.success) {
        return teleportValidation;
      }

      // 3. Récupérer le téléport validé
      const validatedTeleport = teleportValidation.validatedTeleport!;
      console.log(`✅ [TransitionService] Téléport validé: ${validatedTeleport.id}`);
      console.log(`🎯 [TransitionService] Spawn autorisé: "${validatedTeleport.targetSpawn || 'DÉFAUT'}"`);

      // 4. Vérifier les règles de configuration
      const configValidation = await this.validateConfigRules(player, request);
      if (!configValidation.success) {
        return configValidation;
      }

      // 5. ✅ UTILISER LE SPAWN DU TÉLÉPORT, PAS DU CLIENT
      const authorizedSpawn = validatedTeleport.targetSpawn;
      console.log(`🔒 [TransitionService] Spawn final (serveur fait autorité): "${authorizedSpawn || 'DÉFAUT'}"`);

      // 6. Calculer la position de spawn avec le spawn autorisé
      const spawnPosition = this.calculateSpawnPosition(request.targetZone, authorizedSpawn);
      if (!spawnPosition) {
        console.error(`❌ [TransitionService] Position de spawn introuvable: "${authorizedSpawn || 'DÉFAUT'}"`);
        return {
          success: false,
          reason: `Position de spawn introuvable: ${authorizedSpawn || 'défaut'}`,
          rollback: true
        };
      }

      // 7. Validation réussie
      console.log(`✅ [TransitionService] === TRANSITION VALIDÉE ===`);
      console.log(`📍 Position finale: (${spawnPosition.x}, ${spawnPosition.y})`);
      console.log(`🎯 Spawn utilisé: "${authorizedSpawn || 'DÉFAUT'}"`);
      
      return {
        success: true,
        position: spawnPosition,
        currentZone: request.targetZone,
        // ✅ DONNÉES DE DEBUG
        validatedTeleport: validatedTeleport,
        originalSpawn: request.targetSpawn,
        finalSpawn: authorizedSpawn
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

  // ✅ NOUVELLE MÉTHODE : Validation croisée téléport-spawn (CŒUR DE LA SÉCURITÉ)
  private validateTeleportAndSpawn(request: TransitionRequest): TransitionResult & { validatedTeleport?: TeleportData } {
    console.log(`🔒 [TransitionService] === VALIDATION CROISÉE TÉLÉPORT-SPAWN ===`);
    
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
      console.log(`  🎯 Spawn cible: "${teleport.targetSpawn || 'AUCUN'}" (demandé: "${request.targetSpawn || 'AUCUN'}")`);
      
      // Vérification 1: Zone de destination
      if (teleport.targetZone !== request.targetZone) {
        console.log(`  ❌ Zone mismatch: téléport → ${teleport.targetZone}, demandé → ${request.targetZone}`);
        return false;
      }
      
      // ✅ VÉRIFICATION CRITIQUE 2: Spawn de destination
      if (request.targetSpawn && teleport.targetSpawn !== request.targetSpawn) {
        console.warn(`  🚨 [SÉCURITÉ] TENTATIVE DE MANIPULATION DE SPAWN DÉTECTÉE !`);
        console.warn(`    Téléport autorisé: "${teleport.targetSpawn || 'AUCUN'}"`);
        console.warn(`    Client a demandé: "${request.targetSpawn}"`);
        console.warn(`    Joueur potentiellement malveillant ou bug client`);
        return false;
      }
      
      // Vérification 3: Proximité physique
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
      
      console.log(`  ✅ Téléport VALIDE : toutes les vérifications passées`);
      return true;
    });

    if (!validTeleport) {
      console.error(`❌ [TransitionService] === AUCUN TÉLÉPORT VALIDE ===`);
      console.error(`  Zone: ${request.fromZone} → ${request.targetZone}`);
      console.error(`  Position: (${request.playerX}, ${request.playerY})`);
      console.error(`  Spawn demandé: "${request.targetSpawn || 'AUCUN'}"`);
      console.error(`  Téléports disponibles:`);
      teleports.forEach(t => {
        console.error(`    - ${t.id}: (${t.x}, ${t.y}) → ${t.targetZone}/"${t.targetSpawn || 'AUCUN'}"`);
      });
      
      return {
        success: false,
        reason: "Aucun téléport valide à cette position avec cette destination",
        rollback: true
      };
    }

    console.log(`✅ [TransitionService] === TÉLÉPORT SÉCURISÉ TROUVÉ ===`);
    console.log(`  ID: ${validTeleport.id}`);
    console.log(`  Zone: ${validTeleport.targetZone}`);
    console.log(`  Spawn: "${validTeleport.targetSpawn || 'DÉFAUT'}"`);

    return { 
      success: true,
      validatedTeleport: validTeleport
    };
  }

  // ✅ CALCUL DE SPAWN AVEC LOGS DÉTAILLÉS
  private calculateSpawnPosition(targetZone: string, authorizedSpawn?: string): { x: number; y: number } | null {
    console.log(`🎯 [TransitionService] === CALCUL POSITION SPAWN ===`);
    console.log(`🌍 Zone cible: ${targetZone}`);
    console.log(`🎯 Spawn autorisé: "${authorizedSpawn || 'AUCUN (chercher défaut)'}"`);
    
    const spawns = this.spawnData.get(targetZone);
    if (!spawns || spawns.length === 0) {
      console.warn(`⚠️ [TransitionService] Aucun spawn configuré dans ${targetZone}`);
      console.log(`🔄 [TransitionService] Utilisation position de fallback: (100, 100)`);
      return { x: 100, y: 100 };
    }

    console.log(`📋 [TransitionService] Spawns disponibles dans ${targetZone} (${spawns.length}):`);
    spawns.forEach((spawn, index) => {
      console.log(`  ${index + 1}. "${spawn.name}" à (${spawn.x}, ${spawn.y})`);
    });

    // Si un spawn spécifique est autorisé, le chercher
    if (authorizedSpawn) {
      const namedSpawn = spawns.find(spawn => spawn.name === authorizedSpawn);
      if (namedSpawn) {
        console.log(`✅ [TransitionService] Spawn trouvé: "${authorizedSpawn}" → (${namedSpawn.x}, ${namedSpawn.y})`);
        return { x: namedSpawn.x, y: namedSpawn.y };
      } else {
        console.warn(`⚠️ [TransitionService] Spawn "${authorizedSpawn}" introuvable !`);
        console.log(`📋 [TransitionService] Spawns existants: ${spawns.map(s => `"${s.name}"`).join(', ')}`);
      }
    }

    // Chercher un spawn "default" ou "main"
    const defaultSpawn = spawns.find(spawn => 
      spawn.name === 'default' || 
      spawn.name === 'main' || 
      spawn.name === 'spawn'
    );
    
    if (defaultSpawn) {
      console.log(`✅ [TransitionService] Spawn par défaut trouvé: "${defaultSpawn.name}" → (${defaultSpawn.x}, ${defaultSpawn.y})`);
      return { x: defaultSpawn.x, y: defaultSpawn.y };
    }

    // Prendre le premier spawn disponible
    const firstSpawn = spawns[0];
    console.warn(`⚠️ [TransitionService] Aucun spawn spécifique, utilisation du premier: "${firstSpawn.name}" → (${firstSpawn.x}, ${firstSpawn.y})`);
    return { x: firstSpawn.x, y: firstSpawn.y };
  }

  // ✅ MÉTHODES EXISTANTES CONSERVÉES (sans changement)
  private loadAllMapsData() {
    console.log(`🔄 [TransitionService] Chargement depuis NPCManagers...`);
    
    this.npcManagers.forEach((npcManager, zoneName) => {
      try {
        this.extractTeleportsFromNpcManager(zoneName, npcManager);
      } catch (error) {
        console.warn(`⚠️ [TransitionService] Erreur extraction ${zoneName}:`, error);
      }
    });

    console.log(`✅ [TransitionService] Données extraites de ${this.teleportData.size} NPCManagers`);
  }

  private extractTeleportsFromNpcManager(zoneName: string, npcManager: NpcManager) {
    const mapPath = path.resolve(__dirname, `../assets/maps/${zoneName}.tmj`);
    
    if (!fs.existsSync(mapPath)) {
      console.warn(`⚠️ [TransitionService] Map non trouvée: ${mapPath}`);
      return;
    }

    const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    
    const teleports: TeleportData[] = [];
    const spawns: any[] = [];

    if (!mapData.layers) return;

    mapData.layers.forEach((layer: any) => {
      if (layer.type === 'objectgroup' && layer.objects) {
        layer.objects.forEach((obj: any) => {
          const objName = (obj.name || '').toLowerCase();
          
          if (objName === 'teleport') {
            const targetZone = this.getProperty(obj, 'targetzone');
            const targetSpawn = this.getProperty(obj, 'targetspawn');
            
            if (targetZone) {
              teleports.push({
                id: `${zoneName}_${obj.id}`,
                x: obj.x,
                y: obj.y,
                width: obj.width || 32,
                height: obj.height || 32,
                targetZone: targetZone,
                targetSpawn: targetSpawn
              });
              
              console.log(`📍 [TransitionService] Teleport ${zoneName}_${obj.id}: (${obj.x}, ${obj.y}) → ${targetZone}/"${targetSpawn || 'AUCUN'}"`);
            }
          } else if (objName === 'spawn') {
  const spawnKey = this.getProperty(obj, 'targetspawn');
  if (spawnKey) {
    spawns.push({
      name: spawnKey,   // clé logique du spawn (la propriété, pas le nom objet)
      x: obj.x,
      y: obj.y,
      zone: zoneName
    });
    // log
  }
}
          }
        });
      }
    });

    this.teleportData.set(zoneName, teleports);
    this.spawnData.set(zoneName, spawns);
    
    console.log(`📊 [TransitionService] ${zoneName}: ${teleports.length} téléports, ${spawns.length} spawns chargés`);
  }

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

  // ✅ MÉTHODES DE DEBUG AMÉLIORÉES
  public debugZoneData(zoneName: string): void {
    console.log(`🔍 [TransitionService] === DEBUG ${zoneName.toUpperCase()} ===`);
    
    const teleports = this.teleportData.get(zoneName);
    const spawns = this.spawnData.get(zoneName);
    
    console.log(`📍 TÉLÉPORTS (${teleports?.length || 0}):`);
    teleports?.forEach(teleport => {
      console.log(`  - ${teleport.id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}/"${teleport.targetSpawn || 'AUCUN'}"`);
    });
    
    console.log(`🎯 SPAWNS (${spawns?.length || 0}):`);
    spawns?.forEach(spawn => {
      console.log(`  - "${spawn.name}": (${spawn.x}, ${spawn.y})`);
    });
    
    console.log(`=======================================`);
  }

  public getAllZoneData(): any {
    const result: any = {};
    
    this.teleportData.forEach((teleports, zoneName) => {
      result[zoneName] = {
        teleports: teleports,
        spawns: this.spawnData.get(zoneName) || []
      };
    });
    
    return result;
  }

  public getZoneStats(): any {
    const stats: any = {};
    
    this.teleportData.forEach((teleports, zoneName) => {
      const spawns = this.spawnData.get(zoneName) || [];
      stats[zoneName] = {
        teleportCount: teleports.length,
        spawnCount: spawns.length
      };
    });
    
    return stats;
  }
}
