/**
 * Gestionnaire de notifications pour l'Admin Panel
 * Affiche des notifications toast avec différents types et options
 */
class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.defaultOptions = {
            duration: 4000,
            showIcon: true,
            closable: true,
            position: 'top-right',
            maxNotifications: 5
        };
        
        this.init();
    }

    init() {
        this.createContainer();
        this.bindEvents();
    }

    createContainer() {
        // Vérifier si le container existe déjà
        this.container = document.getElementById('notification-container');
        
        if (!this.container) {
            this.container = AdminHelpers.dom.createElement('div', {
                id: 'notification-container',
                className: 'notification-container'
            });
            document.body.appendChild(this.container);
        }

        // Ajouter les styles CSS si nécessaire
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('notification-styles')) return;

        const styles = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            }

            .notification {
                background: white;
                border-radius: 8px;
                padding: 16px 20px;
                margin-bottom: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-left: 4px solid #3498db;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: auto;
                position: relative;
                overflow: hidden;
                max-width: 100%;
                word-wrap: break-word;
            }

            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .notification.success {
                border-left-color: #27ae60;
                background: linear-gradient(135deg, #d5f5d6 0%, #ffffff 100%);
            }

            .notification.error {
                border-left-color: #e74c3c;
                background: linear-gradient(135deg, #f8d7da 0%, #ffffff 100%);
            }

            .notification.warning {
                border-left-color: #f39c12;
                background: linear-gradient(135deg, #fff3cd 0%, #ffffff 100%);
            }

            .notification.info {
                border-left-color: #3498db;
                background: linear-gradient(135deg, #d1ecf1 0%, #ffffff 100%);
            }

            .notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }

            .notification-icon {
                font-size: 18px;
                margin-top: 2px;
                flex-shrink: 0;
            }

            .notification-icon.success { color: #27ae60; }
            .notification-icon.error { color: #e74c3c; }
            .notification-icon.warning { color: #f39c12; }
            .notification-icon.info { color: #3498db; }

            .notification-body {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 4px;
                font-size: 14px;
            }

            .notification-message {
                color: #5a6c7d;
                font-size: 13px;
                line-height: 1.4;
            }

            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 16px;
                color: #95a5a6;
                cursor: pointer;
                padding: 4px;
                line-height: 1;
                transition: color 0.2s ease;
            }

            .notification-close:hover {
                color: #7f8c8d;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(0, 0, 0, 0.1);
                transition: width linear;
            }

            .notification-progress.success { background: #27ae60; }
            .notification-progress.error { background: #e74c3c; }
            .notification-progress.warning { background: #f39c12; }
            .notification-progress.info { background: #3498db; }

            @media (max-width: 480px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;

        const styleSheet = AdminHelpers.dom.createElement('style', {
            id: 'notification-styles'
        }, styles);
        
        document.head.appendChild(styleSheet);
    }

    bindEvents() {
        // Délégation d'événements pour les boutons de fermeture
        AdminHelpers.events.delegate(this.container, '.notification-close', 'click', (e) => {
            const notification = e.target.closest('.notification');
            if (notification) {
                this.dismiss(notification.dataset.id);
            }
        });

        // Pause/reprise au hover
        AdminHelpers.events.delegate(this.container, '.notification', 'mouseenter', (e) => {
            const id = e.target.dataset.id;
            const notif = this.notifications.get(id);
            if (notif && notif.timer) {
                clearTimeout(notif.timer);
            }
        });

        AdminHelpers.events.delegate(this.container, '.notification', 'mouseleave', (e) => {
            const id = e.target.dataset.id;
            const notif = this.notifications.get(id);
            if (notif && notif.options.duration > 0) {
                this.setAutoHide(id, notif.options.duration);
            }
        });
    }

    /**
     * Affiche une notification
     */
    show(message, type = 'info', options = {}) {
        const finalOptions = { ...this.defaultOptions, ...options };
        const id = this.generateId();

        // Limiter le nombre de notifications
        this.enforceMaxNotifications(finalOptions.maxNotifications);

        const notification = this.createNotification(id, message, type, finalOptions);
        this.container.appendChild(notification);

        // Animation d'entrée
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Stocker la référence
        this.notifications.set(id, {
            element: notification,
            options: finalOptions,
            timer: null
        });

        // Auto-hide si duration > 0
        if (finalOptions.duration > 0) {
            this.setAutoHide(id, finalOptions.duration);
        }

        return id;
    }

    /**
     * Méthodes raccourcies pour chaque type
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { duration: 6000, ...options });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Ferme une notification
     */
    dismiss(id) {
        const notif = this.notifications.get(id);
        if (!notif) return;

        // Nettoyer le timer
        if (notif.timer) {
            clearTimeout(notif.timer);
        }

        // Animation de sortie
        notif.element.classList.remove('show');
        
        setTimeout(() => {
            if (notif.element.parentNode) {
                notif.element.parentNode.removeChild(notif.element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Ferme toutes les notifications
     */
    clear() {
        Array.from(this.notifications.keys()).forEach(id => {
            this.dismiss(id);
        });
    }

    /**
     * Met à jour une notification existante
     */
    update(id, message, type = null) {
        const notif = this.notifications.get(id);
        if (!notif) return false;

        const messageElement = notif.element.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        if (type) {
            // Retirer l'ancienne classe de type
            notif.element.classList.remove('success', 'error', 'warning', 'info');
            notif.element.classList.add(type);

            // Mettre à jour l'icône
            const icon = notif.element.querySelector('.notification-icon');
            if (icon) {
                icon.className = `notification-icon ${type}`;
                icon.innerHTML = this.getIcon(type);
            }

            // Mettre à jour la barre de progression
            const progress = notif.element.querySelector('.notification-progress');
            if (progress) {
                progress.className = `notification-progress ${type}`;
            }
        }

        return true;
    }

    /**
     * Affiche une notification de progression
     */
    showProgress(message, type = 'info', options = {}) {
        const id = this.show(message, type, { duration: 0, ...options });
        const notif = this.notifications.get(id);
        
        if (notif) {
            const progressBar = notif.element.querySelector('.notification-progress');
            progressBar.style.width = '0%';
            progressBar.style.display = 'block';
        }
        
        return {
            id,
            updateProgress: (percent) => this.updateProgress(id, percent),
            updateMessage: (newMessage) => this.update(id, newMessage),
            complete: (successMessage = null) => {
                if (successMessage) {
                    this.update(id, successMessage, 'success');
                    setTimeout(() => this.dismiss(id), 2000);
                } else {
                    this.dismiss(id);
                }
            }
        };
    }

    updateProgress(id, percent) {
        const notif = this.notifications.get(id);
        if (!notif) return;

        const progressBar = notif.element.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
        }
    }

    createNotification(id, message, type, options) {
        const notification = AdminHelpers.dom.createElement('div', {
            className: `notification ${type}`,
            dataset: { id }
        });

        const content = AdminHelpers.dom.createElement('div', {
            className: 'notification-content'
        });

        // Icône
        if (options.showIcon) {
            const icon = AdminHelpers.dom.createElement('div', {
                className: `notification-icon ${type}`
            }, this.getIcon(type));
            content.appendChild(icon);
        }

        // Corps du message
        const body = AdminHelpers.dom.createElement('div', {
            className: 'notification-body'
        });

        // Titre si fourni
        if (options.title) {
            const title = AdminHelpers.dom.createElement('div', {
                className: 'notification-title'
            }, AdminHelpers.security.escapeHtml(options.title));
            body.appendChild(title);
        }

        // Message
        const messageElement = AdminHelpers.dom.createElement('div', {
            className: 'notification-message'
        }, AdminHelpers.security.escapeHtml(message));
        body.appendChild(messageElement);

        content.appendChild(body);
        notification.appendChild(content);

        // Bouton de fermeture
        if (options.closable) {
            const closeBtn = AdminHelpers.dom.createElement('button', {
                className: 'notification-close',
                'aria-label': 'Fermer'
            }, '×');
            notification.appendChild(closeBtn);
        }

        // Barre de progression
        if (options.duration > 0) {
            const progress = AdminHelpers.dom.createElement('div', {
                className: `notification-progress ${type}`
            });
            notification.appendChild(progress);
        }

        return notification;
    }

    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    setAutoHide(id, duration) {
        const notif = this.notifications.get(id);
        if (!notif) return;

        const progressBar = notif.element.querySelector('.notification-progress');
        
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.transition = `width ${duration}ms linear`;
            
            // Reset puis animer
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        }

        notif.timer = setTimeout(() => {
            this.dismiss(id);
        }, duration);
    }

    enforceMaxNotifications(max) {
        const currentNotifications = Array.from(this.notifications.keys());
        
        if (currentNotifications.length >= max) {
            // Fermer les plus anciennes
            const toRemove = currentNotifications.slice(0, currentNotifications.length - max + 1);
            toRemove.forEach(id => this.dismiss(id));
        }
    }

    generateId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Méthodes utilitaires pour les modules
    showLoading(message = 'Chargement en cours...') {
        return this.showProgress(message, 'info');
    }

    showSaving(message = 'Sauvegarde en cours...') {
        return this.showProgress(message, 'info');
    }

    showApiError(error) {
        const message = error.message || 'Une erreur est survenue';
        return this.error(`Erreur API: ${message}`, { duration: 6000 });
    }

    showValidationError(fields) {
        const message = Array.isArray(fields) 
            ? `Erreurs de validation: ${fields.join(', ')}`
            : `Erreur de validation: ${fields}`;
        return this.warning(message, { duration: 5000 });
    }
}

// Export pour les builds
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
} else {
    window.NotificationManager = NotificationManager;
}
