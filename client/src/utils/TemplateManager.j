// client/src/utils/TemplateManager.js - Gestionnaire de templates HTML

export class TemplateManager {
  constructor() {
    this.cache = new Map();
    this.baseUrl = '/templates/';
  }

  /**
   * Charge un template depuis un fichier externe
   * @param {string} templateName - Nom du template (sans extension)
   * @param {boolean} useCache - Utiliser le cache (défaut: true)
   * @returns {Promise<string>} - Contenu du template
   */
  async loadTemplate(templateName, useCache = true) {
    // Vérifie le cache
    if (useCache && this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    try {
      const response = await fetch(`${this.baseUrl}${templateName}.html`);
      if (!response.ok) {
        throw new Error(`Template ${templateName} not found (${response.status})`);
      }
      
      const content = await response.text();
      
      // Met en cache
      if (useCache) {
        this.cache.set(templateName, content);
      }
      
      console.log(`✅ Template ${templateName} chargé`);
      return content;
    } catch (error) {
      console.error(`❌ Erreur chargement template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Charge plusieurs templates en parallèle
   * @param {string[]} templateNames - Liste des noms de templates
   * @returns {Promise<Object>} - Objet avec les templates chargés
   */
  async loadTemplates(templateNames) {
    const promises = templateNames.map(async name => {
      try {
        const content = await this.loadTemplate(name);
        return { name, content, success: true };
      } catch (error) {
        return { name, content: null, success: false, error };
      }
    });

    const results = await Promise.all(promises);
    const templates = {};
    
    results.forEach(result => {
      if (result.success) {
        templates[result.name] = result.content;
      } else {
        console.warn(`⚠️ Template ${result.name} non chargé:`, result.error);
        templates[result.name] = null;
      }
    });

    return templates;
  }

  /**
   * Rendu d'un template avec des données
   * @param {string} template - Contenu du template
   * @param {Object} data - Données à injecter
   * @param {Object} options - Options de rendu
   * @returns {string} - Template rendu
   */
  render(template, data = {}, options = {}) {
    const {
      delimiter = '{{}}',
      escape = true,
      fallback = ''
    } = options;

    let result = template;

    // Remplace les variables {{VAR}}
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      
      let replacementValue = value;
      
      // Échappement HTML si nécessaire
      if (escape && typeof value === 'string') {
        replacementValue = this.escapeHtml(value);
      }
      
      result = result.replace(regex, replacementValue ?? fallback);
    }

    // Gère les conditions {{#IF condition}}...{{/IF}}
    result = this.processConditionals(result, data);

    // Gère les boucles {{#EACH array}}...{{/EACH}}
    result = this.processLoops(result, data);

    return result;
  }

  /**
   * Traite les conditions dans les templates
   * @param {string} template - Template
   * @param {Object} data - Données
   * @returns {string} - Template traité
   */
  processConditionals(template, data) {
    const ifRegex = /{{#IF\s+(\w+)}}([\s\S]*?){{\/IF}}/g;
    
    return template.replace(ifRegex, (match, condition, content) => {
      const value = data[condition];
      const isTrue = value && value !== 'false' && value !== '0' && value !== 0;
      return isTrue ? content : '';
    });
  }

  /**
   * Traite les boucles dans les templates
   * @param {string} template - Template
   * @param {Object} data - Données
   * @returns {string} - Template traité
   */
  processLoops(template, data) {
    const eachRegex = /{{#EACH\s+(\w+)}}([\s\S]*?){{\/EACH}}/g;
    
    return template.replace(eachRegex, (match, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        const itemData = {
          ...data,
          ...item,
          INDEX: index,
          FIRST: index === 0,
          LAST: index === array.length - 1
        };
        return this.render(itemTemplate, itemData, { escape: false });
      }).join('');
    });
  }

  /**
   * Échappement HTML
   * @param {string} text - Texte à échapper
   * @returns {string} - Texte échappé
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Définit un template inline
   * @param {string} name - Nom du template
   * @param {string} content - Contenu du template
   */
  setTemplate(name, content) {
    this.cache.set(name, content);
    console.log(`✅ Template ${name} défini en mémoire`);
  }

  /**
   * Récupère un template du cache
   * @param {string} name - Nom du template
   * @returns {string|null} - Contenu du template ou null
   */
  getTemplate(name) {
    return this.cache.get(name) || null;
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache templates vidé');
  }

  /**
   * Template helper pour créer des composants réutilisables
   * @param {string} templateName - Nom du template
   * @param {Object} data - Données
   * @param {HTMLElement} container - Conteneur où insérer
   * @returns {HTMLElement} - Élément créé
   */
  async createComponent(templateName, data = {}, container = null) {
    try {
      const template = await this.loadTemplate(templateName);
      const html = this.render(template, data);
      
      const element = document.createElement('div');
      element.innerHTML = html;
      
      // Si c'est un seul élément, retourne directement l'élément
      const children = element.children;
      const result = children.length === 1 ? children[0] : element;
      
      if (container) {
        container.appendChild(result);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Erreur création composant ${templateName}:`, error);
      
      // Élément d'erreur de fallback
      const errorElement = document.createElement('div');
      errorElement.className = 'template-error';
      errorElement.textContent = `Erreur template: ${templateName}`;
      errorElement.style.cssText = 'color: red; border: 1px solid red; padding: 10px; margin: 5px;';
      
      if (container) {
        container.appendChild(errorElement);
      }
      
      return errorElement;
    }
  }
}
