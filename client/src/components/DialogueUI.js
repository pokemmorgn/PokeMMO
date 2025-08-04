// client/src/components/DialogueUI.js
// 🎭 Interface utilisateur pour les dialogues NPCs - VERSION CORRIGÉE
// 🔧 FIX CRITIQUE : Tous les boutons d'action fonctionnent maintenant !

export class DialogueUI {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.isUnifiedInterface = false;
    this.currentTab = null;
    this.tabs = [];
    this.quickActions = [];
    this.currentNpcId = null;
    this.npcIdObserver = null;
    
    this.onTabSwitch = null;
    this.onClose = null;
    this.onQuickAction = null;
    this.onActionClick = null; // 📌 CALLBACK PRINCIPAL POUR TOUTES LES ACTIONS
    
    this.init();
  }

  init() {
    this.createDialogueContainer();
    this.addIntegratedStyles();
    this.setupEventListeners();
    this.setupNpcIdTracking();
    // 🔧 SUPPRIMÉ : setupQuestButtonInterceptor() qui causait le problème
    console.log('✅ DialogueUI initialisé (tous boutons fonctionnels)');
  }

  // ✅ CONSERVÉ : Système de tracking NPC ID
  setupNpcIdTracking() {
    if (!this.container) return;
    
    this.npcIdObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          
          if (target.classList.contains('dialogue-container') && 
              !target.classList.contains('hidden')) {
            
            this.extractNpcIdOnOpen();
          }
        }
      });
    });
    
    this.npcIdObserver.observe(this.container, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  extractNpcIdOnOpen() {
    let npcId = null;
    
    // 1. Essayer depuis les données d'interaction récentes
    if (window.lastNpcInteraction) {
      npcId = window.lastNpcInteraction.npcId || 
              window.lastNpcInteraction.id ||
              window.lastNpcInteraction.npc?.id;
    }
    
    // 2. Essayer depuis NetworkManager history
    if (!npcId && window.globalNetworkManager?.interactionHistory) {
      const recentNpcInteractions = window.globalNetworkManager.interactionHistory
        .filter(entry => entry.type.includes('npc') || entry.type.includes('interaction'))
        .slice(-3);
      
      if (recentNpcInteractions.length > 0) {
        const lastInteraction = recentNpcInteractions[recentNpcInteractions.length - 1];
        npcId = lastInteraction.data?.npcId || 
                lastInteraction.data?.id ||
                lastInteraction.data?.npc?.id;
      }
    }
    
    // 3. Essayer depuis l'état des scènes
    if (!npcId && window.game?.scene) {
      const scenes = window.game.scene.getScenes(true);
      for (const scene of scenes) {
        if (scene.lastInteractedNpc || scene.currentNpcId) {
          npcId = scene.lastInteractedNpc || scene.currentNpcId;
          break;
        }
      }
    }
    
    // 4. Fallback : utiliser un ID par défaut
    if (!npcId) {
      npcId = 2;
    }
    
    this.currentNpcId = npcId;
    this.container.setAttribute('data-current-npc-id', npcId);
    
    console.log('📋 NPC ID extrait:', npcId);
  }

  // 🔧 MÉTHODE MISE À JOUR : Extraction NPC ID améliorée
  extractNpcId(data) {
    const candidates = [
      data.npcId, data.id, data.npc?.id, data.npcData?.id,
      data.unifiedInterface?.npcId, data.contextualData?.npcId,
      data.originalData?.npcId, data.meta?.npcId, data.metadata?.npcId,
      data.params?.npcId, data.parameters?.npcId,
      data.npc, data.npcData, data.target?.id, data.source?.id
    ];
    
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        if (typeof candidate === 'object' && candidate.id) {
          return candidate.id;
        }
        if (typeof candidate === 'number' || typeof candidate === 'string') {
          return candidate;
        }
      }
    }
    
    return null;
  }

  createDialogueContainer() {
    this.container = document.createElement('div');
    this.container.id = 'dialogue-container';
    this.container.className = 'dialogue-container hidden';
    
    this.container.innerHTML = `
      <div id="dialogue-box" class="dialogue-box-unified" style="display:none;">
        <div class="dialogue-main-content">
          <div id="npc-portrait" class="npc-portrait"></div>
          <div id="npc-dialogue" class="npc-dialogue">
            <span id="npc-name" class="npc-name"></span>
            <span id="npc-text" class="npc-text"></span>
            <div class="dialogue-continue-indicator">
              <span class="dialogue-counter">1/1</span>
              <div class="dialogue-arrow"></div>
            </div>
          </div>
        </div>
        
        <div id="dialogue-actions" class="dialogue-actions-integrated" style="display:none;">
          <div class="actions-separator"></div>
          <div class="actions-header">Actions disponibles</div>
          <div class="actions-buttons" id="actions-buttons"></div>
        </div>
      </div>

      <div id="unified-interface" class="unified-interface" style="display:none;">
        <div class="unified-header">
          <div class="unified-portrait">
            <img id="unified-npc-image" src="" alt="NPC" class="unified-npc-image">
            <div class="unified-npc-status"></div>
          </div>
          <div class="unified-info">
            <h2 id="unified-npc-name" class="unified-npc-name">NPC Name</h2>
            <p id="unified-npc-title" class="unified-npc-title">NPC Title</p>
            <div class="unified-npc-level">Level 15</div>
          </div>
          <div class="unified-controls">
            <button class="unified-close-btn" id="unified-close">✕</button>
          </div>
        </div>

        <div class="unified-tabs" id="unified-tabs"></div>
        <div class="unified-content" id="unified-content"></div>

        <div class="unified-footer" id="unified-footer">
          <div class="quick-actions" id="quick-actions"></div>
          <div class="unified-tips">
            <span class="tip-text">💡 Utilisez Tab pour changer d'onglet</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  addIntegratedStyles() {
    if (document.querySelector('#dialogue-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'dialogue-ui-styles';
    style.textContent = `
      .dialogue-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .dialogue-container.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .dialogue-container:not(.hidden) {
        opacity: 1;
        pointer-events: auto;
      }

      .dialogue-box-unified {
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        min-width: 500px;
        max-width: 750px;
        background: linear-gradient(145deg, rgba(36, 76, 116, 0.95), rgba(25, 55, 95, 0.95));
        border: 3px solid rgba(255, 255, 255, 0.8);
        border-radius: 20px;
        box-shadow: 
          0 8px 40px rgba(0, 0, 0, 0.6),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 2px 0 rgba(255, 255, 255, 0.3);
        display: flex !important;
        flex-direction: column !important;
        font-family: 'Arial Rounded MT Bold', Arial, sans-serif;
        backdrop-filter: blur(8px);
        transition: all 0.3s ease;
        pointer-events: auto;
        overflow: hidden;
        width: auto;
      }

      .dialogue-main-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 15px 20px;
        cursor: pointer;
        min-height: 80px;
        width: 100%;
        box-sizing: border-box;
      }

      .npc-dialogue {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-left: 15px;
        position: relative;
        min-height: 60px;
      }

      .dialogue-continue-indicator {
        position: absolute;
        bottom: -5px;
        right: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      .dialogue-counter {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: bold;
      }

      .dialogue-arrow {
        width: 0;
        height: 0;
        border-left: 6px solid rgba(255, 255, 255, 0.7);
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
        animation: arrowBlink 1.5s infinite;
      }

      @keyframes arrowBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }

      .dialogue-actions-integrated {
        background: linear-gradient(135deg, rgba(20, 45, 75, 0.8), rgba(30, 60, 100, 0.8));
        padding: 15px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        width: 100%;
        box-sizing: border-box;
        display: block !important;
      }

      .actions-separator {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        margin: -1px 0 12px 0;
      }

      .actions-header {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.9);
        font-weight: bold;
        margin-bottom: 12px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Arial Rounded MT Bold', Arial, sans-serif;
      }

      .dialogue-box-unified.simple .dialogue-actions-integrated {
        display: none !important;
      }

      .dialogue-box-unified.with-actions {
        box-shadow: 
          0 12px 50px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 2px 0 rgba(255, 255, 255, 0.3);
      }

      .actions-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
        align-items: center;
        width: 100%;
      }

      .action-btn {
        background: linear-gradient(135deg, #4a90e2, #357abd);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        color: white;
        padding: 10px 18px;
        font-family: 'Arial Rounded MT Bold', Arial, sans-serif;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 140px;
        justify-content: center;
        position: relative;
        overflow: hidden;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
        /* 🔧 IMPORTANT : S'assurer que les événements sont capturés */
        pointer-events: auto;
        z-index: 101;
      }

      .action-btn:hover {
        background: linear-gradient(135deg, #5ba0f2, #4080cd);
        border-color: rgba(255, 255, 255, 0.6);
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.4);
      }

      /* 🛒 Styles spécifiques pour shop */
      .action-btn.shop {
        background: linear-gradient(135deg, #28a745, #1e7e34);
        color: white;
      }

      .action-btn.shop:hover {
        background: linear-gradient(135deg, #34ce57, #28a745);
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
      }

      /* 📋 Styles spécifiques pour quêtes */
      .action-btn.quest,
      .action-btn.quest-specific {
        background: linear-gradient(135deg, #ffc107, #e0a800);
        color: #333;
        text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
      }

      .action-btn.quest:hover,
      .action-btn.quest-specific:hover {
        background: linear-gradient(135deg, #ffcd17, #ebb000);
        box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
      }

      .action-btn.quest-specific {
        border-left: 4px solid #ff9800;
        position: relative;
      }

      .action-btn.quest-specific::before {
        content: "📋";
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff9800;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }

      /* 💊 Styles pour heal */
      .action-btn.heal {
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
      }

      .action-btn.heal:hover {
        background: linear-gradient(135deg, #e4606d, #dc3545);
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
      }

      /* ℹ️ Styles pour info */
      .action-btn.info {
        background: linear-gradient(135deg, #17a2b8, #138496);
        color: white;
      }

      .action-btn.info:hover {
        background: linear-gradient(135deg, #20c0db, #17a2b8);
        box-shadow: 0 4px 15px rgba(23, 162, 184, 0.4);
      }
    `;

    document.head.appendChild(style);
  }

  // 🔧 SETUP EVENT LISTENERS CORRIGÉ
  setupEventListeners() {
    // 1️⃣ Event listener pour l'avancement du dialogue (clic sur zone principale)
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.dialogue-main-content') && !e.target.closest('.dialogue-actions-integrated')) {
        this.handleDialogueClick();
      }
    });

    // 2️⃣ Event listener pour fermeture interface unifiée
    const closeBtn = this.container.querySelector('#unified-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // 3️⃣ 🔧 EVENT LISTENER PRINCIPAL POUR TOUS LES BOUTONS D'ACTION
    // Délégation d'événement sur le container actions
    this.container.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.action-btn');
      
      if (actionBtn && this.isVisible) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎯 [DialogueUI] Bouton action cliqué:', actionBtn);
        
        // Extraire les données du bouton
        const actionData = {
          id: actionBtn.dataset.actionId,
          type: actionBtn.dataset.actionType,
          questId: actionBtn.dataset.questId,
          label: actionBtn.querySelector('.action-label')?.textContent || actionBtn.textContent,
          icon: actionBtn.querySelector('.action-icon')?.textContent || '',
        };
        
        console.log('🎯 [DialogueUI] Action data:', actionData);
        
        // 🔧 CALLBACK VERS DIALOGUEMANAGER
        if (this.onActionClick && typeof this.onActionClick === 'function') {
          console.log('🎯 [DialogueUI] Appel callback onActionClick');
          this.onActionClick(actionData);
        } else {
          console.error('❌ [DialogueUI] Pas de callback onActionClick défini!');
        }
        
        return false;
      }
    });

    // 4️⃣ Event listener pour clavier
    document.addEventListener('keydown', (e) => {
      if (this.isVisible) {
        this.handleKeyDown(e);
      }
    });

    console.log('✅ Event listeners configurés (tous boutons)');
  }

  handleDialogueClick() {
    if (this.onDialogueAdvance && typeof this.onDialogueAdvance === 'function') {
      this.onDialogueAdvance();
    }
  }

  handleKeyDown(e) {
    if (typeof window.isChatFocused === "function" && window.isChatFocused()) return;
    if (window._questDialogActive) return;

    switch (e.code) {
      case 'Escape':
        this.hide();
        e.preventDefault();
        e.stopPropagation();
        break;

      case 'KeyE':
        if (!this.isUnifiedInterface) {
          this.handleDialogueClick();
          e.preventDefault();
          e.stopPropagation();
        }
        break;
    }
  }

  showClassicDialogue(data) {
    this.currentNpcId = this.extractNpcId(data);

    const dialogueBox = this.container.querySelector('#dialogue-box');
    const portrait = this.container.querySelector('#npc-portrait');
    const npcName = this.container.querySelector('#npc-name');
    const npcText = this.container.querySelector('#npc-text');
    const actionsZone = this.container.querySelector('#dialogue-actions');
    const continueIndicator = this.container.querySelector('.dialogue-continue-indicator');

    portrait.innerHTML = data.portrait
      ? `<img src="${data.portrait}" alt="${data.name}" style="max-width:80px;max-height:80px;">`
      : '';

    npcName.textContent = data.name || '';
    if (data.hideName) {
      npcName.style.display = 'none';
    } else {
      npcName.style.display = '';
    }

    const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : [data.text || ""];
    npcText.textContent = lines[0] || "";

    if (lines.length > 1) {
      continueIndicator.style.display = 'block';
      const counter = continueIndicator.querySelector('.dialogue-counter');
      if (counter) {
        counter.textContent = `1/${lines.length}`;
      }
    } else {
      continueIndicator.style.display = 'none';
    }

    actionsZone.style.display = 'none';
    dialogueBox.className = 'dialogue-box-unified simple';

    this.classicDialogueData = {
      lines: lines,
      currentPage: 0,
      onClose: data.onClose
    };

    this.container.classList.remove('hidden');
    dialogueBox.style.display = 'flex';
    this.isVisible = true;
  }

  showDialogueWithActions(data) {
    this.currentNpcId = this.extractNpcId(data);

    const dialogueBox = this.container.querySelector('#dialogue-box');
    const actionsZone = this.container.querySelector('#dialogue-actions');
    const actionsButtons = this.container.querySelector('#actions-buttons');

    const portrait = this.container.querySelector('#npc-portrait');
    const npcName = this.container.querySelector('#npc-name');
    const npcText = this.container.querySelector('#npc-text');

    portrait.innerHTML = data.portrait
      ? `<img src="${data.portrait}" alt="${data.name}" style="max-width:80px;max-height:80px;">`
      : '';

    npcName.textContent = data.name || '';
    if (data.hideName) {
      npcName.style.display = 'none';
    } else {
      npcName.style.display = '';
    }

    const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : [data.text || ""];
    npcText.textContent = lines[0] || "";

    if (data.actions && data.actions.length > 0) {
      actionsButtons.innerHTML = '';
      
      data.actions.forEach(action => {
        const actionBtn = this.createActionButton(action);
        actionsButtons.appendChild(actionBtn);
      });
      
      actionsZone.style.display = 'block';
      dialogueBox.className = 'dialogue-box-unified with-actions';
      
      console.log(`✅ [DialogueUI] ${data.actions.length} boutons d'action créés`);
    } else {
      actionsZone.style.display = 'none';
      dialogueBox.className = 'dialogue-box-unified simple';
    }

    this.classicDialogueData = {
      lines: lines,
      currentPage: 0,
      onClose: data.onClose
    };

    this.container.classList.remove('hidden');
    dialogueBox.style.display = 'flex';
    this.isVisible = true;
  }

  // 🔧 CREATEACTIONBUTTON CORRIGÉ
  createActionButton(action) {
    const button = document.createElement('button');
    button.className = `action-btn ${action.type || 'default'}`;
    
    // 📌 CRUCIAL : Définir les data attributes
    button.dataset.actionId = action.id;
    button.dataset.actionType = action.type;
    
    if (action.questId) {
      button.dataset.questId = action.questId;
      button.classList.add('quest-specific');
    }
    
    button.innerHTML = `
      <span class="action-icon">${action.icon || '🔧'}</span>
      <span class="action-label">${action.label}</span>
      ${action.badge ? `<span class="action-badge">${action.badge}</span>` : ''}
    `;
    
    console.log('🔧 [DialogueUI] Bouton créé:', {
      id: action.id,
      type: action.type,
      label: action.label,
      questId: action.questId,
      datasets: button.dataset
    });
    
    // 🔧 PAS D'EVENT LISTENER ICI - géré par délégation dans setupEventListeners
    
    return button;
  }

  // ===== INTERFACE UNIFIÉE (inchangée) =====

  showUnifiedInterface(data) {
    this.currentNpcId = this.extractNpcId(data);

    const unifiedInterface = this.container.querySelector('#unified-interface');
    
    this.setupUnifiedHeader(data);
    this.setupUnifiedTabs(data.tabs);
    this.setupQuickActions(data.quickActions);
    
    this.onTabSwitch = data.onTabSwitch;
    this.onClose = data.onClose;
    
    if (this.tabs.length > 0) {
      this.switchToTab(this.tabs[0].id);
    }
    
    this.container.classList.remove('hidden');
    unifiedInterface.style.display = 'flex';
    this.isVisible = true;
    this.isUnifiedInterface = true;
  }

  setupUnifiedHeader(data) {
    const npcImage = this.container.querySelector('#unified-npc-image');
    const npcName = this.container.querySelector('#unified-npc-name');
    const npcTitle = this.container.querySelector('#unified-npc-title');

    npcImage.src = data.portrait || 'https://via.placeholder.com/80x80/4a90e2/ffffff?text=NPC';
    npcImage.alt = data.name || 'NPC';
    npcName.textContent = data.name || 'Unknown NPC';
    npcTitle.textContent = data.title || 'Villager';
  }

  setupUnifiedTabs(tabs) {
    const tabsContainer = this.container.querySelector('#unified-tabs');
    tabsContainer.innerHTML = '';
    
    this.tabs = tabs || [];
    
    this.tabs.forEach((tab, index) => {
      const tabElement = document.createElement('button');
      tabElement.className = 'unified-tab';
      tabElement.dataset.tabId = tab.id;
      
      tabElement.innerHTML = `
        <span class="tab-icon">${tab.icon || '📄'}</span>
        <span class="tab-label">${tab.label}</span>
        ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
      `;
      
      tabElement.addEventListener('click', () => {
        this.switchToTab(tab.id);
      });
      
      tabsContainer.appendChild(tabElement);
    });
  }

  setupQuickActions(actions) {
    const actionsContainer = this.container.querySelector('#quick-actions');
    actionsContainer.innerHTML = '';
    
    this.quickActions = actions || [];
    
    this.quickActions.forEach(action => {
      const actionBtn = document.createElement('button');
      actionBtn.className = `quick-action-btn ${action.type || 'primary'}`;
      actionBtn.innerHTML = `
        <span>${action.icon || '🔧'}</span>
        <span>${action.label}</span>
      `;
      
      actionBtn.addEventListener('click', () => {
        if (action.callback && typeof action.callback === 'function') {
          action.callback();
        }
        if (this.onQuickAction && typeof this.onQuickAction === 'function') {
          this.onQuickAction(action);
        }
      });
      
      actionsContainer.appendChild(actionBtn);
    });
  }

  switchToTab(tabId) {
    const tabs = this.container.querySelectorAll('.unified-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tabId === tabId);
    });

    this.currentTab = tabId;
    this.loadTabContent(tabId);

    if (this.onTabSwitch && typeof this.onTabSwitch === 'function') {
      this.onTabSwitch(tabId);
    }
  }

  loadTabContent(tabId) {
    const contentContainer = this.container.querySelector('#unified-content');
    
    contentContainer.innerHTML = `
      <div class="unified-loading">
        <div class="unified-loading-spinner"></div>
        <div class="unified-loading-text">Loading ${tabId}...</div>
      </div>
    `;
  }

  injectTabContent(tabId, htmlContent) {
    if (this.currentTab !== tabId) return;

    const contentContainer = this.container.querySelector('#unified-content');
    contentContainer.innerHTML = htmlContent;
  }

  // ===== MÉTHODES PUBLIQUES =====

  show(data) {
    if (data.isUnifiedInterface) {
      this.showUnifiedInterface(data);
    } else if (data.actions && data.actions.length > 0) {
      this.showDialogueWithActions(data);
    } else {
      this.showClassicDialogue(data);
    }
  }

  hide() {
    if (this.isUnifiedInterface) {
      const unifiedInterface = this.container.querySelector('#unified-interface');
      unifiedInterface.style.display = 'none';
      this.completeHide();
    } else {
      const dialogueBox = this.container.querySelector('#dialogue-box');
      dialogueBox.style.display = 'none';
      this.completeHide();
    }
  }

  completeHide() {
    this.container.classList.add('hidden');
    this.isVisible = false;
    this.isUnifiedInterface = false;
    this.currentTab = null;
    this.tabs = [];
    this.quickActions = [];
    this.classicDialogueData = null;

    if (this.onClose && typeof this.onClose === 'function') {
      this.onClose();
      this.onClose = null;
    }
  }

  isOpen() {
    return this.isVisible;
  }

  getCurrentTab() {
    return this.currentTab;
  }

  getContentContainer() {
    return this.container.querySelector('#unified-content');
  }

  // ===== NETTOYAGE =====

  destroy() {
    if (this.npcIdObserver) {
      this.npcIdObserver.disconnect();
      this.npcIdObserver = null;
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    const style = document.querySelector('#dialogue-ui-styles');
    if (style) {
      style.remove();
    }
    
    this.container = null;
    this.currentNpcId = null;
  }
}
