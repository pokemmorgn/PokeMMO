/**
 * Fonctions utilitaires pour l'Admin Panel
 * Collection de helpers réutilisables
 */

const AdminHelpers = {
    /**
     * Formatage des données
     */
    formatters: {
        /**
         * Formate un nombre avec des séparateurs de milliers
         */
        number(value) {
            return new Intl.NumberFormat('fr-FR').format(value);
        },

        /**
         * Formate une date
         */
        date(date, options = {}) {
            const defaultOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            };
            return new Intl.DateTimeFormat('fr-FR', { ...defaultOptions, ...options }).format(new Date(date));
        },

        /**
         * Formate un uptime en secondes
         */
        uptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (days > 0) return `${days}j ${hours}h ${minutes}m`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        },

        /**
         * Formate une taille de fichier
         */
        fileSize(bytes) {
            const sizes = ['B', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        },

        /**
         * Formate un pourcentage
         */
        percentage(value, total) {
            return total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
        }
    },

    /**
     * Validation des données
     */
    validators: {
        /**
         * Valide un nom d'utilisateur
         */
        username(username) {
            const regex = /^[a-zA-Z0-9_-]{3,20}$/;
            return regex.test(username);
        },

        /**
         * Valide un email
         */
        email(email) {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },

        /**
         * Valide un ID de quête
         */
        questId(questId) {
            const regex = /^[a-zA-Z0-9_-]+$/;
            return regex.test(questId) && questId.length >= 2 && questId.length <= 50;
        },

        /**
         * Valide un niveau
         */
        level(level) {
            const num = parseInt(level);
            return !isNaN(num) && num >= 1 && num <= 100;
        },

        /**
         * Valide un montant de gold
         */
        gold(gold) {
            const num = parseInt(gold);
            return !isNaN(num) && num >= 0 && num <= 999999999;
        },

        /**
         * Valide des coordonnées
         */
        coordinates(x, y) {
            const xNum = parseInt(x);
            const yNum = parseInt(y);
            return !isNaN(xNum) && !isNaN(yNum) && 
                   xNum >= -9999 && xNum <= 9999 && 
                   yNum >= -9999 && yNum <= 9999;
        }
    },

    /**
     * Manipulation du DOM
     */
    dom: {
        /**
         * Crée un élément avec attributs et contenu
         */
        createElement(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            if (content) {
                if (typeof content === 'string') {
                    element.innerHTML = content;
                } else {
                    element.appendChild(content);
                }
            }
            
            return element;
        },

        /**
         * Trouve un élément parent avec une classe spécifique
         */
        findParent(element, className) {
            let parent = element.parentElement;
            while (parent && !parent.classList.contains(className)) {
                parent = parent.parentElement;
            }
            return parent;
        },

        /**
         * Anime l'apparition d'un élément
         */
        fadeIn(element, duration = 300) {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const fadeInAnimation = element.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], {
                duration,
                easing: 'ease-out'
            });
            
            fadeInAnimation.addEventListener('finish', () => {
                element.style.opacity = '1';
            });
            
            return fadeInAnimation;
        },

        /**
         * Anime la disparition d'un élément
         */
        fadeOut(element, duration = 300) {
            const fadeOutAnimation = element.animate([
                { opacity: 1 },
                { opacity: 0 }
            ], {
                duration,
                easing: 'ease-in'
            });
            
            fadeOutAnimation.addEventListener('finish', () => {
                element.style.display = 'none';
                element.style.opacity = '0';
            });
            
            return fadeOutAnimation;
        },

        /**
         * Anime le glissement d'un élément
         */
        slideDown(element, duration = 300) {
            const height = element.scrollHeight;
            element.style.height = '0px';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            
            const slideAnimation = element.animate([
                { height: '0px' },
                { height: height + 'px' }
            ], {
                duration,
                easing: 'ease-out'
            });
            
            slideAnimation.addEventListener('finish', () => {
                element.style.height = 'auto';
                element.style.overflow = 'visible';
            });
            
            return slideAnimation;
        }
    },

    /**
     * Gestion des événements
     */
    events: {
        /**
         * Debounce une fonction
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle une fonction
         */
        throttle(func, wait) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, wait);
                }
            };
        },

        /**
         * Délégation d'événements
         */
        delegate(container, selector, event, handler) {
            container.addEventListener(event, (e) => {
                if (e.target.matches(selector) || e.target.closest(selector)) {
                    handler.call(e.target.closest(selector), e);
                }
            });
        }
    },

    /**
     * Utilitaires de données
     */
    data: {
        /**
         * Clone profond d'un objet
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const clonedObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        clonedObj[key] = this.deepClone(obj[key]);
                    }
                }
                return clonedObj;
            }
        },

        /**
         * Fusion profonde d'objets
         */
        deepMerge(target, source) {
            const result = { ...target };
            
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        result[key] = this.deepMerge(target[key] || {}, source[key]);
                    } else {
                        result[key] = source[key];
                    }
                }
            }
            
            return result;
        },

        /**
         * Groupe un tableau d'objets par une propriété
         */
        groupBy(array, key) {
            return array.reduce((groups, item) => {
                const value = item[key];
                if (!groups[value]) {
                    groups[value] = [];
                }
                groups[value].push(item);
                return groups;
            }, {});
        },

        /**
         * Trie un tableau d'objets par une propriété
         */
        sortBy(array, key, direction = 'asc') {
            return [...array].sort((a, b) => {
                const aVal = a[key];
                const bVal = b[key];
                
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        },

        /**
         * Filtre un tableau d'objets par plusieurs critères
         */
        filterBy(array, filters) {
            return array.filter(item => {
                return Object.entries(filters).every(([key, value]) => {
                    if (value === null || value === undefined || value === '') return true;
                    
                    const itemValue = item[key];
                    if (typeof value === 'string') {
                        return itemValue.toString().toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            });
        }
    },

    /**
     * Utilitaires de stockage
     */
    storage: {
        /**
         * Sauvegarde avec expiration
         */
        setWithExpiry(key, value, ttl) {
            const now = new Date();
            const item = {
                value: value,
                expiry: now.getTime() + ttl
            };
            localStorage.setItem(key, JSON.stringify(item));
        },

        /**
         * Récupération avec vérification d'expiration
         */
        getWithExpiry(key) {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        },

        /**
         * Sauvegarde sécurisée en session
         */
        setSession(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Impossible de sauvegarder en session:', e);
                return false;
            }
        },

        /**
         * Récupération sécurisée de session
         */
        getSession(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Impossible de lire la session:', e);
                return defaultValue;
            }
        }
    },

    /**
     * Utilitaires UI
     */
    ui: {
        /**
         * Génère des classes CSS pour les badges de statut
         */
        getStatusBadgeClass(status) {
            const statusMap = {
                'active': 'badge-success',
                'inactive': 'badge-secondary',
                'online': 'badge-success',
                'offline': 'badge-danger',
                'dev': 'badge-info',
                'admin': 'badge-warning',
                'banned': 'badge-danger',
                'pending': 'badge-warning'
            };
            return statusMap[status] || 'badge-secondary';
        },

        /**
         * Génère des classes CSS pour les catégories de quêtes
         */
        getQuestCategoryClass(category) {
            const categoryMap = {
                'main': 'badge-danger',
                'side': 'badge-info',
                'daily': 'badge-warning',
                'event': 'badge-success'
            };
            return categoryMap[category] || 'badge-secondary';
        },

        /**
         * Génère une couleur aléatoire pour les graphiques
         */
        generateColor(index = 0) {
            const colors = [
                '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
                '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
            ];
            return colors[index % colors.length];
        },

        /**
         * Calcule la couleur contrastante pour un fond
         */
        getContrastColor(hexColor) {
            const r = parseInt(hexColor.substr(1, 2), 16);
            const g = parseInt(hexColor.substr(3, 2), 16);
            const b = parseInt(hexColor.substr(5, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#000000' : '#ffffff';
        }
    },

    /**
     * Utilitaires de sécurité
     */
    security: {
        /**
         * Échappe le HTML pour éviter les injections XSS
         */
        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        /**
         * Nettoie une chaîne pour utilisation en tant qu'ID
         */
        sanitizeId(str) {
            return str.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        },

        /**
         * Valide et nettoie une URL
         */
        sanitizeUrl(url) {
            try {
                const urlObj = new URL(url);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                    return null;
                }
                return urlObj.toString();
            } catch {
                return null;
            }
        }
    },

    /**
     * Utilitaires de performance
     */
    performance: {
        /**
         * Mesure le temps d'exécution d'une fonction
         */
        async measureTime(fn, label = 'Operation') {
            const start = performance.now();
            const result = await fn();
            const end = performance.now();
            console.log(`⏱️ [${label}] ${(end - start).toFixed(2)}ms`);
            return result;
        },

        /**
         * Crée un observateur d'intersection pour le lazy loading
         */
        createIntersectionObserver(callback, options = {}) {
            const defaultOptions = {
                root: null,
                rootMargin: '50px',
                threshold: 0.1
            };
            
            return new IntersectionObserver(callback, { ...defaultOptions, ...options });
        },

        /**
         * Lazy loading d'images
         */
        lazyLoadImages(container = document) {
            const images = container.querySelectorAll('img[data-src]');
            
            if ('IntersectionObserver' in window) {
                const imageObserver = this.createIntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    });
                });
                
                images.forEach(img => imageObserver.observe(img));
            } else {
                // Fallback pour les navigateurs sans IntersectionObserver
                images.forEach(img => {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
            }
        }
    },

    /**
     * Utilitaires de développement
     */
    dev: {
        /**
         * Log avec timestamp et couleur
         */
        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const styles = {
                info: 'color: #3498db',
                success: 'color: #27ae60',
                warning: 'color: #f39c12',
                error: 'color: #e74c3c'
            };
            
            console.log(`%c[${timestamp}] ${message}`, styles[type] || styles.info);
        },

        /**
         * Crée un mock de données pour les tests
         */
        createMockData(template, count = 10) {
            return Array.from({ length: count }, (_, index) => {
                const mock = {};
                Object.entries(template).forEach(([key, generator]) => {
                    if (typeof generator === 'function') {
                        mock[key] = generator(index);
                    } else {
                        mock[key] = generator;
                    }
                });
                return mock;
            });
        }
    }
};

// Export pour les builds
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminHelpers;
} else {
    window.AdminHelpers = AdminHelpers;
}
