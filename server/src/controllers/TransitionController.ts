import { Client } from "@colyseus/core";
import { PlayerData } from "../models/PlayerData";
import { BaseRoom } from "../rooms/BaseRoom";
import { Player } from "../schema/PokeWorldState";
import fs from "fs";
import path from "path";

// Cache pour ne pas relire à chaque fois
const mapCache: { [key: string]: any } = {};

/**
 * Normalise un nom de map ("BeachRoom", "BeachScene", "beach") => "beach"
 */
function normalizeMapName(name: string): string {
  return name.toLowerCase().replace(/room|scene/gi, '');
}

/**
 * Charge une map TMJ depuis le dossier maps (cache si déjà lue)
 */
function loadMap(mapName: string): any {
  const cleanName = normalizeMapName(mapName);
  if (!mapCache[cleanName]) {
    const mapPath = path.join(__dirname, "../assets/maps/", `${cleanName}.tmj`);
    if (!fs.existsSync(mapPath)) {
      throw new Error(`[TransitionController] Map manquante: ${mapPath}`);
    }
    console.log(`[TransitionController] Chargement map '${cleanName}' depuis ${mapPath}`);
    mapCache[cleanName] = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  } else {
    console.log(`[TransitionController] Map '${cleanName}' chargée depuis le cache`);
  }
  return mapCache[cleanName];
}

/**
 * Récupère un objet dans le layer Worlds selon sa propriété targetSpawn
 */
function findWorldObject(mapName: string, valueToFind: string): any | null {
  const mapData = loadMap(mapName);
  const worldsLayer = mapData.layers.find(
    (l: any) => l.name === "Worlds" && l.type === "objectgroup"
  );
  if (!worldsLayer) {
    console.warn(`[TransitionController] Layer 'Worlds' introuvable dans la map '${mapName}'.`);
    return null;
  }
  // Cherche par propriété "targetSpawn" OU par nom (pour compatibilité)
  const foundObj = worldsLayer.objects.find((obj: any) =>
    obj.name === valueToFind ||
    (obj.properties && obj.properties.some((p: any) => p.name === "targetSpawn" && p.value === valueToFind))
  );
  return foundObj || null;
}



/**
 * Cherche une propriété personnalisée d'un objet Tiled (array → value)
 */
function getProperty(obj: any, key: string): any {
  if (!obj.properties) return undefined;
  const prop = obj.properties.find((p: any) => p.name === key);
  return prop?.value;
}

/**
 * Extrait le nom de la sortie depuis les données de transition
 */
function extractExitName(targetSpawn: any): string {
  // Debug: log what we received
  console.log(`[TransitionController] Données targetSpawn reçues:`, typeof targetSpawn, targetSpawn);
  
  if (typeof targetSpawn === "string") {
    return targetSpawn;
  }
  
  if (targetSpawn && typeof targetSpawn === "object") {
    // Si c'est un objet, essaie différentes propriétés possibles
    if (typeof targetSpawn.targetSpawn === "string") {
      return targetSpawn.targetSpawn;
    }
    if (typeof targetSpawn.name === "string") {
      return targetSpawn.name;
    }
    if (typeof targetSpawn.exitName === "string") {
      return targetSpawn.exitName;
    }
    if (typeof targetSpawn.target === "string") {
      return targetSpawn.target;
    }
    
    // Si aucune propriété connue, log l'objet pour debug
    console.warn(`[TransitionController] Objet targetSpawn inconnu:`, Object.keys(targetSpawn));
  }
  
  console.warn(`[TransitionController] targetSpawn invalide:`, targetSpawn);
  return "";
}

type TransitionData = {
  targetSpawn?: string | { targetSpawn?: string; name?: string; exitName?: string; target?: string } | any;
};

export class TransitionController {
  room: BaseRoom;

  constructor(room: BaseRoom) {
    this.room = room;
  }

  async handleTransition(client: Client, data: TransitionData) {
    const player = this.room.state.players.get(client.sessionId) as Player | undefined;

    if (!player || (player as any).isTransitioning) {
      console.warn(`[TransitionController] Transition ignorée : déjà en cours pour ${player?.name}`);
      return;
    }

    (player as any).isTransitioning = true;

    // On récupère l'objet de sortie dans la map actuelle, layer Worlds
    const currentMapName = normalizeMapName(this.room.mapName);
    const exitName = extractExitName(data.targetSpawn);
    
    if (!exitName) {
      console.warn(`[TransitionController] DENIED: nom de sortie vide ou invalide`);
      client.send("transitionDenied", { reason: "Nom de sortie invalide" });
      (player as any).isTransitioning = false;
      return;
    }
    
    // Cherche l'objet qui a la propriété targetSpawn correspondante
    const exitObj = findWorldObjectByTargetSpawn(currentMapName, exitName);

    if (!exitObj) {
      console.warn(`[TransitionController] DENIED: sortie '${exitName}' absente de la map '${currentMapName}'`);
      client.send("transitionDenied", { reason: "Sortie introuvable côté serveur" });
      (player as any).isTransitioning = false;
      return;
    }

    // Propriétés custom de l'objet (définies dans Tiled !)
    const targetZone = getProperty(exitObj, "targetZone");
    const targetSpawn = getProperty(exitObj, "targetSpawn");

    if (!targetZone || !targetSpawn) {
      console.warn(`[TransitionController] DENIED: targetZone/targetSpawn manquant sur la sortie '${exitName}'`);
      client.send("transitionDenied", { reason: "Propriétés de transition absentes" });
      (player as any).isTransitioning = false;
      return;
    }

    // On cherche l'objet d'arrivée dans la map cible (targetZone)
    const entryObj = findWorldObject(normalizeMapName(targetZone), targetSpawn);

    if (!entryObj) {
      console.warn(`[TransitionController] DENIED: point d'arrivée '${targetSpawn}' absent de '${targetZone}'`);
      client.send("transitionDenied", { reason: "Entrée introuvable dans la map cible" });
      (player as any).isTransitioning = false;
      return;
    }

    // Utilise les coordonnées exactes du point d'entrée
    const spawnX = entryObj.x;
    const spawnY = entryObj.y;

    // Ici tu peux aussi prendre des propriétés custom sur le point d'entrée (genre direction)

    console.log(`[TransitionController] Transition ${player.name} (${currentMapName}) -> ${targetZone} via '${exitName}' (${spawnX},${spawnY})`);

    this.room.state.players.delete(client.sessionId);
    this.room.movementController?.resetPlayer?.(client.sessionId);

    // Mets à jour la position dans la base Mongo
    await PlayerData.updateOne(
      { username: player.name },
      { $set: { lastX: spawnX, lastY: spawnY, lastMap: targetZone } }
    );

    // Envoie au client les infos pour charger la nouvelle zone
    client.send("zoneChanged", {
      targetZone: targetZone,
      fromZone: this.room.mapName,
      spawnX: spawnX,
      spawnY: spawnY,
      entryName: targetSpawn // optionnel pour debug
    });

    console.log(`[TransitionController] Transition terminée pour ${player.name}`);
  }
}
