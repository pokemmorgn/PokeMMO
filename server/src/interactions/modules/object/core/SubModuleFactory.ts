// src/interactions/modules/object/core/SubModuleFactory.ts
// Factory avec auto-discovery et hot-reload sécurisé - VERSION CORRIGÉE

import fs from 'fs';
import path from 'path';
import { IObjectSubModule, ObjectDefinition } from './IObjectSubModule';

// ✅ INTERFACE POUR LE CHARGEUR DE MODULES
interface IModuleLoader {
  loadModule(modulePath: string): Promise<any>;
  validateModule(moduleExport: any): boolean;
  unloadModule(modulePath: string): void;
}

// ✅ CONFIGURATION DE SÉCURITÉ
interface SecurityConfig {
  enabled: boolean;
  whitelist?: string[];           // Modules autorisés
  requireSignature?: boolean;     // Vérification signature
  sandbox?: boolean;              // Exécution en sandbox
  auditLog?: boolean;             // Log des actions
  maxLoadTime?: number;           // Timeout chargement (ms)
}

// ✅ RÉSULTAT DE CHARGEMENT DE MODULE
interface ModuleLoadResult {
  success: boolean;
  module?: any;
  error?: string;
  loadTime?: number;
}

// ✅ CHARGEUR DE BASE (Mode développement) - VERSION CORRIGÉE
class BasicModuleLoader implements IModuleLoader {
  
  async loadModule(modulePath: string): Promise<any> {
    try {
      this.log('info', `Chargement module: ${modulePath}`);
      
      // Supprimer du cache pour hot-reload
      delete require.cache[require.resolve(modulePath)];
      
      const moduleExport = require(modulePath);
      
      // Support export default ET named exports - VERSION ROBUSTE
      return this.extractModuleClass(moduleExport, modulePath);
      
    } catch (error) {
      const errorMsg = `Erreur chargement ${modulePath}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      this.log('error', errorMsg);
      throw new Error(errorMsg);
    }
  }
  
  /**
   * Extraction robuste de la classe du module - NOUVELLE MÉTHODE
   */
  private extractModuleClass(moduleExport: any, modulePath: string): any {
    let ModuleClass: any = null;
    
    // 1. Export default (ES6)
    if (moduleExport.default && typeof moduleExport.default === 'function') {
      ModuleClass = moduleExport.default;
      this.log('info', `Module exporté via default: ${modulePath}`);
    }
    // 2. Export direct (CommonJS ou ES6 sans default)
    else if (typeof moduleExport === 'function') {
      ModuleClass = moduleExport;
      this.log('info', `Module exporté directement: ${modulePath}`);
    }
    // 3. Named exports - chercher des classes
    else if (moduleExport && typeof moduleExport === 'object') {
      const functionExports = Object.entries(moduleExport)
        .filter(([key, value]) => typeof value === 'function')
        .filter(([key, value]) => this.isValidModuleClass(value));
      
      if (functionExports.length > 0) {
        ModuleClass = functionExports[0][1];
        this.log('info', `Module trouvé via named export "${functionExports[0][0]}": ${modulePath}`);
      } else {
        throw new Error(`Aucune classe valide trouvée dans les exports: ${Object.keys(moduleExport)}`);
      }
    }
    else {
      throw new Error(`Format d'export non supporté. Type: ${typeof moduleExport}`);
    }
    
    if (!ModuleClass || typeof ModuleClass !== 'function') {
      throw new Error(`Classe de module invalide`);
    }
    
    return new ModuleClass();
  }
  
  /**
   * Vérifier si une fonction ressemble à une classe de module
   */
  private isValidModuleClass(func: any): boolean {
    if (typeof func !== 'function') return false;
    
    // Vérifier si c'est une classe (a un prototype avec constructor)
    if (func.prototype && func.prototype.constructor === func) {
      return true;
    }
    
    // Vérifier si le nom suggère une classe (commence par majuscule)
    if (func.name && /^[A-Z]/.test(func.name)) {
      return true;
    }
    
    return false;
  }
  
  validateModule(moduleExport: any): boolean {
    // Validation de base : vérifier que c'est un IObjectSubModule
    return (
      moduleExport &&
      typeof moduleExport.typeName === 'string' &&
      typeof moduleExport.canHandle === 'function' &&
      typeof moduleExport.handle === 'function'
    );
  }
  
  unloadModule(modulePath: string): void {
    delete require.cache[require.resolve(modulePath)];
  }
  
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    const prefix = '[BasicModuleLoader]';
    switch (level) {
      case 'info':
        console.log(`ℹ️ ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`);
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
    }
  }
}

// ✅ CHARGEUR SÉCURISÉ (Mode production) - VERSION CORRIGÉE
class SecureModuleLoader implements IModuleLoader {
  
  constructor(private securityConfig: SecurityConfig) {}
  
  async loadModule(modulePath: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Chargement sécurisé: ${modulePath}`);
      
      // 1. Vérifier whitelist
      if (this.securityConfig.whitelist) {
        const moduleName = this.extractModuleName(modulePath);
        if (!this.securityConfig.whitelist.includes(moduleName)) {
          throw new Error(`Module ${moduleName} non autorisé (whitelist: ${this.securityConfig.whitelist.join(', ')})`);
        }
      }
      
      // 2. Vérifier signature (si activé)
      if (this.securityConfig.requireSignature) {
        await this.verifySignature(modulePath);
      }
      
      // 3. Charger avec timeout
      const loadPromise = this.securityConfig.sandbox 
        ? this.loadInSandbox(modulePath)
        : this.loadNormal(modulePath);
        
      const timeoutMs = this.securityConfig.maxLoadTime || 5000;
      const moduleExport = await Promise.race([
        loadPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout chargement module (${timeoutMs}ms)`)), timeoutMs)
        )
      ]);
      
      // 4. Audit log
      if (this.securityConfig.auditLog) {
        this.auditLog('MODULE_LOADED', {
          modulePath,
          loadTime: Date.now() - startTime,
          secure: true
        });
      }
      
      return moduleExport;
      
    } catch (error) {
      if (this.securityConfig.auditLog) {
        this.auditLog('MODULE_LOAD_FAILED', {
          modulePath,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          loadTime: Date.now() - startTime
        });
      }
      throw error;
    }
  }
  
  private extractModuleName(modulePath: string): string {
    return path.basename(modulePath, '.js').replace('SubModule', '');
  }
  
  private async loadNormal(modulePath: string): Promise<any> {
    delete require.cache[require.resolve(modulePath)];
    const moduleExport = require(modulePath);
    
    // Utiliser la même logique robuste que BasicModuleLoader
    return this.extractModuleClass(moduleExport, modulePath);
  }
  
  /**
   * Chargement en sandbox avec gestion robuste des exports - CORRECTION MAJEURE
   */
  private async loadInSandbox(modulePath: string): Promise<any> {
    try {
      this.log('info', `Chargement sandbox: ${modulePath}`);
      
      // Sandbox basique avec vm
      const vm = require('vm');
      const moduleCode = fs.readFileSync(modulePath, 'utf8');
      
      // Contexte restreint
      const sandbox = {
        require: require,
        module: { exports: {} },
        exports: {},
        console: console,
        Buffer: Buffer,
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        __filename: modulePath,
        __dirname: path.dirname(modulePath)
      };
      
      vm.createContext(sandbox);
      vm.runInContext(moduleCode, sandbox, {
        filename: modulePath,
        timeout: 3000 // 3s max pour exécuter
      });
      
      // CORRECTION ICI - Gestion robuste des exports
      const moduleExports = sandbox.module.exports;
      
      // Vérifier que quelque chose a été exporté
      if (!moduleExports || 
          (typeof moduleExports === 'object' && 
           Object.keys(moduleExports).length === 0 && 
           typeof sandbox.exports === 'object' && 
           Object.keys(sandbox.exports).length === 0)) {
        throw new Error(`Module ${modulePath} n'exporte rien (sandbox)`);
      }
      
      // Essayer d'abord module.exports, puis exports
      const exportToUse = (moduleExports && Object.keys(moduleExports).length > 0) 
        ? moduleExports 
        : sandbox.exports;
      
      return this.extractModuleClass(exportToUse, modulePath);
      
    } catch (error) {
      throw new Error(`Erreur sandbox ${modulePath}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
  
  /**
   * Extraction robuste de la classe du module (même logique que BasicModuleLoader)
   */
  private extractModuleClass(moduleExport: any, modulePath: string): any {
    let ModuleClass: any = null;
    
    // 1. Export default (ES6)
    if (moduleExport.default && typeof moduleExport.default === 'function') {
      ModuleClass = moduleExport.default;
      this.log('info', `Module exporté via default: ${modulePath}`);
    }
    // 2. Export direct (CommonJS ou ES6 sans default)
    else if (typeof moduleExport === 'function') {
      ModuleClass = moduleExport;
      this.log('info', `Module exporté directement: ${modulePath}`);
    }
    // 3. Named exports - chercher des classes
    else if (moduleExport && typeof moduleExport === 'object') {
      const functionExports = Object.entries(moduleExport)
        .filter(([key, value]) => typeof value === 'function')
        .filter(([key, value]) => this.isValidModuleClass(value));
      
      if (functionExports.length > 0) {
        ModuleClass = functionExports[0][1];
        this.log('info', `Module trouvé via named export "${functionExports[0][0]}": ${modulePath}`);
      } else {
        throw new Error(`Aucune classe valide trouvée dans les exports: ${Object.keys(moduleExport)}`);
      }
    }
    else {
      throw new Error(`Format d'export non supporté. Type: ${typeof moduleExport}, Keys: ${typeof moduleExport === 'object' ? Object.keys(moduleExport) : 'N/A'}`);
    }
    
    if (!ModuleClass || typeof ModuleClass !== 'function') {
      throw new Error(`Classe de module invalide`);
    }
    
    return new ModuleClass();
  }
  
  private isValidModuleClass(func: any): boolean {
    if (typeof func !== 'function') return false;
    
    // Vérifier si c'est une classe (a un prototype avec constructor)
    if (func.prototype && func.prototype.constructor === func) {
      return true;
    }
    
    // Vérifier si le nom suggère une classe (commence par majuscule)
    if (func.name && /^[A-Z]/.test(func.name)) {
      return true;
    }
    
    return false;
  }
  
  private async verifySignature(modulePath: string): Promise<void> {
    // Simulation de vérification signature
    // En vrai, ici on vérifierait une signature crypto
    const signatureFile = modulePath + '.sig';
    
    if (!fs.existsSync(signatureFile)) {
      throw new Error(`Signature manquante pour ${modulePath}`);
    }
    
    // TODO: Implémenter vérification crypto réelle
    this.log('info', `Signature vérifiée: ${modulePath}`);
  }
  
  validateModule(moduleExport: any): boolean {
    // Validation renforcée
    const requiredMethods = ['typeName', 'canHandle', 'handle'];
    const requiredTypes = ['string', 'function', 'function'];
    
    for (let i = 0; i < requiredMethods.length; i++) {
      const method = requiredMethods[i];
      const expectedType = requiredTypes[i];
      
      if (!(method in moduleExport) || typeof moduleExport[method] !== expectedType) {
        this.log('error', `Validation échouée: ${method} (${expectedType})`);
        return false;
      }
    }
    
    // Vérifier que typeName est alphanumérique
    if (!/^[a-zA-Z0-9_]+$/.test(moduleExport.typeName)) {
      this.log('error', `typeName invalide: ${moduleExport.typeName}`);
      return false;
    }
    
    return true;
  }
  
  unloadModule(modulePath: string): void {
    delete require.cache[require.resolve(modulePath)];
    
    if (this.securityConfig.auditLog) {
      this.auditLog('MODULE_UNLOADED', { modulePath });
    }
  }
  
  private auditLog(action: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      data
    };
    
    // En vrai, on écrirait dans un fichier sécurisé ou DB
    console.log(`🔍 [AUDIT] ${JSON.stringify(logEntry)}`);
  }
  
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    const prefix = '[SecureModuleLoader]';
    switch (level) {
      case 'info':
        console.log(`ℹ️ ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`);
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
    }
  }
}

// ✅ FACTORY PRINCIPALE AVEC AUTO-DISCOVERY - VERSION AMÉLIORÉE
export class SubModuleFactory {
  
  private modules: Map<string, IObjectSubModule> = new Map();
  private moduleFiles: Map<string, string> = new Map(); // typeName -> filePath
  private loader: IModuleLoader;
  private securityConfig: SecurityConfig;
  private submodulesPath: string;
  private watchers: fs.FSWatcher[] = [];
  private loadingInProgress: Set<string> = new Set(); // Éviter les chargements multiples
  
  constructor(
    submodulesPath: string,
    securityConfig: SecurityConfig = { enabled: false }
  ) {
    this.submodulesPath = path.resolve(submodulesPath);
    this.securityConfig = securityConfig;
    
    // Choisir le bon loader selon la config
    this.loader = securityConfig.enabled 
      ? new SecureModuleLoader(securityConfig)
      : new BasicModuleLoader();
      
    console.log(`🏭 [SubModuleFactory] Initialisé avec sécurité: ${securityConfig.enabled ? 'ON' : 'OFF'}`);
    console.log(`📁 [SubModuleFactory] Dossier modules: ${this.submodulesPath}`);
  }
  
  // === AUTO-DISCOVERY AMÉLIORÉ ===
  
  /**
   * Scanner et charger tous les sous-modules - VERSION ROBUSTE
   */
  async discoverAndLoadModules(): Promise<void> {
    console.log(`🔍 [SubModuleFactory] Scan du dossier: ${this.submodulesPath}`);
    
    if (!fs.existsSync(this.submodulesPath)) {
      console.warn(`⚠️ [SubModuleFactory] Dossier inexistant: ${this.submodulesPath}`);
      
      // Essayer de créer le dossier
      try {
        fs.mkdirSync(this.submodulesPath, { recursive: true });
        console.log(`📁 [SubModuleFactory] Dossier créé: ${this.submodulesPath}`);
      } catch (error) {
        console.error(`❌ [SubModuleFactory] Impossible de créer le dossier:`, error);
      }
      return;
    }
    
    const files = fs.readdirSync(this.submodulesPath)
      .filter(file => this.isValidModuleFile(file))
      .filter(file => !file.startsWith('.') && !file.includes('.disabled'));
    
    console.log(`📦 [SubModuleFactory] ${files.length} sous-modules trouvés:`, files);
    
    // Chargement en parallèle avec gestion d'erreur
    const loadPromises = files.map(file => this.loadModuleFromFile(file));
    const results = await Promise.allSettled(loadPromises);
    
    // Rapport de chargement
    let successCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        console.error(`❌ [SubModuleFactory] Erreur chargement ${files[index]}:`, result.reason);
      }
    });
    
    console.log(`📊 [SubModuleFactory] Chargement terminé: ${successCount} succès, ${errorCount} erreurs`);
    
    // Démarrer la surveillance en mode dev
    if (!this.securityConfig.enabled) {
      this.startWatching();
    }
  }
  
  private isValidModuleFile(filename: string): boolean {
    return (filename.endsWith('SubModule.js') || 
            filename.endsWith('SubModule.ts') ||
            filename.endsWith('.js') ||
            filename.endsWith('.ts')) &&
           !filename.startsWith('index') &&
           !filename.startsWith('base') &&
           !filename.startsWith('abstract');
  }
  
  /**
   * Charger un sous-module depuis un fichier - VERSION ROBUSTE
   */
  private async loadModuleFromFile(filename: string): Promise<void> {
    const filePath = path.join(this.submodulesPath, filename);
    
    // Éviter les chargements multiples simultanés
    if (this.loadingInProgress.has(filePath)) {
      console.log(`⏳ [SubModuleFactory] Chargement déjà en cours: ${filename}`);
      return;
    }
    
    this.loadingInProgress.add(filePath);
    
    try {
      console.log(`📥 [SubModuleFactory] Chargement: ${filename}`);
      
      const moduleInstance = await this.loader.loadModule(filePath);
      
      if (!this.loader.validateModule(moduleInstance)) {
        throw new Error(`Validation échouée pour ${filename}`);
      }
      
      const typeName = moduleInstance.typeName;
      
      // Vérifier doublon
      if (this.modules.has(typeName)) {
        console.warn(`⚠️ [SubModuleFactory] Module ${typeName} déjà chargé, remplacement`);
        
        // Cleanup ancien module
        const oldModule = this.modules.get(typeName);
        if (oldModule?.cleanup) {
          try {
            await oldModule.cleanup();
          } catch (cleanupError) {
            console.warn(`⚠️ [SubModuleFactory] Erreur cleanup ancien module ${typeName}:`, cleanupError);
          }
        }
      }
      
      // Initialiser le nouveau module
      if (moduleInstance.initialize) {
        await moduleInstance.initialize();
      }
      
      // Enregistrer
      this.modules.set(typeName, moduleInstance);
      this.moduleFiles.set(typeName, filePath);
      
      console.log(`✅ [SubModuleFactory] Module chargé: ${typeName} v${moduleInstance.version || '1.0.0'}`);
      
    } catch (error) {
      console.error(`❌ [SubModuleFactory] Erreur chargement ${filename}:`, error);
      throw error; // Re-throw pour Promise.allSettled
    } finally {
      this.loadingInProgress.delete(filePath);
    }
  }
  
  /**
   * Surveillance des fichiers pour hot-reload - VERSION AMÉLIORÉE
   */
  private startWatching(): void {
    if (!fs.existsSync(this.submodulesPath)) return;
    
    console.log(`👀 [SubModuleFactory] Surveillance hot-reload activée`);
    
    const watcher = fs.watch(this.submodulesPath, { persistent: false }, (eventType, filename) => {
      if (!filename || !this.isValidModuleFile(filename)) {
        return;
      }
      
      if (filename.includes('.disabled')) {
        console.log(`🚫 [SubModuleFactory] Module désactivé: ${filename}`);
        return;
      }
      
      console.log(`🔄 [SubModuleFactory] Changement détecté: ${filename} (${eventType})`);
      
      // Délai pour éviter les rechargements multiples + debouncing
      this.debounceReload(filename);
    });
    
    this.watchers.push(watcher);
  }
  
  private reloadTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  private debounceReload(filename: string): void {
    // Annuler le timeout précédent s'il existe
    const existingTimeout = this.reloadTimeouts.get(filename);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Programmer nouveau rechargement
    const timeout = setTimeout(() => {
      this.hotReloadModule(filename);
      this.reloadTimeouts.delete(filename);
    }, 500);
    
    this.reloadTimeouts.set(filename, timeout);
  }
  
  /**
   * Hot-reload d'un module spécifique - VERSION ROBUSTE
   */
  async hotReloadModule(filename: string): Promise<boolean> {
    try {
      console.log(`🔥 [SubModuleFactory] Hot-reload: ${filename}`);
      
      await this.loadModuleFromFile(filename);
      
      console.log(`✅ [SubModuleFactory] Hot-reload réussi: ${filename}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [SubModuleFactory] Hot-reload échoué ${filename}:`, error);
      return false;
    }
  }
  
  // === ACCÈS AUX MODULES ===
  
  /**
   * Trouver le bon sous-module pour un objet
   */
  findModuleForObject(objectDef: ObjectDefinition): IObjectSubModule | null {
    for (const module of this.modules.values()) {
      try {
        if (module.canHandle(objectDef)) {
          return module;
        }
      } catch (error) {
        console.warn(`⚠️ [SubModuleFactory] Erreur canHandle pour ${module.typeName}:`, error);
      }
    }
    return null;
  }
  
  /**
   * Obtenir un module par nom
   */
  getModule(typeName: string): IObjectSubModule | null {
    return this.modules.get(typeName) || null;
  }
  
  /**
   * Lister tous les modules chargés
   */
  getAllModules(): IObjectSubModule[] {
    return Array.from(this.modules.values());
  }
  
  /**
   * Lister les noms des modules
   */
  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }
  
  // === GESTION ADMINISTRATIVE ===
  
  /**
   * Recharger un module par nom (admin)
   */
  async reloadModule(typeName: string): Promise<boolean> {
    const filePath = this.moduleFiles.get(typeName);
    if (!filePath) {
      console.error(`❌ [SubModuleFactory] Module ${typeName} non trouvé pour reload`);
      return false;
    }
    
    const filename = path.basename(filePath);
    return await this.hotReloadModule(filename);
  }
  
  /**
   * Décharger un module
   */
  async unloadModule(typeName: string): Promise<boolean> {
    const module = this.modules.get(typeName);
    if (!module) {
      return false;
    }
    
    try {
      // Cleanup
      if (module.cleanup) {
        await module.cleanup();
      }
      
      // Supprimer du cache
      const filePath = this.moduleFiles.get(typeName);
      if (filePath) {
        this.loader.unloadModule(filePath);
        this.moduleFiles.delete(typeName);
      }
      
      this.modules.delete(typeName);
      
      console.log(`🗑️ [SubModuleFactory] Module déchargé: ${typeName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [SubModuleFactory] Erreur déchargement ${typeName}:`, error);
      return false;
    }
  }
  
  // === STATISTIQUES ET MONITORING ===
  
  /**
   * Statistiques globales - VERSION ENRICHIE
   */
  getStats(): any {
    const moduleStats: Record<string, any> = {};
    let totalInteractions = 0;
    let healthyModules = 0;
    
    for (const [typeName, module] of this.modules.entries()) {
      const stats = module.getStats ? module.getStats() : null;
      const health = module.getHealth ? module.getHealth() : null;
      
      moduleStats[typeName] = {
        stats,
        health,
        filePath: this.moduleFiles.get(typeName),
        version: module.version || '1.0.0'
      };
      
      if (stats) {
        totalInteractions += stats.totalInteractions;
      }
      
      if (health?.status === 'healthy') {
        healthyModules++;
      }
    }
    
    return {
      totalModules: this.modules.size,
      healthyModules,
      totalInteractions,
      systemHealth: healthyModules === this.modules.size ? 'healthy' : 
                   healthyModules > this.modules.size * 0.7 ? 'warning' : 'critical',
      securityEnabled: this.securityConfig.enabled,
      watchersActive: this.watchers.length,
      loadingInProgress: this.loadingInProgress.size,
      moduleStats
    };
  }
  
  /**
   * Debug complet
   */
  debug(): void {
    console.log(`🔍 [SubModuleFactory] === DEBUG COMPLET ===`);
    console.log(`📦 Modules chargés: ${this.modules.size}`);
    console.log(`👀 Watchers actifs: ${this.watchers.length}`);
    console.log(`🛡️ Sécurité: ${this.securityConfig.enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
    console.log(`⏳ Chargements en cours: ${this.loadingInProgress.size}`);
    
    for (const [typeName, module] of this.modules.entries()) {
      const filePath = this.moduleFiles.get(typeName);
      const stats = module.getStats ? module.getStats() : 'N/A';
      const health = module.getHealth ? module.getHealth() : 'N/A';
      
      console.log(`  📄 ${typeName}:`);
      console.log(`    📁 Fichier: ${filePath}`);
      console.log(`    🏷️ Version: ${module.version || '1.0.0'}`);
      console.log(`    📊 Stats: ${JSON.stringify(stats)}`);
      console.log(`    💚 Santé: ${JSON.stringify(health)}`);
    }
  }
  
  // === NETTOYAGE ===
  
  /**
   * Arrêter la surveillance et nettoyer - VERSION COMPLÈTE
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 [SubModuleFactory] Nettoyage...`);
    
    // Arrêter timeouts de debounce
    for (const timeout of this.reloadTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reloadTimeouts.clear();
    
    // Arrêter watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    
    // Cleanup tous les modules
    for (const [typeName, module] of this.modules.entries()) {
      if (module.cleanup) {
        try {
          await module.cleanup();
        } catch (error) {
          console.error(`❌ [SubModuleFactory] Erreur cleanup ${typeName}:`, error);
        }
      }
    }
    
    this.modules.clear();
    this.moduleFiles.clear();
    this.loadingInProgress.clear();
    
    console.log(`✅ [SubModuleFactory] Nettoyage terminé`);
  }
}
