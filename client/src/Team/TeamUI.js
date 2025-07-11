// Team/TeamUI.js - Interface Team COMPLÈTE avec affichage Pokémon
// 🎯 Layout moderne avec affichage correct des données Pokémon

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
    this.currentView = 'overview';
    
    // === CALLBACKS ===
    this.onAction = null;
    
    console.log('🎯 [TeamUI] Instance créée - Interface Pokémon complète');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamUI] Initialisation interface Pokémon...');
      
      await this.loadModernCSS();
      this.createCompleteInterface();
      this.setupEventListeners();
      
      console.log('✅ [TeamUI] Interface Pokémon initialisée');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🎨 CSS MODERNE COMPLET ===
  
  async loadModernCSS() {
    // Supprimer l'ancien style s'il existe
    const existingStyle = document.querySelector('#complete-team-ui-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'complete-team-ui-styles';
    style.textContent = `
      /* ===== RESET ET BASE ===== */
      .team-overlay * {
        box-sizing: border-box;
      }
      
      /* ===== OVERLAY TRANSPARENT ===== */
      .team-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
      }
      
      .team-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      /* ===== CONTAINER PRINCIPAL - TAILLE EXACTE ===== */
      .team-container {
        /* TAILLE EXACTE DEMANDÉE */
        width: 887.33px;
        height: 705.33px;
        min-width: 887.33px;
        max-width: 887.33px;
        min-height: 705.33px;
        max-height: 705.33px;
        background: linear-gradient(145deg, #2a3f5f, #1e2d42);
        border: 3px solid #4a90e2;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        transform: scale(1); /* Pas de scale pour garder la taille exacte */
        transition: transform 0.3s ease;
        overflow: hidden;
        /* ASSURER LE REMPLISSAGE COMPLET */
        box-sizing: border-box;
      }
      
      .team-overlay:not(.hidden) .team-container {
        transform: scale(1); /* Pas de scale pour garder la taille exacte */
      }
      
      /* ===== HEADER FULL WIDTH ===== */
      .team-header {
        background: linear-gradient(90deg, #4a90e2, #357abd);
        padding: 15px 25px; /* Plus de padding horizontal */
        border-radius: 17px 17px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #357abd;
        flex-shrink: 0;
        /* FORCER LA LARGEUR COMPLÈTE */
        width: 100%;
        min-width: 100%;
        box-sizing: border-box;
      }
      
      .team-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        /* PERMETTRE L'EXPANSION */
        flex: 1;
        min-width: 0; /* Permet le shrinking si nécessaire */
      }
      
      .team-icon {
        font-size: 32px;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
      }
      
      .team-title-text h2 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: bold;
      }
      
      .team-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        margin: 2px 0 0 0;
        font-weight: 400;
      }
      
      .team-controls {
        display: flex;
        align-items: center;
        gap: 20px;
        /* EMPÊCHER LE SHRINKING */
        flex-shrink: 0;
      }
      
      .team-stats-header {
        text-align: right;
        background: rgba(255, 255, 255, 0.1);
        padding: 10px 15px;
        border-radius: 10px;
        font-size: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .team-count {
        font-size: 20px;
        font-weight: bold;
        color: #87ceeb;
        display: block;
      }
      
      .team-status {
        font-size: 12px;
        margin-top: 3px;
        font-weight: 600;
      }
      
      .team-close-btn {
        background: rgba(220, 53, 69, 0.9);
        border: 2px solid rgba(220, 53, 69, 0.5);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .team-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        border-color: rgba(220, 53, 69, 0.8);
        transform: scale(1.1);
      }
      
      /* ===== TABS ===== */
      .team-tabs {
        display: flex;
        gap: 0;
        padding: 0;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 2px solid #357abd;
        flex-shrink: 0;
      }
      
      .team-tab {
        flex: 1;
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
        font-size: 15px;
        font-weight: 600;
        border-bottom: 4px solid transparent;
        position: relative;
      }
      
      .team-tab:hover {
        background: rgba(74, 144, 226, 0.15);
        color: #87ceeb;
      }
      
      .team-tab.active {
        background: rgba(74, 144, 226, 0.25);
        color: #87ceeb;
        border-bottom-color: #4a90e2;
      }
      
      .tab-icon {
        font-size: 18px;
        width: 22px;
        text-align: center;
      }
      
      /* ===== CONTENU - FORCER LARGEUR POUR TOUTES LES VUES ===== */
      .team-content {
        flex: 1;
        display: flex;
        overflow: hidden;
        /* FORCER LA LARGEUR COMPLÈTE */
        width: 100%;
        min-width: 100%;
        box-sizing: border-box;
      }
      
      .team-view {
        display: none;
        /* STRUCTURE FLEX IDENTIQUE POUR TOUTES LES VUES */
        flex-direction: column;
        width: 100%;
        min-width: 100%;
        box-sizing: border-box;
      }
      
      .team-view.active {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 100%;
        box-sizing: border-box;
      }
      
      /* ===== LAYOUT OVERVIEW - REMPLISSAGE COMPLET ===== */
      .team-overview-content {
        display: flex;
        width: 100%;
        height: 100%;
        /* AUCUN ESPACE PERDU */
        box-sizing: border-box;
      }
      
      /* Section principale des slots - CALCULÉE POUR REMPLIR */
      .team-slots-section {
        /* LARGEUR CALCULÉE: 887.33px - 250px sidebar = 637.33px */
        width: 637.33px;
        min-width: 637.33px;
        max-width: 637.33px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;
        flex-shrink: 0;
      }
      
      .slots-header {
        padding: 20px 25px 15px 25px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid #357abd;
        flex-shrink: 0;
      }
      
      .slots-title {
        font-size: 18px;
        font-weight: 700;
        color: #87ceeb;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      /* Actions rapides */
      .team-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }
      
      .action-btn {
        padding: 8px 16px;
        background: rgba(74, 144, 226, 0.8);
        border: 1px solid rgba(74, 144, 226, 0.5);
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .action-btn:hover {
        background: rgba(74, 144, 226, 1);
        border-color: rgba(74, 144, 226, 0.8);
        transform: translateY(-2px);
      }
      
      .action-btn.heal {
        background: rgba(40, 167, 69, 0.8);
        border-color: rgba(40, 167, 69, 0.5);
      }
      
      .action-btn.heal:hover {
        background: rgba(40, 167, 69, 1);
        border-color: rgba(40, 167, 69, 0.8);
      }
      
      /* Grille des slots Pokémon - AJUSTÉE POUR LA NOUVELLE LARGEUR */
      .team-slots-grid {
        flex: 1;
        padding: 20px; /* Réduit de 25px à 20px */
        overflow-y: auto;
        display: grid;
        /* AJUSTÉ POUR 637.33px - 40px padding = ~597px disponible */
        /* 597px ÷ 3 = 199px par colonne */
        grid-template-columns: repeat(3, 199px);
        gap: 15px; /* Réduit de 20px à 15px */
        align-content: start;
        justify-content: center;
        width: 100%;
        box-sizing: border-box;
      }
      
      /* Slot Pokémon - AJUSTÉ POUR LA NOUVELLE GRILLE */
      .team-slot {
        background: rgba(255, 255, 255, 0.08);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 15px 12px; /* Légèrement réduit */
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        /* AJUSTÉ POUR LA GRILLE 199px */
        width: 170px;
        height: 170px;
        min-width: 170px;
        max-width: 170px;
        min-height: 170px;
        max-height: 170px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        backdrop-filter: blur(5px);
        flex-shrink: 0;
        margin: 0 auto; /* Centrer dans la cellule de grille */
      }
      
      .team-slot:hover {
        background: rgba(74, 144, 226, 0.2);
        border-color: #4a90e2;
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(74, 144, 226, 0.4);
      }
      
      .team-slot.selected {
        background: rgba(74, 144, 226, 0.35);
        border-color: #87ceeb;
        box-shadow: 0 0 25px rgba(74, 144, 226, 0.7);
        transform: translateY(-3px);
      }
      
      .team-slot.empty {
        border-style: dashed;
        background: rgba(255, 255, 255, 0.04);
        /* MÊME TAILLE EXACTE QUE LES SLOTS PLEINS */
        display: flex;
        align-items: center;
        justify-content: center;
        width: 170px;
        height: 170px;
        min-width: 170px;
        max-width: 170px;
        min-height: 170px;
        max-height: 170px;
        flex-shrink: 0;
        margin: 0 auto;
      }
      
      /* Numéro du slot */
      .slot-number {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(74, 144, 226, 0.9);
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }
      
      /* Slot vide */
      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        opacity: 0.6;
        height: 100%;
      }
      
      .empty-icon {
        font-size: 28px;
        color: #4a90e2;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
      }
      
      .empty-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
        font-weight: 500;
      }
      
      /* ===== POKEMON CARD - AJUSTÉE POUR SLOT 170px ===== */
      .pokemon-card {
        /* HAUTEUR EXACTE POUR CORRESPONDRE AU SLOT AJUSTÉ */
        height: 140px; /* 170px slot - 30px padding = 140px */
        display: flex;
        flex-direction: column;
        gap: 6px; /* Réduit légèrement */
        justify-content: space-between;
      }
      
      .pokemon-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 15px;
        gap: 5px;
      }
      
      .pokemon-name {
        font-weight: 700;
        color: #ffffff;
        font-size: 14px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        max-width: 100px;
        text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
        flex: 1;
      }
      
      .pokemon-level {
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        padding: 4px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 3px 10px rgba(74, 144, 226, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        flex-shrink: 0;
      }
      
      .pokemon-sprite {
        text-align: center;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 8px 0;
      }
      
      .pokemon-portrait {
        width: 64px;
        height: 64px;
        background-size: cover;
        background-position: center;
        border-radius: 12px;
        border: 3px solid rgba(255, 255, 255, 0.4);
        image-rendering: pixelated;
        box-shadow: 0 6px 15px rgba(0,0,0,0.4);
        transition: all 0.3s ease;
        position: relative;
      }
      
      .team-slot:hover .pokemon-portrait {
        transform: scale(1.08);
        border-color: rgba(74, 144, 226, 0.7);
        box-shadow: 0 8px 25px rgba(74, 144, 226, 0.5);
      }
      
      /* Status Pokémon */
      .pokemon-status {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        background: #28a745;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      
      .pokemon-status.fainted {
        background: #dc3545;
      }
      
      .pokemon-status.status {
        background: #ffc107;
      }
      
      .pokemon-health {
        margin-top: auto;
      }
      
      .health-bar {
        width: 100%;
        height: 6px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 5px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .health-fill {
        height: 100%;
        transition: width 0.5s ease;
        border-radius: 3px;
        position: relative;
      }
      
      .health-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: healthShine 2s infinite;
      }
      
      @keyframes healthShine {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
      
      .health-fill.high { 
        background: linear-gradient(90deg, #28a745, #20c997);
      }
      .health-fill.medium { 
        background: linear-gradient(90deg, #ffc107, #fd7e14);
      }
      .health-fill.low { 
        background: linear-gradient(90deg, #fd7e14, #dc3545);
      }
      .health-fill.critical { 
        background: linear-gradient(90deg, #dc3545, #6f42c1);
        animation: healthCritical 0.5s infinite alternate;
      }
      
      @keyframes healthCritical {
        from { opacity: 0.7; }
        to { opacity: 1; }
      }
      
      .health-text {
        font-size: 10px;
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
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.3);
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
      
      /* Types Pokémon avec gradients */
      .type-badge.type-fire { background: linear-gradient(135deg, #ff6347, #ff4500); }
      .type-badge.type-water { background: linear-gradient(135deg, #1e90ff, #0066cc); }
      .type-badge.type-grass { background: linear-gradient(135deg, #32cd32, #228b22); }
      .type-badge.type-electric { background: linear-gradient(135deg, #ffd700, #ffb347); color: #333; }
      .type-badge.type-psychic { background: linear-gradient(135deg, #ff69b4, #da70d6); }
      .type-badge.type-ice { background: linear-gradient(135deg, #87ceeb, #4682b4); }
      .type-badge.type-dragon { background: linear-gradient(135deg, #9370db, #663399); }
      .type-badge.type-dark { background: linear-gradient(135deg, #2f4f4f, #1c1c1c); }
      .type-badge.type-fairy { background: linear-gradient(135deg, #ffb6c1, #ff69b4); color: #333; }
      .type-badge.type-normal { background: linear-gradient(135deg, #d3d3d3, #a9a9a9); color: #333; }
      .type-badge.type-fighting { background: linear-gradient(135deg, #cd853f, #8b4513); }
      .type-badge.type-poison { background: linear-gradient(135deg, #9932cc, #663399); }
      .type-badge.type-ground { background: linear-gradient(135deg, #daa520, #b8860b); color: #333; }
      .type-badge.type-flying { background: linear-gradient(135deg, #87ceeb, #6495ed); }
      .type-badge.type-bug { background: linear-gradient(135deg, #9acd32, #6b8e23); }
      .type-badge.type-rock { background: linear-gradient(135deg, #a0522d, #8b4513); }
      .type-badge.type-ghost { background: linear-gradient(135deg, #9370db, #483d8b); }
      .type-badge.type-steel { background: linear-gradient(135deg, #b0c4de, #778899); color: #333; }
      
      /* ===== SIDEBAR - LARGEUR EXACTE POUR REMPLIR ===== */
      .team-sidebar {
        /* LARGEUR EXACTE: 887.33px - 637.33px = 250px */
        width: 250px;
        min-width: 250px;
        max-width: 250px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 2px solid #357abd;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        box-sizing: border-box;
        flex-shrink: 0;
      }
      
      /* Section stats */
      .stats-section {
        background: rgba(0, 0, 0, 0.2);
        margin: 15px;
        border-radius: 10px;
        padding: 18px;
        border: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #87ceeb;
        margin: 0;
      }
      
      .section-icon {
        font-size: 18px;
        color: #4a90e2;
      }
      
      /* Stats individuelles */
      .stat-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        border: 1px solid rgba(74, 144, 226, 0.2);
        transition: all 0.3s ease;
      }
      
      .stat-item:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(74, 144, 226, 0.4);
      }
      
      .stat-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
      }
      
      .stat-value {
        font-size: 13px;
        font-weight: bold;
        color: #ffffff;
      }
      
      /* Couverture des types */
      .type-coverage {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      
      .coverage-type {
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      
      /* ===== VUE DÉTAILS - LARGEUR COMPLÈTE ===== */
      .team-details-content {
        border-top: 2px solid #357abd;
        background: rgba(0, 0, 0, 0.2);
        padding: 25px;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        /* FORCER LA LARGEUR COMPLÈTE */
        width: 100%;
        min-width: 100%;
        box-sizing: border-box;
        flex: 1; /* Prendre tout l'espace disponible en hauteur */
      }
      
      .no-selection {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #888;
        text-align: center;
        /* UTILISER TOUTE LA LARGEUR DISPONIBLE */
        width: 100%;
        min-height: 400px; /* Hauteur minimale pour bien centrer */
      }
      
      .no-selection-icon {
        font-size: 64px; /* Augmenté pour la plus grande surface */
        margin-bottom: 20px;
        opacity: 0.5;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
      }
      
      .no-selection h3 {
        font-size: 24px; /* Augmenté */
        margin: 12px 0;
        color: #ccc;
      }
      
      .no-selection p {
        font-size: 16px; /* Augmenté */
        margin: 0;
        opacity: 0.8;
        max-width: 400px; /* Largeur maximale pour la lisibilité */
      }
      
      /* ===== DÉTAILS POKÉMON - OPTIMISÉS POUR LARGEUR COMPLÈTE ===== */
      .pokemon-details {
        width: 100%;
        max-width: 800px; /* Augmenté pour utiliser plus d'espace */
        margin: 0 auto;
      }
      
      .pokemon-details-header {
        text-align: center;
        margin-bottom: 30px;
        padding: 25px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 15px;
        border: 1px solid rgba(74, 144, 226, 0.3);
      }
      
      .pokemon-details-portrait {
        width: 140px;
        height: 140px;
        margin: 0 auto 25px;
        border: 4px solid #4a90e2;
        border-radius: 15px;
        background-size: cover;
        background-position: center;
        image-rendering: pixelated;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
      }
      
      .pokemon-details-name {
        margin: 0 0 10px 0;
        color: #87ceeb;
        font-size: 28px;
        font-weight: bold;
      }
      
      .pokemon-details-info {
        color: rgba(255,255,255,0.9);
        font-size: 16px;
        margin: 0;
        font-weight: 500;
      }
      
      .pokemon-details-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 25px;
      }
      
      .pokemon-stat-group {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(74, 144, 226, 0.2);
      }
      
      .pokemon-stat-group h4 {
        margin: 0 0 15px 0;
        color: #87ceeb;
        font-size: 16px;
        font-weight: 600;
        text-transform: uppercase;
        border-bottom: 2px solid rgba(74, 144, 226, 0.3);
        padding-bottom: 8px;
      }
      
      /* ===== SCROLLBAR CUSTOM ===== */
      .team-slots-grid::-webkit-scrollbar,
      .team-sidebar::-webkit-scrollbar,
      .team-details-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .team-slots-grid::-webkit-scrollbar-track,
      .team-sidebar::-webkit-scrollbar-track,
      .team-details-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      
      .team-slots-grid::-webkit-scrollbar-thumb,
      .team-sidebar::-webkit-scrollbar-thumb,
      .team-details-content::-webkit-scrollbar-thumb {
        background: rgba(74, 144, 226, 0.6);
        border-radius: 4px;
      }
      
      .team-slots-grid::-webkit-scrollbar-thumb:hover,
      .team-sidebar::-webkit-scrollbar-thumb:hover,
      .team-details-content::-webkit-scrollbar-thumb:hover {
        background: rgba(74, 144, 226, 0.8);
      }
      
      /* ===== RESPONSIVE ===== */
      @media (max-width: 768px) {
        .team-container {
          width: 95%;
          height: 90%;
        }
        
        .team-overview-content {
          flex-direction: column;
        }
        
        .team-sidebar {
          width: 100%;
          order: 2;
          border-left: none;
          border-top: 2px solid #357abd;
          max-height: 200px;
        }
        
        .team-slots-grid {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          padding: 20px;
        }
        
        .team-slot {
          /* TAILLE FIXE MOBILE - LARGEUR ET HAUTEUR */
          width: 140px;
          height: 140px;
          min-width: 140px;
          max-width: 140px;
          min-height: 140px;
          max-height: 140px;
          padding: 15px 10px;
          flex-shrink: 0;
        }
        
        .pokemon-portrait {
          width: 48px;
          height: 48px;
        }
        
        .pokemon-card {
          /* HAUTEUR AJUSTÉE MOBILE */
          height: 110px; /* 140px slot - 30px padding = 110px */
        }
      }
      
      /* ===== ANIMATIONS ===== */
      @keyframes itemAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .team-slot.new {
        animation: itemAppear 0.5s ease;
      }
      
      @keyframes teamFullGlow {
        0%, 100% { 
          box-shadow: 0 10px 30px rgba(74, 144, 226, 0.4); 
        }
        50% { 
          box-shadow: 0 10px 40px rgba(74, 144, 226, 0.8); 
        }
      }
      
      .team-container.team-full {
        animation: teamFullGlow 1.5s ease;
      }
      
      @keyframes pokemonUpdate {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .pokemon-card.updated {
        animation: pokemonUpdate 0.6s ease;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [TeamUI] CSS complet chargé');
  }
  
  // === 🏗️ INTERFACE COMPLÈTE ===
  
  createCompleteInterface() {
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
        <!-- Header -->
        <div class="team-header">
          <div class="team-title">
            <div class="team-icon">⚔️</div>
            <div class="team-title-text">
              <h2>Mon Équipe Pokémon</h2>
              <p class="team-subtitle">Gestion complète de votre équipe de combat</p>
            </div>
          </div>
          <div class="team-controls">
            <div class="team-stats-header">
              <div class="team-count">0/6</div>
              <div class="team-status">En attente</div>
            </div>
            <button class="team-close-btn">✕</button>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="team-tabs">
          <button class="team-tab active" data-view="overview">
            <span class="tab-icon">👥</span>
            <span class="tab-text">Vue d'ensemble</span>
          </button>
          <button class="team-tab" data-view="details">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Détails</span>
          </button>
        </div>
        
        <!-- Contenu -->
        <div class="team-content">
          <!-- Vue d'ensemble -->
          <div class="team-view active" id="team-overview">
            <div class="team-overview-content">
              <!-- Section des slots Pokemon -->
              <div class="team-slots-section">
                <div class="slots-header">
                  <h3 class="slots-title">
                    <span>⚔️</span>
                    <span>Équipe de Combat</span>
                  </h3>
                  <div class="team-actions">
                    <button class="action-btn heal" id="heal-team-btn">
                      💊 Soigner l'équipe
                    </button>
                    <button class="action-btn" id="organize-team-btn">
                      🔄 Organiser
                    </button>
                  </div>
                </div>
                <div class="team-slots-grid">
                  ${this.generateCompleteSlots()}
                </div>
              </div>
              
              <!-- Sidebar avec statistiques -->
              <div class="team-sidebar">
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">📊</span>
                    <h4 class="section-title">Statistiques</h4>
                  </div>
                  <div class="stat-list">
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
                    <div class="stat-item">
                      <span class="stat-label">Équipe Complète</span>
                      <span class="stat-value" id="team-complete">Non</span>
                    </div>
                  </div>
                </div>
                
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">🎯</span>
                    <h4 class="section-title">Couverture Types</h4>
                  </div>
                  <div class="type-coverage" id="type-coverage">
                    <!-- Types générés dynamiquement -->
                  </div>
                </div>
                
                <div class="stats-section">
                  <div class="section-header">
                    <span class="section-icon">⚡</span>
                    <h4 class="section-title">Actions Rapides</h4>
                  </div>
                  <div class="stat-list">
                    <button class="stat-item" style="cursor: pointer; border: none; background: inherit;" id="refresh-team-btn">
                      <span class="stat-label">🔄 Actualiser</span>
                      <span class="stat-value">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Vue Détails -->
          <div class="team-view" id="team-details">
            <div class="team-details-content">
              <div class="no-selection">
                <div class="no-selection-icon">📊</div>
                <h3>Détails Pokémon</h3>
                <p>Sélectionnez un Pokémon pour voir ses détails complets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    
    console.log('🎨 [TeamUI] Interface complète créée');
  }
  
  generateCompleteSlots() {
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
  
  // === 🎛️ SETUP ÉVÉNEMENTS ===
  
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
    
    // Navigation tabs
    this.overlayElement.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.switchToView(view);
      });
    });
    
    // Actions équipe
    const healTeamBtn = this.overlayElement.querySelector('#heal-team-btn');
    if (healTeamBtn) {
      healTeamBtn.addEventListener('click', () => {
        this.handleAction('healTeam');
      });
    }
    
    const organizeTeamBtn = this.overlayElement.querySelector('#organize-team-btn');
    if (organizeTeamBtn) {
      organizeTeamBtn.addEventListener('click', () => {
        this.handleAction('organizeTeam');
      });
    }
    
    const refreshTeamBtn = this.overlayElement.querySelector('#refresh-team-btn');
    if (refreshTeamBtn) {
      refreshTeamBtn.addEventListener('click', () => {
        this.handleAction('requestData');
      });
    }
    
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
    console.log('👁️ [TeamUI] Affichage interface complète');
    
    this.isVisible = true;
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('hidden');
    }
    
    // Demander les données fraîches
    this.requestTeamData();
    
    return true;
  }
  
  hide() {
    console.log('👻 [TeamUI] Masquage interface');
    
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
  
  // === 📊 GESTION DONNÉES POKÉMON ===
  
  updateTeamData(data) {
    console.log('📊 [TeamUI] === MISE À JOUR DONNÉES ÉQUIPE ===');
    console.log('📊 Data reçue:', data);
    
    // Extraire les données d'équipe selon le format
    if (data && Array.isArray(data.team)) {
      this.teamData = data.team;
    } else if (data && Array.isArray(data)) {
      this.teamData = data;
    } else if (data && data.pokemon && Array.isArray(data.pokemon)) {
      this.teamData = data.pokemon;
    } else {
      console.warn('⚠️ [TeamUI] Format de données non reconnu:', data);
      this.teamData = [];
    }
    
    console.log('📊 [TeamUI] Équipe parsée:', {
      count: this.teamData.length,
      pokemon: this.teamData.map(p => ({
        name: p?.nickname || p?.name || 'Unknown',
        level: p?.level || '?',
        hp: `${p?.currentHp || 0}/${p?.maxHp || 0}`,
        types: p?.types || []
      }))
    });
    
    this.refreshCompleteDisplay();
    this.updateCompleteStats();
    
    // Mettre à jour le Pokémon sélectionné si nécessaire
    if (this.selectedPokemon) {
      const updatedPokemon = this.teamData.find(p => p._id === this.selectedPokemon._id);
      if (updatedPokemon) {
        this.selectedPokemon = updatedPokemon;
        this.updateDetailView();
      }
    }
  }
  
  refreshCompleteDisplay() {
    const slotsContainer = this.overlayElement.querySelector('.team-slots-grid');
    if (!slotsContainer) return;
    
    console.log('🔄 [TeamUI] Rafraîchissement affichage complet...');
    
    // Vider la grille
    slotsContainer.innerHTML = '';
    
    // Créer les 6 slots avec les données
    for (let i = 0; i < 6; i++) {
      const pokemon = this.teamData[i];
      const slot = this.createCompleteSlotElement(pokemon, i);
      slotsContainer.appendChild(slot);
      
      // Animation d'apparition
      setTimeout(() => {
        slot.classList.add('new');
        setTimeout(() => {
          slot.classList.remove('new');
        }, 500);
      }, i * 100);
    }
    
    // Marquer équipe complète si applicable
    if (this.teamData.length === 6) {
      this.overlayElement.querySelector('.team-container').classList.add('team-full');
      setTimeout(() => {
        this.overlayElement.querySelector('.team-container').classList.remove('team-full');
      }, 1500);
    }
    
    console.log('✅ [TeamUI] Affichage rafraîchi');
  }
  
  createCompleteSlotElement(pokemon, index) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.slot = index;
    
    if (pokemon) {
      slot.classList.remove('empty');
      slot.innerHTML = `
        <div class="slot-number">${index + 1}</div>
        ${this.createCompletePokemonCardHTML(pokemon)}
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
  
  createCompletePokemonCardHTML(pokemon) {
    console.log('🎨 [TeamUI] Création carte Pokémon:', pokemon);
    
    // Calculs de santé
    const currentHp = pokemon.currentHp || 0;
    const maxHp = pokemon.maxHp || 1;
    const healthPercent = (currentHp / maxHp) * 100;
    const healthClass = this.getHealthClass(healthPercent);
    
    // Types
    const typesHTML = this.getTypesHTML(pokemon.types);
    
    // Nom d'affichage
    const displayName = pokemon.nickname || pokemon.name || `Pokémon #${pokemon.pokemonId || '?'}`;
    
    // Level
    const level = pokemon.level || 1;
    
    // Status
    const isFainted = currentHp === 0;
    const hasStatus = pokemon.status && pokemon.status !== 'normal' && pokemon.status !== 'none';
    
    return `
      <div class="pokemon-card">
        <div class="pokemon-header">
          <div class="pokemon-name" title="${displayName}">
            ${displayName}
          </div>
          <div class="pokemon-level">Niv. ${level}</div>
        </div>
        
        <div class="pokemon-sprite">
          <div class="pokemon-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}">
            <div class="pokemon-status ${isFainted ? 'fainted' : hasStatus ? 'status' : ''}"></div>
          </div>
        </div>
        
        <div class="pokemon-health">
          <div class="health-bar">
            <div class="health-fill ${healthClass}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="health-text">${currentHp}/${maxHp} HP</div>
        </div>
        
        <div class="pokemon-types">
          ${typesHTML}
        </div>
      </div>
    `;
  }
  
getPortraitStyle(pokemonId) {
  if (!pokemonId) {
    return `
      background: linear-gradient(45deg, #ccc, #999); 
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
    `;
  }
  
  const url = `/assets/pokemon/portraitanime/${pokemonId}.png`;
  
  // ✅ AFFICHER SEULEMENT LA PREMIÈRE FRAME
  return `
    background-image: url('${url}');
    background-size: auto 100%;
    background-position: 0px 0px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
  `;
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
  
  // === 📊 STATISTIQUES COMPLÈTES ===
  
  updateCompleteStats() {
    if (!this.overlayElement) return;
    
    console.log('📊 [TeamUI] Mise à jour statistiques complètes...');
    
    const teamCount = this.teamData.length;
    const aliveCount = this.teamData.filter(p => p && p.currentHp > 0).length;
    const avgLevel = teamCount > 0 ? 
      Math.round(this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0) / teamCount) : 0;
    const totalCurrentHp = this.teamData.reduce((sum, p) => sum + (p?.currentHp || 0), 0);
    const totalMaxHp = this.teamData.reduce((sum, p) => sum + (p?.maxHp || 0), 0);
    const canBattle = aliveCount > 0;
    const isComplete = teamCount === 6;
    
    // Header stats
    const teamCountElement = this.overlayElement.querySelector('.team-count');
    if (teamCountElement) {
      teamCountElement.textContent = `${teamCount}/6`;
    }
    
    const statusElement = this.overlayElement.querySelector('.team-status');
    if (statusElement) {
      statusElement.textContent = canBattle ? 'Prêt au Combat' : 'Non Prêt';
      statusElement.style.color = canBattle ? '#28a745' : '#dc3545';
    }
    
    // Stats détaillées
    const elements = {
      'avg-level': avgLevel,
      'total-hp': `${totalCurrentHp}/${totalMaxHp}`,
      'alive-count': aliveCount,
      'team-complete': isComplete ? 'Oui' : 'Non'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = this.overlayElement.querySelector(`#${id}`);
      if (element) {
        element.textContent = value;
        
        // Couleurs conditionnelles
        if (id === 'battle-ready') {
          element.style.color = canBattle ? '#28a745' : '#dc3545';
        } else if (id === 'team-complete') {
          element.style.color = isComplete ? '#28a745' : '#ffc107';
        }
      }
    });
    
    const battleReadyElement = this.overlayElement.querySelector('#battle-ready');
    if (battleReadyElement) {
      battleReadyElement.textContent = canBattle ? 'Oui' : 'Non';
      battleReadyElement.style.color = canBattle ? '#28a745' : '#dc3545';
    }
    
    // Type coverage
    this.updateCompleteTypeCoverage();
    
    console.log('✅ [TeamUI] Statistiques mises à jour');
  }
  
  updateCompleteTypeCoverage() {
    const coverageContainer = this.overlayElement.querySelector('#type-coverage');
    if (!coverageContainer) return;
    
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types && Array.isArray(pokemon.types)) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    
    if (types.size === 0) {
      coverageContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-style: italic; text-align: center;">Aucun type</div>';
      return;
    }
    
    const typesHTML = Array.from(types).map(type => 
      `<span class="coverage-type type-badge type-${type.toLowerCase()}">${type}</span>`
    ).join('');
    
    coverageContainer.innerHTML = typesHTML;
  }
  
  // === 🎯 SÉLECTION POKÉMON ===
  
  selectPokemon(pokemon, slotElement, slotIndex) {
    console.log('🎯 [TeamUI] Sélection Pokémon:', pokemon.nickname || pokemon.name);
    
    // Désélectionner l'ancien
    this.overlayElement.querySelectorAll('.team-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Sélectionner le nouveau
    slotElement.classList.add('selected');
    
    this.selectedPokemon = pokemon;
    this.selectedSlot = slotIndex;
    
    // Animation de sélection
    slotElement.querySelector('.pokemon-card')?.classList.add('updated');
    setTimeout(() => {
      slotElement.querySelector('.pokemon-card')?.classList.remove('updated');
    }, 600);
    
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
    const detailsContent = this.overlayElement.querySelector('.team-details-content');
    if (!detailsContent) return;
    
    if (!this.selectedPokemon) {
      detailsContent.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">📊</div>
          <h3>Détails Pokémon</h3>
          <p>Sélectionnez un Pokémon pour voir ses détails complets</p>
        </div>
      `;
      return;
    }
    
    const pokemon = this.selectedPokemon;
    const healthPercent = (pokemon.currentHp / pokemon.maxHp) * 100;
    const displayName = pokemon.nickname || pokemon.name || `Pokémon #${pokemon.pokemonId}`;
    const typesText = pokemon.types ? pokemon.types.join(' / ') : 'Type Inconnu';
    
    detailsContent.innerHTML = `
      <div class="pokemon-details">
        <div class="pokemon-details-header">
          <div class="pokemon-details-portrait" style="${this.getPortraitStyle(pokemon.pokemonId)}"></div>
          <h2 class="pokemon-details-name">${displayName}</h2>
          <p class="pokemon-details-info">Niveau ${pokemon.level} • ${typesText}</p>
        </div>
        
        <div class="pokemon-details-stats">
          <div class="pokemon-stat-group">
            <h4>Informations Générales</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">Points de Vie</span>
                <span class="stat-value">${pokemon.currentHp}/${pokemon.maxHp} (${Math.round(healthPercent)}%)</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Niveau</span>
                <span class="stat-value">${pokemon.level}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Expérience</span>
                <span class="stat-value">${pokemon.experience || 0} XP</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Nature</span>
                <span class="stat-value">${pokemon.nature || 'Inconnue'}</span>
              </div>
            </div>
          </div>
          
          <div class="pokemon-stat-group">
            <h4>État et Statut</h4>
            <div class="stat-list">
              <div class="stat-item">
                <span class="stat-label">Statut</span>
                <span class="stat-value">${pokemon.status || 'Normal'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Peut Combattre</span>
                <span class="stat-value" style="color: ${pokemon.currentHp > 0 ? '#28a745' : '#dc3545'}">${pokemon.currentHp > 0 ? 'Oui' : 'Non'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Position</span>
                <span class="stat-value">Slot ${(this.selectedSlot || 0) + 1}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0;">
            Double-cliquez sur un Pokémon dans la vue d'ensemble pour voir ses détails
          </p>
        </div>
      </div>
    `;
  }
  
  // === 🎮 NAVIGATION VUES ===
  
  switchToView(viewName) {
    console.log(`🎮 [TeamUI] Changement vue: ${viewName}`);
    
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
    console.log(`🎬 [TeamUI] Action: ${action}`, data);
    
    if (this.onAction) {
      this.onAction(action, data);
    }
    
    // Feedback visuel
    this.showActionFeedback(action);
  }
  
  showActionFeedback(action) {
    let message = '';
    let type = 'info';
    
    switch (action) {
      case 'healTeam':
        message = 'Équipe en cours de soin...';
        type = 'success';
        break;
      case 'organizeTeam':
        message = 'Organisation de l\'équipe...';
        type = 'info';
        break;
      case 'requestData':
        message = 'Actualisation des données...';
        type = 'info';
        break;
      default:
        message = `Action ${action} en cours...`;
    }
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  requestTeamData() {
    this.handleAction('requestData');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamUI] Destruction interface complète...');
    
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
    
    console.log('✅ [TeamUI] Interface complète détruite');
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
      style: 'complete-modern-design',
      teamData: this.teamData.map(p => ({
        name: p?.nickname || p?.name || 'Unknown',
        level: p?.level || '?',
        hp: `${p?.currentHp || 0}/${p?.maxHp || 0}`,
        types: p?.types || []
      }))
    };
  }
  
  // === 🔧 MÉTHODES UTILITAIRES ===
  
  getPokemonCount() {
    return this.teamData.length;
  }
  
  getAliveCount() {
    return this.teamData.filter(p => p && p.currentHp > 0).length;
  }
  
  getFaintedCount() {
    return this.teamData.filter(p => p && p.currentHp === 0).length;
  }
  
  getAverageLevel() {
    if (this.teamData.length === 0) return 0;
    return Math.round(this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0) / this.teamData.length);
  }
  
  getTotalHP() {
    return this.teamData.reduce((sum, p) => sum + (p?.currentHp || 0), 0);
  }
  
  getMaxHP() {
    return this.teamData.reduce((sum, p) => sum + (p?.maxHp || 0), 0);
  }
  
  getHealthPercentage() {
    const total = this.getTotalHP();
    const max = this.getMaxHP();
    return max > 0 ? Math.round((total / max) * 100) : 0;
  }
  
  canBattle() {
    return this.getAliveCount() > 0;
  }
  
  isTeamFull() {
    return this.teamData.length >= 6;
  }
  
  needsHealing() {
    return this.teamData.some(p => p && p.currentHp < p.maxHp);
  }
  
  hasStatusConditions() {
    return this.teamData.some(p => p && p.status && p.status !== 'normal' && p.status !== 'none');
  }
  
  getTypeCoverage() {
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types && Array.isArray(pokemon.types)) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    return Array.from(types);
  }
  
  // === 🎮 MÉTHODES PUBLIQUES POUR L'INTERACTION ===
  
  selectSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 6) return false;
    
    const slot = this.overlayElement.querySelector(`[data-slot="${slotIndex}"]`);
    const pokemon = this.teamData[slotIndex];
    
    if (slot && pokemon) {
      this.selectPokemon(pokemon, slot, slotIndex);
      return true;
    }
    
    return false;
  }
  
  healPokemon(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 6) return false;
    
    const pokemon = this.teamData[slotIndex];
    if (!pokemon) return false;
    
    this.handleAction('healPokemon', { pokemonId: pokemon._id, slotIndex });
    return true;
  }
  
  swapPokemon(fromSlot, toSlot) {
    if (fromSlot < 0 || fromSlot >= 6 || toSlot < 0 || toSlot >= 6) return false;
    if (fromSlot === toSlot) return false;
    
    this.handleAction('swapPokemon', { fromSlot, toSlot });
    return true;
  }
  
  removePokemon(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 6) return false;
    
    const pokemon = this.teamData[slotIndex];
    if (!pokemon) return false;
    
    this.handleAction('removePokemon', { pokemonId: pokemon._id, slotIndex });
    return true;
  }
  
  // === 📊 MÉTHODES D'ANALYSE ===
  
  getTeamAnalysis() {
    return {
      basic: {
        count: this.getPokemonCount(),
        aliveCount: this.getAliveCount(),
        faintedCount: this.getFaintedCount(),
        averageLevel: this.getAverageLevel(),
        healthPercentage: this.getHealthPercentage()
      },
      battle: {
        canBattle: this.canBattle(),
        isComplete: this.isTeamFull(),
        needsHealing: this.needsHealing(),
        hasStatusConditions: this.hasStatusConditions()
      },
      types: {
        coverage: this.getTypeCoverage(),
        coverageCount: this.getTypeCoverage().length,
        duplicateTypes: this.findDuplicateTypes()
      },
      recommendations: this.getRecommendations()
    };
  }
  
  findDuplicateTypes() {
    const typeCount = {};
    this.teamData.forEach(pokemon => {
      if (pokemon.types && Array.isArray(pokemon.types)) {
        pokemon.types.forEach(type => {
          typeCount[type] = (typeCount[type] || 0) + 1;
        });
      }
    });
    
    return Object.entries(typeCount)
      .filter(([type, count]) => count > 1)
      .map(([type, count]) => ({ type, count }));
  }
  
  getRecommendations() {
    const recommendations = [];
    
    if (this.getFaintedCount() > 0) {
      recommendations.push({
        type: 'healing',
        priority: 'high',
        message: `${this.getFaintedCount()} Pokémon K.O. - Utilisez un Centre Pokémon`
      });
    }
    
    if (this.needsHealing() && this.getFaintedCount() === 0) {
      recommendations.push({
        type: 'healing',
        priority: 'medium',
        message: 'Certains Pokémon sont blessés - Soignez votre équipe'
      });
    }
    
    if (!this.isTeamFull()) {
      recommendations.push({
        type: 'team',
        priority: 'medium',
        message: `Équipe incomplète (${this.getPokemonCount()}/6) - Capturez plus de Pokémon`
      });
    }
    
    const typeCoverage = this.getTypeCoverage();
    if (typeCoverage.length < 4) {
      recommendations.push({
        type: 'strategy',
        priority: 'low',
        message: 'Couverture de types limitée - Diversifiez votre équipe'
      });
    }
    
    if (this.hasStatusConditions()) {
      recommendations.push({
        type: 'status',
        priority: 'medium',
        message: 'Certains Pokémon ont des altérations de statut'
      });
    }
    
    return recommendations;
  }
  
  // === 🎨 MÉTHODES D'AFFICHAGE AVANCÉES ===
  
  highlightPokemon(slotIndex, duration = 2000) {
    const slot = this.overlayElement.querySelector(`[data-slot="${slotIndex}"]`);
    if (!slot) return;
    
    slot.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8)';
    slot.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
      slot.style.boxShadow = '';
      slot.style.transform = '';
    }, duration);
  }
  
  showPokemonAnimation(slotIndex, animationType = 'update') {
    const slot = this.overlayElement.querySelector(`[data-slot="${slotIndex}"]`);
    if (!slot) return;
    
    const pokemonCard = slot.querySelector('.pokemon-card');
    if (!pokemonCard) return;
    
    switch (animationType) {
      case 'update':
        pokemonCard.classList.add('updated');
        setTimeout(() => pokemonCard.classList.remove('updated'), 600);
        break;
      case 'heal':
        slot.style.background = 'rgba(40, 167, 69, 0.3)';
        setTimeout(() => slot.style.background = '', 1000);
        break;
      case 'faint':
        slot.style.background = 'rgba(220, 53, 69, 0.3)';
        setTimeout(() => slot.style.background = '', 1000);
        break;
    }
  }
  
  updateSlotRealtime(slotIndex, newData) {
    if (slotIndex < 0 || slotIndex >= 6) return;
    
    // Mettre à jour les données locales
    if (newData) {
      this.teamData[slotIndex] = { ...this.teamData[slotIndex], ...newData };
    } else {
      this.teamData[slotIndex] = null;
    }
    
    // Recréer le slot
    const slot = this.overlayElement.querySelector(`[data-slot="${slotIndex}"]`);
    if (slot) {
      const newSlot = this.createCompleteSlotElement(this.teamData[slotIndex], slotIndex);
      slot.parentNode.replaceChild(newSlot, slot);
      
      // Animation d'apparition
      newSlot.classList.add('new');
      setTimeout(() => newSlot.classList.remove('new'), 500);
    }
    
    // Mettre à jour les stats
    this.updateCompleteStats();
  }
  
  // === 🔄 MÉTHODES DE SYNCHRONISATION ===
  
  syncWithTeamManager(teamManager) {
    if (!teamManager) return;
    
    try {
      const teamStats = teamManager.getTeamStats();
      const teamData = teamManager.getTeamData();
      
      console.log('🔄 [TeamUI] Synchronisation avec TeamManager:', {
        stats: teamStats,
        dataCount: teamData.length
      });
      
      this.updateTeamData({ team: teamData });
      
    } catch (error) {
      console.error('❌ [TeamUI] Erreur synchronisation TeamManager:', error);
    }
  }
  
  forceRefresh() {
    console.log('🔄 [TeamUI] Force refresh interface...');
    
    this.refreshCompleteDisplay();
    this.updateCompleteStats();
    this.updateDetailView();
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Interface équipe actualisée', 'success', {
        duration: 1500,
        position: 'bottom-center'
      });
    }
  }
  
  // === 📱 MÉTHODES RESPONSIVE ===
  
  updateForScreenSize() {
    if (!this.overlayElement) return;
    
    const container = this.overlayElement.querySelector('.team-container');
    const screenWidth = window.innerWidth;
    
    if (screenWidth <= 768) {
      container.classList.add('mobile-layout');
    } else {
      container.classList.remove('mobile-layout');
    }
  }
  
  // === 🎯 MÉTHODES DE TESTS ===
  
  testInterface() {
    console.log('🧪 [TeamUI] Test interface...');
    
    // Test data simulée
    const testData = {
      team: [
        {
          _id: 'test1',
          pokemonId: 1,
          name: 'Bulbasaur',
          nickname: 'Bulbi',
          level: 15,
          currentHp: 45,
          maxHp: 45,
          types: ['Grass', 'Poison'],
          status: 'normal'
        },
        {
          _id: 'test2',
          pokemonId: 4,
          name: 'Charmander',
          level: 12,
          currentHp: 20,
          maxHp: 39,
          types: ['Fire'],
          status: 'normal'
        },
        {
          _id: 'test3',
          pokemonId: 7,
          name: 'Squirtle',
          level: 14,
          currentHp: 0,
          maxHp: 44,
          types: ['Water'],
          status: 'fainted'
        }
      ]
    };
    
    this.updateTeamData(testData);
    
    console.log('✅ [TeamUI] Test data appliquée');
    
    return {
      testDataApplied: true,
      pokemonCount: this.teamData.length,
      interfaceReady: !!this.overlayElement
    };
  }
  
  // === 🔍 MÉTHODES DE RECHERCHE ===
  
  findPokemonByName(name) {
    return this.teamData.find(p => 
      (p.nickname && p.nickname.toLowerCase().includes(name.toLowerCase())) ||
      (p.name && p.name.toLowerCase().includes(name.toLowerCase()))
    );
  }
  
  findPokemonsByType(type) {
    return this.teamData.filter(p => 
      p.types && p.types.some(t => t.toLowerCase() === type.toLowerCase())
    );
  }
  
  findPokemonsByLevel(minLevel, maxLevel = Infinity) {
    return this.teamData.filter(p => 
      p.level >= minLevel && p.level <= maxLevel
    );
  }
  
  findFaintedPokemon() {
    return this.teamData.filter(p => p && p.currentHp === 0);
  }
  
  findHealthyPokemon() {
    return this.teamData.filter(p => p && p.currentHp === p.maxHp);
  }
  
  findInjuredPokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0 && p.currentHp < p.maxHp);
  }
}

export default TeamUI;

// Exposer globalement pour les boutons onclick
if (typeof window !== 'undefined') {
  window.TeamUI = TeamUI;
}

console.log(`
🎯 === TEAM UI INTERFACE COMPLÈTE ===

✨ NOUVELLES FONCTIONNALITÉS:
• Affichage complet des Pokémon avec portraits
• Barres de vie animées avec effets visuels
• Types Pokémon avec gradients colorés
• Statistiques détaillées en temps réel
• Vue détails avec informations complètes
• Actions rapides (soigner, organiser)
• Sélection et interactions avancées

🎨 DESIGN MODERNE:
• Glassmorphisme et néomorphisme
• Animations fluides et microinteractions
• Layout responsive mobile/desktop
• Effets de brillance sur les barres de vie
• Status visuels (fainted, status, healthy)
• Gradients et ombres professionnels

📊 FONCTIONNALITÉS AVANCÉES:
• Analyse d'équipe complète
• Recommandations intelligentes
• Couverture de types automatique
• Synchronisation temps réel
• Debug et test intégrés
• Recherche et filtrage

🔧 API COMPLÈTE:
• updateTeamData() - Mise à jour données
• selectPokemon() - Sélection interactive
• healPokemon() - Actions de soin
• getTeamAnalysis() - Analyse complète
• testInterface() - Tests automatisés

🎯 PRÊT POUR L'AFFICHAGE POKÉMON !
`);
