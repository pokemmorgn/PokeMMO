/**
 * Gestionnaire API centralisé pour l'Admin Panel
 * Gère toutes les communications avec le serveur
 */
class AdminAPI {
    constructor(token) {
        this.token = token;
        this.baseURL = '/api/admin';
        this.requestQueue = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Effectuer un appel API
     * @param {string} endpoint - Point de terminaison de l'API
     * @param {Object} options - Options de la requête
     * @returns {Promise<Object>} Réponse de l'API
     */
    async call(endpoint, options = {}) {
        const requestId = this.generateRequestId(endpoint, options);
        
        // Éviter les doublons de requêtes
        if (this.requestQueue.has(requestId)) {
            return this.requestQueue.get(requestId);
        }

        console.log(`📡 [AdminAPI] ${options.method || 'GET'} ${endpoint}`);
        console.log('🎫 [AdminAPI] Token:', this.token ? this.token.substring(0, 20) + '...' : 'NONE');
        
        const requestPromise = this.executeRequest(endpoint, options);
        this.requestQueue.set(requestId, requestPromise);
        
        try {
            const result = await requestPromise;
            this.requestQueue.delete(requestId);
            return result;
        } catch (error) {
            this.requestQueue.delete(requestId);
            throw error;
        }
    }

    async executeRequest(endpoint, options, attempt = 1) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: options.method || 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                ...options
            });

            console.log(`📡 [AdminAPI] Response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                await this.handleErrorResponse(response);
            }

            return await response.json();

        } catch (error) {
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                console.log(`🔄 [AdminAPI] Tentative ${attempt + 1}/${this.retryAttempts} dans ${this.retryDelay}ms`);
                await this.delay(this.retryDelay * attempt);
                return this.executeRequest(endpoint, options, attempt + 1);
            }
            
            throw error;
        }
    }

    async handleErrorResponse(response) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }

        console.error('❌ [AdminAPI] Erreur API:', errorData);

        // Gestion spécifique des erreurs d'authentification
        if (response.status === 401 || response.status === 403) {
            console.log('🔐 [AdminAPI] Token expiré, redirection vers /auth');
            sessionStorage.removeItem('sessionToken');
            setTimeout(() => window.location.href = '/auth', 1000);
            throw new Error('Session expirée');
        }

        throw new Error(errorData.error || `Erreur ${response.status}`);
    }

    shouldRetry(error) {
        // Retry pour les erreurs réseau, pas pour les erreurs d'authentification
        return error.name === 'TypeError' || 
               (error.message && error.message.includes('fetch'));
    }

    generateRequestId(endpoint, options) {
        return `${options.method || 'GET'}_${endpoint}_${JSON.stringify(options.body || {})}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== MÉTHODES SPÉCIALISÉES =====

    /**
     * Dashboard
     */
    async getDashboard() {
        return this.call('/dashboard');
    }

    async getServerStats() {
        return this.call('/stats');
    }

    /**
     * Joueurs
     */
    async getPlayers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.call(`/players${queryString ? `?${queryString}` : ''}`);
    }

    async getPlayer(username) {
        return this.call(`/players/${encodeURIComponent(username)}`);
    }

    async updatePlayer(username, data) {
        return this.call(`/players/${encodeURIComponent(username)}`, {
            method: 'PUT',
            body: data
        });
    }

    async bulkPlayerAction(action, usernames) {
        return this.call('/bulk-actions', {
            method: 'POST',
            body: { action, usernames }
        });
    }

    /**
     * Quêtes
     */
    async getQuests(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.call(`/quests${queryString ? `?${queryString}` : ''}`);
    }

    async getQuest(questId) {
        return this.call(`/quests/${encodeURIComponent(questId)}`);
    }

    async saveQuest(questData) {
        const method = questData.id && await this.questExists(questData.id) ? 'PUT' : 'POST';
        const endpoint = method === 'PUT' ? `/quests/${questData.id}` : '/quests';
        
        return this.call(endpoint, {
            method,
            body: questData
        });
    }

    async deleteQuest(questId) {
        return this.call(`/quests/${encodeURIComponent(questId)}`, {
            method: 'DELETE'
        });
    }

    async duplicateQuest(questId) {
        return this.call(`/quests/${encodeURIComponent(questId)}/duplicate`, {
            method: 'POST'
        });
    }

    async reloadQuestSystem() {
        return this.call('/quests/reload', {
            method: 'POST'
        });
    }

    async getQuestBackups() {
        return this.call('/quests/backups');
    }

    async restoreQuestBackup(filename) {
        return this.call(`/quests/restore/${encodeURIComponent(filename)}`, {
            method: 'POST'
        });
    }

    async questExists(questId) {
        try {
            await this.getQuest(questId);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Logs
     */
    async getLogs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.call(`/logs${queryString ? `?${queryString}` : ''}`);
    }

    async clearLogs() {
        return this.call('/logs', {
            method: 'DELETE'
        });
    }

    /**
     * Outils
     */
    async getSystemInfo() {
        return this.call('/system/info');
    }

    async restartGameRooms() {
        return this.call('/system/restart-rooms', {
            method: 'POST'
        });
    }

    async getActiveConnections() {
        return this.call('/system/connections');
    }

    async emergencyShutdown() {
        return this.call('/system/shutdown', {
            method: 'POST'
        });
    }

    async optimizeDatabase() {
        return this.call('/database/optimize', {
            method: 'POST'
        });
    }

    async backupDatabase() {
        return this.call('/database/backup', {
            method: 'POST'
        });
    }

    async getDatabaseStats() {
        return this.call('/database/stats');
    }

    // ===== UTILITAIRES =====

    /**
     * Upload de fichier
     */
    async uploadFile(file, endpoint) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        return response.json();
    }

    /**
     * Télécharger un fichier
     */
    async downloadFile(endpoint, filename) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * WebSocket pour les données en temps réel
     */
    createWebSocket(endpoint) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/admin${endpoint}?token=${this.token}`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.addEventListener('error', (error) => {
            console.error('❌ [AdminAPI] WebSocket Error:', error);
        });
        
        return ws;
    }
}

// Export pour les builds
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAPI;
} else {
    window.AdminAPI = AdminAPI;
}
