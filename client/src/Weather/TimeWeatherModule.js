// client/src/Weather/TimeWeatherModule.js
import { TimeWeatherWidget } from './TimeWeatherWidget.js';

export function createTimeWeatherModule() {
  console.log('🌤️ [TimeWeatherModule] Création du module...');
  
  const widget = new TimeWeatherWidget({ 
    id: 'time-weather-widget', 
    anchor: 'top-right' 
  });
  
  // Créer le wrapper compatible avec UIManager
  const module = {
    // Propriétés pour UIManager
    id: 'timeWeather',
    widget: widget,
    iconElement: null,
    initialized: false,
    isVisible: true,
    isEnabled: true,
    
    // === MÉTHODE CREATEICON POUR UIMANAGER ===
    createIcon() {
      console.log('🎨 [TimeWeatherModule] createIcon() appelée');
      
      // Déléguer à la widget
      this.iconElement = this.widget.createIcon();
      this.initialized = true;
      
      console.log('✅ [TimeWeatherModule] Icône créée:', !!this.iconElement);
      return this.iconElement;
    },
    
    // === MÉTHODES POUR UIMANAGER ===
    show() {
      this.isVisible = true;
      const result = this.widget.show();
      console.log('👁️ [TimeWeatherModule] Module affiché');
      return result;
    },
    
    hide() {
      this.isVisible = false;
      const result = this.widget.hide();
      console.log('👻 [TimeWeatherModule] Module caché');
      return result;
    },
    
    setEnabled(enabled) {
      this.isEnabled = enabled;
      const result = this.widget.setEnabled(enabled);
      console.log(`🔧 [TimeWeatherModule] Module ${enabled ? 'activé' : 'désactivé'}`);
      return result;
    },
    
    // === MÉTHODES SPÉCIFIQUES AU WIDGET ===
    updateTime(hour, isDayTime) {
      return this.widget.updateTime(hour, isDayTime);
    },
    
    updateWeather(weather, displayName) {
      return this.widget.updateWeather(weather, displayName);
    },
    
    // === COMPATIBILITÉ UIMANAGER ===
    connectUIManager(uiManager) {
      if (!uiManager || !uiManager.registerIconPosition) {
        console.warn('⚠️ [TimeWeatherModule] UIManager invalide');
        return false;
      }
      
      console.log('🔗 [TimeWeatherModule] Connexion à UIManager...');
      
      // Callback pour mise à jour de position
      this.widget.onPositioned = (position) => {
        console.log('📍 [TimeWeatherModule] Position mise à jour:', position);
        if (this.iconElement) {
          this.iconElement.setAttribute('data-uimanager-position', JSON.stringify(position));
        }
      };
      
      return true;
    },
    
    // === PROPRIÉTÉS UTILES ===
    get element() {
      return this.iconElement || this.widget.element;
    },
    
    get isPositionedByUIManager() {
      return this.widget.isPositionedByUIManager();
    },
    
    getCurrentPosition() {
      return this.widget.getCurrentPosition();
    },
    
    // === DESTRUCTION ===
    destroy() {
      console.log('🧹 [TimeWeatherModule] Destruction...');
      
      if (this.widget) {
        this.widget.destroy();
      }
      
      this.iconElement = null;
      this.initialized = false;
      this.isVisible = false;
      this.isEnabled = false;
      
      console.log('✅ [TimeWeatherModule] Détruit');
    },
    
    // === DEBUG ===
    debugInfo() {
      const widgetInfo = this.widget.debugInfo();
      
      return {
        module: {
          id: this.id,
          initialized: this.initialized,
          isVisible: this.isVisible,
          isEnabled: this.isEnabled,
          hasIconElement: !!this.iconElement,
          isPositionedByUIManager: this.isPositionedByUIManager
        },
        widget: widgetInfo,
        compatibility: {
          hasCreateIcon: typeof this.createIcon === 'function',
          hasShow: typeof this.show === 'function',
          hasHide: typeof this.hide === 'function',
          hasSetEnabled: typeof this.setEnabled === 'function',
          hasDestroy: typeof this.destroy === 'function'
        }
      };
    }
  };
  
  console.log('✅ [TimeWeatherModule] Module créé avec succès');
  return module;
}

// Export par défaut pour compatibilité
export default createTimeWeatherModule;
