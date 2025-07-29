// client/src/Weather/TimeWeatherModule.js - Avec support traductions temps réel
import { TimeWeatherWidget } from './TimeWeatherWidget.js';
import { t } from '../managers/LocalizationManager.js';

export function createTimeWeatherModule(optionsManager = null) {
  console.log('🌤️ [TimeWeatherModule] Création du module avec traductions...');
  
  const widget = new TimeWeatherWidget({ 
    id: 'time-weather-widget', 
    anchor: 'top-right',
    optionsManager  // ← NOUVEAU: Passer optionsManager au widget
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
    
    // 🌐 NOUVEAU: Support traductions
    optionsManager: optionsManager,
    languageListeners: [],
    translationsReady: false,
    
    // === 🌐 SETUP TRADUCTIONS ===
    
    /**
     * Configurer le support des langues (pattern identique Options/Pokedex)
     */
    setupLanguageSupport() {
      console.log('🌐 [TimeWeatherModule] Setup support traductions...');
      
      if (!this.optionsManager) {
        console.warn('⚠️ [TimeWeatherModule] OptionsManager manquant - pas de traductions');
        return false;
      }
      
      // Vérifier si les traductions sont prêtes
      this.checkTranslationsReady();
      
      // Setup des listeners avec retry automatique
      this.setupLanguageListeners();
      
      return true;
    },
    
    /**
     * Vérifier si les traductions sont disponibles (avec retry)
     */
    checkTranslationsReady() {
      const maxAttempts = 10;
      let attempts = 0;
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        // Test de base: clé timeweather
        const testTranslation = this.safeTranslate('timeweather.weather.conditions.sunny', 'Sunny');
        const isReady = testTranslation !== 'timeweather.weather.conditions.sunny';
        
        if (isReady) {
          console.log(`✅ [TimeWeatherModule] Traductions prêtes (tentative ${attempts})`);
          this.translationsReady = true;
          clearInterval(checkInterval);
          
          // Mise à jour immédiate si widget initialisé
          if (this.widget && this.widget.initialized) {
            this.updateLanguage();
          }
          
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.warn(`⚠️ [TimeWeatherModule] Traductions non trouvées après ${maxAttempts} tentatives`);
          clearInterval(checkInterval);
          return;
        }
        
        console.log(`🔄 [TimeWeatherModule] Attente traductions... (${attempts}/${maxAttempts})`);
      }, 500);
    },
    
    /**
     * Écouter les changements de langue
     */
    setupLanguageListeners() {
      console.log('👂 [TimeWeatherModule] Setup listeners traductions...');
      
      if (!this.optionsManager) return;
      
      // Listener 1: Changement de langue via Options
      if (this.optionsManager.on) {
        const languageListener = (event) => {
          console.log('🌐 [TimeWeatherModule] Langue changée:', event.detail);
          setTimeout(() => this.updateLanguage(), 100);
        };
        
        this.optionsManager.on('languageChanged', languageListener);
        this.languageListeners.push(() => {
          this.optionsManager.off('languageChanged', languageListener);
        });
      }
      
      // Listener 2: Événement global window
      const globalLanguageListener = (event) => {
        console.log('🌐 [TimeWeatherModule] Langue globale changée:', event.detail);
        setTimeout(() => this.updateLanguage(), 100);
      };
      
      window.addEventListener('languageChanged', globalLanguageListener);
      this.languageListeners.push(() => {
        window.removeEventListener('languageChanged', globalLanguageListener);
      });
      
      // Listener 3: Mise à jour modules LocalizationManager
      const modulesUpdatedListener = (event) => {
        if (event.detail.newModules?.includes('timeweather')) {
          console.log('📦 [TimeWeatherModule] Module timeweather chargé dynamiquement');
          setTimeout(() => {
            this.translationsReady = true;
            this.updateLanguage();
          }, 200);
        }
      };
      
      window.addEventListener('localizationModulesUpdated', modulesUpdatedListener);
      this.languageListeners.push(() => {
        window.removeEventListener('localizationModulesUpdated', modulesUpdatedListener);
      });
      
      console.log(`✅ [TimeWeatherModule] ${this.languageListeners.length} listeners configurés`);
    },
    
    /**
     * Traduction sécurisée avec fallback
     */
    safeTranslate(key, fallback = null) {
      try {
        const translation = t(key);
        return (translation && translation !== key) ? translation : (fallback || key);
      } catch (error) {
        console.warn(`⚠️ [TimeWeatherModule] Erreur traduction "${key}":`, error);
        return fallback || key;
      }
    },
    
    /**
     * Mettre à jour toutes les traductions du widget
     */
    updateLanguage() {
      if (!this.translationsReady) {
        console.log('⏳ [TimeWeatherModule] Traductions pas encore prêtes');
        return;
      }
      
      if (!this.widget || !this.widget.element) {
        console.log('⏳ [TimeWeatherModule] Widget pas encore initialisé');
        return;
      }
      
      console.log('🔄 [TimeWeatherModule] Mise à jour traductions...');
      
      try {
        // 1. Traduire condition météo actuelle
        this.translateCurrentWeather();
        
        // 2. Traduire période de temps
        this.translateTimePeriod();
        
        // 3. Traduire localisation
        this.translateLocation();
        
        // 4. Traduire bonus gameplay
        this.translateGameplayBonus();
        
        // 5. Mettre à jour tooltips si présents
        this.translateTooltips();
        
        console.log('✅ [TimeWeatherModule] Traductions mises à jour');
        
      } catch (error) {
        console.error('❌ [TimeWeatherModule] Erreur mise à jour traductions:', error);
      }
    },
    
    /**
     * Traduire la condition météo actuelle
     */
    translateCurrentWeather() {
      if (!this.widget.weather || !this.widget.weather.weather) return;
      
      const weatherCondition = this.widget.weather.weather;
      const translatedCondition = this.safeTranslate(
        `timeweather.weather.conditions.${weatherCondition}`,
        this.widget.weather.displayName
      );
      
      const weatherElement = this.widget.element.querySelector('.weather-main');
      if (weatherElement && weatherElement.textContent !== translatedCondition) {
        weatherElement.textContent = translatedCondition;
        console.log(`🌤️ [TimeWeatherModule] Météo traduite: ${weatherCondition} → ${translatedCondition}`);
      }
    },
    
    /**
     * Traduire période de temps (AM/PM)
     */
    translateTimePeriod() {
      const periodElement = this.widget.element.querySelector('.time-period');
      if (!periodElement) return;
      
      const currentPeriod = periodElement.textContent.toLowerCase();
      if (currentPeriod === 'am' || currentPeriod === 'pm') {
        const translatedPeriod = this.safeTranslate(
          `timeweather.time.periods.${currentPeriod}`,
          currentPeriod.toUpperCase()
        );
        
        if (periodElement.textContent !== translatedPeriod) {
          periodElement.textContent = translatedPeriod;
          console.log(`⏰ [TimeWeatherModule] Période traduite: ${currentPeriod} → ${translatedPeriod}`);
        }
      }
    },
    
    /**
     * Traduire nom de localisation
     */
    translateLocation() {
      const zoneElement = this.widget.element.querySelector('.zone-text');
      if (!zoneElement) return;
      
      const currentLocation = zoneElement.textContent;
      
      // Mapping des noms de lieux vers les clés de traduction
      const locationMapping = {
        'Village': 'village',
        'Pallet Town': 'pallet_town',
        'Viridian City': 'viridian_city',
        'Pewter City': 'pewter_city',
        'Cerulean City': 'cerulean_city',
        'Vermilion City': 'vermilion_city',
        'Lavender Town': 'lavender_town',
        'Celadon City': 'celadon_city',
        'Fuchsia City': 'fuchsia_city',
        'Saffron City': 'saffron_city',
        'Cinnabar Island': 'cinnabar_island',
        'Indigo Plateau': 'indigo_plateau'
      };
      
      const locationKey = locationMapping[currentLocation];
      if (locationKey) {
        const translatedLocation = this.safeTranslate(
          `timeweather.locations.${locationKey}`,
          currentLocation
        );
        
        if (zoneElement.textContent !== translatedLocation) {
          zoneElement.textContent = translatedLocation;
          console.log(`📍 [TimeWeatherModule] Lieu traduit: ${currentLocation} → ${translatedLocation}`);
        }
      }
    },
    
    /**
     * Traduire bonus gameplay
     */
    translateGameplayBonus() {
      const bonusElement = this.widget.element.querySelector('.bonus-text');
      if (!bonusElement) return;
      
      if (!this.widget.gameplayBonus || !this.widget.gameplayBonus.active) return;
      
      const bonusType = this.widget.gameplayBonus.type;
      if (!bonusType) return;
      
      // Traduire le type Pokémon
      const translatedType = this.safeTranslate(
        `timeweather.bonus.types.${bonusType}`,
        bonusType
      );
      
      // Formatter le message de bonus avec la traduction
      const bonusTemplate = this.safeTranslate(
        'timeweather.bonus.xp_boost',
        '+{0}% XP {1} Pokémon'
      );
      
      const bonusText = bonusTemplate
        .replace('{0}', '15')
        .replace('{1}', translatedType);
      
      if (bonusElement.textContent !== bonusText) {
        bonusElement.textContent = bonusText;
        console.log(`🎮 [TimeWeatherModule] Bonus traduit: ${translatedType}`);
      }
    },
    
    /**
     * Traduire tooltips (si présents)
     */
    translateTooltips() {
      const tooltipElements = this.widget.element.querySelectorAll('[title], [data-tooltip]');
      
      tooltipElements.forEach(element => {
        const currentTooltip = element.title || element.dataset.tooltip;
        if (!currentTooltip) return;
        
        // Mapping des tooltips vers les clés de traduction
        const tooltipMapping = {
          'Current weather': 'current_weather',
          'Local time': 'local_time',
          'Temperature': 'temperature',
          'Weather intensity': 'weather_intensity',
          'Pokémon type bonus': 'pokemon_bonus'
        };
        
        const tooltipKey = tooltipMapping[currentTooltip];
        if (tooltipKey) {
          const translatedTooltip = this.safeTranslate(
            `timeweather.tooltips.${tooltipKey}`,
            currentTooltip
          );
          
          if (element.title) {
            element.title = translatedTooltip;
          }
          if (element.dataset.tooltip) {
            element.dataset.tooltip = translatedTooltip;
          }
        }
      });
    },
    
    // === MÉTHODE CREATEICON POUR UIMANAGER (MODIFIÉE) ===
    createIcon() {
      console.log('🎨 [TimeWeatherModule] createIcon() avec traductions...');
      
      // Déléguer à la widget
      this.iconElement = this.widget.createIcon();
      this.initialized = true;
      
      // 🌐 NOUVEAU: Setup traductions après création
      setTimeout(() => {
        this.setupLanguageSupport();
      }, 500);
      
      console.log('✅ [TimeWeatherModule] Icône créée avec support traductions');
      return this.iconElement;
    },
    
    // === MÉTHODES POUR UIMANAGER (INCHANGÉES) ===
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
    
    // === MÉTHODES SPÉCIFIQUES AU WIDGET (MODIFIÉES POUR TRADUCTIONS) ===
    updateTime(hour, isDayTime) {
      const result = this.widget.updateTime(hour, isDayTime);
      
      // Re-traduire après mise à jour
      if (this.translationsReady) {
        setTimeout(() => this.translateTimePeriod(), 100);
      }
      
      return result;
    },
    
    updateWeather(weather, displayName) {
      const result = this.widget.updateWeather(weather, displayName);
      
      // Re-traduire après mise à jour
      if (this.translationsReady) {
        setTimeout(() => {
          this.translateCurrentWeather();
          this.translateGameplayBonus();
        }, 100);
      }
      
      return result;
    },
    
    // === COMPATIBILITÉ UIMANAGER (INCHANGÉE) ===
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
    
    // === PROPRIÉTÉS UTILES (INCHANGÉES) ===
    get element() {
      return this.iconElement || this.widget.element;
    },
    
    get isPositionedByUIManager() {
      return this.widget.isPositionedByUIManager();
    },
    
    getCurrentPosition() {
      return this.widget.getCurrentPosition();
    },
    
    // === DESTRUCTION (MODIFIÉE POUR CLEANUP TRADUCTIONS) ===
    destroy() {
      console.log('🧹 [TimeWeatherModule] Destruction avec cleanup traductions...');
      
      // 🌐 NOUVEAU: Cleanup des listeners de langue
      this.languageListeners.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('⚠️ [TimeWeatherModule] Erreur cleanup listener:', error);
        }
      });
      this.languageListeners = [];
      
      // Destruction du widget
      if (this.widget) {
        this.widget.destroy();
      }
      
      // Reset des états
      this.iconElement = null;
      this.initialized = false;
      this.isVisible = false;
      this.isEnabled = false;
      this.optionsManager = null;
      this.translationsReady = false;
      
      console.log('✅ [TimeWeatherModule] Détruit avec cleanup traductions');
    },
    
    // === DEBUG (AMÉLIORÉ POUR TRADUCTIONS) ===
    debugInfo() {
      const widgetInfo = this.widget.debugInfo();
      
      // Test quelques traductions
      const translationTests = this.translationsReady ? {
        sunny: this.safeTranslate('timeweather.weather.conditions.sunny', 'TEST'),
        morning: this.safeTranslate('timeweather.time.periods.morning', 'TEST'),
        village: this.safeTranslate('timeweather.locations.village', 'TEST'),
        fire: this.safeTranslate('timeweather.bonus.types.fire', 'TEST')
      } : {};
      
      return {
        module: {
          id: this.id,
          initialized: this.initialized,
          isVisible: this.isVisible,
          isEnabled: this.isEnabled,
          hasIconElement: !!this.iconElement,
          isPositionedByUIManager: this.isPositionedByUIManager
        },
        
        // 🌐 NOUVEAU: Infos traductions
        translations: {
          ready: this.translationsReady,
          hasOptionsManager: !!this.optionsManager,
          listenersCount: this.languageListeners.length,
          currentLanguage: this.optionsManager?.getCurrentLanguage?.() || 'unknown',
          tests: translationTests
        },
        
        widget: widgetInfo,
        
        compatibility: {
          hasCreateIcon: typeof this.createIcon === 'function',
          hasShow: typeof this.show === 'function',
          hasHide: typeof this.hide === 'function',
          hasSetEnabled: typeof this.setEnabled === 'function',
          hasDestroy: typeof this.destroy === 'function',
          
          // 🌐 NOUVEAU: Compatibilité traductions
          hasUpdateLanguage: typeof this.updateLanguage === 'function',
          hasSetupLanguageSupport: typeof this.setupLanguageSupport === 'function',
          hasSafeTranslate: typeof this.safeTranslate === 'function'
        }
      };
    }
  };
  
  console.log('✅ [TimeWeatherModule] Module créé avec support traductions complet');
  return module;
}

// Export par défaut pour compatibilité
export default createTimeWeatherModule;
