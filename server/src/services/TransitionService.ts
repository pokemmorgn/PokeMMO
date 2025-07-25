// server/src/services/TransitionService.ts
// ✅ VERSION INDÉPENDANTE SANS NPCManager

import { Client } from "@colyseus/core";
import { Player } from "../schema/PokeWorldState";
import { TeleportConfig, TransitionRule, ValidationContext } from "../config/TeleportConfig";
import { JWTManager } from "../managers/JWTManager";
import { FollowerHandlers } from "../handlers/FollowerHandlers";
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
  userId?: string;
}

export interface TeleportData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetZone: string;
  targetSpawn: string;
}

export interface SpawnData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetSpawn: string;
}

export class TransitionService {
  private teleportData: Map<string, TeleportData[]> = new Map();
  private spawnData: Map<string, SpawnData[]> = new Map();
  private config: TeleportConfig;
  private jwtManager: JWTManager;
  private followerHandlers: FollowerHandlers | null = null;

  // ✅ CONSTRUCTEUR SIMPLIFIÉ - Plus de dépendance NPCManager
  constructor() {
    this.jwtManager = JWTManager.getInstance();
    this.config = new TeleportConfig();
    this.loadAllMapsData();
    
    console.log(`🔄 [TransitionService] Initialisé avec ${this.teleportData.size} zones`);
  }

  /**
   * ✅ NOUVEAU: Enregistrer le handler de followers
   */
  setFollowerHandlers(followerHandlers: FollowerHandlers): void {
    this.followerHandlers = followerHandlers;
    console.log(`🐾 [TransitionService] FollowerHandlers enregistré pour les transitions`);
  }

  // ✅ VALIDATION AVEC SYSTÈME SPAWN DYNAMIQUE + JWT
  async validateTransition(client: Client, player: any, data: TransitionRequest): Promise<any> {
    console.log(`🔍 [TransitionService] === VALIDATION TRANSITION ===`);
    
    // ✅ VALIDATION UNIVERSELLE EN UNE LIGNE !
    const sessionValidation = await this.jwtManager.validateSessionRobust(
      client.sessionId, 
      player.name, 
      'transition'
    );
    
    if (!sessionValidation.valid) {
      console.error(`❌ [TransitionService] ${sessionValidation.reason}`);
      return {
        success: false,
        reason: "Session invalide pour transition",
        rollback: true
      };
    }
    
    const { userId, jwtData } = sessionValidation;
    console.log(`✅ [TransitionService] Session validée pour transition: ${userId}`);
    
    console.log(`👤 Joueur: ${player.name} (${client.sessionId} → ${userId})`);
    console.log(`🔐 JWT: ${jwtData.username} (niveau: ${jwtData.level || 'N/A'})`);
    console.log(`📍 ${data.fromZone} → ${data.targetZone}`);
    console.log(`📊 Position: (${data.playerX}, ${data.playerY})`);

    try {
      // 1. Vérifier que les zones existent
      if (!this.teleportData.has(data.fromZone)) {
        console.error(`❌ [TransitionService] Zone source inconnue: ${data.fromZone}`);
        console.log(`📋 [TransitionService] Zones disponibles:`, Array.from(this.teleportData.keys()));
        return {
          success: false,
          reason: `Zone source inconnue: ${data.fromZone}`,
          rollback: true
        };
      }

      if (!this.spawnData.has(data.targetZone)) {
        console.error(`❌ [TransitionService] Zone cible sans spawns: ${data.targetZone}`);
        console.log(`📋 [TransitionService] Zones avec spawns:`, Array.from(this.spawnData.keys()));
        return {
          success: false,
          reason: `Zone cible sans spawns: ${data.targetZone}`,
          rollback: true
        };
      }

      // 2. Validation physique du téléport (collision + destination)
      const teleportValidation = this.validateTeleportCollision(data);
      if (!teleportValidation.success) {
        return teleportValidation;
      }

      // 3. Récupérer le téléport validé
      const validatedTeleport = teleportValidation.validatedTeleport!;
      console.log(`✅ [TransitionService] Téléport validé: ${validatedTeleport.id}`);
      console.log(`🎯 [TransitionService] TargetSpawn demandé: ${validatedTeleport.targetSpawn}`);

      // 4. Vérifier les règles de configuration avec JWT
      const configValidation = await this.validateConfigRules(client, player, data);
      if (!configValidation.success) {
        return configValidation;
      }

      // 5. ✅ NOUVEAU: Trouver le spawn correspondant dans la zone de destination
      const spawnPosition = this.findTargetSpawn(data.targetZone, validatedTeleport.targetSpawn);
      if (!spawnPosition) {
        console.error(`❌ [TransitionService] Spawn introuvable: ${data.targetZone} avec targetSpawn="${validatedTeleport.targetSpawn}"`);
        return {
          success: false,
          reason: `Position de spawn introuvable: targetSpawn="${validatedTeleport.targetSpawn}"`,
          rollback: true
        };
      }

      // 6. ✅ NOUVEAU: Gérer la transition du follower
      if (this.followerHandlers) {
        console.log(`🐾 [TransitionService] Gestion transition follower pour ${client.sessionId}`);
        this.followerHandlers.onPlayerMapTransition(client.sessionId, spawnPosition.x, spawnPosition.y);
      }

      // 7. Validation réussie
      console.log(`✅ [TransitionService] === TRANSITION VALIDÉE AVEC SPAWN DYNAMIQUE ===`);
      console.log(`📍 Position spawn: (${spawnPosition.x}, ${spawnPosition.y})`);
      this.jwtManager.ensureMapping(client.sessionId, userId, jwtData);

      return {
        success: true,
        position: spawnPosition,
        currentZone: data.targetZone,
        validatedTeleport: validatedTeleport,
        userId: userId
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

  // ✅ VALIDATION TÉLÉPORT AVEC targetSpawn
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
      console.log(`  🎯 TargetSpawn: ${teleport.targetSpawn}`);
      
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
        console.error(`    - ${t.id}: (${t.x}, ${t.y}) → ${t.targetZone} [${t.targetSpawn}]`);
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
    console.log(`  TargetSpawn: ${validTeleport.targetSpawn}`);

    return { 
      success: true,
      validatedTeleport: validTeleport
    };
  }

  // ✅ NOUVEAU: Recherche du spawn correspondant au targetSpawn
  private findTargetSpawn(targetZone: string, targetSpawn: string): { x: number; y: number } | null {
    console.log(`[TransitionService] Recherche spawn: zone="${targetZone}" targetSpawn="${targetSpawn}"`);
    
    const spawns = this.spawnData.get(targetZone);
    if (!spawns || spawns.length === 0) {
      console.error(`❌ [TransitionService] Aucun spawn dans la zone: ${targetZone}`);
      return null;
    }

    console.log(`🔍 [TransitionService] ${spawns.length} spawns disponibles dans ${targetZone}:`);
    spawns.forEach(spawn => {
      console.log(`  - ${spawn.id}: targetSpawn="${spawn.targetSpawn}" pos=(${spawn.x}, ${spawn.y})`);
    });

    // Chercher le spawn avec le bon targetSpawn
    const matchingSpawn = spawns.find(spawn => spawn.targetSpawn === targetSpawn);
    
    if (!matchingSpawn) {
      console.error(`❌ [TransitionService] Aucun spawn trouvé avec targetSpawn="${targetSpawn}" dans ${targetZone}`);
      
      // Fallback: prendre le premier spawn disponible
      if (spawns.length > 0) {
        console.warn(`⚠️ [TransitionService] Utilisation du spawn par défaut: ${spawns[0].id}`);
        return { x: spawns[0].x, y: spawns[0].y };
      }
      
      return null;
    }

    console.log(`✅ [TransitionService] Spawn trouvé: ${matchingSpawn.id} à (${matchingSpawn.x}, ${matchingSpawn.y})`);
    return { x: matchingSpawn.x, y: matchingSpawn.y };
  }

  // ✅ CHARGEMENT INDÉPENDANT DES TÉLÉPORTS ET SPAWNS
  private loadAllMapsData() {
    console.log(`🔄 [TransitionService] Scan direct du dossier maps...`);
    
    try {
      const mapsDir = path.resolve(__dirname, '../assets/maps/');
      
      if (!fs.existsSync(mapsDir)) {
        console.error(`❌ [TransitionService] Dossier maps introuvable: ${mapsDir}`);
        return;
      }

      // Scanner tous les fichiers .tmj
      const mapFiles = fs.readdirSync(mapsDir)
        .filter(file => file.endsWith('.tmj'))
        .map(file => file.replace('.tmj', ''));

      console.log(`📁 [TransitionService] ${mapFiles.length} cartes trouvées:`, mapFiles);

      // Charger chaque carte
      mapFiles.forEach(zoneName => {
        try {
          this.extractTeleportsAndSpawns(zoneName);
        } catch (error) {
          console.warn(`⚠️ [TransitionService] Erreur extraction ${zoneName}:`, error);
        }
      });

    } catch (error) {
      console.error(`❌ [TransitionService] Erreur scan dossier maps:`, error);
    }

    console.log(`✅ [TransitionService] Données extraites de ${this.teleportData.size} zones`);
  }

  // ✅ EXTRACTION DIRECTE DEPUIS LES FICHIERS TMJ
  private extractTeleportsAndSpawns(zoneName: string) {
    const mapPath = path.resolve(__dirname, `../assets/maps/${zoneName}.tmj`);
    
    if (!fs.existsSync(mapPath)) {
      console.warn(`⚠️ [TransitionService] Map non trouvée: ${mapPath}`);
      return;
    }

    const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    
    const teleports: TeleportData[] = [];
    const spawns: SpawnData[] = [];

    if (!mapData.layers) return;

    mapData.layers.forEach((layer: any) => {
      if (layer.type === 'objectgroup' && layer.objects) {
        layer.objects.forEach((obj: any) => {
          const objName = (obj.name || '').toLowerCase();
          
          // ✅ CHARGER LES TÉLÉPORTS
          if (objName === 'teleport') {
            const targetZone = this.getProperty(obj, 'targetzone');
            const targetSpawn = this.getProperty(obj, 'targetspawn');
            
            if (targetZone && targetSpawn) {
              teleports.push({
                id: `${zoneName}_teleport_${obj.id}`,
                x: obj.x,
                y: obj.y,
                width: obj.width || 32,
                height: obj.height || 32,
                targetZone: targetZone,
                targetSpawn: targetSpawn
              });
              console.log(`📍 [TransitionService] Téléport ${zoneName}_teleport_${obj.id}: (${obj.x}, ${obj.y}) → ${targetZone}[${targetSpawn}]`);
            }
          }
          
          // ✅ CHARGER LES SPAWNS
          else if (objName === 'spawn') {
            const targetSpawn = this.getProperty(obj, 'targetspawn');
            
            if (targetSpawn) {
              spawns.push({
                id: `${zoneName}_spawn_${obj.id}`,
                x: obj.x,
                y: obj.y,
                width: obj.width || 32,
                height: obj.height || 32,
                targetSpawn: targetSpawn
              });
              console.log(`🎯 [TransitionService] Spawn ${zoneName}_spawn_${obj.id}: targetSpawn="${targetSpawn}" à (${obj.x}, ${obj.y})`);
            }
          }
        });
      }
    });

    this.teleportData.set(zoneName, teleports);
    this.spawnData.set(zoneName, spawns);
    
    console.log(`📊 [TransitionService] ${zoneName}: ${teleports.length} téléports, ${spawns.length} spawns chargés`);
  }

  // ✅ MÉTHODES AVEC JWT
  private async validateConfigRules(client: Client, player: Player, request: TransitionRequest): Promise<TransitionResult> {
    const userId = this.jwtManager.getUserId(client.sessionId);
    const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);

    const context: ValidationContext = {
      playerName: jwtData?.username || player.name,
      playerLevel: jwtData?.level || player.level || 1,
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

  /**
   * ✅ NOUVELLE MÉTHODE: Validation de session avec logs détaillés
   */
  private validateUserSession(client: Client): { userId: string; jwtData: any } | null {
    const userId = this.jwtManager.getUserId(client.sessionId);
    const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);
    
    if (!userId || !jwtData) {
      console.error(`❌ [TransitionService] Session invalide pour ${client.sessionId}`);
      this.jwtManager.debugMappings(); // Debug en cas d'erreur
      return null;
    }
    
    return { userId, jwtData };
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
      console.log(`  - ${teleport.id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}[${teleport.targetSpawn}]`);
    });
    
    console.log(`🎯 SPAWNS (${spawns?.length || 0}):`);
    spawns?.forEach(spawn => {
      console.log(`  - ${spawn.id}: targetSpawn="${spawn.targetSpawn}" à (${spawn.x}, ${spawn.y})`);
    });
    
    console.log(`=======================================`);
  }

  public getAllZoneData(): any {
    const result: any = {};
    
    this.teleportData.forEach((teleports, zoneName) => {
      const spawns = this.spawnData.get(zoneName) || [];
      result[zoneName] = {
        teleports: teleports,
        spawns: spawns
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
