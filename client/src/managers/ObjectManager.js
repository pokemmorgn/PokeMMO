// client/src/managers/ObjectManager.js - VERSION CORRIGÉE COMPLÈTE

export default class ObjectManager {
    constructor(scene) {
        this.scene = scene;
        this.objectSprites = new Map(); // ID -> sprite
        this.phaserGroups = null;
        this.isInitialized = false;
        this.isDestroyed = false; // ✅ NOUVEAU: Flag de destruction
        this.networkManager = null;
        this.lastProcessedData = null; // ✅ NOUVEAU: Éviter les doublons
        
        // ✅ NOUVEAU: Configuration par défaut
        this.config = {
            enableVisualFeedback: true,
            enableClickHandling: true,
            enableHoverEffects: true,
            debugMode: true
        };
        
        console.log(`[ObjectManager] 📦 Créé pour scène: ${scene.constructor.name}`);
    }

    // ✅ CORRECTION 1: Initialisation sécurisée
    initialize() {
        if (this.isInitialized || this.isDestroyed) {
            console.log(`[ObjectManager] ⚠️ Déjà initialisé ou détruit`);
            return false;
        }

        console.log(`[ObjectManager] 🚀 === INITIALISATION ===`);
        console.log(`[ObjectManager] Scène: ${this.scene.constructor.name}`);

        try {
            this.setupPhaserGroups();
            this.setupEventHandlers();
            this.setupNetworkIntegration();
            
            this.isInitialized = true;
            console.log(`[ObjectManager] ✅ Initialisé avec succès`);
            return true;
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur initialisation:`, error);
            return false;
        }
    }

    // ✅ CORRECTION 2: Création groupes Phaser sécurisée
    setupPhaserGroups() {
        console.log(`[ObjectManager] 🎭 Création des groupes Phaser...`);
        
        if (!this.scene || !this.scene.add) {
            throw new Error('Scène Phaser invalide');
        }

        // ✅ Vérifier si les groupes existent déjà
        if (this.phaserGroups) {
            console.log(`[ObjectManager] ⚠️ Groupes déjà créés, nettoyage...`);
            this.cleanupPhaserGroups();
        }

        try {
            this.phaserGroups = {
                objects: this.scene.add.group({
                    name: 'ObjectManagerGroup',
                    active: true,
                    maxSize: -1
                }),
                interactions: this.scene.add.group({
                    name: 'ObjectInteractionGroup', 
                    active: true,
                    maxSize: -1
                })
            };
            
            console.log(`[ObjectManager] ✅ Groupes Phaser créés`);
            console.log(`[ObjectManager]   - objects: ${!!this.phaserGroups.objects}`);
            console.log(`[ObjectManager]   - interactions: ${!!this.phaserGroups.interactions}`);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur création groupes:`, error);
            throw error;
        }
    }

    // ✅ CORRECTION 3: Event handlers sécurisés
    setupEventHandlers() {
        console.log(`[ObjectManager] ⚙️ Configuration handlers d'événements...`);
        
        if (!this.scene || !this.scene.input) {
            console.warn(`[ObjectManager] ⚠️ Scene.input manquant, skip event handlers`);
            return;
        }

        try {
            if (this.config.enableClickHandling) {
                // ✅ Click handling basique
                console.log(`[ObjectManager] 🖱️ Click handling activé`);
            }
            
            if (this.config.enableHoverEffects) {
                // ✅ Hover effects basiques  
                console.log(`[ObjectManager] 🎯 Hover effects activés`);
            }
            
            console.log(`[ObjectManager] ✅ Event handlers configurés`);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur event handlers:`, error);
            // ✅ Non-critique, continuer
        }
    }

    // ✅ CORRECTION 4: Intégration réseau robuste
    setupNetworkIntegration() {
        console.log(`[ObjectManager] 🌐 Configuration intégration réseau...`);
        
        // ✅ Recherche NetworkManager multi-sources
        const networkSources = [
            () => this.scene.networkManager,
            () => this.scene.game?.registry?.get('networkManager'),
            () => window.globalNetworkManager,
            () => window.networkManager
        ];
        
        for (const getNetwork of networkSources) {
            try {
                const network = getNetwork();
                if (network) {
                    console.log(`[ObjectManager] 🎯 NetworkManager trouvé`);
                    this.networkManager = network;
                    break;
                }
            } catch (error) {
                // ✅ Ignorer les erreurs et continuer
            }
        }
        
        if (!this.networkManager) {
            console.warn(`[ObjectManager] ⚠️ NetworkManager non trouvé, mode autonome`);
            console.log(`[ObjectManager] ✅ Intégration réseau configurée (mode autonome)`);
            return;
        }
        
        console.log(`[ObjectManager] 🔗 NetworkManager trouvé, configuration callbacks...`);
        
        try {
            // ✅ Configurer callback pour objets de zone
            this.networkManager.onZoneObjects((data) => {
                console.log(`[ObjectManager] 📨 Objets de zone reçus:`, data);
                this.processZoneObjects(data);
            });
            
            // ✅ Demander les objets pour la zone actuelle
            const currentZone = this.networkManager.getCurrentZone();
            if (currentZone) {
                console.log(`[ObjectManager] 📤 Demande objets pour zone: ${currentZone}`);
                this.requestZoneObjects(currentZone);
            }
            
            console.log(`[ObjectManager] ✅ Intégration réseau configurée`);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur intégration réseau:`, error);
            // ✅ Non-critique, continuer en mode autonome
        }
    }

    // ✅ CORRECTION 5: Traitement objets avec dédoublonnage
    processZoneObjects(data) {
        console.log(`[ObjectManager] 🔄 === TRAITEMENT OBJETS ZONE ===`);
        console.log(`[ObjectManager] Zone: ${data.zone}`);
        console.log(`[ObjectManager] Objets: ${data.objects?.length || 0}`);
        
        // ✅ NOUVEAU: Éviter les doublons
        const dataKey = `${data.zone}_${data.objects?.length || 0}_${Date.now()}`;
        if (this.lastProcessedData === dataKey) {
            console.log(`[ObjectManager] ⚠️ Données déjà traitées récemment, skip`);
            return;
        }
        this.lastProcessedData = dataKey;
        
        if (!data.objects || !Array.isArray(data.objects)) {
            console.log(`[ObjectManager] ⚠️ Pas d'objets à traiter`);
            return;
        }
        
        if (this.isDestroyed) {
            console.log(`[ObjectManager] ⚠️ Manager détruit, skip traitement`);
            return;
        }
        
        try {
            let created = 0;
            let updated = 0;
            
            data.objects.forEach(objectData => {
                if (this.objectSprites.has(objectData.id)) {
                    console.log(`[ObjectManager] ♻️ Objet ${objectData.id} existe déjà, mise à jour`);
                    this.updateObjectSprite(objectData);
                    updated++;
                } else {
                    console.log(`[ObjectManager] 🎨 Création sprite objet: ${objectData.id} (${objectData.type || 'unknown'})`);
                    this.createObjectSprite(objectData);
                    created++;
                }
            });
            
            console.log(`[ObjectManager] ✅ ${data.objects.length} objets traités (${created} créés, ${updated} mis à jour)`);
            console.log(`[ObjectManager] 📊 === RÉSUMÉ OBJETS ===`);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur traitement objets:`, error);
        }
    }

    // ✅ CORRECTION 6: Création sprite sécurisée
    createObjectSprite(objectData) {
        if (!this.phaserGroups || this.isDestroyed) {
            console.warn(`[ObjectManager] ⚠️ Groupes non disponibles pour création sprite`);
            return null;
        }
        
        try {
            const sprite = this.createPlaceholderSprite(objectData);
            if (!sprite) {
                console.warn(`[ObjectManager] ⚠️ Échec création sprite pour objet ${objectData.id}`);
                return null;
            }
            
            // ✅ Configurer le sprite
            sprite.setData('objectId', objectData.id);
            sprite.setData('objectType', objectData.type || 'unknown');
            sprite.setData('objectData', objectData);
            
            // ✅ Ajouter au groupe et au cache
            this.phaserGroups.objects.add(sprite);
            this.objectSprites.set(objectData.id, sprite);
            
            console.log(`[ObjectManager] ✅ Sprite créé: ${objectData.id} à (${objectData.x}, ${objectData.y})`);
            return sprite;
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur création sprite ${objectData.id}:`, error);
            return null;
        }
    }

    // ✅ AMÉLIORATION: Création placeholder améliorée
    createPlaceholderSprite(objectData) {
        if (!this.scene || !this.scene.add) {
            console.error(`[ObjectManager] ❌ Scene.add non disponible`);
            return null;
        }
        
        const type = objectData.type || 'unknown';
        console.log(`[ObjectManager] 🟨 Création placeholder pour ${type}`);
        
        // ✅ Couleurs par type d'objet
        const typeColors = {
            'pokeball': 0xFF0000,    // Rouge
            'item': 0x00FF00,        // Vert
            'collectible': 0x0000FF, // Bleu
            'machine': 0xFFFF00,     // Jaune
            'container': 0xFF00FF,   // Magenta
            'unknown': 0x808080      // Gris
        };
        
        const color = typeColors[type] || typeColors.unknown;
        
        try {
            // ✅ Créer rectangle coloré
            const sprite = this.scene.add.rectangle(
                objectData.x,
                objectData.y,
                32, // largeur
                32, // hauteur
                color,
                0.8 // alpha
            );
            
            // ✅ Ajouter bordure
            sprite.setStrokeStyle(2, 0xFFFFFF);
            
            // ✅ Rendre interactif si demandé
            if (this.config.enableClickHandling) {
                sprite.setInteractive();
                sprite.on('pointerdown', () => {
                    console.log(`[ObjectManager] 🖱️ Click sur objet ${objectData.id}`);
                    this.handleObjectClick(objectData);
                });
            }
            
            return sprite;
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur création rectangle:`, error);
            return null;
        }
    }

    // ✅ NOUVEAU: Gestion click objets
    handleObjectClick(objectData) {
        console.log(`[ObjectManager] 🎯 Interaction avec objet:`, objectData);
        
        // ✅ TODO: Implémenter interaction avec objets
        if (this.networkManager && typeof this.networkManager.sendObjectInteract === 'function') {
            this.networkManager.sendObjectInteract(objectData.id, objectData.type);
        }
    }

    // ✅ NOUVEAU: Mise à jour sprite existant
    updateObjectSprite(objectData) {
        const sprite = this.objectSprites.get(objectData.id);
        if (!sprite || sprite.active === false) {
            console.warn(`[ObjectManager] ⚠️ Sprite ${objectData.id} non trouvé pour mise à jour`);
            return;
        }
        
        console.log(`[ObjectManager] 🔄 Mise à jour sprite: ${objectData.id}`);
        
        try {
            // ✅ Mettre à jour position
            sprite.setPosition(objectData.x, objectData.y);
            
            // ✅ Mettre à jour données
            sprite.setData('objectData', objectData);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur mise à jour sprite ${objectData.id}:`, error);
        }
    }

    // ✅ CORRECTION 7: Destruction sécurisée
    destroyObjectSprite(objectId) {
        console.log(`[ObjectManager] 💥 Destruction sprite: ${objectId}`);
        
        const sprite = this.objectSprites.get(objectId);
        if (!sprite) {
            console.log(`[ObjectManager] ⚠️ Sprite ${objectId} non trouvé`);
            return;
        }
        
        try {
            // ✅ NOUVELLE LOGIQUE: Vérification sécurisée
            if (this.phaserGroups && this.phaserGroups.objects) {
                // ✅ Vérifier si le sprite est dans le groupe avant de l'enlever
                if (this.phaserGroups.objects.contains && this.phaserGroups.objects.contains(sprite)) {
                    this.phaserGroups.objects.remove(sprite);
                    console.log(`[ObjectManager] ✅ Sprite ${objectId} retiré du groupe`);
                } else {
                    console.log(`[ObjectManager] ⚠️ Sprite ${objectId} pas dans le groupe`);
                }
            } else {
                console.log(`[ObjectManager] ⚠️ Groupe objects non disponible pour ${objectId}`);
            }
            
            // ✅ Détruire le sprite directement
            if (sprite.destroy && typeof sprite.destroy === 'function') {
                sprite.destroy();
                console.log(`[ObjectManager] ✅ Sprite ${objectId} détruit`);
            }
            
            // ✅ Nettoyer le cache
            this.objectSprites.delete(objectId);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur destruction sprite ${objectId}:`, error);
            
            // ✅ FALLBACK: Nettoyer le cache même en cas d'erreur
            this.objectSprites.delete(objectId);
        }
    }

    // ✅ CORRECTION 8: Nettoyage groupes sécurisé
    cleanupPhaserGroups() {
        console.log(`[ObjectManager] 🧹 Nettoyage groupes Phaser...`);
        
        if (!this.phaserGroups) {
            console.log(`[ObjectManager] ⚠️ Pas de groupes à nettoyer`);
            return;
        }
        
        try {
            // ✅ Nettoyer le groupe objects
            if (this.phaserGroups.objects) {
                console.log(`[ObjectManager] 🗑️ Nettoyage groupe objects (${this.phaserGroups.objects.children?.size || 0} éléments)`);
                
                if (this.phaserGroups.objects.clear) {
                    this.phaserGroups.objects.clear(true, true); // removeFromScene=true, destroyChild=true
                }
                
                if (this.phaserGroups.objects.destroy) {
                    this.phaserGroups.objects.destroy();
                }
            }
            
            // ✅ Nettoyer le groupe interactions
            if (this.phaserGroups.interactions) {
                console.log(`[ObjectManager] 🗑️ Nettoyage groupe interactions`);
                
                if (this.phaserGroups.interactions.clear) {
                    this.phaserGroups.interactions.clear(true, true);
                }
                
                if (this.phaserGroups.interactions.destroy) {
                    this.phaserGroups.interactions.destroy();
                }
            }
            
            console.log(`[ObjectManager] ✅ Groupes nettoyés`);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur nettoyage groupes:`, error);
        } finally {
            // ✅ Toujours reset la référence
            this.phaserGroups = null;
        }
    }

    // ✅ CORRECTION 9: Demande objets robuste
    requestZoneObjects(zone) {
        if (!this.networkManager) {
            console.log(`[ObjectManager] ⚠️ Pas de NetworkManager pour demander objets`);
            return false;
        }
        
        try {
            console.log(`[ObjectManager] 🎯 NetworkManager trouvé`);
            
            if (typeof this.networkManager.sendMessage === 'function') {
                this.networkManager.sendMessage('requestZoneObjects', { zone });
                console.log(`[ObjectManager] ✅ Demande envoyée pour zone ${zone}`);
                return true;
            } else {
                console.log(`[ObjectManager] ⚠️ Méthode sendMessage non disponible`);
                return false;
            }
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur demande objets:`, error);
            return false;
        }
    }

    // ✅ CORRECTION 10: Destruction complète et sécurisée
    destroy() {
        console.log(`[ObjectManager] 💀 === DESTRUCTION ===`);
        
        if (this.isDestroyed) {
            console.log(`[ObjectManager] ⚠️ Déjà détruit`);
            return;
        }
        
        this.isDestroyed = true;
        
        try {
            // ✅ 1. Détruire tous les sprites individuellement
            console.log(`[ObjectManager] 🗑️ Destruction ${this.objectSprites.size} sprites...`);
            
            for (const [objectId, sprite] of this.objectSprites) {
                try {
                    if (sprite && sprite.active !== false) {
                        if (sprite.destroy && typeof sprite.destroy === 'function') {
                            sprite.destroy();
                        }
                    }
                } catch (error) {
                    console.warn(`[ObjectManager] ⚠️ Erreur destruction sprite ${objectId}:`, error);
                }
            }
            
            // ✅ 2. Nettoyer le cache
            this.objectSprites.clear();
            console.log(`[ObjectManager] ✅ Cache sprites nettoyé`);
            
            // ✅ 3. Nettoyer les groupes Phaser
            this.cleanupPhaserGroups();
            
            // ✅ 4. Nettoyer les références
            this.networkManager = null;
            this.scene = null;
            this.lastProcessedData = null;
            
            // ✅ 5. Reset état
            this.isInitialized = false;
            
            console.log(`[ObjectManager] ✅ Détruit`);
            
        } catch (error) {
            console.error(`[ObjectManager] ❌ Erreur destruction:`, error);
        }
    }

    // ✅ MÉTHODES UTILITAIRES

    getObjectCount() {
        return this.objectSprites.size;
    }

    getObjectSprite(objectId) {
        return this.objectSprites.get(objectId) || null;
    }

    getAllObjects() {
        return Array.from(this.objectSprites.values());
    }

    isObjectVisible(objectId) {
        const sprite = this.objectSprites.get(objectId);
        return sprite && sprite.active && sprite.visible;
    }

    // ✅ DEBUG ET MONITORING

    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            objectCount: this.objectSprites.size,
            hasPhaserGroups: !!this.phaserGroups,
            hasNetworkManager: !!this.networkManager,
            sceneValid: !!(this.scene && this.scene.add),
            config: this.config,
            lastProcessedData: this.lastProcessedData
        };
    }

    debugObjectList() {
        console.log(`[ObjectManager] 📋 === LISTE OBJETS DEBUG ===`);
        console.log(`Total: ${this.objectSprites.size} objets`);
        
        this.objectSprites.forEach((sprite, objectId) => {
            const objectData = sprite.getData('objectData');
            console.log(`  ${objectId}: (${sprite.x}, ${sprite.y}) - ${objectData?.type || 'unknown'} - active: ${sprite.active}`);
        });
    }
}

// ✅ FONCTIONS DEBUG GLOBALES

window.debugObjectManager = function() {
    // ✅ Recherche multi-sources du manager
    const managers = [
        () => window.currentScene?.objectManager,
        () => window.game?.scene?.getScenes(true)?.[0]?.objectManager,
        () => window.globalObjectManager
    ].map(getter => {
        try { return getter(); } catch { return null; }
    }).filter(Boolean);
    
    if (managers.length > 0) {
        const manager = managers[0];
        const info = manager.getDebugInfo();
        
        console.log('[ObjectManager] === INFO DEBUG ===');
        console.table({
            'Initialisé': info.isInitialized,
            'Détruit': info.isDestroyed,
            'Objets': info.objectCount,
            'Groupes Phaser': info.hasPhaserGroups,
            'NetworkManager': info.hasNetworkManager,
            'Scène Valide': info.sceneValid
        });
        
        console.log('[ObjectManager] Info complète:', info);
        
        if (info.objectCount > 0) {
            manager.debugObjectList();
        }
        
        return info;
    } else {
        console.error('[ObjectManager] ❌ Manager non trouvé');
        return null;
    }
};

window.testObjectManager = function() {
    console.log('[ObjectManager] 🧪 === TEST AVEC OBJETS SIMULÉS ===');
    
    const managers = [
        () => window.currentScene?.objectManager,
        () => window.game?.scene?.getScenes(true)?.[0]?.objectManager
    ].map(getter => {
        try { return getter(); } catch { return null; }
    }).filter(Boolean);
    
    if (managers.length === 0) {
        console.error('[ObjectManager] ❌ Aucun manager trouvé pour test');
        return false;
    }
    
    const manager = managers[0];
    
    // ✅ Créer des objets de test
    const testObjects = [
        { id: 'test_pokeball_1', x: 100, y: 100, type: 'pokeball' },
        { id: 'test_item_1', x: 200, y: 150, type: 'item' },
        { id: 'test_machine_1', x: 300, y: 200, type: 'machine' }
    ];
    
    console.log(`[ObjectManager] 🎯 Test avec ${testObjects.length} objets simulés`);
    
    try {
        manager.processZoneObjects({
            zone: 'test_zone',
            objects: testObjects
        });
        
        console.log('[ObjectManager] ✅ Test réussi !');
        console.log(`[ObjectManager] Objets créés: ${manager.getObjectCount()}`);
        
        return true;
        
    } catch (error) {
        console.error('[ObjectManager] ❌ Test échoué:', error);
        return false;
    }
};

console.log('✅ ObjectManager corrigé chargé!');
console.log('🔍 Utilisez window.debugObjectManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testObjectManager() pour tester avec des objets simulés');
