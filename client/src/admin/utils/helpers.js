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
