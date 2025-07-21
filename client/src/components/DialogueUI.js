// client/src/components/DialogueUI.js
// 🎭 Interface utilisateur pour les dialogues NPCs - Version avec Actions Contextuelles
// ✅ Support dialogue classique + zone d'actions + interface unifiée à onglets
// ✅ Réutilise dialogue.css + styles intégrés pour onglets + nouveaux styles actions

export class DialogueUI {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.isUnifiedInterface = false;
    this.currentTab = null;
    this.tabs = [];
    this.quickActions = [];
    
    // Callbacks
    this.onTabSwitch = null;
    this.onClose = null;
    this.onQuickAction = null;
    this.onActionClick = null; // 🆕 NOUVEAU: Callback pour actions dialogue
    
    console.log('🎭 DialogueUI créé avec support actions');
    this.init();
  }

  init() {
    this.createDialogueContainer();
    this.addIntegratedStyles();
    this.setupEventListeners();
    console.log('✅ DialogueUI initialisé avec actions');
  }

  // ===== CRÉATION DE L'INTERFACE =====
  
  createDialogueContainer() {
    // Créer le conteneur principal
    this.container = document.createElement('div');
    this.container.id = 'dialogue-container';
    this.container.className = 'dialogue-container hidden';
    
    // Structure HTML complète UNIFIÉE - CORRIGÉE
    this.container.innerHTML = `
      <!-- Dialogue unifié avec actions intégrées -->
      <div id="dialogue-box" class="dialogue-box-unified" style="display:none;">
        <!-- Partie haute: Portrait + Dialogue -->
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
        
        <!-- Partie basse: Actions intégrées -->
        <div id="dialogue-actions" class="dialogue-actions-integrated" style="display:none;">
          <div class="actions-separator"></div>
          <div class="actions-header">Actions disponibles</div>
          <div class="actions-buttons" id="actions-buttons">
            <!-- Les boutons seront générés dynamiquement -->
          </div>
        </div>
      </div>

      <!-- Interface unifiée avec onglets -->
      <div id="unified-interface" class="unified-interface" style="display:none;">
        <!-- Header avec portrait et nom NPC -->
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

        <!-- Navigation par onglets -->
        <div class="unified-tabs" id="unified-tabs">
          <!-- Les onglets seront générés dynamiquement -->
        </div>

        <!-- Contenu des onglets -->
        <div class="unified-content" id="unified-content">
          <!-- Le contenu sera injecté selon l'onglet actif -->
        </div>

        <!-- Actions rapides (footer) -->
        <div class="unified-footer" id="unified-footer">
          <div class="quick-actions" id="quick-actions">
            <!-- Actions rapides générées dynamiquement -->
          </div>
          <div class="unified-tips">
            <span class="tip-text">💡 Utilisez Tab pour changer d'onglet</span>
          </div>
        </div>
      </div>
    `;

    // Ajouter au DOM
    document.body.appendChild(this.container);
  }

  // ===== STYLES INTÉGRÉS ÉTENDUS =====
  
  addIntegratedStyles() {
    if (document.querySelector('#dialogue-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'dialogue-ui-styles';
    style.textContent = `
      /* ===== CONTENEUR PRINCIPAL ===== */
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

      /* ===== DIALOGUE UNIFIÉ - CORRIGÉ ===== */
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

      /* Partie haute du dialogue - CORRIGÉE */
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

      /* Zone de dialogue */
      .npc-dialogue {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-left: 15px;
        position: relative;
        min-height: 60px;
      }

      /* Indicateur de continuation - repositionné */
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

      /* Partie basse des actions - CORRIGÉE */
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

      /* Style avec actions */
      .dialogue-box-unified.with-actions {
        box-shadow: 
          0 12px 50px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 2px 0 rgba(255, 255, 255, 0.3);
      }

      /* Animation d'apparition unifiée */
      .dialogue-box-unified.appear {
        animation: dialogueUnifiedAppear 0.4s ease;
      }

      @keyframes dialogueUnifiedAppear {
        from { 
          opacity: 0; 
          transform: translateX(-50%) translateY(30px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateX(-50%) translateY(0) scale(1); 
        }
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
      }

      .action-btn:hover {
        background: linear-gradient(135deg, #5ba0f2, #4080cd);
        border-color: rgba(255, 255, 255, 0.6);
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.4);
      }

      .action-btn:active,
      .action-btn.clicked {
        transform: translateY(0);
        background: linear-gradient(135deg, #357abd, #2a6a9d);
        animation: actionClick 0.2s ease;
      }

      /* Styles par type d'action */
      .action-btn.shop {
        background: linear-gradient(135deg, #28a745, #20c997);
      }

      .action-btn.shop:hover {
        background: linear-gradient(135deg, #32b855, #24d3a7);
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
      }

      .action-btn.quest {
        background: linear-gradient(135deg, #ffc107, #e0a800);
        color: #333;
        text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
      }

      .action-btn.quest:hover {
        background: linear-gradient(135deg, #ffcd17, #ebb000);
        box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
      }

      .action-btn.heal {
        background: linear-gradient(135deg, #dc3545, #c82333);
      }

      .action-btn.heal:hover {
        background: linear-gradient(135deg, #e64555, #d32f43);
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
      }

      .action-btn.info {
        background: linear-gradient(135deg, #6c757d, #5a6268);
      }

      .action-btn.info:hover {
        background: linear-gradient(135deg, #7c858d, #6a7278);
        box-shadow: 0 4px 15px rgba(108, 117, 125, 0.4);
      }

      .action-icon {
        font-size: 16px;
        line-height: 1;
        filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.3));
      }

      .action-label {
        font-weight: bold;
        white-space: nowrap;
      }

      .action-badge {
        background: rgba(220, 53, 69, 0.9);
        color: white;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        margin-left: 5px;
        min-width: 16px;
        text-align: center;
        animation: badgePulse 2s infinite;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      @keyframes badgePulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
      }

      @keyframes actionClick {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }

      /* ===== INTERFACE UNIFIÉE ===== */
      .unified-interface {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 900px;
        height: 80%;
        max-height: 650px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        animation: unifiedAppear 0.4s ease;
        pointer-events: auto;
      }

      @keyframes unifiedAppear {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }

      /* ===== HEADER UNIFIÉ ===== */
      .unified-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 20px 25px;
        border-radius: 17px 17px 0 0;
        display: flex;
        align-items: center;
        gap: 20px;
        border-bottom: 2px solid #357abd;
        position: relative;
        overflow: hidden;
      }

      .unified-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: headerShimmer 4s infinite;
      }

      @keyframes headerShimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .unified-portrait {
        position: relative;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.8);
        overflow: hidden;
        background: linear-gradient(145deg, #fff, #f0f0f0);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        flex-shrink: 0;
      }

      .unified-npc-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .unified-npc-status {
        position: absolute;
        bottom: 5px;
        right: 5px;
        width: 16px;
        height: 16px;
        background: #28a745;
        border: 2px solid white;
        border-radius: 50%;
        animation: statusPulse 2s infinite;
      }

      @keyframes statusPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }

      .unified-info {
        flex: 1;
        z-index: 1;
      }

      .unified-npc-name {
        font-size: 24px;
        font-weight: bold;
        margin: 0 0 5px 0;
        color: #ffff80;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
      }

      .unified-npc-title {
        font-size: 14px;
        margin: 0 0 8px 0;
        color: #87ceeb;
        font-style: italic;
        opacity: 0.9;
      }

      .unified-npc-level {
        display: inline-block;
        background: rgba(255, 193, 7, 0.2);
        border: 1px solid rgba(255, 193, 7, 0.5);
        border-radius: 12px;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: bold;
        color: #ffc107;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .unified-controls {
        z-index: 1;
      }

      .unified-close-btn {
        background: rgba(220, 53, 69, 0.8);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .unified-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
      }

      /* ===== ONGLETS ===== */
      .unified-tabs {
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        border-bottom: 2px solid #357abd;
        min-height: 50px;
      }

      .unified-tab {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        padding: 12px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        position: relative;
        overflow: hidden;
      }

      .unified-tab:hover {
        background: rgba(74, 144, 226, 0.2);
        color: rgba(255, 255, 255, 0.9);
      }

      .unified-tab.active {
        background: linear-gradient(180deg, rgba(74, 144, 226, 0.4), rgba(74, 144, 226, 0.2));
        color: #87ceeb;
        border-bottom: 3px solid #4a90e2;
      }

      .unified-tab.active::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #4a90e2, #87ceeb, #4a90e2);
        animation: tabGlow 2s ease-in-out infinite alternate;
      }

      @keyframes tabGlow {
        from { opacity: 0.6; }
        to { opacity: 1; }
      }

      .tab-icon {
        font-size: 18px;
        transition: transform 0.3s ease;
      }

      .unified-tab.active .tab-icon {
        animation: tabIconPulse 1.5s ease-in-out infinite;
      }

      @keyframes tabIconPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .tab-label {
        font-weight: bold;
      }

      .tab-badge {
        background: #dc3545;
        color: white;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        margin-left: 5px;
        min-width: 16px;
        text-align: center;
        animation: badgePulse 1.5s infinite;
      }

      /* ===== CONTENU ===== */
      .unified-content {
        flex: 1;
        padding: 25px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.1);
      }

      /* Contenu de dialogue */
      .dialogue-content {
        text-align: center;
      }

      .dialogue-text {
        font-size: 16px;
        line-height: 1.6;
        color: #e0e0e0;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 20px;
        border-left: 4px solid #4a90e2;
      }

      .dialogue-speaker {
        font-size: 14px;
        color: #87ceeb;
        font-weight: bold;
        margin-bottom: 10px;
        text-align: left;
      }

      .dialogue-pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 15px;
        margin-top: 15px;
      }

      .dialogue-nav-btn {
        background: rgba(74, 144, 226, 0.8);
        border: none;
        color: white;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 12px;
        font-weight: bold;
      }

      .dialogue-nav-btn:hover:not(:disabled) {
        background: rgba(74, 144, 226, 1);
        transform: translateY(-1px);
      }

      .dialogue-nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .dialogue-page-info {
        color: #ccc;
        font-size: 12px;
        background: rgba(255, 255, 255, 0.1);
        padding: 5px 10px;
        border-radius: 8px;
      }

      /* Contenu intégré (shop, quêtes, etc.) */
      .embedded-content {
        width: 100%;
        height: 100%;
        min-height: 300px;
      }

      /* ===== FOOTER ===== */
      .unified-footer {
        background: rgba(0, 0, 0, 0.3);
        padding: 15px 25px;
        border-top: 2px solid #357abd;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 17px 17px;
        min-height: 60px;
      }

      .quick-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .quick-action-btn {
        background: rgba(74, 144, 226, 0.8);
        border: none;
        color: white;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .quick-action-btn:hover {
        background: rgba(74, 144, 226, 1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
      }

      .quick-action-btn.primary {
        background: linear-gradient(135deg, #28a745, #20c997);
      }

      .quick-action-btn.secondary {
        background: rgba(108, 117, 125, 0.8);
      }

      .quick-action-btn.danger {
        background: rgba(220, 53, 69, 0.8);
      }

      .unified-tips {
        color: #888;
        font-size: 11px;
        font-style: italic;
      }

      .tip-text {
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 8px;
        border-radius: 6px;
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 768px) {
        .unified-interface {
          width: 95%;
          height: 90%;
          border-radius: 15px;
        }

        .dialogue-box-unified {
          min-width: calc(100vw - 40px);
          left: 20px;
          right: 20px;
          transform: translateX(0);
          margin: 0 auto;
        }

        .actions-buttons {
          flex-direction: column;
          gap: 8px;
        }
        
        .action-btn {
          width: 100%;
          max-width: 250px;
        }

        .dialogue-main-content {
          padding: 15px;
        }

        .dialogue-actions-integrated {
          padding: 12px 15px;
        }
      }

      /* ===== SCROLLBAR PERSONNALISÉE ===== */
      .unified-content::-webkit-scrollbar {
        width: 8px;
      }

      .unified-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .unified-content::-webkit-scrollbar-thumb {
        background: rgba(74, 144, 226, 0.6);
        border-radius: 4px;
      }

      .unified-content::-webkit-scrollbar-thumb:hover {
        background: rgba(74, 144, 226, 0.8);
      }

      /* ===== ANIMATIONS D'ENTRÉE/SORTIE ===== */
      .unified-interface.closing {
        animation: unifiedDisappear 0.3s ease forwards;
      }

      @keyframes unifiedDisappear {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }

      .dialogue-box-unified.appear {
        animation: dialogueUnifiedAppear 0.4s ease;
      }

      @keyframes dialogueUnifiedAppear {
        from { 
          opacity: 0; 
          transform: translateX(-50%) translateY(30px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateX(-50%) translateY(0) scale(1); 
        }
      }
    `;

    document.head.appendChild(style);
    console.log('✅ Styles DialogueUI avec actions intégrés');
  }

  // ===== GESTION DES ÉVÉNEMENTS =====
  
  setupEventListeners() {
    // Clic pour fermer (dialogue unifié - seulement sur la partie dialogue)
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.dialogue-main-content') && !e.target.closest('.dialogue-actions-integrated')) {
        this.handleDialogueClick();
      }
    });

    // Bouton fermer (interface unifiée)
    const closeBtn = this.container.querySelector('#unified-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Événements clavier
    document.addEventListener('keydown', (e) => {
      if (this.isVisible) {
        this.handleKeyDown(e);
      }
    });

    console.log('✅ Event listeners DialogueUI configurés');
  }

  handleDialogueClick() {
    if (this.onDialogueAdvance && typeof this.onDialogueAdvance === 'function') {
      this.onDialogueAdvance();
    }
  }

  handleKeyDown(e) {
    // Vérifier si une autre interface importante est ouverte
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

      case 'Tab':
        if (this.isUnifiedInterface && this.tabs.length > 1) {
          this.switchToNextTab();
          e.preventDefault();
          e.stopPropagation();
        }
        break;

      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        if (this.isUnifiedInterface) {
          const tabIndex = parseInt(e.code.slice(-1)) - 1;
          if (tabIndex < this.tabs.length) {
            this.switchToTab(this.tabs[tabIndex].id);
            e.preventDefault();
            e.stopPropagation();
          }
        }
        break;
    }
  }

  // ===== AFFICHAGE DES DIALOGUES =====

  showClassicDialogue(data) {
    console.log('🎭 Affichage dialogue unifié simple:', data);

    const dialogueBox = this.container.querySelector('#dialogue-box');
    const portrait = this.container.querySelector('#npc-portrait');
    const npcName = this.container.querySelector('#npc-name');
    const npcText = this.container.querySelector('#npc-text');
    const actionsZone = this.container.querySelector('#dialogue-actions');
    const continueIndicator = this.container.querySelector('.dialogue-continue-indicator');

    // Configuration du portrait
    portrait.innerHTML = data.portrait
      ? `<img src="${data.portrait}" alt="${data.name}" style="max-width:80px;max-height:80px;">`
      : '';

    // Configuration du nom
    npcName.textContent = data.name || '';
    if (data.hideName) {
      npcName.style.display = 'none';
    } else {
      npcName.style.display = '';
    }

    // Configuration du texte
    const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : [data.text || ""];
    npcText.textContent = lines[0] || "";

    // 🆕 Afficher le compteur seulement si plusieurs pages
    if (lines.length > 1) {
      continueIndicator.style.display = 'block';
      const counter = continueIndicator.querySelector('.dialogue-counter');
      if (counter) {
        counter.textContent = `1/${lines.length}`;
      }
    } else {
      continueIndicator.style.display = 'none';
    }

    // Masquer les actions pour dialogue simple et utiliser classe unifiée
    actionsZone.style.display = 'none';
    dialogueBox.className = 'dialogue-box-unified';

    // Stocker les données pour la pagination
    this.classicDialogueData = {
      lines: lines,
      currentPage: 0,
      onClose: data.onClose
    };

    // Afficher
    this.container.classList.remove('hidden');
    dialogueBox.style.display = 'flex';
    dialogueBox.classList.add('appear');
    this.isVisible = true;

    console.log('✅ Dialogue unifié simple affiché');
  }

  // 🆕 NOUVELLE MÉTHODE: Afficher dialogue unifié avec actions
  showDialogueWithActions(data) {
    console.log('🎭 Affichage dialogue unifié avec actions:', data);

    const dialogueBox = this.container.querySelector('#dialogue-box');
    const actionsZone = this.container.querySelector('#dialogue-actions');
    const actionsButtons = this.container.querySelector('#actions-buttons');
    const continueIndicator = this.container.querySelector('.dialogue-continue-indicator');

    // 1. Afficher le dialogue de base
    this.showClassicDialogue(data);

    // 2. Générer et afficher les actions si disponibles
    if (data.actions && data.actions.length > 0) {
      console.log(`🎯 Génération de ${data.actions.length} actions`);
      
      // Nettoyer les boutons existants
      actionsButtons.innerHTML = '';
      
      // Créer les boutons d'actions
      data.actions.forEach(action => {
        const actionBtn = this.createActionButton(action);
        actionsButtons.appendChild(actionBtn);
      });
      
      // Afficher la zone d'actions intégrée
      actionsZone.style.display = 'block';
      
      // Changer de classe pour le style unifié
      dialogueBox.className = 'dialogue-box-unified with-actions';
      
      // 🆕 Gérer le compteur avec actions
      const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : [data.text || ""];
      if (lines.length > 1) {
        continueIndicator.style.display = 'block';
        const counter = continueIndicator.querySelector('.dialogue-counter');
        if (counter) {
          counter.textContent = `1/${lines.length}`;
        }
      } else {
        continueIndicator.style.display = 'none';
      }
      
    } else {
      // Pas d'actions = dialogue simple
      actionsZone.style.display = 'none';
      dialogueBox.className = 'dialogue-box-unified';
    }

    console.log('✅ Dialogue unifié avec actions affiché');
  }

  // 🆕 NOUVELLE MÉTHODE: Créer un bouton d'action
  createActionButton(action) {
    const button = document.createElement('button');
    button.className = `action-btn ${action.type || 'default'}`;
    button.innerHTML = `
      <span class="action-icon">${action.icon || '🔧'}</span>
      <span class="action-label">${action.label}</span>
      ${action.badge ? `<span class="action-badge">${action.badge}</span>` : ''}
    `;
    
    // Ajouter les données d'action
    button.dataset.actionId = action.id;
    button.dataset.actionType = action.type;
    
    // Handler de clic
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleActionClick(action);
    });
    
    return button;
  }

  // 🆕 NOUVELLE MÉTHODE: Handler pour les clics sur actions
  handleActionClick(action) {
    console.log(`🎯 Action cliquée: ${action.id} (${action.type})`);
    
    // Callback vers le DialogueManager
    if (this.onActionClick && typeof this.onActionClick === 'function') {
      this.onActionClick(action);
    }
    
    // Animation feedback
    const button = this.container.querySelector(`[data-action-id="${action.id}"]`);
    if (button) {
      button.classList.add('clicked');
      setTimeout(() => button.classList.remove('clicked'), 200);
    }
  }

  showUnifiedInterface(data) {
    console.log('🎭 Affichage interface unifiée:', data);

    const unifiedInterface = this.container.querySelector('#unified-interface');
    
    // Configuration du header
    this.setupUnifiedHeader(data);
    
    // Configuration des onglets
    this.setupUnifiedTabs(data.tabs);
    
    // Configuration des actions rapides
    this.setupQuickActions(data.quickActions);
    
    // Stocker les callbacks
    this.onTabSwitch = data.onTabSwitch;
    this.onClose = data.onClose;
    this.tabData = data.tabData || {};
    
    // Afficher le premier onglet
    if (this.tabs.length > 0) {
      this.switchToTab(this.tabs[0].id);
    }
    
    // Afficher l'interface
    this.container.classList.remove('hidden');
    unifiedInterface.style.display = 'flex';
    this.isVisible = true;
    this.isUnifiedInterface = true;

    console.log('✅ Interface unifiée affichée');
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

    console.log(`✅ ${this.tabs.length} onglets configurés`);
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

    console.log(`✅ ${this.quickActions.length} actions rapides configurées`);
  }

  // ===== GESTION DES ONGLETS =====

  switchToTab(tabId) {
    console.log(`🎭 Changement vers onglet: ${tabId}`);

    // Mettre à jour la navigation
    const tabs = this.container.querySelectorAll('.unified-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tabId === tabId);
    });

    // Mettre à jour le contenu
    this.currentTab = tabId;
    this.loadTabContent(tabId);

    // Appeler le callback
    if (this.onTabSwitch && typeof this.onTabSwitch === 'function') {
      this.onTabSwitch(tabId);
    }
  }

  switchToNextTab() {
    if (this.tabs.length <= 1) return;

    const currentIndex = this.tabs.findIndex(tab => tab.id === this.currentTab);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.switchToTab(this.tabs[nextIndex].id);
  }

  loadTabContent(tabId) {
    const contentContainer = this.container.querySelector('#unified-content');
    
    // Afficher un état de chargement
    contentContainer.innerHTML = `
      <div class="unified-loading">
        <div class="unified-loading-spinner"></div>
        <div class="unified-loading-text">Loading ${tabId}...</div>
        <div class="unified-loading-subtext">Please wait...</div>
      </div>
    `;

    // Le contenu réel sera injecté par le DialogueManager
    console.log(`📄 Contenu de l'onglet ${tabId} demandé`);
  }

  // ===== INJECTION DE CONTENU =====

  injectTabContent(tabId, htmlContent) {
    if (this.currentTab !== tabId) return;

    const contentContainer = this.container.querySelector('#unified-content');
    contentContainer.innerHTML = htmlContent;
    console.log(`✅ Contenu injecté pour l'onglet ${tabId}`);
  }

  // ===== DIALOGUE CLASSIQUE - PAGINATION =====

  advanceClassicDialogue() {
    if (!this.classicDialogueData) return;

    this.classicDialogueData.currentPage++;
    
    if (this.classicDialogueData.currentPage >= this.classicDialogueData.lines.length) {
      this.hide();
      return;
    }

    const npcText = this.container.querySelector('#npc-text');
    npcText.textContent = this.classicDialogueData.lines[this.classicDialogueData.currentPage];
  }

  // ===== AFFICHAGE/MASQUAGE =====

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
    console.log('🎭 Fermeture DialogueUI');

    // Animation de fermeture
    if (this.isUnifiedInterface) {
      const unifiedInterface = this.container.querySelector('#unified-interface');
      unifiedInterface.classList.add('closing');
      
      setTimeout(() => {
        unifiedInterface.style.display = 'none';
        unifiedInterface.classList.remove('closing');
        this.completeHide();
      }, 300);
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

    // Appeler le callback de fermeture
    if (this.onClose && typeof this.onClose === 'function') {
      this.onClose();
      this.onClose = null;
    }

    console.log('✅ DialogueUI fermé');
  }

  // ===== UTILITAIRES =====

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
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    const style = document.querySelector('#dialogue-ui-styles');
    if (style) {
      style.remove();
    }
    
    this.container = null;
    this.onTabSwitch = null;
    this.onClose = null;
    this.onQuickAction = null;
    this.onActionClick = null;
    
    console.log('💀 DialogueUI détruit');
  }
}
