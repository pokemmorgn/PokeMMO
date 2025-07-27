// Options/OptionsIcon.js - Icône cliquable pour le menu d'options
// ⚙️ Icône engrenage avec tooltip + intégration UIManager
// 🎛️ Compatible avec le système d'icônes standardisé

export class OptionsIcon {
  constructor(moduleId, options = {}) {
    this.moduleId = moduleId;
    this.options = {
      tooltip: 'Options (Échap)',
      position: 'bottom-right',
      size: { width: 70, height: 80 },
      ...options
    };
    
    // === ÉTAT ===
    this.isVisible = true;
    this.isEnabled = true;
    this.isHovered = false;
    
    // === ÉLÉMENT DOM ===
    this.iconElement = null;
    this.module = null;
    
    // === CALLBACKS ===
    this.onClick = options.onClick || (() => {});
    this.onHover = options.onHover || (() => {});
    
    console.log('⚙️ [OptionsIcon] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [OptionsIcon] Initialisation...');
      
      this.addStyles();
      this.createElement();
      this.setupEventListeners();
      
      console.log('✅ [OptionsIcon] Icône prête');
      return this;
      
    } catch (error) {
      console.error('❌ [OptionsIcon] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🎨 STYLES ===
  
  addStyles() {
    if (document.querySelector('#options-icon-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'options-icon-styles';
    style.textContent = `
      /* ===== OPTIONS ICON STYLES ===== */
      
      .options-icon {
        position: fixed;
        width: 70px;
        height: 80px;
        cursor: pointer;
        user-select: none;
        z-index: 500;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px;
        box-sizing: border-box;
      }
      
      .options-icon.ui-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }
      
      .options-icon.ui-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(50%);
      }
      
      .options-icon:not(.ui-disabled):hover {
        transform: scale(1.1);
      }
      
      /* Icon Container */
      .options-icon-container {
        width: 50px;
        height: 50px;
        background: linear-gradient(145deg, #4a5568, #2d3748);
        border: 2px solid #718096;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s ease;
        box-shadow: 
          0 4px 12px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }
      
      .options-icon:hover .options-icon-container {
        background: linear-gradient(145deg, #5a6478, #3d4758);
        border-color: #a0aec0;
        box-shadow: 
          0 6px 20px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px rgba(160, 174, 192, 0.3);
      }
      
      .options-icon.ui-disabled .options-icon-container {
        background: linear-gradient(145deg, #2d3748, #1a202c);
        border-color: #4a5568;
      }
      
      /* Gear Icon */
      .options-gear {
        width: 28px;
        height: 28px;
        color: #e2e8f0;
        font-size: 24px;
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .options-icon:hover .options-gear {
        color: #f7fafc;
        transform: rotate(90deg);
        filter: drop-shadow(0 0 6px rgba(247, 250, 252, 0.5));
      }
      
      .options-icon.ui-disabled .options-gear {
        color: #718096;
        transform: none;
      }
      
      /* Animated Gear SVG */
      .gear-svg {
        width: 28px;
        height: 28px;
        transition: transform 0.3s ease;
      }
      
      .options-icon:hover .gear-svg {
        transform: rotate(90deg);
      }
      
      .options-icon.ui-disabled .gear-svg {
        transform: none;
      }
      
      /* Label */
      .options-label {
        font-size: 10px;
        font-weight: 600;
        color: #a0aec0;
        text-align: center;
        line-height: 1.2;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      .options-icon:hover .options-label {
        color: #e2e8f0;
        text-shadow: 0 0 8px rgba(226, 232, 240, 0.5);
      }
      
      .options-icon.ui-disabled .options-label {
        color: #718096;
      }
      
      /* Status Indicator */
      .options-status {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #2d3748;
        background: #48bb78;
        opacity: 0;
        transition: all 0.3s ease;
        box-shadow: 0 0 8px rgba(72, 187, 120, 0.6);
      }
      
      .options-icon.has-changes .options-status {
        opacity: 1;
        background: #ed8936;
        box-shadow: 0 0 8px rgba(237, 137, 54, 0.6);
        animation: optionsPulse 2s infinite;
      }
      
      @keyframes optionsPulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1); 
        }
        50% { 
          opacity: 0.7; 
          transform: scale(1.1); 
        }
      }
      
      /* Keyboard Shortcut Badge */
      .keyboard-shortcut {
        position: absolute;
        bottom: -8px;
        right: -8px;
        background: linear-gradient(145deg, #2b6cb0, #2c5282);
        color: white;
        font-size: 8px;
        font-weight: bold;
        padding: 2px 4px;
        border-radius: 4px;
        border: 1px solid #3182ce;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .options-icon:hover .keyboard-shortcut {
        opacity: 1;
        transform: translateY(-2px);
      }
      
      /* Active State */
      .options-icon.active .options-icon-container {
        background: linear-gradient(145deg, #3182ce, #2c5282);
        border-color: #4299e1;
        box-shadow: 
          0 6px 20px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px rgba(66, 153, 225, 0.5);
      }
      
      .options-icon.active .options-gear {
        color: #f7fafc;
        transform: rotate(180deg);
      }
      
      .options-icon.active .options-label {
        color: #bee3f8;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .options-icon {
          width: 60px;
          height: 70px;
        }
        
        .options-icon-container {
          width: 45px;
          height: 45px;
        }
        
        .options-gear {
          width: 24px;
          height: 24px;
          font-size: 20px;
        }
        
        .gear-svg {
          width: 24px;
          height: 24px;
        }
        
        .options-label {
          font-size: 9px;
        }
      }
      
      @media (max-width: 480px) {
        .options-icon {
          width: 55px;
          height: 65px;
        }
        
        .options-icon-container {
          width: 40px;
          height: 40px;
        }
        
        .options-gear {
          width: 20px;
          height: 20px;
          font-size: 18px;
        }
        
        .gear-svg {
          width: 20px;
          height: 20px;
        }
        
        .options-label {
          font-size: 8px;
        }
      }
      
      /* Animation pour le premier affichage */
      @keyframes optionsIconAppear {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .options-icon.first-show {
        animation: optionsIconAppear 0.4s ease-out;
      }
    `;
    
    document.head.appendChild(style);
    console.log('🎨 [OptionsIcon] Styles ajoutés');
  }
  
  // === 🏗️ CRÉATION ÉLÉMENT ===
  
  createElement() {
    // Supprimer élément existant
    const existing = document.querySelector('#options-icon');
    if (existing) existing.remove();
    
    const icon = document.createElement('div');
    icon.id = 'options-icon';
    icon.className = 'options-icon ui-icon';
    
    // Créer SVG engrenage animé
    const gearSVG = this.createGearSVG();
    
    icon.innerHTML = `
      <div class="options-icon-container">
        ${gearSVG}
        <div class="options-status"></div>
        <div class="keyboard-shortcut">Échap</div>
      </div>
      <div class="options-label">Options</div>
    `;
    
    document.body.appendChild(icon);
    this.iconElement = icon;
    
    // Animation première apparition
    setTimeout(() => {
      icon.classList.add('first-show');
    }, 100);
    
    console.log('🏗️ [OptionsIcon] Élément créé');
  }
  
  createGearSVG() {
    return `
      <svg class="gear-svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
      </svg>
    `;
  }
  
  // === 🎛️ ÉVÉNEMENTS ===
  
  setupEventListeners() {
    if (!this.iconElement) return;
    
    // Click
    this.iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.isEnabled) {
        this.handleClick();
      }
    });
    
    // Hover
    this.iconElement.addEventListener('mouseenter', () => {
      if (this.isEnabled) {
        this.handleHoverStart();
      }
    });
    
    this.iconElement.addEventListener('mouseleave', () => {
      this.handleHoverEnd();
    });
    
    // Touch support
    this.iconElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.isEnabled) {
        this.handleClick();
      }
    });
    
    console.log('🎛️ [OptionsIcon] Événements configurés');
  }
  
  handleClick() {
    console.log('🖱️ [OptionsIcon] Clic détecté');
    
    // Animation click
    this.iconElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.iconElement.style.transform = '';
    }, 150);
    
    this.onClick();
  }
  
  handleHoverStart() {
    this.isHovered = true;
    this.onHover(true);
    
    // Tooltip personnalisé si disponible
    if (typeof window.showGameTooltip === 'function') {
      window.showGameTooltip(this.options.tooltip, {
        position: 'top',
        delay: 500,
        element: this.iconElement
      });
    }
  }
  
  handleHoverEnd() {
    this.isHovered = false;
    this.onHover(false);
    
    // Masquer tooltip
    if (typeof window.hideGameTooltip === 'function') {
      window.hideGameTooltip();
    }
  }
  
  // === 🎨 ÉTATS VISUELS ===
  
  setActive(active) {
    if (!this.iconElement) return;
    
    if (active) {
      this.iconElement.classList.add('active');
    } else {
      this.iconElement.classList.remove('active');
    }
  }
  
  setHasChanges(hasChanges) {
    if (!this.iconElement) return;
    
    if (hasChanges) {
      this.iconElement.classList.add('has-changes');
    } else {
      this.iconElement.classList.remove('has-changes');
    }
  }
  
  pulseForAttention() {
    if (!this.iconElement || !this.isEnabled) return;
    
    this.iconElement.style.animation = 'optionsPulse 0.6s ease 3';
    
    setTimeout(() => {
      this.iconElement.style.animation = '';
    }, 1800);
  }
  
  // === 🔧 CONTRÔLES ===
  
  show() {
    this.isVisible = true;
    
    if (this.iconElement) {
      this.iconElement.classList.remove('ui-hidden');
      this.iconElement.style.display = 'flex';
    }
    
    console.log('✅ [OptionsIcon] Icône affichée');
    return true;
  }
  
  hide() {
    this.isVisible = false;
    
    if (this.iconElement) {
      this.iconElement.classList.add('ui-hidden');
      
      // Masquer complètement après animation
      setTimeout(() => {
        if (!this.isVisible) {
          this.iconElement.style.display = 'none';
        }
      }, 300);
    }
    
    console.log('✅ [OptionsIcon] Icône masquée');
    return true;
  }
  
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (this.iconElement) {
      if (enabled) {
        this.iconElement.classList.remove('ui-disabled');
        this.iconElement.style.pointerEvents = 'auto';
      } else {
        this.iconElement.classList.add('ui-disabled');
        this.iconElement.style.pointerEvents = 'none';
      }
    }
    
    console.log(`🔧 [OptionsIcon] Icône ${enabled ? 'activée' : 'désactivée'}`);
    return true;
  }
  
  setPosition(x, y) {
    if (this.iconElement) {
      this.iconElement.style.left = `${x}px`;
      this.iconElement.style.top = `${y}px`;
    }
  }
  
  // === 🔗 CONNEXIONS ===
  
  setModule(optionsModule) {
    this.module = optionsModule;
  }
  
  updateTooltip(text) {
    this.options.tooltip = text;
  }
  
  // === 📊 ÉTAT ===
  
  getState() {
    return {
      isVisible: this.isVisible,
      isEnabled: this.isEnabled,
      isHovered: this.isHovered,
      hasElement: !!this.iconElement,
      position: this.iconElement ? {
        x: parseInt(this.iconElement.style.left) || 0,
        y: parseInt(this.iconElement.style.top) || 0
      } : null
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [OptionsIcon] Destruction...');
    
    // Masquer tooltip si affiché
    if (typeof window.hideGameTooltip === 'function') {
      window.hideGameTooltip();
    }
    
    // Supprimer élément DOM
    if (this.iconElement && this.iconElement.parentNode) {
      this.iconElement.remove();
    }
    
    // Supprimer styles
    const styles = document.querySelector('#options-icon-styles');
    if (styles) styles.remove();
    
    // Reset état
    this.iconElement = null;
    this.module = null;
    this.isVisible = false;
    this.isEnabled = false;
    
    console.log('✅ [OptionsIcon] Détruit');
  }
}

export default OptionsIcon;
