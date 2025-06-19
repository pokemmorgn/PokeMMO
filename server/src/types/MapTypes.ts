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
    data?: number[];
    width?: number;
    height?: number;
}

export interface TiledMap {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: TiledLayer[];
    tilesets: any[];
}

export interface Teleport {
    mapName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fromzone: string;
    targetzone: string;
    targetspawn: string;
}

export interface Spawn {
    mapName: string;
    x: number;
    y: number;
    targetspawn: string;
    targetzone: string;
}

export interface TeleportResult {
    success: boolean;
    targetMap: string;
    targetX: number;
    targetY: number;
    spawnPoint: string;
}

export interface ParsedProperties {
    [key: string]: string | number | boolean;
}
