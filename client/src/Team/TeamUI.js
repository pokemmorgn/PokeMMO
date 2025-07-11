// Team/TeamUI.js - Interface Team Moderne Style Pokémon
// 🎯 Interface complète moderne équilibrée

export class TeamUI {
  constructor(teamManager, gameRoom) {
    this.teamManager = teamManager;
    this.gameRoom = gameRoom;
    
    // === ÉTAT ===
    this.isVisible = false;
    this.isEnabled = true;
    this.overlayElement = null;
    
    // === DONNÉES AFFICHÉES ===
    this.teamData = [];
    this.selectedPokemon = null;
    this.selectedSlot = null;
    this.currentView = 'overview'; // overview, details, moves
    
    // === CALLBACKS ===
    this.onAction = null; // Appelé pour les actions
    
    console.log('🎯 [TeamUI] Instance moderne créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamUI] Initialisation interface moderne...');
      
      await this.loadModernCSS();
      this.createModernInterface();
      this.setupEventListeners();
      
      console.log('✅ [TeamUI] Interface moderne initialisée');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CSS MODERNE POKÉMON ===
  
  async loadModernCSS() {
    if (document.querySelector('#modern-team-ui-styles')) {
      return; // Déjà chargé
    }
    
    const style = document.createElement('style');
    style.id = 'modern-team-ui-styles';
    style.textContent = `
      /* ===== TEAM UI MODERNE POKÉMON ===== */
      
      .team-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(10, 25, 55, 0.95), rgba(25, 45, 85, 0.92));
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 1;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      
      .team-overlay.hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.95);
      }
      
      .team-container {
        width: 95vw;
        max-width: 1400px;
        height: 90vh;
        max-height: 800px;
        background: linear-gradient(145deg, #1e3a5f 0%, #2a4a7a 50%, #1a2f4f 100%);
        border: 3px solid #4a90e2;
        border-radius: 25px;
        color: white;
        font-family: 'Segoe UI', 'Arial', sans-serif;
        display: flex;
        flex-direction: column;
        box-shadow: 
          0 25px 50px rgba(0, 0, 0, 0.6),
          0 0 0 1px rgba(74, 144, 226, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        overflow: hidden;
        position: relative;
      }
      
      /* Effet lumineux Pokémon */
      .team-container::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, #4a90e2, #6ba3f0, #4a90e2, #357abd);
        background-size: 400% 400%;
        border-radius: 25px;
        z-index: -1;
        animation: pokemonGlow 3s ease-in-out infinite;
      }
      
      @keyframes pokemonGlow {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      
      /* ===== HEADER POKÉMON ===== */
      .team-header {
        background: linear-gradient(90deg, #4a90e2 0%, #357abd 50%, #4a90e2 100%);
        padding: 20px 30px;
        border-radius: 22px 22px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #357abd;
        position: relative;
        overflow: hidden;
      }
      
      .team-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        animation: headerShine 4s ease-in-out infinite;
      }
      
      @keyframes headerShine {
        0%, 100% { left: -100%; }
        50% { left: 100%; }
      }
      
      .team-title {
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 1;
        position: relative;
      }
      
      .team-icon {
        font-size: 28px;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
        animation: iconFloat 2s ease-in-out infinite;
      }
      
      @keyframes iconFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      
      .team-title-text h2 {
        margin: 0;
        color: #ffffff;
        font-size: 26px;
        font-weight: 700;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        letter-spacing: 1px;
      }
      
      .team-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        margin: 2px 0 0 0;
        font-weight: 400;
      }
      
      .team-controls {
        display: flex;
        align-items: center;
        gap: 25px;
        z-index: 1;
        position: relative;
      }
      
      .team-stats {
        text-align: right;
        background: rgba(255, 255, 255, 0.1);
        padding: 10px 15px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .team-count {
        font-size: 20px;
        font-weight: bold;
        color: #87ceeb;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .team-status {
        font-size: 14px;
        margin-top: 4px;
        font-weight: 600;
      }
      
      .team-close-btn {
        background: linear-gradient(145deg, #e74c3c, #c0392b);
        border: 2px solid #fff;
        color: white;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      .team-close-btn:hover {
        background: linear-gradient(145deg, #c0392b, #a93226);
        transform: scale(1.1);
        box-shadow: 0 6px 12px rgba(0,0,0,0.4);
      }
      
      /* ===== TABS MODERNES ===== */
      .team-tabs {
        display: flex;
        padding: 0 30px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .team-tab {
        flex: 1;
        max-width: 200px;
        padding: 15px 20px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        position: relative;
        overflow: hidden;
      }
      
      .team-tab::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 0;
        height: 3px;
        background: linear-gradient(90deg, #4a90e2, #87ceeb);
        transition: all 0.3s ease;
        transform: translateX(-50%);
      }
      
      .team-tab:hover {
        background: rgba(74, 144, 226, 0.1);
        color: #87ceeb;
      }
      
      .team-tab:hover::before {
        width: 80%;
      }
      
      .team-tab.active {
        background: rgba(74, 144, 226, 0.2);
        color: #87ceeb;
      }
      
      .team-tab.active::before {
        width: 100%;
        background: linear-gradient(90deg, #87ceeb, #4a90e2);
      }
      
      .tab-icon {
        font-size: 18px;
      }
      
      /* ===== CONTENU PRINCIPAL ===== */
      .team-content {
        flex: 1;
        overflow: hidden;
        padding: 25px 30px;
        display: flex;
        flex-direction: column;
      }
      
      .team-view {
        display: none;
        height: 100%;
        overflow: hidden;
      }
      
      .team-view.active {
        display: flex;
        flex-direction: column;
      }
      
      /* ===== OVERVIEW - LAYOUT ÉQUILIBRÉ ===== */
      .team-overview {
        display: grid;
        grid-template-columns: 2.5fr 1fr;
        gap: 25px;
        height: 100%;
      }
      
      .team-main-section {
        display: flex;
        flex-direction: column;
        gap: 15px;
        min-height: 0;
      }
      
      .team-slots-container {
        flex: 1;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 18px;
        padding: 25px;
        border: 2px solid rgba(74, 144, 226, 0.4);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      }
      
      .team-slots-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .team-slots-title {
        font-size: 20px;
        font-weight: 700;
        color: #87ceeb;
        margin: 0;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .team-slots-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 18px;
        height: 100%;
        min-height: 400px;
      }
      
      .team-slot {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
        border: 2px solid rgba(74, 144, 226, 0.4);
        border-radius: 18px;
        padding: 20px 15px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 160px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .team-slot::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, transparent, rgba(74, 144, 226, 0.5), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
        border-radius: 15px;
        z-index: -1;
      }
      
      .team-slot:hover::before {
        opacity: 1;
      }
      
      .team-slot:hover {
        transform: translateY(-4px);
        border-color: #87ceeb;
        box-shadow: 0 12px 30px rgba(74, 144, 226, 0.4);
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(135, 206, 235, 0.08));
      }
      
      .team-slot.selected {
        border-color: #87ceeb;
        background: linear-gradient(145deg, rgba(135, 206, 235, 0.2), rgba(74, 144, 226, 0.1));
        box-shadow: 0 0 20px rgba(135, 206, 235, 0.4);
      }
      
      .team-slot.empty {
        border-style: dashed;
        border-color: rgba(74, 144, 226, 0.5);
        background: rgba(255, 255, 255, 0.03);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      
      .slot-number {
        position: absolute;
        top: 12px;
        left: 15px;
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 2;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
      
      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        opacity: 0.6;
      }
      
      .empty-icon {
        font-size: 30px;
        color: #4a90e2;
        opacity: 0.7;
      }
      
      .empty-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
      }
      
      /* ===== POKEMON CARD MODERNE ===== */
      .pokemon-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
      }
      
      .pokemon-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      
      .pokemon-info {
        flex: 1;
        min-width: 0;
      }
      
      .pokemon-name {
        font-weight: 700;
        color: #ffffff;
        font-size: 14px;
        margin-bottom: 2px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .pokemon-level {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        color: white;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        display: inline-block;
      }
      
      .pokemon-sprite {
        text-align: center;
        margin: 8px 0;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .pokemon-portrait {
        width: 80px;
        height: 80px;
        background-size: cover;
        background-position: center;
        border-radius: 12px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        image-rendering: pixelated;
        transition: all 0.3s ease;
        box-shadow: 0 6px 15px rgba(0,0,0,0.4);
      }
      
      .pokemon-portrait:hover {
        transform: scale(1.05);
        border-color: #87ceeb;
      }
      
      .pokemon-health {
        margin-top: auto;
      }
      
      .health-bar {
        width: 100%;
        height: 8px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
      }
      
      .health-fill {
        height: 100%;
        transition: width 0.5s ease;
        border-radius: 4px;
        position: relative;
      }
      
      .health-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(to bottom, rgba(255,255,255,0.3), transparent);
        border-radius: 4px 4px 0 0;
      }
      
      .health-fill.high { 
        background: linear-gradient(90deg, #2ecc71, #27ae60);
      }
      .health-fill.medium { 
        background: linear-gradient(90deg, #f39c12, #e67e22);
      }
      .health-fill.low { 
        background: linear-gradient(90deg, #e74c3c, #c0392b);
      }
      .health-fill.critical { 
        background: linear-gradient(90deg, #9b59b6, #8e44ad);
        animation: criticalPulse 1s ease-in-out infinite;
      }
      
      @keyframes criticalPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      .health-text {
        font-size: 11px;
        text-align: center;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .pokemon-types {
        display: flex;
        gap: 4px;
        justify-content: center;
        margin-top: 6px;
        flex-wrap: wrap;
      }
      
      .type-badge {
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      /* Types Pokémon */
      .type-badge.type-fire { background: linear-gradient(135deg, #ff6347, #ff4500); }
      .type-badge.type-water { background: linear-gradient(135deg, #1e90ff, #0066cc); }
      .type-badge.type-grass { background: linear-gradient(135deg, #32cd32, #228b22); }
      .type-badge.type-electric { background: linear-gradient(135deg, #ffd700, #ffb347); color: #333; }
      .type-badge.type-psychic { background: linear-gradient(135deg, #ff69b4, #da70d6); }
      .type-badge.type-ice { background: linear-gradient(135deg, #87ceeb, #4682b4); }
      .type-badge.type-dragon { background: linear-gradient(135deg, #9370db, #663399); }
      .type-badge.type-dark { background: linear-gradient(135deg, #2f4f4f, #1c1c1c); }
      .type-badge.type-fairy { background: linear-gradient(135deg, #ffb6c1, #ff69b4); color: #333; }
      .type-badge.type-fighting { background: linear-gradient(135deg, #cd853f, #a0522d); }
      .type-badge.type-poison { background: linear-gradient(135deg, #9932cc, #8a2be2); }
      .type-badge.type-ground { background: linear-gradient(135deg, #daa520, #b8860b); }
      .type-badge.type-flying { background: linear-gradient(135deg, #87ceeb, #6495ed); }
      .type-badge.type-bug { background: linear-gradient(135deg, #9acd32, #7cfc00); }
      .type-badge.type-rock { background: linear-gradient(135deg, #a0522d, #8b4513); }
      .type-badge.type-ghost { background: linear-gradient(135deg, #9370db, #7b68ee); }
      .type-badge.type-steel { background: linear-gradient(135deg, #b0c4de, #778899); color: #333; }
      .type-badge.type-normal { background: linear-gradient(135deg, #d3d3d3, #a9a9a9); color: #333; }
      
      /* ===== TEAM SUMMARY MODERNE ===== */
      .team-summary-section {
        background: linear-gradient(145deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2));
        border-radius: 18px;
        padding: 25px;
        border: 2px solid rgba(74, 144, 226, 0.4);
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      }
      
      .summary-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .summary-header h3 {
        margin: 0;
        color: #87ceeb;
        font-size: 20px;
        font-weight: 700;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .summary-icon {
        font-size: 20px;
      }
      
      .summary-stats {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .stat-item {
        background: rgba(255, 255, 255, 0.12);
        padding: 15px 18px;
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid rgba(74, 144, 226, 0.3);
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      .stat-item:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(74, 144, 226, 0.4);
      }
      
      .stat-label {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
      }
      
      .stat-value {
        font-size: 16px;
        font-weight: bold;
        color: #ffffff;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      }
      
      .type-coverage-section {
        margin-top: auto;
      }
      
      .type-coverage {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      
      .coverage-type {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      /* ===== DETAILS VIEW ===== */
      .team-details {
        padding: 20px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 15px;
        height: 100%;
        overflow-y: auto;
      }
      
      .pokemon-detail-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .no-selection {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.6);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .no-selection-icon {
        font-size: 64px;
        margin-bottom: 20px;
        opacity: 0.5;
        color: #4a90e2;
      }
      
      .pokemon-detail-content {
        display: flex;
        flex-direction: column;
        gap: 25px;
        height: 100%;
      }
      
      .pokemon-detail-header {
        display: flex;
        gap: 25px;
        align-items: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 15px;
        border: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .pokemon-detail-icon .pokemon-portrait {
        width: 96px;
        height: 96px;
        border: 3px solid #4a90e2;
      }
      
      .pokemon-detail-info h3 {
        margin: 0 0 10px 0;
        color: #87ceeb;
        font-size: 24px;
        font-weight: 700;
      }
      
      .pokemon-detail-subtitle {
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 8px;
        font-size: 16px;
      }
      
      .pokemon-detail-nature {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
      }
      
      /* ===== FOOTER MODERNE ===== */
      .team-footer {
        padding: 20px 30px;
        border-top: 2px solid rgba(74, 144, 226, 0.3);
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 22px 22px;
      }
      
      .team-actions {
        display: flex;
        gap: 15px;
      }
      
      .team-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 10px;
        background: linear-gradient(145deg, #4a90e2, #357abd);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.2);
      }
      
      .team-btn:hover {
        background: linear-gradient(145deg, #357abd, #2c5f99);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.4);
      }
      
      .team-btn.secondary {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
      }
      
      .team-btn.secondary:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2));
      }
      
      .btn-icon {
        font-size: 16px;
      }
      
      .team-info {
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        font-style: italic;
      }
      
      /* ===== ANIMATIONS D'APPARITION ===== */
      .team-container {
        animation: teamUIAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      @keyframes teamUIAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(50px) rotateX(10deg);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0) rotateX(0deg);
        }
      }
      
      .team-slot {
        animation: slotAppear 0.4s ease;
        animation-fill-mode: both;
      }
      
      @keyframes slotAppear {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      /* Stagger animation for slots */
      .team-slot:nth-child(1) { animation-delay: 0.1s; }
      .team-slot:nth-child(2) { animation-delay: 0.15s; }
      .team-slot:nth-child(3) { animation-delay: 0.2s; }
      .team-slot:nth-child(4) { animation-delay: 0.25s; }
      .team-slot:nth-child(5) { animation-delay: 0.3s; }
      .team-slot:nth-child(6) { animation-delay: 0.35s; }
      
      /* ===== RESPONSIVE DESIGN ===== */
      @media (max-width: 1200px) {
        .team-overview {
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
        }
        
        .team-container {
          width: 98vw;
          height: 95vh;
        }
      }
      
      @media (max-width: 900px) {
        .team-overview {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .team-slots-grid {
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(3, 1fr);
        }
        
        .team-header {
          padding: 15px 20px;
        }
        
        .team-content {
          padding: 20px;
        }
        
        .team-footer {
          padding: 15px 20px;
          flex-direction: column;
          gap: 15px;
        }
        
        .team-actions {
          justify-content: center;
        }
      }
      
      @media (max-width: 600px) {
        .team-slots-grid {
          grid-template-columns: 1fr;
          grid-template-rows: repeat(6, 1fr);
        }
        
        .team-tabs {
          flex-direction: column;
          padding: 0 15px;
        }
        
        .team-tab {
          padding: 12px 16px;
        }
        
        .team-header {
          flex-direction: column;
          gap: 15px;
          text-align: center;
        }
        
        .team-controls {
          flex-direction: column;
          gap: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamUI] Styles modernes chargés');
  }
  
  // === 🏗️ INTERFACE MODERNE ===
  
  createModernInterface() {
    // Supprimer l'ancienne interface
    const existing = document.querySelector('#team-overlay');
    if (existing) {
      existing.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'team-overlay';
    overlay.className = 'team-overlay hidden';
    
    overlay.innerHTML = `
      <div class="team-container">
        <!-- Header Moderne -->
        <div class="team-header">
          <div class="team-title">
            <div class="team-icon">⚔️</div>
            <div class="team-title-text">
              <h2>Mon Équipe Pokémon</h2>
              <p class="team-subtitle">Gestion complète de votre équipe de combat</p>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats">
              <div class="team-count">0/6</div>
              <div class="team-status">En attente</div>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>
        
        <!-- Tabs Modernes -->
        <div class="team-tabs">
          <button class="team-tab active" data-view="overview">
            <span class="tab-icon">👥</span>
            <span class="tab-text">Vue d'ensemble</span>
          </button>
          <button class="team-tab" data-view="details">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Détails</span>
          </button>
          <button class="team-tab" data-view="moves">
            <span class="tab-icon">⚡</span>
            <span class="tab-text">Attaques</span>
          </button>
        </div>
        
        <!-- Contenu Principal -->
        <div class="team-content">
          <!-- Vue d'ensemble -->
          <div class="team-view team-overview active" id="team-overview">
            <div class="team-main-section">
              <div class="team-slots-container">
                <div class="team-slots-header">
                  <h3 class="team-slots-title">🎯 Équipe de Combat</h3>
                </div>
                <div class="team-slots-grid">
                  ${this.generateModernTeamSlots()}
                </div>
              </div>
            </div>
            
            <div class="team-summary-section">
              <div class="summary-header">
                <span class="summary-icon">📊</span>
                <h3>Statistiques</h3>
              </div>
              
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-label">Niveau Moyen</span>
                  <span class="stat-value" id="avg-level">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">HP Total</span>
                  <span class="stat-value" id="total-hp">0/0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Prêt au Combat</span>
                  <span class="stat-value" id="battle-ready">Non</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Pokémon Vivants</span>
                  <span class="stat-value" id="alive-count">0</span>
                </div>
              </div>
              
              <div class="type-coverage-section">
                <div class="summary-header">
                  <span class="summary-icon">🎯</span>
                  <h3>Couverture Types</h3>
                </div>
                <div class="type-coverage" id="type-coverage">
                  <!-- Types générés dynamiquement -->
                </div>
              </div>
            </div>
          </div>
          
          <!-- Vue Détails -->
          <div class="team-view team-details" id="team-details">
            <div class="pokemon-detail-panel">
              <div class="no-selection">
                <div class="no-selection-icon">⚔️</div>
                <h3>Sélectionnez un Pokémon</h3>
                <p>Cliquez sur un Pokémon dans votre équipe pour voir ses détails complets</p>
              </div>
            </div>
          </div>
          
          <!-- Vue Attaques -->
          <div class="team-view team-moves" id="team-moves">
            <div class="pokemon-detail-panel">
              <div class="no-selection">
                <div class="no-selection-icon">⚡</div>
                <h3>Gestion des Attaques</h3>
                <p>Gérez les attaques de votre équipe Pokémon</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer Moderne -->
        <div class="team-footer">
          <div class="team-actions">
            <button class="team-btn" id="heal-team-btn">
              <span class="btn-icon">💊</span>
              <span class="btn-text">Soigner Tout</span>
            </button>
            <button class="team-btn secondary" id="pc-access-btn">
              <span class="btn-icon">💻</span>
              <span class="btn-text">PC Pokémon</span>
            </button>
            <button class="team-btn secondary" id="auto-arrange-btn">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Réorganiser</span>
            </button>
          </div>
          
          <div class="team-info">
            💡 Double-cliquez sur un Pokémon pour voir ses détails
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [TeamUI] Interface moderne créée');
  }
  
  generateModernTeamSlots() {
    let slotsHTML = '';
    for (let i = 0; i < 6; i++) {
      slotsHTML += `
        <div class="team-slot empty" data-slot="${i}">
          <div class="slot-number">${i + 1}</div>
          <div class="empty-slot">
            <div class="empty-icon">➕</div>
            <div class="empty-text">Slot libre</div>
          </div>
        </div>
      `;
    }
    return slotsHTML;
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.overlayElement) return;
    
    // Fermeture
    this.overlayElement.querySelector('.team-close-btn').addEventListener('click', () => {
      this.hide();
    });
    
    // Fermeture par échap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
    
    // Fermeture en cliquant à l'extérieur
    this.overlayElement.addEventListener('click', (e) => {
      if (e.target === this.overlayElement) {
        this.hide();
      }
    });
    
    // Navigation tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchToView(view);
      });
    });
    
    // Actions footer
    this.overlayElement.querySelector('#heal-team-btn').addEventListener('click', () => {
      this.handleAction('healTeam');
    });
    
    this.overlayElement.querySelector('#pc-access-btn').addEventListener('click', () => {
      this.handleAction('openPC');
    });
    
    this.overlayElement.querySelector('#auto-arrange-btn').addEventListener('click', () => {
      this.handleAction('autoArrange');
    });
    
    // Sélection des slots
    this.setupSlotSelection();
    
    console.log('🎛️ [TeamUI] Événements configurés');
  }
  
  setupSlotSelection() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    
    slotsContainer.addEventListener('click', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.selectPokemon(pokemon, slot, slotIndex);
      } else {
        this.deselectPokemon();
      }
    });
    
    // Double-clic pour voir les détails
    slotsContainer.addEventListener('dblclick', (e) => {
      const slot = e.target.closest('.team-slot');
      if (!slot) return;
      
      const slotIndex = parseInt(slot.dataset.slot);
      const pokemon = this.teamData[slotIndex];
      
      if (pokemon) {
        this.switchToView('details');
        this.selectPokemon(pokemon, slot, slotIndex);
      }
    });
  }
  
  // === 🎛️ CONTRÔLE UI MANAGER ===
  
  show() {
    console.log('👁️ [TeamUI] Affichage interface moderne');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('hidden');
    }
    
    // Demander les données fraîches
    this.requestTeamData();
    
    return true;
  }
  
  hide() {
    console.log('👻 [TeamUI] Masquage interface moderne');
    
    this.isVisible = false;
    
    if (this.overlayElement) {
      this.overlayElement.classList.add('hidden');
    }
    
    // Désélectionner
    this.deselectPokemon();
    
    return true;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  setEnabled(enabled) {
    console.log(`🔧 [TeamUI] setEnabled(${enabled})`);
    
    this.isEnabled = enabled;
    
    if (this.overlayElement) {
      if (enabled) {
        this.overlayElement.style.pointerEvents = 'auto';
        this.overlayElement.style.opacity = '1';
      } else {
        this.overlayElement.style.pointerEvents = 'none';
        this.overlayElement.style.opacity = '0.5';
      }
    }
    
    return true;
  }
  
  // === 📊 GESTION DONNÉES ===
  
  updateTeamData(data) {
    console.log('📊 [TeamUI] Mise à jour données équipe moderne:', data);
    
    this.teamData = Array.isArray(data.team) ? data.team : [];
    
    this.refreshModernDisplay();
    this.updateModernSummary();
    
    if (this.selectedPokemon) {
      // Mettre à jour le Pokémon sélectionné
      const updatedPokemon = this.teamData.find(p => p._id === this.selectedPokemon._id);
      if (updatedPokemon) {
        this.selectedPokemon = updatedPokemon;
        this.updateDetailView();
      }
    }
  }
  
  refreshModernDisplay() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    // Vider la grille
    slotsContainer.innerHTML = '';
    
    // Créer les 6 slots
    for (let i = 0; i < 6; i++) {
      const pokemon = this.teamData[i];
      const slot = this.createModernSlotElement(pokemon, i);
      slotsContainer.appendChild(slot);
    }
    
    console.log('🔄 [TeamUI] Affichage moderne rafraîchi');
  }
  
  createModernSlotElement(pokemon, index) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.slot = index;
    
    if (pokemon) {
      slot.classList.remove('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        ${this.createModernPokemonCardHTML(pokemon)}
      `;
    } else {
      slot.classList.add('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        <div class="empty-slot">
          <div class="empty-icon">➕</div>
          <div class="empty-text">Slot libre</div>
        </div>
      `;
    }
    
    return slot;
  }
  
  createModernPokemonCardHTML(pokemon) {
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    const typesHTML = this.getTypesHTML(pokemon.types);
    
    return `
      <div class="pokemon-card">
        <div class="pokemon-header">
          <div class="pokemon-info">
            <div class="pokemon-name" title="${pokemon.nickname || pokemon.name || 'Pokémon'}">
              ${pokemon.nickname || pokemon.name || `#${pokemon.pokemonId}`}
            </div>
            <div class="pokemon-level">Niv. ${pokemon.level}</div>
          </div>
        </div>
        
        <div class="pokemon-sprite">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
        </div>
        
        <div class="pokemon-health">
          <div class="health-bar">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="health-text">${pokemon.currentHp}/${pokemon.maxHp} HP</div>
        </div>
        
        <div class="pokemon-types">
          ${typesHTML}
        </div>
      </div>
    `;
  }
  
  getPortraitStyle(pokemonId) {
    const url = `/assets/pokemon/portraitanime/${pokemonId}.png`;
    return `background-image: url('${url}'); background-size: cover; background-position: center;`;
  }
  
  getHealthClass(healthPercent) {
    if (healthPercent > 75) return 'high';
    if (healthPercent > 50) return 'medium';
    if (healthPercent > 25) return 'low';
    return 'critical';
  }
  
  getTypesHTML(types) {
    if (!types || !Array.isArray(types)) return '';
    
    return types.map(type => 
      `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
  }
  
  // === 📊 RÉSUMÉ MODERNE ===
  
  updateModernSummary() {
    if (!this.overlayElement) return;
    
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p.currentHp > 0).length;
    const avgLevel = teamCount > 0 ? 
      Math.round(this.teamData.reduce((sum, p) => sum + p.level, 0) / teamCount) : 0;
    const totalCurrentHp = this.teamData.reduce((sum, p) => sum + p.currentHp, 0);
    const totalMaxHp = this.teamData.reduce((sum, p) => sum + p.maxHp, 0);
    const canBattle = aliveCount > 0;
    
    // Header stats
    this.overlayElement.querySelector('.team-count').textContent = `${teamCount}/6`;
    const statusElement = this.overlayElement.querySelector('.team-status');
    statusElement.textContent = canBattle ? 'Prêt au Combat' : 'Non Disponible';
    statusElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Summary stats
    this.overlayElement.querySelector('#avg-level').textContent = avgLevel;
    this.overlayElement.querySelector('#total-hp').textContent = `${totalCurrentHp}/${totalMaxHp}`;
    this.overlayElement.querySelector('#alive-count').textContent = aliveCount;
    
    const battleReadyElement = this.overlayElement.querySelector('#battle-ready');
    battleReadyElement.textContent = canBattle ? 'Oui' : 'Non';
    battleReadyElement.style.color = canBattle ? '#2ecc71' : '#e74c3c';
    
    // Type coverage
    this.updateModernTypeCoverage();
    
    console.log('📊 [TeamUI] Résumé moderne mis à jour');
  }
  
  updateModernTypeCoverage() {
    const coverageContainer = this.overlayElement.querySelector('#type-coverage');
    if (!coverageContainer) return;
    
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    
    if (types.size === 0) {
      coverageContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-style: italic;">Aucune couverture type</div>';
      return;
    }
    
    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    coverageContainer.innerHTML = typesHTML;
  }
  
  // === 🎯 SÉLECTION POKÉMON ===
  
  selectPokemon(pokemon, slotElement, slotIndex) {
    console.log('🎯 [TeamUI] Sélection Pokémon moderne:', pokemon.nickname || pokemon.name);
    
    // Désélectionner l'ancien
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Sélectionner le nouveau
    slotElement.classList.add('selected');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;
    
    // Mettre à jour la vue détaillée
    this.updateDetailView();
  }
  
  deselectPokemon() {
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    this.selectedPokemon = null;
    this.selectedSlot = null;
    
    this.updateDetailView();
  }
  
  updateDetailView() {
    const detailPanel = this.overlayElement.querySelector('.pokemon-detail-panel');
    if (!detailPanel) return;
    
    if (!this.selectedPokemon) {
      detailPanel.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">⚔️</div>
          <h3>Sélectionnez un Pokémon</h3>
          <p>Cliquez sur un Pokémon dans votre équipe pour voir ses détails complets</p>
        </div>
      `;
      return;
    }
    
    const pokemon = this.selectedPokemon;
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    
    detailPanel.innerHTML = `
      <div class="pokemon-detail-content">
        <div class="pokemon-detail-header">
          <div class="pokemon-detail-icon">
            <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
          </div>
          <div class="pokemon-detail-info">
            <h3>${pokemon.nickname || pokemon.name || `#${pokemon.pokemonId}`}</h3>
            <div class="pokemon-detail-subtitle">
              Niveau ${pokemon.level} • ${pokemon.types?.join('/') || 'Type Inconnu'}
            </div>
            <div class="pokemon-detail-nature">Nature: ${pokemon.nature || 'Inconnue'}</div>
          </div>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">💖 Points de Vie</span>
          <span class="stat-value">${pokemon.currentHp} / ${pokemon.maxHp} HP (${Math.round(healthPercent)}%)</span>
        </div>
        
        <div class="health-bar" style="height: 15px; margin: 10px 0;">
          <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
        </div>
        
        <div class="summary-header">
          <span class="summary-icon">⚡</span>
          <h3>Attaques Connues</h3>
        </div>
        
        <div class="summary-stats">
          ${this.getMovesHTML(pokemon.moves)}
        </div>
        
        <div class="team-actions" style="margin-top: 20px;">
          <button class="team-btn" onclick="window.teamUI?.handlePokemonAction('heal', '${pokemon._id}')">
            <span class="btn-icon">💊</span>
            <span class="btn-text">Soigner</span>
          </button>
          <button class="team-btn secondary" onclick="window.teamUI?.handlePokemonAction('remove', '${pokemon._id}')">
            <span class="btn-icon">📦</span>
            <span class="btn-text">Vers PC</span>
          </button>
        </div>
      </div>
    `;
  }
  
  getMovesHTML(moves) {
    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return '<div class="stat-item"><span class="stat-label">Aucune attaque apprise</span><span class="stat-value">-</span></div>';
    }
    
    return moves.slice(0, 4).map(move => {
      const ppPercent = (move.currentPp / move.maxPp) * 100;
      const ppClass = ppPercent > 50 ? 'high' : ppPercent > 25 ? 'medium' : 'low';
      
      return `
        <div class="stat-item">
          <span class="stat-label">${this.formatMoveName(move.moveId || move.name)}</span>
          <span class="stat-value">${move.currentPp}/${move.maxPp} PP</span>
        </div>
      `;
    }).join('');
  }
  
  formatMoveName(moveId) {
    return moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // === 🎮 NAVIGATION VUES ===
  
  switchToView(viewName) {
    console.log(`🎮 [TeamUI] Changement vue moderne: ${viewName}`);
    
    // Mettre à jour les tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    
    // Mettre à jour les vues
    this.overlayElement.querySelectorAll('.team-view').forEach(view => {
      view.classList.toggle('active', view.id === `team-${viewName}`);
    });
    
    this.currentView = viewName;
    
    // Actions spécifiques selon la vue
    if (viewName === 'details' && this.selectedPokemon) {
      this.updateDetailView();
    }
  }
  
  // === 🎬 GESTION ACTIONS ===
  
  handleAction(action, data = null) {
    console.log(`🎬 [TeamUI] Action moderne: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
  }
  
  handlePokemonAction(action, pokemonId) {
    this.handleAction(action, { pokemonId });
  }
  
  requestTeamData() {
    this.handleAction('requestData');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamUI] Destruction interface moderne...');
    
    // Supprimer les événements globaux
    document.removeEventListener('keydown', this.keydownHandler);
    
    // Supprimer l'élément DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    // Reset état
    this.overlayElement = null;
    this.isVisible = false;
    this.teamData = [];
    this.selectedPokemon = null;
    this.onAction = null;
    
    // Supprimer la référence globale
    if (window.teamUI === this) {
      window.teamUI = null;
    }
    
    console.log('✅ [TeamUI] Interface moderne détruite');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      hasElement: !!this.overlayElement,
      elementInDOM: this.overlayElement ? document.contains(this.overlayElement) : false,
      currentView: this.currentView,
      teamCount: this.teamData.length,
      selectedPokemon: this.selectedPokemon ? this.selectedPokemon.nickname || this.selectedPokemon.name : null,
      selectedSlot: this.selectedSlot,
      hasOnAction: !!this.onAction,
      style: 'modern-pokemon'
    };
  }
}

export default TeamUI;

// Exposer globalement pour les boutons onclick
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log(`
🎯 === TEAM UI MODERNE POKÉMON ===

✨ DESIGN MODERNE:
• Interface équilibrée utilisant tout l'espace
• Gradients et effets lumineux Pokémon
• Animations fluides et modernes
• Couleurs bleues harmonisées

🏗️ LAYOUT AMÉLIORÉ:
• Grid 2fr 1fr (plus équilibré)
• Slots Pokémon plus grands et beaux
• Résumé intégré à droite
• Navigation par tabs moderne

🎨 STYLE POKÉMON:
• Effets de glow et shine
• Cartes Pokémon avec portraits
• Types avec couleurs officielles
• Barres de vie stylisées

📱 RESPONSIVE COMPLET:
• Mobile: layout en colonne
• Tablet: layout adaptatif
• Desktop: expérience complète

🎮 FONCTIONNALITÉS:
• Sélection visuelle des Pokémon
• Vue détaillée complète
• Actions contextuelles
• Statistiques en temps réel

🔧 INTÉGRATION:
• Compatible UIManager
• CSS intégré (pas de fichier externe)
• Callbacks vers TeamManager
• API show/hide/setEnabled

✅ INTERFACE MODERNE ET ÉQUILIBRÉE !
`);
