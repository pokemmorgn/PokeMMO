// client/src/game/QuestSystem.js - VERSION CORRIGÉE avec coordination complète

import { QuestJournalUI } from '../components/QuestJournalUI.js';
import { QuestIcon } from '../components/QuestIcon.js';
import { QuestTrackerUI } from '../components/QuestTrackerUI.js';

export class QuestSystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.questJournal = null;
    this.questIcon = null;
    this.questTracker = null;
    this.trackedQuest = null;
    this.questNotifications = [];

    // ✅ Utiliser le NotificationManager global
    this.notificationManager = window.NotificationManager;
    if (!this.notificationManager) {
      console.warn("⚠️ NotificationManager non trouvé, créer une instance");
      this.notificationManager = {
        show: (message, options) => console.log(`[QUEST] ${message}`),
        success: (message, options) => console.log(`[QUEST SUCCESS] ${message}`),
        error: (message, options) => console.log(`[QUEST ERROR] ${message}`),
        warning: (message, options) => console.log(`[QUEST WARNING] ${message}`),
        info: (message, options) => console.log(`[QUEST INFO] ${message}`),
        quest: (message, options) => console.log(`[QUEST] ${message}`),
        questNotification: (questName, action, options) => console.log(`[QUEST] ${questName} - ${action}`),
        achievement: (message, options) => console.log(`[ACHIEVEMENT] ${message}`)
      };
    }
    
    // ✅ Système de déduplication des notifications
    this.lastNotificationTime = new Map();
    this.notificationCooldown = 2000;
    
    // ✅ STOCKAGE CENTRALISÉ des quêtes pour coordination
    this.activeQuests = [];
    this.availableQuests = [];
    
    this.init();
  }

  init() {
    // ✅ MODIFICATION: Créer le journal SANS listeners automatiques
    this.questJournal = new QuestJournalUI(null); // Pas de gameRoom direct
    
    // ✅ Créer l'icône de quête
    this.questIcon = new QuestIcon(this);
    
    // ✅ Créer le tracker de quêtes
    this.questTracker = new QuestTrackerUI(this);
    this.questTracker.connectToQuestSystem(this);
    
    // ✅ NOUVEAU: Setup des listeners CENTRALISÉS
    this.setupCentralizedListeners();
    
    // ✅ Setup des timers pour le tracker
    this.setupTrackerTimers();
    
    // Rendre le système accessible globalement
    window.questSystem = this;
    
    console.log("🎯 Système de quêtes initialisé avec coordination centralisée");
  }

  // ✅ === LISTENERS CENTRALISÉS POUR COORDINATION ===
  setupCentralizedListeners() {
    if (!this.gameRoom) {
      console.warn("⚠️ [QuestSystem] Pas de gameRoom pour les écoutes centralisées");
      return;
    }

    console.log("📡 [QuestSystem] Configuration des écoutes centralisées");

    // ✅ ÉCOUTER LES QUÊTES ACTIVES (CENTRALISÉ)
    this.gameRoom.onMessage("activeQuestsList", (data) => {
      console.log("📋 [QuestSystem] Liste des quêtes actives reçue:", data);
      this.activeQuests = data.quests || [];
      
      // ✅ SYNCHRONISER TOUS LES COMPOSANTS
      this.syncAllComponents();
    });

    // ✅ ÉCOUTER LES QUÊTES DISPONIBLES (CENTRALISÉ)
    this.gameRoom.onMessage("availableQuestsList", (data) => {
      console.log("📋 [QuestSystem] Liste des quêtes disponibles reçue:", data);
      this.availableQuests = data.quests || [];
      
      // ✅ Mettre à jour seulement le journal (tracker n'affiche que les actives)
      if (this.questJournal) {
        this.questJournal.updateQuestList(this.availableQuests);
      }
    });

    // ✅ ÉCOUTER LES NOUVELLES QUÊTES (questGranted) - CENTRALISÉ
    this.gameRoom.onMessage("questGranted", (data) => {
      console.log("🎁 [QuestSystem] Nouvelle quête accordée (centralisé):", data);
      
      // ✅ AFFICHER NOTIFICATION
      if (this.shouldShowNotification('questGranted', data.questId)) {
        this.questIcon.onNewQuest();
        
        this.notificationManager.questNotification(
          data.questName || 'Nouvelle quête',
          'granted',
          {
            duration: 5000,
            closable: true,
            onClick: () => {
              this.openQuestJournal();
            }
          }
        );
      }
      
      // ✅ RAFRAÎCHIR LES QUÊTES ACTIVES
      setTimeout(() => {
        this.refreshActiveQuests();
      }, 500);
    });

    // ✅ ÉCOUTER LES PROGRESSIONS DE QUÊTE (CENTRALISÉ)
    this.gameRoom.onMessage("questProgressUpdate", (results) => {
      console.log("📈 [QuestSystem] Progression de quête (centralisé):", results);
      
      this.handleQuestProgressUpdate(results);
      
      // ✅ RAFRAÎCHIR APRÈS PROGRESSION
      setTimeout(() => {
        this.refreshActiveQuests();
      }, 300);
    });

    // ✅ ÉCOUTER LES RÉSULTATS DE DÉMARRAGE (CENTRALISÉ)
    this.gameRoom.onMessage("questStartResult", (data) => {
      console.log("🎯 [QuestSystem] Résultat démarrage quête (centralisé):", data);
      
      if (data.success) {
        const questId = data.quest?.id || data.quest?.name || 'unknown';
        if (this.shouldShowNotification('questStart', questId)) {
          this.questIcon.onNewQuest();
          
          this.notificationManager.questNotification(
            data.quest?.name || 'Nouvelle quête',
            'started',
            {
              duration: 5000,
              closable: true,
              onClick: () => {
                this.openQuestJournal();
              }
            }
          );
        }
        
        // ✅ AJOUTER AU TRACKER
        if (data.quest) {
          this.addQuestToTracker(data.quest);
        }
        
        // ✅ RAFRAÎCHIR
        this.refreshActiveQuests();
      } else {
        this.notificationManager.error(
          data.message || "Impossible d'accepter la quête",
          { duration: 4000 }
        );
      }
    });

    // ✅ AUTRES LISTENERS EXISTANTS...
    this.setupAdditionalListeners();

    console.log("✅ [QuestSystem] Listeners centralisés configurés");
  }

  // ✅ === MÉTHODE DE SYNCHRONISATION CENTRALE ===
  syncAllComponents() {
    console.log("🔄 [QuestSystem] Synchronisation de tous les composants");
    
    // ✅ Synchroniser le Journal
    if (this.questJournal) {
      this.questJournal.activeQuests = this.activeQuests; // Mise à jour directe
      this.questJournal.updateQuestList(this.activeQuests);
    }
    
    // ✅ Synchroniser le Tracker
    if (this.questTracker) {
      this.questTracker.updateQuests(this.activeQuests);
    }
    
    // ✅ Mettre à jour l'icône
    this.updateQuestIconState();
    
    console.log(`✅ [QuestSystem] Synchronisation terminée (${this.activeQuests.length} quêtes actives)`);
  }

  // ✅ === MÉTHODE POUR RAFRAÎCHIR LES QUÊTES ACTIVES ===
  refreshActiveQuests() {
    console.log("🔄 [QuestSystem] Rafraîchissement des quêtes actives");
    if (this.gameRoom) {
      this.gameRoom.send("getActiveQuests");
    }
  }

  // ✅ === LISTENERS ADDITIONNELS ===
  setupAdditionalListeners() {
    // Interaction NPC avec quêtes
    this.gameRoom.onMessage("npcInteractionResult", (data) => {
      this.handleNpcInteraction(data);
    });

    // ✅ Récompenses de quête
    this.gameRoom.onMessage("questRewards", (data) => {
      this.showQuestRewards(data);
    });
  }

  // ✅ Setup des timers pour le tracker (inchangé)
  setupTrackerTimers() {
    // Timer pour mettre à jour les quêtes avec limite de temps
    this.timerInterval = setInterval(() => {
      if (this.questTracker) {
        this.questTracker.updateQuestTimers();
      }
    }, 1000);

    // Timer pour mettre à jour les distances des quêtes (si le joueur a bougé)
    this.distanceInterval = setInterval(() => {
      if (this.questTracker && this.scene && this.scene.playerManager) {
        const player = this.scene.playerManager.getMyPlayer();
        if (player) {
          this.questTracker.updateQuestDistances(player.x, player.y);
        }
      }
    }, 2000);
  }

  // ✅ === MÉTHODES DE GESTION DU TRACKER (améliorées) ===
  addQuestToTracker(quest) {
    if (!this.questTracker) return;
    
    console.log("📊 [QuestSystem] Ajout de quête au tracker:", quest.name);
    
    // Enrichir la quête avec des données supplémentaires pour le tracker
    const enrichedQuest = {
      ...quest,
      level: quest.level || this.calculateQuestLevel(quest),
      distance: quest.targetLocation ? this.calculateQuestDistance(quest) : null,
      timeRemaining: quest.timeLimit || null
    };
    
    this.questTracker.onQuestAdded(enrichedQuest);
    this.updateQuestIconState();
  }

  // ✅ Calculer le niveau d'une quête (inchangé)
  calculateQuestLevel(quest) {
    if (quest.difficulty) {
      const levelMap = { easy: '1-5', medium: '6-10', hard: '11-15', expert: '16+' };
      return levelMap[quest.difficulty] || '';
    }
    return '';
  }

  // ✅ Calculer la distance d'une quête (inchangé)
  calculateQuestDistance(quest) {
    if (!quest.targetLocation || !this.scene?.playerManager) return null;
    
    const player = this.scene.playerManager.getMyPlayer();
    if (!player) return null;
    
    const dx = quest.targetLocation.x - player.x;
    const dy = quest.targetLocation.y - player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ✅ Mettre à jour l'état de l'icône (inchangé)
  updateQuestIconState() {
    if (!this.questIcon) return;
    
    const hasActiveQuests = this.activeQuests.length > 0;
    this.questIcon.updateActiveQuestState(hasActiveQuests);
    
    // Compter les nouvelles quêtes ou quêtes prêtes à être terminées
    const newOrReadyQuests = this.activeQuests.filter(quest => 
      quest.isNew || quest.currentStepIndex >= quest.steps.length
    ).length;
    
    this.questIcon.updateNotificationCount(newOrReadyQuests);
  }

  // ✅ Système de déduplication (inchangé)
  shouldShowNotification(type, questId) {
    const key = `${type}_${questId}`;
    const now = Date.now();
    const lastTime = this.lastNotificationTime.get(key);
    
    if (!lastTime || (now - lastTime) > this.notificationCooldown) {
      this.lastNotificationTime.set(key, now);
      return true;
    }
    
    console.log(`🔕 Notification dédupliquée: ${key} (${now - lastTime}ms depuis la dernière)`);
    return false;
  }

  // ✅ Gestion des mises à jour de progression (améliorée pour coordination)
  handleQuestProgressUpdate(results) {
    if (!Array.isArray(results)) return;
    
    results.forEach(result => {
      if (result.questCompleted) {
        const questId = result.questId || 'unknown';
        if (this.shouldShowNotification('questCompleted', questId)) {
          this.questIcon.onQuestCompleted();
          
          this.notificationManager.questNotification(
            result.questId,
            'completed',
            {
              duration: 6000,
              bounce: true,
              sound: true,
              onClick: () => this.openQuestJournal()
            }
          );
          
          // ✅ NOTIFIER LE TRACKER
          if (this.questTracker) {
            const quest = this.activeQuests.find(q => q.id === result.questId);
            if (quest) {
              quest.currentStepIndex = quest.steps.length;
              this.questTracker.onQuestCompleted(quest);
            }
          }
          
          // Afficher les récompenses si disponibles
          if (result.rewards && result.rewards.length > 0) {
            setTimeout(() => {
              this.showQuestRewards({ rewards: result.rewards });
            }, 1000);
          }
        }
      } else if (result.stepCompleted) {
        const stepId = `${result.questId || 'unknown'}_step`;
        if (this.shouldShowNotification('stepCompleted', stepId)) {
          this.questIcon.onQuestProgress();
          
          this.notificationManager.quest(
            `Étape terminée !`,
            {
              duration: 3000,
              onClick: () => this.openQuestJournal()
            }
          );
          
          // ✅ METTRE À JOUR LE TRACKER
          if (this.questTracker) {
            const quest = this.activeQuests.find(q => q.id === result.questId);
            if (quest) {
              quest.currentStepIndex = result.newStepIndex || quest.currentStepIndex + 1;
              this.questTracker.onQuestUpdated(quest);
            }
          }
        }
      } else if (result.message) {
        if (this.shouldShowNotification('questProgress', result.message)) {
          this.notificationManager.info(result.message, { duration: 3000 });
          this.questIcon.onQuestProgress();
        }
      }
    });
    
    // ✅ SYNCHRONISER TOUS LES COMPOSANTS APRÈS PROGRESSION
    this.updateQuestIconState();
  }

  // ✅ === MÉTHODES D'INTERFACE (inchangées) ===
  openQuestJournal() {
    if (this.questJournal) {
      this.questJournal.show();
    }
  }

  closeQuestJournal() {
    if (this.questJournal) {
      this.questJournal.hide();
    }
  }

  toggleQuestJournal() {
    if (this.questJournal) {
      this.questJournal.toggle();
    }
  }

  showQuestTracker() {
    if (this.questTracker) {
      this.questTracker.show();
    }
  }

  hideQuestTracker() {
    if (this.questTracker) {
      this.questTracker.hide();
    }
  }

  toggleQuestTracker() {
    if (this.questTracker) {
      this.questTracker.toggle();
    }
  }

  showQuestIcon() {
    if (this.questIcon) {
      this.questIcon.show();
    }
  }

  hideQuestIcon() {
    if (this.questIcon) {
      this.questIcon.hide();
    }
  }

  // ✅ === MÉTHODES POUR DÉCLENCHER DES ÉVÉNEMENTS (inchangées) ===
  triggerCollectEvent(itemId, amount = 1) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'collect',
        itemId: itemId,
        amount: amount
      });
      
      const collectKey = `${itemId}_${amount}`;
      if (this.shouldShowNotification('itemCollect', collectKey)) {
        this.notificationManager.info(
          `Objet collecté: ${itemId} x${amount}`,
          {
            duration: 2000,
            position: 'bottom-right',
            type: 'inventory'
          }
        );
      }
    }
  }

  triggerDefeatEvent(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'defeat',
        pokemonId: pokemonId
      });
      
      if (this.shouldShowNotification('pokemonDefeat', pokemonId)) {
        this.notificationManager.show(
          `Pokémon vaincu !`,
          {
            type: 'battle',
            duration: 2000,
            position: 'bottom-center'
          }
        );
      }
    }
  }

  triggerReachEvent(zoneId, x, y, map) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'reach',
        zoneId: zoneId,
        x: x,
        y: y,
        map: map
      });
      
      if (this.shouldShowNotification('zoneReach', zoneId)) {
        this.notificationManager.info(
          `Zone visitée: ${zoneId}`,
          {
            duration: 2000,
            position: 'top-center'
          }
        );
      }
    }
  }

  triggerDeliverEvent(npcId, itemId) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'deliver',
        npcId: npcId,
        targetId: itemId
      });
      
      const deliverKey = `${npcId}_${itemId}`;
      if (this.shouldShowNotification('itemDeliver', deliverKey)) {
        this.notificationManager.success(
          `Objet livré: ${itemId}`,
          {
            duration: 3000
          }
        );
      }
    }
  }

  // ✅ === MÉTHODES DE CONFIGURATION DU TRACKER (inchangées) ===
  setMaxTrackedQuests(max) {
    if (this.questTracker) {
      this.questTracker.setMaxTrackedQuests(max);
    }
  }

  setTrackerPosition(x, y) {
    if (this.questTracker) {
      this.questTracker.setPosition(x, y);
    }
  }

  // ✅ === MÉTHODES UTILITAIRES (inchangées) ===
  isQuestJournalOpen() {
    return this.questJournal ? this.questJournal.isVisible : false;
  }

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    return !questDialogOpen && !chatOpen && !starterHudOpen;
  }

  // ✅ === MÉTHODES DE DEBUG (inchangées) ===
  resetNotificationCooldowns() {
    this.lastNotificationTime.clear();
    console.log("🔄 Cooldowns de notification réinitialisés");
  }

  debugNotificationSystem() {
    console.log("🔍 État du système de déduplication des notifications:");
    console.log("- Cooldown actuel:", this.notificationCooldown, "ms");
    console.log("- Notifications en cooldown:", this.lastNotificationTime.size);
    
    if (this.lastNotificationTime.size > 0) {
      console.log("- Détails des cooldowns:");
      const now = Date.now();
      this.lastNotificationTime.forEach((time, key) => {
        const remaining = Math.max(0, this.notificationCooldown - (now - time));
        console.log(`  ${key}: ${remaining}ms restant`);
      });
    }

    if (this.notificationManager) {
      this.notificationManager.info(
        `Debug: ${this.lastNotificationTime.size} notifications en cooldown`,
        {
          duration: 3000,
          position: 'top-left'
        }
      );
    }
  }

  setNotificationCooldown(milliseconds) {
    const oldCooldown = this.notificationCooldown;
    this.notificationCooldown = milliseconds;
    
    console.log(`🔧 Cooldown notification changé: ${oldCooldown}ms → ${milliseconds}ms`);
    
    if (this.notificationManager) {
      this.notificationManager.info(
        `Cooldown mis à jour: ${milliseconds}ms`,
        {
          duration: 2000,
          position: 'bottom-left'
        }
      );
    }
  }

  // ✅ === GESTION DES ÉVÉNEMENTS NPC (toutes les méthodes existantes conservées) ===
  handleNpcInteraction(data) {
    console.log("🎯 Interaction NPC reçue:", data);
    
    if (window._questDialogActive) {
      console.log("⚠️ Dialog de quête déjà ouvert, interaction ignorée");
      return;
    }
    
    switch (data.type) {
      case 'questGiver':
        const parsedData = this.parseNpcQuestData(data);
        this.showQuestGiverDialog(parsedData);
        break;
        
      case 'questComplete':
        this.showQuestCompleteDialog(data);
        break;
        
      case 'questProgress':
        if (this.shouldShowNotification('questProgress', data.message)) {
          this.notificationManager.info(data.message, { duration: 3000 });
        }
        break;
        
      case 'shop':
        console.log("🛒 Ouverture boutique:", data.shopId);
        break;
        
      case 'heal':
        this.notificationManager.success(data.message, { duration: 3000 });
        break;
        
      default:
        console.log(`ℹ️ Type d'interaction '${data.type}' délégué à BaseZoneScene`);
        break;
    }
  }

  parseNpcQuestData(data) {
    console.log("🔍 Parsing NPC quest data:", data);
    
    try {
      let availableQuests = data.availableQuests || [];
      
      if (typeof availableQuests === 'string') {
        console.log("📝 Parsing string JSON:", availableQuests);
        availableQuests = JSON.parse(availableQuests);
      }
      
      if (!Array.isArray(availableQuests)) {
        console.warn("⚠️ availableQuests n'est pas un array:", typeof availableQuests);
        
        if (availableQuests.quests && Array.isArray(availableQuests.quests)) {
          availableQuests = availableQuests.quests;
        } else {
          availableQuests = [];
        }
      }

      const normalizedQuests = availableQuests.map(quest => this.normalizeQuestData(quest));
      
      console.log("✅ Quêtes NPC parsées:", normalizedQuests);
      
      return {
        ...data,
        availableQuests: normalizedQuests
      };
      
    } catch (error) {
      console.error("❌ Erreur lors du parsing des quêtes NPC:", error);
      return {
        ...data,
        availableQuests: []
      };
    }
  }

  normalizeQuestData(quest) {
    try {
      if (typeof quest === 'string') {
        quest = JSON.parse(quest);
      }

      const normalized = {
        id: quest.id || `quest_${Date.now()}`,
        name: quest.name || 'Quête sans nom',
        description: quest.description || 'Pas de description disponible',
        category: quest.category || 'side',
        level: quest.level || '',
        steps: []
      };

      if (quest.steps && Array.isArray(quest.steps)) {
        normalized.steps = quest.steps.map((step, index) => {
          try {
            if (typeof step === 'string') {
              step = JSON.parse(step);
            }
            
            return {
              id: step.id || `step_${index}`,
              name: step.name || `Étape ${index + 1}`,
              description: step.description || 'Pas de description',
              rewards: step.rewards || []
            };
          } catch (err) {
            console.warn("⚠️ Erreur step:", err);
            return {
              id: `step_${index}`,
              name: `Étape ${index + 1}`,
              description: 'Description non disponible',
              rewards: []
            };
          }
        });
      }

      return normalized;

    } catch (error) {
      console.error("❌ Erreur normalizeQuestData:", error, quest);
      return {
        id: 'error_quest',
        name: 'Quête (Erreur)',
        description: 'Cette quête n\'a pas pu être chargée correctement.',
        category: 'error',
        steps: []
      };
    }
  }

  showQuestGiverDialog(data) {
    console.log("💬 Affichage dialogue quête:", data);
    
    if (!data.availableQuests || data.availableQuests.length === 0) {
      console.log("⚠️ Aucune quête disponible");
      return;
    }

    window._questDialogActive = true;

    const questDialog = this.createQuestDialog('Quêtes disponibles', data.availableQuests, (questId) => {
      this.startQuest(questId);
    });

    document.body.appendChild(questDialog);
  }

  showQuestCompleteDialog(data) {
    const message = data.message || "Félicitations ! Vous avez terminé une quête !";
    
    window._questDialogActive = true;
    const completeDialog = this.createQuestCompleteDialog(message, data.questRewards);
    document.body.appendChild(completeDialog);
  }

  createQuestDialog(title, quests, onSelectQuest) {
    console.log("🎨 Création dialogue avec quêtes:", quests);
    
    const dialog = document.createElement('div');
    dialog.className = 'quest-dialog-overlay';
    
    const questsHTML = quests.map(quest => {
      const questName = quest.name || 'Quête sans nom';
      const questDesc = quest.description || 'Pas de description';
      const questCategory = quest.category || 'side';
      const questLevel = quest.level ? `[${quest.level}]` : '';
      const firstStep = quest.steps && quest.steps[0] ? quest.steps[0] : null;
      
      console.log("🎯 Génération HTML pour quête:", questName);
      
      return `
        <div class="quest-option" data-quest-id="${quest.id}">
          <div class="quest-option-header">
            <strong>${questName} ${questLevel}</strong>
            <span class="quest-category ${questCategory}">${questCategory.toUpperCase()}</span>
          </div>
          <p class="quest-option-description">${questDesc}</p>
          ${firstStep ? `
            <div class="quest-option-steps">
              <strong>Première étape :</strong> ${firstStep.description || 'Non spécifiée'}
            </div>
            ${firstStep.rewards && firstStep.rewards.length > 0 ? `
              <div class="quest-option-rewards">
                <strong>Récompenses :</strong> 
                ${firstStep.rewards.map(r => this.formatReward(r)).join(', ')}
              </div>
            ` : ''}
          ` : `
            <div class="quest-option-steps">
              <strong>Première étape :</strong> Information non disponible
            </div>
          `}
        </div>
      `;
    }).join('');

    dialog.innerHTML = `
      <div class="quest-dialog">
        <div class="quest-dialog-header">
          <h3>${title}</h3>
          <button class="quest-dialog-close">✕</button>
        </div>
        <div class="quest-dialog-content">
          ${questsHTML}
        </div>
        <div class="quest-dialog-actions">
          <button class="quest-btn-cancel">Annuler</button>
          <button class="quest-btn-accept" disabled>Accepter</button>
        </div>
      </div>
    `;

    // Sélection automatique si une seule quête
    let defaultSelectedId = null;
    if (quests.length === 1) {
      const onlyOption = dialog.querySelector('.quest-option');
      const acceptBtn = dialog.querySelector('.quest-btn-accept');
      if (onlyOption && acceptBtn) {
        onlyOption.classList.add('selected');
        acceptBtn.disabled = false;
        defaultSelectedId = onlyOption.dataset.questId;
        setTimeout(() => {
          onlyOption.focus();
          acceptBtn.focus();
        }, 0);
      }
    }

    this.styleQuestDialog(dialog);
    this.addQuestDialogListeners(dialog, onSelectQuest, defaultSelectedId);

    return dialog;
  }

  addQuestDialogListeners(dialog, onSelectQuest, defaultSelectedId = null) {
    let selectedQuestId = defaultSelectedId;

    const closeBtn = dialog.querySelector('.quest-dialog-close');
    const cancelBtn = dialog.querySelector('.quest-btn-cancel');
    const acceptBtn = dialog.querySelector('.quest-btn-accept');

    if (defaultSelectedId && acceptBtn) {
      acceptBtn.disabled = false;
    }

    const closeDialog = () => {
      dialog.remove();
      window._questDialogActive = false;
      console.log("📋 Dialogue de quête fermé");
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDialog);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeDialog);
    }

    // Sélection des quêtes
    dialog.querySelectorAll('.quest-option').forEach(option => {
      option.addEventListener('click', () => {
        dialog.querySelectorAll('.quest-option').forEach(opt => 
          opt.classList.remove('selected')
        );
        option.classList.add('selected');
        selectedQuestId = option.dataset.questId;
        acceptBtn.disabled = false;
        
        console.log(`📋 Quête sélectionnée: ${selectedQuestId}`);
      });
    });

    const acceptQuest = () => {
      if (!selectedQuestId && defaultSelectedId) {
        selectedQuestId = defaultSelectedId;
      }
      if (!selectedQuestId) {
        const selectedOption = dialog.querySelector('.quest-option.selected') || dialog.querySelector('.quest-option');
        if (selectedOption) {
          selectedQuestId = selectedOption.dataset.questId;
        }
      }
      
      console.log("🎯 Acceptation de la quête:", selectedQuestId);
      
      if (selectedQuestId && onSelectQuest) {
        onSelectQuest(selectedQuestId);
      }
      closeDialog();
    };

    acceptBtn.addEventListener('click', acceptQuest);

    // Gestion clavier
    const handleKeydown = (e) => {
      if (!dialog || !dialog.parentNode) {
        document.removeEventListener('keydown', handleKeydown);
        return;
      }

      console.log(`⌨️ Touche pressée dans dialogue quête: ${e.key}`);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          closeDialog();
          break;
          
        case 'Enter':
        case 'e':
        case 'E':
          e.preventDefault();
          e.stopPropagation();
          
          if (selectedQuestId || defaultSelectedId) {
            console.log(`✅ Acceptation via ${e.key}: ${selectedQuestId || defaultSelectedId}`);
            acceptQuest();
          } else {
            const firstOption = dialog.querySelector('.quest-option');
            if (firstOption) {
              firstOption.click();
            }
          }
          break;
          
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          this.navigateQuestOptions(dialog, e.key === 'ArrowDown' ? 1 : -1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    dialog.tabIndex = -1;
    dialog.focus();

    console.log(`📋 Event listeners configurés pour dialogue quête (selectedId: ${selectedQuestId})`);
  }

  navigateQuestOptions(dialog, direction) {
    const options = dialog.querySelectorAll('.quest-option');
    if (options.length === 0) return;

    let currentIndex = -1;
    options.forEach((option, index) => {
      if (option.classList.contains('selected')) {
        currentIndex = index;
      }
    });

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;

    options[newIndex].click();
  }

  startQuest(questId) {
    console.log("🎯 Démarrage de la quête:", questId);
    
    if (this.gameRoom) {
      this.gameRoom.send("startQuest", { questId });
      console.log("📤 Message startQuest envoyé au serveur");
    } else {
      console.error("❌ Pas de gameRoom pour envoyer startQuest");
    }
  }

  styleQuestDialog(dialog) {
    const style = document.createElement('style');
    if (!document.querySelector('#quest-dialog-styles')) {
      style.id = 'quest-dialog-styles';
      style.textContent = `
        .quest-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1050;
          backdrop-filter: blur(5px);
        }

        .quest-dialog {
          background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98));
          border: 2px solid rgba(100, 149, 237, 0.8);
          border-radius: 15px;
          max-width: 500px;
          max-height: 70vh;
          width: 90%;
          color: white;
          font-family: Arial, sans-serif;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
        }

        .quest-dialog-header {
          background: rgba(100, 149, 237, 0.2);
          padding: 15px 20px;
          border-bottom: 1px solid rgba(100, 149, 237, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quest-dialog-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .quest-dialog-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(220, 53, 69, 0.8);
        }

        .quest-dialog-close:hover {
          background: rgba(220, 53, 69, 1);
        }

        .quest-dialog-content {
          max-height: 300px;
          overflow-y: auto;
          padding: 20px;
        }

        .quest-option {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .quest-option:hover {
          background: rgba(100, 149, 237, 0.1);
          border-color: rgba(100, 149, 237, 0.3);
        }

        .quest-option.selected {
          border-color: #64b5f6;
          background: rgba(100, 149, 237, 0.2);
        }

        .quest-option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .quest-category {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .quest-category.main { background: rgba(255, 193, 7, 0.3); color: #ffc107; }
        .quest-category.side { background: rgba(40, 167, 69, 0.3); color: #28a745; }
        .quest-category.daily { background: rgba(220, 53, 69, 0.3); color: #dc3545; }

        .quest-option-description {
          font-size: 14px;
          color: #ccc;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .quest-dialog-actions {
          padding: 15px 20px;
          border-top: 1px solid rgba(100, 149, 237, 0.3);
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .quest-btn-cancel,
        .quest-btn-accept {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .quest-btn-cancel {
          background: rgba(108, 117, 125, 0.3);
          color: #ccc;
        }

        .quest-btn-accept {
          background: rgba(40, 167, 69, 0.8);
          color: white;
        }

        .quest-btn-accept:disabled {
          background: rgba(108, 117, 125, 0.3);
          cursor: not-allowed;
        }

        .quest-btn-cancel:hover {
          background: rgba(108, 117, 125, 0.5);
        }

        .quest-btn-accept:hover:not(:disabled) {
          background: rgba(40, 167, 69, 1);
        }
      `;
      document.head.appendChild(style);
    }
  }

  formatReward(reward) {
    try {
      if (typeof reward === 'string') {
        reward = JSON.parse(reward);
      }
      
      const type = reward.type || 'unknown';
      const amount = reward.amount || 1;
      
      switch (type) {
        case 'gold':
          return `💰 ${amount} pièces`;
        case 'item':
          const itemId = reward.itemId || reward.item || 'Objet inconnu';
          return `📦 ${itemId} x${amount}`;
        case 'pokemon':
          return `🎁 Pokémon spécial`;
        case 'experience':
          return `⭐ ${amount} XP`;
        default:
          return `🎁 Récompense (${type})`;
      }
    } catch (error) {
      console.warn("⚠️ Erreur formatReward:", error, reward);
      return `🎁 Récompense`;
    }
  }

  showQuestRewards(data) {
    if (data.rewards && data.rewards.length > 0) {
      window._questDialogActive = true;
      
      const rewardText = data.rewards.map(r => this.formatReward(r)).join(', ');
      
      if (this.shouldShowNotification('questRewards', rewardText)) {
        this.notificationManager.achievement(
          `Récompenses reçues : ${rewardText}`,
          {
            duration: 8000,
            persistent: false,
            bounce: true,
            sound: true
          }
        );
      }
      
      const dialog = this.createQuestCompleteDialog(
        data.message || "Récompenses reçues !",
        data.rewards
      );
      document.body.appendChild(dialog);
    }
  }

  createQuestCompleteDialog(message, rewards) {
    const dialog = document.createElement('div');
    dialog.className = 'quest-dialog-overlay';
    dialog.innerHTML = `
      <div class="quest-dialog quest-complete-dialog">
        <div class="quest-dialog-header">
          <h3>🎉 Quête terminée !</h3>
        </div>
        <div class="quest-dialog-content">
          <p class="quest-complete-message">${message}</p>
          ${rewards && rewards.length > 0 ? `
            <div class="quest-complete-rewards">
              <h4>Récompenses reçues :</h4>
              ${rewards.map(reward => `
                <div class="quest-reward-item">
                  ${this.formatReward(reward)}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="quest-dialog-actions">
          <button class="quest-btn-accept">Continuer</button>
        </div>
      </div>
    `;

    this.styleQuestDialog(dialog);
    
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.remove();
        window._questDialogActive = false;
      }
    }, 5000);

    dialog.querySelector('.quest-btn-accept').addEventListener('click', () => {
      dialog.remove();
      window._questDialogActive = false;
    });
    
    return dialog;
  }

  // ✅ === MÉTHODES DE NETTOYAGE ET DESTRUCTION ===
  destroy() {
    console.log("💀 Destruction du système de quêtes");
    
    // ✅ Nettoyer les timers
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.distanceInterval) {
      clearInterval(this.distanceInterval);
      this.distanceInterval = null;
    }
    
    // Nettoyer les composants UI
    if (this.questIcon) {
      this.questIcon.destroy();
      this.questIcon = null;
    }
    
    if (this.questTracker) {
      this.questTracker.destroy();
      this.questTracker = null;
    }
    
    if (this.questJournal) {
      // Le QuestJournalUI n'a pas de méthode destroy, on le cache
      this.questJournal.hide();
      this.questJournal = null;
    }
    
    // Nettoyer les données
    this.activeQuests = [];
    this.availableQuests = [];
    this.lastNotificationTime.clear();
    
    console.log("✅ Système de quêtes détruit");
  }
}
