// server/src/services/TransitionService.ts
import { Client } from "@colyseus/core";
import { Player } from "../schema/PokeWorldState";
import { TeleportConfig, TransitionRule, ValidationContext } from "../config/TeleportConfig";
import { JWTManager } from "../managers/JWTManager";
import { FollowerHandlers } from "../handlers/FollowerHandlers";
import { getDbZoneName } from "../config/ZoneMapping";
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

  constructor() {
    this.jwtManager = JWTManager.getInstance();
    this.config = new TeleportConfig();
    this.loadAllMapsData();
    
    console.log(`[TransitionService] Initialized with ${this.teleportData.size} zones`);
  }

  setFollowerHandlers(followerHandlers: FollowerHandlers): void {
    this.followerHandlers = followerHandlers;
  }

  async validateTransition(client: Client, player: any, data: TransitionRequest): Promise<any> {
    const dbFromZone = getDbZoneName(data.fromZone);
    const dbTargetZone = getDbZoneName(data.targetZone);
    
    const sessionValidation = await this.jwtManager.validateSessionRobust(
      client.sessionId, 
      player.name, 
      'transition'
    );
    
    if (!sessionValidation.valid) {
      console.error(`[TransitionService] Session validation failed: ${sessionValidation.reason}`);
      return {
        success: false,
        reason: "Invalid session for transition",
        rollback: true
      };
    }
    
    const { userId, jwtData } = sessionValidation;

    try {
      if (!this.teleportData.has(dbFromZone)) {
        console.error(`[TransitionService] Unknown source zone: ${dbFromZone} (client: ${data.fromZone})`);
        return {
          success: false,
          reason: `Unknown source zone: ${data.fromZone}`,
          rollback: true
        };
      }

      if (!this.spawnData.has(dbTargetZone)) {
        console.error(`[TransitionService] Target zone without spawns: ${dbTargetZone} (client: ${data.targetZone})`);
        return {
          success: false,
          reason: `Target zone without spawns: ${data.targetZone}`,
          rollback: true
        };
      }

      const mappedRequest = {
        ...data,
        fromZone: dbFromZone,
        targetZone: dbTargetZone
      };
      
      const teleportValidation = this.validateTeleportCollision(mappedRequest);
      if (!teleportValidation.success) {
        return teleportValidation;
      }

      const validatedTeleport = teleportValidation.validatedTeleport!;

      const configValidation = await this.validateConfigRules(client, player, data);
      if (!configValidation.success) {
        return configValidation;
      }

      const spawnPosition = this.findTargetSpawn(dbTargetZone, validatedTeleport.targetSpawn);
      if (!spawnPosition) {
        console.error(`[TransitionService] Spawn not found: ${dbTargetZone} with targetSpawn="${validatedTeleport.targetSpawn}"`);
        return {
          success: false,
          reason: `Spawn position not found: targetSpawn="${validatedTeleport.targetSpawn}"`,
          rollback: true
        };
      }

      if (this.followerHandlers) {
        this.followerHandlers.onPlayerMapTransition(client.sessionId, spawnPosition.x, spawnPosition.y);
      }

      this.jwtManager.ensureMapping(client.sessionId, userId, jwtData);

      return {
        success: true,
        position: spawnPosition,
        currentZone: data.targetZone,
        validatedTeleport: validatedTeleport,
        userId: userId
      };

    } catch (error) {
      console.error(`[TransitionService] Validation error:`, error);
      return {
        success: false,
        reason: "Server error during validation",
        rollback: true
      };
    }
  }

  private validateTeleportCollision(request: TransitionRequest): TransitionResult & { validatedTeleport?: TeleportData } {
    const teleports = this.teleportData.get(request.fromZone);
    if (!teleports) {
      console.error(`[TransitionService] No teleports found in ${request.fromZone}`);
      return {
        success: false,
        reason: "No teleports found in this zone",
        rollback: true
      };
    }

    const validTeleport = teleports.find(teleport => {
      if (teleport.targetZone !== request.targetZone) {
        return false;
      }
      
      const teleportCenterX = teleport.x + (teleport.width / 2);
      const teleportCenterY = teleport.y + (teleport.height / 2);
      const playerCenterX = request.playerX + 16;
      const playerCenterY = request.playerY + 16;
      
      const distance = Math.sqrt(
        Math.pow(playerCenterX - teleportCenterX, 2) + 
        Math.pow(playerCenterY - teleportCenterY, 2)
      );
      
      const maxDistance = Math.max(teleport.width, teleport.height) + 50;
      
      if (distance > maxDistance) {
        return false;
      }
      
      return true;
    });

    if (!validTeleport) {
      console.error(`[TransitionService] No valid teleport found at position (${request.playerX}, ${request.playerY}) for ${request.fromZone} → ${request.targetZone}`);
      return {
        success: false,
        reason: "No valid teleport at this position with this destination",
        rollback: true
      };
    }

    return { 
      success: true,
      validatedTeleport: validTeleport
    };
  }

  private findTargetSpawn(targetZone: string, targetSpawn: string): { x: number; y: number } | null {
    const spawns = this.spawnData.get(targetZone);
    if (!spawns || spawns.length === 0) {
      console.error(`[TransitionService] No spawns in zone: ${targetZone}`);
      return null;
    }

    const matchingSpawn = spawns.find(spawn => spawn.targetSpawn === targetSpawn);
    
    if (!matchingSpawn) {
      console.error(`[TransitionService] No spawn found with targetSpawn="${targetSpawn}" in ${targetZone}`);
      
      if (spawns.length > 0) {
        console.warn(`[TransitionService] Using default spawn: ${spawns[0].id}`);
        return { x: spawns[0].x, y: spawns[0].y };
      }
      
      return null;
    }

    return { x: matchingSpawn.x, y: matchingSpawn.y };
  }

  private loadAllMapsData() {
    try {
      const mapsDir = path.resolve(__dirname, '../assets/maps/');
      
      if (!fs.existsSync(mapsDir)) {
        console.error(`[TransitionService] Maps directory not found: ${mapsDir}`);
        return;
      }

      const mapFiles = fs.readdirSync(mapsDir)
        .filter(file => file.endsWith('.tmj'))
        .map(file => file.replace('.tmj', ''));

      mapFiles.forEach(zoneName => {
        try {
          this.extractTeleportsAndSpawns(zoneName);
        } catch (error) {
          console.warn(`[TransitionService] Error extracting ${zoneName}:`, error);
        }
      });

    } catch (error) {
      console.error(`[TransitionService] Error scanning maps directory:`, error);
    }
  }

  private extractTeleportsAndSpawns(zoneName: string) {
    const mapPath = path.resolve(__dirname, `../assets/maps/${zoneName}.tmj`);
    
    if (!fs.existsSync(mapPath)) {
      console.warn(`[TransitionService] Map not found: ${mapPath}`);
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
          
          if (objName === 'teleport') {
            const targetZone = this.getProperty(obj, 'targetzone');
            const targetSpawn = this.getProperty(obj, 'targetspawn');
            
            if (targetZone && targetSpawn) {
              const dbTargetZone = getDbZoneName(targetZone);
              
              teleports.push({
                id: `${zoneName}_teleport_${obj.id}`,
                x: obj.x,
                y: obj.y,
                width: obj.width || 32,
                height: obj.height || 32,
                targetZone: dbTargetZone,
                targetSpawn: targetSpawn
              });
            }
          }
          
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
            }
          }
        });
      }
    });

    this.teleportData.set(zoneName, teleports);
    this.spawnData.set(zoneName, spawns);
  }

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
      console.warn(`[TransitionService] Transition denied by config: ${canTransition.reason}`);
      return {
        success: false,
        reason: canTransition.reason,
        rollback: true
      };
    }

    return { success: true };
  }

  private validateUserSession(client: Client): { userId: string; jwtData: any } | null {
    const userId = this.jwtManager.getUserId(client.sessionId);
    const jwtData = this.jwtManager.getJWTDataBySession(client.sessionId);
    
    if (!userId || !jwtData) {
      console.error(`[TransitionService] Invalid session for ${client.sessionId}`);
      this.jwtManager.debugMappings();
      return null;
    }
    
    return { userId, jwtData };
  }

  private getProperty(object: any, propertyName: string): any {
    if (!object.properties) return null;
    const prop = object.properties.find((p: any) => p.name === propertyName);
    return prop ? prop.value : null;
  }

  public debugZoneData(clientZoneName: string): void {
    const dbZoneName = getDbZoneName(clientZoneName);
    console.log(`[TransitionService] DEBUG ${clientZoneName.toUpperCase()} (DB: ${dbZoneName})`);
    
    const teleports = this.teleportData.get(dbZoneName);
    const spawns = this.spawnData.get(dbZoneName);
    
    console.log(`TELEPORTS (${teleports?.length || 0}):`);
    teleports?.forEach(teleport => {
      console.log(`  - ${teleport.id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone}[${teleport.targetSpawn}]`);
    });
    
    console.log(`SPAWNS (${spawns?.length || 0}):`);
    spawns?.forEach(spawn => {
      console.log(`  - ${spawn.id}: targetSpawn="${spawn.targetSpawn}" at (${spawn.x}, ${spawn.y})`);
    });
  }

  public getAllZoneData(): any {
    const result: any = {};
    
    this.teleportData.forEach((teleports, dbZoneName) => {
      const spawns = this.spawnData.get(dbZoneName) || [];
      result[dbZoneName] = {
        teleports: teleports,
        spawns: spawns
      };
    });
    
    return result;
  }

  public getZoneStats(): any {
    const stats: any = {};
    
    this.teleportData.forEach((teleports, dbZoneName) => {
      const spawns = this.spawnData.get(dbZoneName) || [];
      stats[dbZoneName] = {
        teleportCount: teleports.length,
        spawnCount: spawns.length
      };
    });
    
    return stats;
  }
}
