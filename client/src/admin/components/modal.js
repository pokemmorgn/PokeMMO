/**
 * Gestionnaire de modales pour l'Admin Panel
 * Crée et gère des modales dynamiques avec différentes options
 */
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.container = null;
        this.zIndexBase = 1000;
        this.defaultOptions = {
            size: 'medium',
            closable: true,
            backdrop: true,
            keyboard: true,
            animation: true,
            centerVertically: true
        };
        
        this.init();
    }

    init() {
        this.createContainer();
        this.bindEvents();
        this.injectStyles();
    }

    createContainer() {
        this.container = document.getElementById('modal-container');
        
        if (!this.container) {
            this.container = AdminHelpers.dom.createElement('div', {
                id: 'modal-container',
                className: 'modal-container'
            });
            document.body.appendChild(this.container);
        }
    }

    injectStyles() {
        if (document.getElementById('modal-styles')) return;

        const styles = `
            .modal-container {
                position: relative;
                z-index: 1000;
            }

            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: inherit;
            }

            .modal-overlay.show {
                opacity: 1;
            }

            .modal-dialog {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-height: 90vh;
                overflow: hidden;
                transform: scale(0.8) translateY(-50px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                margin: 20px;
                width: 100%;
                max-width: var(--modal-width);
                position: relative;
            }

            .modal-overlay.show .modal-dialog {
                transform: scale(1) translateY(0);
            }

            .modal-dialog.small { --modal-width: 400px; }
            .modal-dialog.medium { --modal-width: 600px; }
            .modal-dialog.large { --modal-width: 900px; }
            .modal-dialog.xlarge { --modal-width: 1200px; }
            .modal-dialog.fullscreen { 
                --modal-width: 95vw; 
                max-height: 95vh;
                margin: 2.5vh 2.5vw;
            }

            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #f8f9fa;
                border-radius: 12px 12px 0 0;
            }

            .modal-title {
                margin: 0;
                color: #2c3e50;
                font-size: 1.25rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6c757d;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .modal-close:hover {
                background: #e9ecef;
                color: #495057;
            }

            .modal-body {
                padding: 24px;
                max-height: calc(90vh - 140px);
                overflow-y: auto;
            }

            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
                border-radius: 0 0 12px 12px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-footer.space-between {
                justify-content: space-between;
            }

            .modal-footer.center {
                justify-content: center;
            }

            .modal-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: #6c757d;
            }

            .modal-loading .spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 16px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .modal-dialog {
                    margin: 10px;
                    --modal-width: calc(100vw - 20px) !important;
                    max-height: calc(100vh - 20px);
                }
                
                .modal-body {
                    max-height: calc(100vh - 160px);
                }
            }
        `;

        const styleSheet = AdminHelpers.dom.createElement('style', {
            id: 'modal-styles'
        }, styles);
        
        document.head.appendChild(styleSheet);
    }

    bindEvents() {
        // Fermeture par clic sur l'overlay
        AdminHelpers.events.delegate(this.container, '.modal-overlay', 'click', (e) => {
            if (e.target === e.currentTarget) {
                const modalId = e.target.dataset.modalId;
                const modal = this.modals.get(modalId);
                if (modal && modal.options.backdrop) {
                    this.close(modalId);
                }
            }
        });

        // Fermeture par bouton close
        AdminHelpers.events.delegate(this.container, '.modal-close', 'click', (e) => {
            const overlay = e.target.closest('.modal-overlay');
            if (overlay) {
                this.close(overlay.dataset.modalId);
            }
        });

        // Fermeture par Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModals = Array.from(this.modals.values())
                    .filter(modal => modal.element.classList.contains('show'))
                    .sort((a, b) => b.zIndex - a.zIndex);
                
                if (activeModals.length > 0 && activeModals[0].options.keyboard) {
                    this.close(activeModals[0].id);
                }
            }
        });
    }

    /**
     * Ouvre une modale
     */
    open(content, options = {}) {
        const finalOptions = { ...this.defaultOptions, ...options };
        const id = this.generateId();
        
        const modal = this.createModal(id, content, finalOptions);
        this.container.appendChild(modal.element);
        
        // Calculer le z-index
        const zIndex = this.zIndexBase + this.modals.size * 10;
        modal.element.style.zIndex = zIndex;
        modal.zIndex = zIndex;
        
        // Stocker la référence
        this.modals.set(id, modal);
        
        // Animation d'ouverture
        requestAnimationFrame(() => {
            modal.element.classList.add('show');
        });

        // Bloquer le scroll du body
        this.updateBodyScroll();
        
        // Focus management
        this.manageFocus(modal.element);
        
        return {
            id,
            close: () => this.close(id),
            update: (newContent) => this.updateContent(id, newContent),
            setLoading: (loading) => this.setLoading(id, loading),
            addFooterButton: (text, onClick, className = 'btn btn-secondary') => 
                this.addFooterButton(id, text, onClick, className)
        };
    }

    /**
     * Ferme une modale
     */
    close(id) {
        const modal = this.modals.get(id);
        if (!modal) return;

        // Callback avant fermeture
        if (modal.options.onClose && modal.options.onClose() === false) {
            return; // Annuler la fermeture
        }

        // Animation de fermeture
        modal.element.classList.remove('show');
        
        setTimeout(() => {
            if (modal.element.parentNode) {
                modal.element.parentNode.removeChild(modal.element);
            }
            this.modals.delete(id);
            this.updateBodyScroll();
        }, 300);
    }

    /**
     * Ferme toutes les modales
     */
    closeAll() {
        Array.from(this.modals.keys()).forEach(id => this.close(id));
    }

    /**
     * Met à jour le contenu d'une modale
     */
    updateContent(id, content) {
        const modal = this.modals.get(id);
        if (!modal) return false;

        const body = modal.element.querySelector('.modal-body');
        if (body) {
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else {
                body.innerHTML = '';
                body.appendChild(content);
            }
        }
        
        return true;
    }

    /**
     * Active/désactive le mode loading
     */
    setLoading(id, loading) {
        const modal = this.modals.get(id);
        if (!modal) return false;

        const body = modal.element.querySelector('.modal-body');
        if (!body) return false;

        if (loading) {
            modal.originalContent = body.innerHTML;
            body.innerHTML = `
                <div class="modal-loading">
                    <div class="spinner"></div>
                    Chargement...
                </div>
            `;
        } else if (modal.originalContent) {
            body.innerHTML = modal.originalContent;
            delete modal.originalContent;
        }

        return true;
    }

    /**
     * Ajoute un bouton au footer
     */
    addFooterButton(id, text, onClick, className = 'btn btn-secondary') {
        const modal = this.modals.get(id);
        if (!modal) return false;

        let footer = modal.element.querySelector('.modal-footer');
        if (!footer) {
            footer = AdminHelpers.dom.createElement('div', {
                className: 'modal-footer'
            });
            modal.element.querySelector('.modal-dialog').appendChild(footer);
        }

        const button = AdminHelpers.dom.createElement('button', {
            className,
            onclick: onClick
        }, text);

        footer.appendChild(button);
        return true;
    }

    createModal(id, content, options) {
        // Overlay principal
        const overlay = AdminHelpers.dom.createElement('div', {
            className: 'modal-overlay',
            dataset: { modalId: id }
        });

        // Dialog
        const dialog = AdminHelpers.dom.createElement('div', {
            className: `modal-dialog ${options.size}`
        });

        // Header si titre fourni
        if (options.title) {
            const header = AdminHelpers.dom.createElement('div', {
                className: 'modal-header'
            });

            const title = AdminHelpers.dom.createElement('h4', {
                className: 'modal-title'
            }, options.title);

            header.appendChild(title);

            if (options.closable) {
                const closeBtn = AdminHelpers.dom.createElement('button', {
                    className: 'modal-close',
                    'aria-label': 'Fermer'
                }, '×');
                header.appendChild(closeBtn);
            }

            dialog.appendChild(header);
        }

        // Body
        const body = AdminHelpers.dom.createElement('div', {
            className: 'modal-body'
        });

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }

        dialog.appendChild(body);

        // Footer si boutons fournis
        if (options.buttons && options.buttons.length > 0) {
            const footer = AdminHelpers.dom.createElement('div', {
                className: 'modal-footer'
            });

            options.buttons.forEach(btn => {
                const button = AdminHelpers.dom.createElement('button', {
                    className: btn.className || 'btn btn-secondary',
                    onclick: btn.onClick
                }, btn.text);
                footer.appendChild(button);
            });

            dialog.appendChild(footer);
        }

        overlay.appendChild(dialog);

        return {
            id,
            element: overlay,
            options,
            zIndex: 0
        };
    }

    updateBodyScroll() {
        const hasOpenModals = this.modals.size > 0;
        document.body.style.overflow = hasOpenModals ? 'hidden' : '';
    }

    manageFocus(modalElement) {
        // Focus sur le premier élément focusable
        const focusableElements = modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    generateId() {
        return 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ===== MÉTHODES PRÉDÉFINIES =====

    /**
     * Modale de confirmation
     */
    confirm(message, title = 'Confirmation', options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div style="text-align: center; padding: 20px 0;">
                    <i class="fas fa-question-circle" style="font-size: 48px; color: #f39c12; margin-bottom: 20px;"></i>
                    <p style="font-size: 16px; color: #2c3e50; margin: 0;">${AdminHelpers.security.escapeHtml(message)}</p>
                </div>
            `;

            this.open(content, {
                title,
                size: 'small',
                buttons: [
                    {
                        text: 'Annuler',
                        className: 'btn btn-secondary',
                        onClick: () => {
                            resolve(false);
                            this.closeAll();
                        }
                    },
                    {
                        text: 'Confirmer',
                        className: 'btn btn-primary',
                        onClick: () => {
                            resolve(true);
                            this.closeAll();
                        }
                    }
                ],
                ...options
            });
        });
    }

    /**
     * Modale d'alerte
     */
    alert(message, title = 'Information', type = 'info') {
        const icons = {
            info: { icon: 'fa-info-circle', color: '#3498db' },
            success: { icon: 'fa-check-circle', color: '#27ae60' },
            warning: { icon: 'fa-exclamation-triangle', color: '#f39c12' },
            error: { icon: 'fa-exclamation-circle', color: '#e74c3c' }
        };

        const iconData = icons[type] || icons.info;

        return new Promise((resolve) => {
            const content = `
                <div style="text-align: center; padding: 20px 0;">
                    <i class="fas ${iconData.icon}" style="font-size: 48px; color: ${iconData.color}; margin-bottom: 20px;"></i>
                    <p style="font-size: 16px; color: #2c3e50; margin: 0;">${AdminHelpers.security.escapeHtml(message)}</p>
                </div>
            `;

            this.open(content, {
                title,
                size: 'small',
                buttons: [
                    {
                        text: 'OK',
                        className: 'btn btn-primary',
                        onClick: () => {
                            resolve();
                            this.closeAll();
                        }
                    }
                ]
            });
        });
    }

    /**
     * Modale de prompt
     */
    prompt(message, defaultValue = '', title = 'Saisie') {
        return new Promise((resolve) => {
            const inputId = 'prompt_input_' + Date.now();
            const content = `
                <div style="padding: 20px 0;">
                    <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">${AdminHelpers.security.escapeHtml(message)}</p>
                    <input type="text" id="${inputId}" class="form-input" value="${AdminHelpers.security.escapeHtml(defaultValue)}" style="width: 100%;">
                </div>
            `;

            const modal = this.open(content, {
                title,
                size: 'small',
                buttons: [
                    {
                        text: 'Annuler',
                        className: 'btn btn-secondary',
                        onClick: () => {
                            resolve(null);
                            this.closeAll();
                        }
                    },
                    {
                        text: 'OK',
                        className: 'btn btn-primary',
                        onClick: () => {
                            const input = document.getElementById(inputId);
                            resolve(input ? input.value : '');
                            this.closeAll();
                        }
                    }
                ]
            });

            // Focus sur l'input après ouverture
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }

    /**
     * Modale de détails de joueur
     */
    showPlayerDetails(playerData) {
        const content = `
            <div class="player-details">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <h4>Informations Générales</h4>
                        <p><strong>Username:</strong> ${playerData.username}</p>
                        <p><strong>Email:</strong> ${playerData.email || 'N/A'}</p>
                        <p><strong>Niveau:</strong> ${playerData.level || 1}</p>
                        <p><strong>Gold:</strong> ${AdminHelpers.formatters.number(playerData.gold || 0)}</p>
                        <p><strong>Créé le:</strong> ${AdminHelpers.formatters.date(playerData.createdAt)}</p>
                        <p><strong>Dernière connexion:</strong> ${AdminHelpers.formatters.date(playerData.lastLogin)}</p>
                    </div>
                    <div>
                        <h4>Position</h4>
                        <p><strong>Carte:</strong> ${playerData.lastMap || 'N/A'}</p>
                        <p><strong>Position:</strong> (${playerData.lastX || 0}, ${playerData.lastY || 0})</p>
                        <p><strong>Temps de jeu:</strong> ${playerData.totalPlaytime || 0} minutes</p>
                    </div>
                    <div>
                        <h4>Statistiques</h4>
                        <p><strong>Pokémon:</strong> ${playerData.stats?.totalPokemon || 0}</p>
                        <p><strong>Quêtes actives:</strong> ${playerData.stats?.activeQuests || 0}</p>
                        <p><strong>Quêtes terminées:</strong> ${playerData.stats?.completedQuests || 0}</p>
                    </div>
                    <div>
                        <h4>Statut</h4>
                        <p><strong>Actif:</strong> ${playerData.isActive ? '✅' : '❌'}</p>
                        <p><strong>Développeur:</strong> ${playerData.isDev ? '✅' : '❌'}</p>
                        <p><strong>Banni:</strong> ${playerData.isBanned ? '❌' : '✅'}</p>
                        <p><strong>Wallet:</strong> ${playerData.walletAddress ? '🔗' : '❌'}</p>
                    </div>
                </div>
            </div>
        `;

        return this.open(content, {
            title: `<i class="fas fa-user-circle"></i> Détails du Joueur - ${playerData.username}`,
            size: 'large',
            buttons: [
                {
                    text: 'Éditer',
                    className: 'btn btn-primary',
                    onClick: () => {
                        this.closeAll();
                        // Déclencher l'édition
                        if (window.adminApp && window.adminApp.currentModule) {
                            window.adminApp.currentModule.editPlayer(playerData.username);
                        }
                    }
                },
                {
                    text: 'Fermer',
                    className: 'btn btn-secondary',
                    onClick: () => this.closeAll()
                }
            ]
        });
    }
}

// Export pour les builds
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
} else {
    window.ModalManager = ModalManager;
}
