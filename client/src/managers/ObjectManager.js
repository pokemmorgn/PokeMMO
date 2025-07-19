// client/src/managers/ObjectManager.js
// ✅ Gestionnaire d'objets côté client - Compatible avec architecture modulaire
// Gère réception, affichage, et cycles de vie des objets dans les zones

export class ObjectManager {
  constructor(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // ✅ État des objets
    this.state = {
      currentZone: null,
      lastReceivedObjects: null,
      lastObjectsTime: 0,
      isLoadingObjects: false,
      objectsRequested: false
    };
    
    // ✅ Collections d'objets gérés
    this.objects = {
      // Données brutes du serveur
      serverData: new Map(), // objectId -> serverObjectData
      
      // Sprites Phaser créés
      sprites: new Map(), // objectId -> Phaser.GameObjects.Sprite
      
      // Objets par zone pour nettoyage
      byZone: new Map(), // zone -> Set<objectId>
      
      // Index par type pour recherches rapides
      byType: new Map(), // type -> Set<objectId>
      
      // Objets visibles actuellement
      visible: new Set(), // Set<objectId>
      
      // Objets interactables
      interactable: new Set() // Set<objectId>
    };
    
    // ✅ Configuration sprites modulaire
    this.spriteConfig = {
      // Mapping type → spriteKey pour vrais sprites
      spriteMapping: {
        'pokeball': 'pokeball_sprite',
        'potion': 'potion_sprite',
        'pc': 'pc_sprite',
        'machine': 'machine_sprite',
        'container': 'container_sprite',
        'collectible': 'collectible_sprite',
        'berry': 'berry_sprite'
      },
      
      // Couleurs placeholder par type
      placeholderColors: {
        'pokeball': 0xFF4444,     // Rouge
        'potion': 0x44FF44,       // Vert
        'pc': 0x4444FF,           // Bleu
        'machine': 0xFFFF44,      // Jaune
        'container': 0xFF44FF,    // Magenta
        'collectible': 0x44FFFF,  // Cyan
        'berry': 0xFFA500,         // Orange
        'default': 0x888888       // Gris
      },
      
      // Tailles placeholder par type
      placeholderSizes: {
        'pokeball': { width: 16, height: 16 },
        'potion': { width: 12, height: 16 },
        'pc': { width: 32, height: 24 },
        'machine': { width: 24, height: 24 },
        'container': { width: 20, height: 20 },
        'collectible': { width: 14, height: 14 },
        'berry': { width: 18, height: 18 },
        'default': { width: 16, height: 16 }
      }
    };
    
    // ✅ Configuration gestion
    this.config = {
      enableDebugLogs: true,
      enableVisualFeedback: true,
      enableClickHandling: true,
      enableHoverEffects: true,
      maxObjectsPerZone: 100,
      spriteDepth: 1,
      interactionHighlightColor: 0xFFFF00,
      autoRequestOnZoneChange: true,
      placeholderMode: true // Commencer en mode placeholder
    };
    
    // ✅ Callbacks pour intégration
    this.callbacks = {
      onObjectsReceived: null,
      onObjectCreated: null,
      onObjectDestroyed: null,
      onObjectClicked: null,
      onObjectHover: null,
      onZoneObjectsLoaded: null,
      onObjectInteraction: null
    };
    
    // ✅ Statistiques debug
    this.stats = {
      totalObjectsReceived: 0,
      objectsCreated: 0,
      objectsDestroyed: 0,
      spritesActive: 0,
      clickEvents: 0,
      hoverEvents: 0,
      zonesLoaded: 0,
      errors: 0
    };
    
    // ✅ Groupes Phaser pour organisation
    this.groups = {
      allObjects: null,      // Groupe principal
      byType: new Map(),     // Groupes par type d'objet
      interactable: null,    // Objets avec lesquels on peut interagir
      background: null,      // Objets décoratifs
      foreground: null       // Objets au premier plan
    };
    
    console.log('[ObjectManager] 📦 Créé pour scène:', this.scene.scene.key);
  }

  // === INITIALISATION ===

  initialize(dependencies = {}) {
    console.log('[ObjectManager] 🚀 === INITIALISATION ===');
    console.log('[ObjectManager] Scène:', this.scene.scene.key);
    
    // ✅ Créer les groupes Phaser
    this.createPhaserGroups();
    
    // ✅ Configurer les handlers d'événements
    this.setupEventHandlers();
    
    // ✅ Connecter au NetworkManager si disponible
    this.setupNetworkIntegration();
    
    this.isInitialized = true;
    console.log('[ObjectManager] ✅ Initialisé avec succès');
    
    return this;
  }

  createPhaserGroups() {
    console.log('[ObjectManager] 🎭 Création des groupes Phaser...');
    
    try {
      // Groupe principal pour tous les objets
      this.groups.allObjects = this.scene.add.group();
      
      // Groupe pour objets interactables
      this.groups.interactable = this.scene.add.group();
      
      // Groupes par couche
      this.groups.background = this.scene.add.group();
      this.groups.foreground = this.scene.add.group();
      
      // Groupes par type d'objet
      const objectTypes = ['pokeball', 'potion', 'pc', 'machine', 'container', 'collectible', 'berry'];
      objectTypes.forEach(type => {
        this.groups.byType.set(type, this.scene.add.group());
      });
      
      console.log('[ObjectManager] ✅ Groupes Phaser créés');
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur création groupes:', error);
      this.stats.errors++;
    }
  }

  setupEventHandlers() {
    console.log('[ObjectManager] ⚙️ Configuration handlers d\'événements...');
    
    if (this.config.enableClickHandling) {
      // Les événements click seront configurés sur chaque sprite individuellement
      console.log('[ObjectManager] 🖱️ Click handling activé');
    }
    
    if (this.config.enableHoverEffects) {
      // Les événements hover seront configurés sur chaque sprite individuellement  
      console.log('[ObjectManager] 🎯 Hover effects activés');
    }
    
    console.log('[ObjectManager] ✅ Event handlers configurés');
  }

  setupNetworkIntegration() {
    console.log('[ObjectManager] 🌐 Configuration intégration réseau...');
    
    // ✅ Chercher NetworkManager dans différents endroits
    const networkManager = this.findNetworkManager();
    
    if (networkManager) {
      console.log('[ObjectManager] 🔗 NetworkManager trouvé, configuration callbacks...');
      
      // Configurer le callback pour recevoir les objets de zone
      networkManager.onMessage('zoneObjects', (data) => {
        console.log('[ObjectManager] 📨 Objets de zone reçus:', data);
        this.handleZoneObjectsReceived(data);
      });
      
      // Demander les objets de la zone actuelle si disponible
      if (networkManager.currentZone) {
        this.requestZoneObjects(networkManager.currentZone);
      }
      
      console.log('[ObjectManager] ✅ Intégration réseau configurée');
    } else {
      console.warn('[ObjectManager] ⚠️ NetworkManager non trouvé - fonctionnement en mode standalone');
    }
  }

  findNetworkManager() {
    // Chercher NetworkManager dans différents endroits
    const candidates = [
      this.scene.networkManager,
      this.scene.game?.networkManager,
      window.globalNetworkManager,
      window.networkManager
    ];
    
    for (const candidate of candidates) {
      if (candidate && candidate.room && typeof candidate.onMessage === 'function') {
        console.log('[ObjectManager] 🎯 NetworkManager trouvé');
        return candidate;
      }
    }
    
    return null;
  }

  // === GESTION DES OBJETS DE ZONE ===

  handleZoneObjectsReceived(data) {
    console.log('[ObjectManager] 🔄 === TRAITEMENT OBJETS ZONE ===');
    console.log(`[ObjectManager] Zone: ${data.zone}`);
    console.log(`[ObjectManager] Objets: ${data.objects?.length || 0}`);
    
    if (!data.objects || !Array.isArray(data.objects)) {
      console.warn('[ObjectManager] ⚠️ Données objets invalides');
      return;
    }
    
    try {
      // ✅ Nettoyer les objets de la zone précédente si différente
      if (this.state.currentZone && this.state.currentZone !== data.zone) {
        this.clearZoneObjects(this.state.currentZone);
      }
      
      // ✅ Mettre à jour l'état
      this.state.currentZone = data.zone;
      this.state.lastReceivedObjects = data.objects;
      this.state.lastObjectsTime = Date.now();
      this.state.isLoadingObjects = false;
      this.stats.totalObjectsReceived += data.objects.length;
      
      // ✅ Créer les sprites pour tous les objets
      data.objects.forEach(objectData => {
        this.createObjectSprite(objectData);
      });
      
      // ✅ Organiser les objets par zone
      if (!this.objects.byZone.has(data.zone)) {
        this.objects.byZone.set(data.zone, new Set());
      }
      
      const zoneObjects = this.objects.byZone.get(data.zone);
      data.objects.forEach(obj => {
        zoneObjects.add(obj.id);
      });
      
      this.stats.zonesLoaded++;
      
      // ✅ Callback d'objets reçus
      if (this.callbacks.onObjectsReceived) {
        this.callbacks.onObjectsReceived(data);
      }
      
      // ✅ Callback de zone chargée
      if (this.callbacks.onZoneObjectsLoaded) {
        this.callbacks.onZoneObjectsLoaded(data.zone, data.objects);
      }
      
      console.log(`[ObjectManager] ✅ ${data.objects.length} objets traités pour zone ${data.zone}`);
      this.logObjectsSummary();
      
    } catch (error) {
      console.error('[ObjectManager] ❌ Erreur traitement objets zone:', error);
      this.stats.errors++;
    }
  }

  createObjectSprite(objectData) {
    console.log(`[ObjectManager] 🎨 Création sprite objet: ${objectData.id} (${objectData.type})`);
    
    try {
      // ✅ Vérifier si l'objet existe déjà
      if (this.objects.sprites.has(objectData.id)) {
        console.log(`[ObjectManager] ♻️ Objet ${objectData.id} existe déjà, mise à jour`);
        this.updateObjectSprite(objectData);
        return;
      }
      
      // ✅ Créer le sprite selon le mode actuel
      let sprite;
      
      if (this.config.placeholderMode || !this.hasRealSprite(objectData.type)) {
        sprite = this.createPlaceholderSprite(objectData);
      } else {
        sprite = this.createRealSprite(objectData);
      }
      
      if (!sprite) {
        console.error(`[ObjectManager] ❌ Impossible de créer sprite pour ${objectData.id}`);
        return;
      }
      
      // ✅ Configurer le sprite
      this.configureObjectSprite(sprite, objectData);
      
      // ✅ Stocker dans les collections
      this.objects.serverData.set(objectData.id, objectData);
      this.objects.sprites.set(objectData.id, sprite);
      this.objects.visible.add(objectData.id);
      
      // ✅ Ajouter aux groupes appropriés
      this.addSpriteToGroups(sprite, objectData);
      
      // ✅ Configurer l'interactivité si applicable
      if (objectData.collectible || objectData.interactable !== false) {
        this.objects.interactable.add(objectData.id);
        this.setupSpriteInteractivity(sprite, objectData);
      }
      
      // ✅ Organiser par type
      if (!this.objects.byType.has(objectData.type)) {
        this.objects.byType.set(objectData.type, new Set());
      }
      this.objects.byType.get(objectData.type).add(objectData.id);
      
      this.stats.objectsCreated++;
      this.stats.spritesActive++;
      
      // ✅ Callback de création
      if (this.callbacks.onObjectCreated) {
        this.callbacks.onObjectCreated(sprite, objectData);
      }
      
      console.log(`[ObjectManager] ✅ Sprite créé: ${objectData.id} à (${objectData.x}, ${objectData.y})`);
      
    } catch (error) {
      console.error(`[ObjectManager] ❌ Erreur création sprite ${objectData.id}:`, error);
      this.stats.errors++;
    }
  }

  createPlaceholderSprite(objectData) {
    console.log(`[ObjectManager] 🟨 Création placeholder pour ${objectData.type}`);
    
    const color = this.spriteConfig.placeholderColors[objectData.type] || 
                  this.spriteConfig.placeholderColors.default;
    const size = this.spriteConfig.placeholderSizes[objectData.type] || 
                 this.spriteConfig.placeholderSizes.default;
    
    // Créer un rectangle coloré comme placeholder
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 0.8);
    graphics.fillRect(0, 0, size.width, size.height);
    
    // Ajouter bordure pour visibilité
    graphics.lineStyle(1, 0xFFFFFF, 0.5);
    graphics.strokeRect(0, 0, size.width, size.height);
    
    // Positionner
    graphics.setPosition(objectData.x, objectData.y);
    
    // Ajouter les propriétés personnalisées
    graphics.objectId = objectData.id;
    graphics.objectType = objectData.type;
    graphics.objectData = objectData;
    graphics.isPlaceholder = true;
    
    return graphics;
  }

  createRealSprite(objectData) {
    console.log(`[ObjectManager] 🎨 Création sprite réel pour ${objectData.type}`);
    
    const spriteKey = this.spriteConfig.spriteMapping[objectData.type] || 
                      objectData.spriteKey || 
                      'default_object_sprite';
    
    // Vérifier si la texture existe
    if (!this.scene.textures.exists(spriteKey)) {
      console.warn(`[ObjectManager] ⚠️ Texture ${spriteKey} non trouvée, fallback placeholder`);
      return this.createPlaceholderSprite(objectData);
    }
    
    const sprite = this.scene.add.sprite(objectData.x, objectData.y, spriteKey);
    
    // Ajouter les propriétés personnalisées
    sprite.objectId = objectData.id;
    sprite.objectType = objectData.type;
    sprite.objectData = objectData;
    sprite.isPlaceholder = false;
    
    return sprite;
  }

  configureObjectSprite(sprite, objectData) {
    // ✅ Configuration générale
    sprite.setDepth(this.config.spriteDepth);
    
    // ✅ Visibilité selon les données serveur
    if (objectData.visible === false) {
      sprite.setVisible(false);
      this.objects.visible.delete(objectData.id);
    }
    
    // ✅ Échelle si spécifiée
    if (objectData.scale) {
      sprite.setScale(objectData.scale);
    }
    
    // ✅ Rotation si spécifiée
    if (objectData.rotation) {
      sprite.setRotation(objectData.rotation);
    }
    
    // ✅ Alpha si spécifié
    if (objectData.alpha !== undefined) {
      sprite.setAlpha(objectData.alpha);
    }
    
    // ✅ Tint si spécifié
    if (objectData.tint) {
      sprite.setTint(objectData.tint);
    }
  }

  addSpriteToGroups(sprite, objectData) {
    // ✅ Groupe principal
    this.groups.allObjects.add(sprite);
    
    // ✅ Groupe par type
    const typeGroup = this.groups.byType.get(objectData.type);
    if (typeGroup) {
      typeGroup.add(sprite);
    }
    
    // ✅ Groupe par couche
    if (objectData.layer === 'background') {
      this.groups.background.add(sprite);
    } else if (objectData.layer === 'foreground') {
      this.groups.foreground.add(sprite);
    }
    
    // ✅ Groupe interactable
    if (objectData.collectible || objectData.interactable !== false) {
      this.groups.interactable.add(sprite);
    }
  }

  setupSpriteInteractivity(sprite, objectData) {
    if (!this.config.enableClickHandling && !this.config.enableHoverEffects) {
      return;
    }
    
    // ✅ Rendre le sprite interactif
    sprite.setInteractive();
    
    // ✅ Événement de clic
    if (this.config.enableClickHandling) {
      sprite.on('pointerdown', (pointer, localX, localY, event) => {
        this.handleObjectClick(sprite, objectData, pointer);
      });
    }
    
    // ✅ Événements de hover
    if (this.config.enableHoverEffects) {
      sprite.on('pointerover', () => {
        this.handleObjectHover(sprite, objectData, true);
      });
      
      sprite.on('pointerout', () => {
        this.handleObjectHover(sprite, objectData, false);
      });
    }
  }

  // === GESTION DES ÉVÉNEMENTS ===

  handleObjectClick(sprite, objectData, pointer) {
    console.log(`[ObjectManager] 🖱️ Clic sur objet: ${objectData.id} (${objectData.type})`);
    
    this.stats.clickEvents++;
    
    // ✅ Effet visuel de clic
    if (this.config.enableVisualFeedback) {
      this.showClickFeedback(sprite);
    }
    
    // ✅ Callback de clic
    if (this.callbacks.onObjectClicked) {
      this.callbacks.onObjectClicked(sprite, objectData, pointer);
    }
    
    // ✅ Préparer données pour ObjectInteractionManager
    const interactionData = {
      objectId: objectData.id,
      objectType: objectData.type,
      position: { x: objectData.x, y: objectData.y },
      sprite: sprite,
      timestamp: Date.now()
    };
    
    // ✅ Callback d'interaction (pour connexion future avec ObjectInteractionManager)
    if (this.callbacks.onObjectInteraction) {
      this.callbacks.onObjectInteraction(interactionData);
    }
    
    // ✅ Log pour debug
    if (this.config.enableDebugLogs) {
      console.log(`[ObjectManager] 📊 Interaction préparée:`, interactionData);
    }
  }

  handleObjectHover(sprite, objectData, isEntering) {
    this.stats.hoverEvents++;
    
    if (isEntering) {
      console.log(`[ObjectManager] 🎯 Hover sur objet: ${objectData.id}`);
      
      // ✅ Effet visuel de hover
      if (this.config.enableVisualFeedback) {
        this.showHoverFeedback(sprite, true);
      }
    } else {
      // ✅ Retirer effet de hover
      if (this.config.enableVisualFeedback) {
        this.showHoverFeedback(sprite, false);
      }
    }
    
    // ✅ Callback de hover
    if (this.callbacks.onObjectHover) {
      this.callbacks.onObjectHover(sprite, objectData, isEntering);
    }
  }

  showClickFeedback(sprite) {
    // ✅ Animation simple de clic (échelle)
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  showHoverFeedback(sprite, isHovering) {
    if (isHovering) {
      // ✅ Surbrillance de hover
      sprite.setTint(this.config.interactionHighlightColor);
      sprite.setScale(sprite.scaleX * 1.1, sprite.scaleY * 1.1);
    } else {
      // ✅ Retirer surbrillance
      sprite.clearTint();
      sprite.setScale(sprite.scaleX / 1.1, sprite.scaleY / 1.1);
    }
  }

  // === GESTION DES SPRITES ===

  updateObjectSprite(objectData) {
    const sprite = this.objects.sprites.get(objectData.id);
    if (!sprite) {
      console.warn(`[ObjectManager] ⚠️ Sprite ${objectData.id} non trouvé pour mise à jour`);
      return;
    }
    
    console.log(`[ObjectManager] 🔄 Mise à jour sprite: ${objectData.id}`);
    
    // ✅ Mettre à jour position
    sprite.setPosition(objectData.x, objectData.y);
    
    // ✅ Mettre à jour visibilité
    sprite.setVisible(objectData.visible !== false);
    
    if (objectData.visible !== false) {
      this.objects.visible.add(objectData.id);
    } else {
      this.objects.visible.delete(objectData.id);
    }
    
    // ✅ Mettre à jour les données
    sprite.objectData = objectData;
    this.objects.serverData.set(objectData.id, objectData);
    
    // ✅ Reconfigurer le sprite
    this.configureObjectSprite(sprite, objectData);
  }

  hasRealSprite(objectType) {
    const spriteKey = this.spriteConfig.spriteMapping[objectType];
    return spriteKey && this.scene.textures.exists(spriteKey);
  }

  // === GESTION DES ZONES ===

  clearZoneObjects(zoneName) {
    console.log(`[ObjectManager] 🧹 Nettoyage objets zone: ${zoneName}`);
    
    const zoneObjects = this.objects.byZone.get(zoneName);
    if (!zoneObjects) {
      console.log(`[ObjectManager] ℹ️ Aucun objet à nettoyer pour zone ${zoneName}`);
      return;
    }
    
    let clearedCount = 0;
    
    zoneObjects.forEach(objectId => {
      if (this.destroyObjectSprite(objectId)) {
        clearedCount++;
      }
    });
    
    // ✅ Nettoyer la collection de zone
    this.objects.byZone.delete(zoneName);
    
    console.log(`[ObjectManager] ✅ ${clearedCount} objets nettoyés pour zone ${zoneName}`);
  }

  destroyObjectSprite(objectId) {
    const sprite = this.objects.sprites.get(objectId);
    if (!sprite) {
      return false;
    }
    
    console.log(`[ObjectManager] 💥 Destruction sprite: ${objectId}`);
    
    try {
      // ✅ Callback de destruction
      if (this.callbacks.onObjectDestroyed) {
        const objectData = this.objects.serverData.get(objectId);
        this.callbacks.onObjectDestroyed(sprite, objectData);
      }
      
      // ✅ Retirer des groupes
      this.groups.allObjects.remove(sprite);
      this.groups.interactable.remove(sprite);
      this.groups.background.remove(sprite);
      this.groups.foreground.remove(sprite);
      
      // Retirer des groupes par type
      this.groups.byType.forEach(group => {
        group.remove(sprite);
      });
      
      // ✅ Détruire le sprite Phaser
      sprite.destroy();
      
      // ✅ Nettoyer les collections
      this.objects.sprites.delete(objectId);
      this.objects.serverData.delete(objectId);
      this.objects.visible.delete(objectId);
      this.objects.interactable.delete(objectId);
      
      // ✅ Nettoyer index par type
      this.objects.byType.forEach(typeSet => {
        typeSet.delete(objectId);
      });
      
      this.stats.objectsDestroyed++;
      this.stats.spritesActive--;
      
      return true;
      
    } catch (error) {
      console.error(`[ObjectManager] ❌ Erreur destruction sprite ${objectId}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  // === INTÉGRATION RÉSEAU ===

  requestZoneObjects(zoneName) {
    console.log(`[ObjectManager] 📤 Demande objets pour zone: ${zoneName}`);
    
    const networkManager = this.findNetworkManager();
    if (!networkManager) {
      console.warn('[ObjectManager] ⚠️ NetworkManager non disponible pour demander objets');
      return false;
    }
    
    if (!networkManager.room) {
      console.warn('[ObjectManager] ⚠️ Pas de room active pour demander objets');
      return false;
    }
    
    try {
      this.state.isLoadingObjects = true;
      this.state.objectsRequested = true;
      
      networkManager.room.send("requestZoneObjects", { zone: zoneName });
      
      console.log(`[ObjectManager] ✅ Demande envoyée pour zone ${zoneName}`);
      return true;
      
    } catch (error) {
      console.error(`[ObjectManager] ❌ Erreur demande objets zone ${zoneName}:`, error);
      this.state.isLoadingObjects = false;
      this.stats.errors++;
      return false;
    }
  }

  onZoneChange(newZone, oldZone = null) {
    console.log(`[ObjectManager] 🌍 Changement de zone: ${oldZone} → ${newZone}`);
    
    // ✅ Nettoyer l'ancienne zone
    if (oldZone && oldZone !== newZone) {
      this.clearZoneObjects(oldZone);
    }
    
    // ✅ Demander les objets de la nouvelle zone
    if (this.config.autoRequestOnZoneChange) {
      this.requestZoneObjects(newZone);
    }
    
    // ✅ Mettre à jour l'état
    this.state.currentZone = newZone;
  }

  // === MÉTHODES PUBLIQUES DE CONTRÔLE ===

  showObject(objectId) {
    const sprite = this.objects.sprites.get(objectId);
    if (sprite) {
      sprite.setVisible(true);
      this.objects.visible.add(objectId);
      console.log(`[ObjectManager] 👁️ Objet ${objectId} affiché`);
    }
  }

  hideObject(objectId) {
    const sprite = this.objects.sprites.get(objectId);
    if (sprite) {
      sprite.setVisible(false);
      this.objects.visible.delete(objectId);
      console.log(`[ObjectManager] 🙈 Objet ${objectId} caché`);
    }
  }

  removeObject(objectId) {
    if (this.destroyObjectSprite(objectId)) {
      console.log(`[ObjectManager] 🗑️ Objet ${objectId} supprimé`);
    }
  }

  // === MÉTHODES DE RECHERCHE ===

  getObjectsByType(objectType) {
    const objectIds = this.objects.byType.get(objectType) || new Set();
    return Array.from(objectIds).map(id => ({
      id,
      sprite: this.objects.sprites.get(id),
      data: this.objects.serverData.get(id)
    })).filter(obj => obj.sprite && obj.data);
  }

  getVisibleObjects() {
    return Array.from(this.objects.visible).map(id => ({
      id,
      sprite: this.objects.sprites.get(id),
      data: this.objects.serverData.get(id)
    })).filter(obj => obj.sprite && obj.data);
  }

  getInteractableObjects() {
    return Array.from(this.objects.interactable).map(id => ({
      id,
      sprite: this.objects.sprites.get(id),
      data: this.objects.serverData.get(id)
    })).filter(obj => obj.sprite && obj.data);
  }

  getObjectById(objectId) {
    const sprite = this.objects.sprites.get(objectId);
    const data = this.objects.serverData.get(objectId);
    
    if (sprite && data) {
      return { id: objectId, sprite, data };
    }
    
    return null;
  }

  // === CALLBACKS PUBLICS ===

  onObjectsReceived(callback) { this.callbacks.onObjectsReceived = callback; }
  onObjectCreated(callback) { this.callbacks.onObjectCreated = callback; }
  onObjectDestroyed(callback) { this.callbacks.onObjectDestroyed = callback; }
  onObjectClicked(callback) { this.callbacks.onObjectClicked = callback; }
  onObjectHover(callback) { this.callbacks.onObjectHover = callback; }
  onZoneObjectsLoaded(callback) { this.callbacks.onZoneObjectsLoaded = callback; }
  onObjectInteraction(callback) { this.callbacks.onObjectInteraction = callback; }

  // === CONFIGURATION ===

  setConfig(newConfig) {
    console.log('[ObjectManager] 🔧 Mise à jour configuration:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  setSpriteMapping(typeMapping) {
    console.log('[ObjectManager] 🎨 Mise à jour mapping sprites:', typeMapping);
    this.spriteConfig.spriteMapping = { ...this.spriteConfig.spriteMapping, ...typeMapping };
  }

  setPlaceholderMode(enabled) {
    console.log(`[ObjectManager] 🟨 Mode placeholder: ${enabled}`);
    this.config.placeholderMode = enabled;
  }

  // === DEBUG ET STATISTIQUES ===

  logObjectsSummary() {
    if (!this.config.enableDebugLogs) return;
    
    console.log('[ObjectManager] 📊 === RÉSUMÉ OBJETS ===');
    console.log(`Zone actuelle: ${this.state.currentZone}`);
    console.log(`Total sprites actifs: ${this.stats.spritesActive}`);
    console.log(`Objets visibles: ${this.objects.visible.size}`);
    console.log(`Objets interactables: ${this.objects.interactable.size}`);
    
    // Log par type
    this.objects.byType.forEach((objectSet, type) => {
      if (objectSet.size > 0) {
        console.log(`  ${type}: ${objectSet.size}`);
      }
    });
  }

  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      state: this.state,
      config: this.config,
      stats: this.stats,
      objects: {
        totalServerData: this.objects.serverData.size,
        totalSprites: this.objects.sprites.size,
        totalVisible: this.objects.visible.size,
        totalInteractable: this.objects.interactable.size,
        byType: Object.fromEntries(
          Array.from(this.objects.byType.entries()).map(([type, set]) => [type, set.size])
        ),
        byZone: Object.fromEntries(
          Array.from(this.objects.byZone.entries()).map(([zone, set]) => [zone, set.size])
        )
      },
      groups: {
        allObjects: this.groups.allObjects?.children?.size || 0,
        interactable: this.groups.interactable?.children?.size || 0,
        background: this.groups.background?.children?.size || 0,
        foreground: this.groups.foreground?.children?.size || 0
      },
      sceneKey: this.scene?.scene?.key,
      networkManagerFound: !!this.findNetworkManager()
    };
  }

  resetStats() {
    console.log('[ObjectManager] 🔄 Reset statistiques');
    
    this.stats = {
      totalObjectsReceived: 0,
      objectsCreated: 0,
      objectsDestroyed: 0,
      spritesActive: this.objects.sprites.size, // Garder la valeur actuelle
      clickEvents: 0,
      hoverEvents: 0,
      zonesLoaded: 0,
      errors: 0
    };
  }

  // === DESTRUCTION ===

  destroy() {
    console.log('[ObjectManager] 💀 === DESTRUCTION ===');
    
    // ✅ Détruire tous les sprites
    this.objects.sprites.forEach((sprite, objectId) => {
      this.destroyObjectSprite(objectId);
    });
    
    // ✅ Détruire les groupes Phaser
    Object.values(this.groups).forEach(group => {
      if (group && group.destroy) {
        group.destroy();
      }
    });
    
    // ✅ Nettoyer les collections
    this.objects.serverData.clear();
    this.objects.sprites.clear();
    this.objects.byZone.clear();
    this.objects.byType.clear();
    this.objects.visible.clear();
    this.objects.interactable.clear();
    
    // ✅ Nettoyer callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    
    // ✅ Reset état
    this.isInitialized = false;
    this.scene = null;
    
    console.log('[ObjectManager] ✅ Détruit');
  }
}

// === FONCTIONS DEBUG GLOBALES ===

window.debugObjectManager = function() {
  // Chercher ObjectManager dans la scène active
  const currentScene = window.game?.scene?.getScenes(true)?.[0];
  const objectManager = currentScene?.objectManager;
  
  if (objectManager) {
    const info = objectManager.getDebugInfo();
    console.log('[ObjectManager] === DEBUG INFO ===');
    console.table({
      'Objets Reçus': info.stats.totalObjectsReceived,
      'Sprites Créés': info.stats.objectsCreated,
      'Sprites Actifs': info.stats.spritesActive,
      'Objets Visibles': info.objects.totalVisible,
      'Objets Interactables': info.objects.totalInteractable,
      'Clics': info.stats.clickEvents,
      'Hovers': info.stats.hoverEvents,
      'Erreurs': info.stats.errors
    });
    console.log('[ObjectManager] Info complète:', info);
    return info;
  } else {
    console.error('[ObjectManager] Manager non trouvé dans la scène active');
    return null;
  }
};

window.testObjectManager = function() {
  const currentScene = window.game?.scene?.getScenes(true)?.[0];
  const objectManager = currentScene?.objectManager;
  
  if (objectManager) {
    console.log('[ObjectManager] 🧪 Test avec objets simulés...');
    
    const testObjects = [
      { id: 'test_1', x: 100, y: 100, type: 'pokeball', visible: true, collectible: true },
      { id: 'test_2', x: 150, y: 120, type: 'potion', visible: true, collectible: true },
      { id: 'test_3', x: 200, y: 140, type: 'pc', visible: true, collectible: false }
    ];
    
    objectManager.handleZoneObjectsReceived({
      zone: 'test_zone',
      objects: testObjects
    });
    
    console.log('[ObjectManager] ✅ Test terminé - vérifiez les sprites dans la scène');
    return true;
  } else {
    console.error('[ObjectManager] Manager non trouvé pour test');
    return false;
  }
};

console.log('✅ ObjectManager chargé!');
console.log('🔍 Utilisez window.debugObjectManager() pour diagnostiquer');
console.log('🧪 Utilisez window.testObjectManager() pour tester avec des objets simulés');
