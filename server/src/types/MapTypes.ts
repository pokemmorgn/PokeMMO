// ==========================================
// types/MapTypes.ts - Types pour les maps
// ==========================================

export interface TiledProperty {
    name: string;
    value: string | number | boolean;
    type?: string;
}

export interface TiledObject {
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    properties?: TiledProperty[];
}

export interface TiledLayer {
    id: number;
    name: string;
    type: string;
    objects?: TiledObject[];
}

export interface TiledMap {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: TiledLayer[];
}

export interface Teleport {
    mapName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targetSpawn: string;
    targetZone: string;
}

export interface Spawn {
    mapName: string;
    x: number;
    y: number;
    targetSpawn: string;
    targetZone: string;
}

export interface TeleportResult {
    success: boolean;
    targetMap: string;
    targetX: number;
    targetY: number;
    spawnPoint: string;
}
