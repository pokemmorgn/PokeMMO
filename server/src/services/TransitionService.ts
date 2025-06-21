// server/src/services/TransitionService.ts
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

  // ✅ CHARGEMENT DES DONNÉES DE TOUTES LES MAPS
  private loadAllMapsData() {
    const zones = ['beach', 'village', 'villagelab', 'villagehouse1', 'road1', 'lavandia'];
    
    zones.forEach(zoneName => {
      try {
        const mapPath = path.resolve(__dirname, `../assets/maps/${zoneName}.tmj`);
        if (fs.existsSync(mapPath)) {
          const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
          this.extractTeleportsAndSpawns(zoneName, mapData);
        }
      } catch (error) {
        console.warn(`⚠️ [TransitionService] Impossible de charger ${zoneName}:`, error);
      }
    });

    console.log(`✅ [TransitionService] Données chargées pour ${this.teleportData.size} zones`);
  }

  // ✅ EXTRACTION DES TÉLÉPORTS ET SPAWNS DEPUIS UNE MAP
  private extractTeleportsAndSpawns(zoneName: string, mapData: any) {
    const teleports: TeleportData[] = [];
    const spawns: any[] = [];

    if (!mapData.layers) return;

    // Chercher dans tous les layers d'objets
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
            }
          } else if (objName === 'spawn') {
            const spawnName = this.getProperty(obj, 'name') || 
                             this.getProperty(obj, 'spawnname') ||
                             obj.name;
            
            if (spawnName) {
              spawns.push({
                name: spawnName,
                x: obj.x,
                y: obj.y,
                zone: zoneName
              });
            }
          }
        });
      }
    });

    this.teleportData.set(zoneName, teleports);
    this.spawnData.set(zoneName, spawns);
    
    console.log(`📍 [TransitionService] ${zoneName}: ${teleports.length} téléports, ${spawns.length} spawns`);
  }

  // ✅ VALIDATION PRINCIPALE D'UNE TRANSITION
  async validateTransition(client: Client, player: Player, request: TransitionRequest): Promise<TransitionResult> {
    console.log(`🔍 [TransitionService] === VALIDATION TRANSITION ===`);
    console.log(`👤 Joueur: ${player.name} (${client.sessionId})`);
    console.log(`📍 ${request.fromZone} → ${request.targetZone}`);
    console.log(`📊 Position: (${request.playerX}, ${request.playerY})`);

    try {
      // 1. Vérifier que les zones existent
      if (!this.teleportData.has(request.fromZone)) {
        return {
          success: false,
          reason: `Zone source inconnue: ${request.fromZone}`,
          rollback: true
        };
      }

      if (!this.teleportData.has(request.targetZone)) {
        return {
          success: false,
          reason: `Zone de destination inconnue: ${request.targetZone}`,
          rollback: true
        };
      }

      // 2. Vérifier les règles de configuration
      const configValidation = await this.validateConfigRules(player, request);
      if (!configValidation.success) {
        return configValidation;
      }

      // 3. Vérifier la proximité du téléport
      const teleportValidation = this.validateTeleportProximity(request);
      if (!teleportValidation.success) {
        return teleportValidation;
      }

      // 4. Calculer la position de spawn
      const spawnPosition = this.calculateSpawnPosition(request.targetZone, request.targetSpawn);
      if (!spawnPosition) {
        return {
          success: false,
          reason: `Position de spawn introuvable: ${request.targetSpawn || 'défaut'}`,
          rollback: true
        };
      }

      // 5. Validation réussie
      console.log(`✅ [TransitionService] Transition validée: ${request.fromZone} → ${request.targetZone}`);
      
      return {
        success: true,
        position: spawnPosition,
        currentZone: request.targetZone
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

  // ✅ VALIDATION DES RÈGLES DE CONFIGURATION
  private async validateConfigRules(player: Player, request: TransitionRequest): Promise<TransitionResult> {
    const context: ValidationContext = {
      playerName: player.name,
      playerLevel: 1, // TODO: Récupérer le vrai niveau
      currentZone: request.fromZone,
      targetZone: request.targetZone,
      playerX: request.playerX,
      playerY: request.playerY,
      hasVipAccess: false, // TODO: Vérifier le statut VIP
      completedQuests: [], // TODO: Récupérer les quêtes complétées
      inventory: [], // TODO: Récupérer l'inventaire
      badges: [] // TODO: Récupérer les badges
    };

    const canTransition = await this.config.canPlayerTransition(context);
    
    if (!canTransition.allowed) {
      console.log(`❌ [TransitionService] Transition refusée: ${canTransition.reason}`);
      return {
        success: false,
        reason: canTransition.reason,
        rollback: true
      };
    }

    return { success: true };
  }

  // ✅ VALIDATION DE LA PROXIMITÉ DU TÉLÉPORT
  private validateTeleportProximity(request: TransitionRequest): TransitionResult {
    const teleports = this.teleportData.get(request.fromZone);
    if (!teleports) {
      return {
        success: false,
        reason: "Aucun téléport trouvé dans cette zone",
        rollback: true
      };
    }

    // Chercher un téléport valide à proximité
    const validTeleport = teleports.find(teleport => {
      if (teleport.targetZone !== request.targetZone) return false;
      
      // Vérifier la collision avec le téléport
      const playerRight = request.playerX + 16; // Taille du joueur
      const playerBottom = request.playerY + 16;
      const teleportRight = teleport.x + teleport.width;
      const teleportBottom = teleport.y + teleport.height;
      
      return (
        request.playerX < teleportRight &&
        playerRight > teleport.x &&
        request.playerY < teleportBottom &&
        playerBottom > teleport.y
      );
    });

    if (!validTeleport) {
      console.log(`❌ [TransitionService] Aucun téléport valide à proximité`);
      console.log(`📍 Position joueur: (${request.playerX}, ${request.playerY})`);
      console.log(`📍 Téléports disponibles:`, teleports.map(t => ({
        id: t.id,
        pos: `(${t.x}, ${t.y})`,
        size: `${t.width}x${t.height}`,
        target: t.targetZone
      })));
      
      return {
        success: false,
        reason: "Aucun téléport valide à cette position",
        rollback: true
      };
    }

    console.log(`✅ [TransitionService] Téléport valide trouvé: ${validTeleport.id}`);
    return { success: true };
  }

  // ✅ CALCUL DE LA POSITION DE SPAWN
  private calculateSpawnPosition(targetZone: string, targetSpawn?: string): { x: number; y: number } | null {
    const spawns = this.spawnData.get(targetZone);
    if (!spawns) {
      console.warn(`⚠️ [TransitionService] Aucun spawn trouvé pour ${targetZone}`);
      return { x: 100, y: 100 }; // Position par défaut
    }

    if (targetSpawn) {
      const namedSpawn = spawns.find(spawn => spawn.name === targetSpawn);
      if (namedSpawn) {
        console.log(`✅ [TransitionService] Spawn "${targetSpawn}" trouvé: (${namedSpawn.x}, ${namedSpawn.y})`);
        return { x: namedSpawn.x, y: namedSpawn.y };
      } else {
        console.warn(`⚠️ [TransitionService] Spawn "${targetSpawn}" non trouvé dans ${targetZone}`);
      }
    }

    // Prendre le premier spawn disponible
    if (spawns.length > 0) {
      const defaultSpawn = spawns[0];
      console.log(`✅ [TransitionService] Spawn par défaut: (${defaultSpawn.x}, ${defaultSpawn.y})`);
      return { x: defaultSpawn.x, y: defaultSpawn.y };
    }

    // Position de fallback
    console.warn(`⚠️ [TransitionService] Aucun spawn trouvé, position par défaut`);
    return { x: 100, y: 100 };
  }

  // ✅ HELPER: Récupérer une propriété d'objet
  private getProperty(object: any, propertyName: string): any {
    if (!object.properties) return null;
    const prop = object.properties.find((p: any) => p.name === propertyName);
    return prop ? prop.value : null;
  }

  // ✅ MÉTHODES PUBLIQUES POUR LE DEBUG

  public debugZoneData(zoneName: string): void {
    console.log(`🔍 [TransitionService] === DEBUG ${zoneName.toUpperCase()} ===`);
    
    const teleports = this.teleportData.get(zoneName);
    const spawns = this.spawnData.get(zoneName);
    
    console.log(`📍 TÉLÉPORTS (${teleports?.length || 0}):`);
    teleports?.forEach(teleport => {
      console.log(`  - ${teleport.id}: (${teleport.x}, ${teleport.y}) → ${teleport.targetZone} ${teleport.targetSpawn || ''}`);
    });
    
    console.log(`🎯 SPAWNS (${spawns?.length || 0}):`);
    spawns?.forEach(spawn => {
      console.log(`  - "${spawn.name}": (${spawn.x}, ${spawn.y})`);
    });
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
