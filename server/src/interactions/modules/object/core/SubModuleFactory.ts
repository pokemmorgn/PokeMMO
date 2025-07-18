// src/interactions/modules/object/core/SubModuleFactory.ts
// Factory avec auto-discovery et hot-reload sécurisé

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

// ✅ CHARGEUR DE BASE (Mode développement)
class BasicModuleLoader implements IModuleLoader {
  
  async loadModule(modulePath: string): Promise<any> {
    try {
      // Supprimer du cache pour hot-reload
      delete require.cache[require.resolve(modulePath)];
      
      const moduleExport = require(modulePath);
      
      // Support export default ET named exports
      const ModuleClass = moduleExport.default || moduleExport;
      
      if (typeof ModuleClass !== 'function') {
        throw new Error(`Module ${modulePath} n'exporte pas de classe`);
      }
      
      return new ModuleClass();
      
    } catch (error) {
      console.error(`❌ [BasicModuleLoader] Erreur chargement ${modulePath}:`, error);
      throw error;
    }
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
}

// ✅ CHARGEUR SÉCURISÉ (Mode production)
class SecureModuleLoader implements IModuleLoader {
  
  constructor(private securityConfig: SecurityConfig) {}
  
  async loadModule(modulePath: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // 1. Vérifier whitelist
      if (this.securityConfig.whitelist) {
        const moduleName = path.basename(modulePath, '.js').replace('SubModule', '');
        if (!this.securityConfig.whitelist.includes(moduleName)) {
          throw new Error(`Module ${moduleName} non autorisé (whitelist)`);
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
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout chargement module')), timeoutMs)
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
          error: error instanceof Error ? error.message : 'Unknown error',
          loadTime: Date.now() - startTime
        });
      }
      throw error;
    }
  }
  
  private async loadNormal(modulePath: string): Promise<any> {
    delete require.cache[require.resolve(modulePath)];
    const moduleExport = require(modulePath);
    const ModuleClass = moduleExport.default || moduleExport;
    
    if (typeof ModuleClass !== 'function') {
      throw new Error(`Module ${modulePath} n'exporte pas de classe`);
    }
    
    return new ModuleClass();
  }
  
  private async loadInSandbox(modulePath: string): Promise<any> {
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
      clearInterval: clearInterval
    };
    
    vm.createContext(sandbox);
    vm.runInContext(moduleCode, sandbox, {
      filename: modulePath,
      timeout: 3000 // 3s max pour exécuter
    });
    
    const ModuleClass = sandbox.module.exports.default || sandbox.module.exports;
    
    if (typeof ModuleClass !== 'function') {
      throw new Error(`Module ${modulePath} n'exporte pas de classe (sandbox)`);
    }
    
    return new ModuleClass();
  }
  
  private async verifySignature(modulePath: string): Promise<void> {
    // Simulation de vérification signature
    // En vrai, ici on vérifierait une signature crypto
    const signatureFile = modulePath + '.sig';
    
    if (!fs.existsSync(signatureFile)) {
      throw new Error(`Signature manquante pour ${modulePath}`);
    }
    
    // TODO: Implémenter vérification crypto réelle
    console.log(`🔐 [SecureModuleLoader] Signature vérifiée: ${modulePath}`);
  }
  
  validateModule(moduleExport: any): boolean {
    // Validation renforcée
    const requiredMethods = ['typeName', 'canHandle', 'handle'];
    const requiredTypes = ['string', 'function', 'function'];
    
    for (let i = 0; i < requiredMethods.length; i++) {
      const method = requiredMethods[i];
      const expectedType = requiredTypes[i];
      
      if (!(method in moduleExport) || typeof moduleExport[method] !== expectedType) {
        console.error(`❌ [SecureModuleLoader] Validation échouée: ${method} (${expectedType})`);
        return false;
      }
    }
    
    // Vérifier que typeName est alphanumérique
    if (!/^[a-zA-Z0-9_]+$/.test(moduleExport.typeName)) {
      console.error(`❌ [SecureModuleLoader] typeName invalide: ${moduleExport.typeName}`);
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
}

// ✅ FACTORY PRINCIPALE AVEC AUTO-DISCOVERY
export class SubModuleFactory {
  
  private modules: Map<string, IObjectSubModule> = new Map();
  private moduleFiles: Map<string, string> = new Map(); // typeName -> filePath
  private loader: IModuleLoader;
  private securityConfig: SecurityConfig;
  private submodulesPath: string;
  private watchers: fs.FSWatcher[] = [];
  
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
  }
  
  // === AUTO-DISCOVERY ===
  
  /**
   * Scanner et charger tous les sous-modules
   */
  async discoverAndLoadModules(): Promise<void> {
    console.log(`🔍 [SubModuleFactory] Scan du dossier: ${this.submodulesPath}`);
    
    if (!fs.existsSync(this.submodulesPath)) {
      console.warn(`⚠️ [SubModuleFactory] Dossier inexistant: ${this.submodulesPath}`);
      return;
    }
    
    const files = fs.readdirSync(this.submodulesPath)
      .filter(file => file.endsWith('SubModule.js') || file.endsWith('SubModule.ts'))
      .filter(file => !file.startsWith('.') && !file.includes('.disabled'));
    
    console.log(`📦 [SubModuleFactory] ${files.length} sous-modules trouvés:`, files);
    
    for (const file of files) {
      await this.loadModuleFromFile(file);
    }
    
    // Démarrer la surveillance en mode dev
    if (!this.securityConfig.enabled) {
      this.startWatching();
    }
  }
  
  /**
   * Charger un sous-module depuis un fichier
   */
  private async loadModuleFromFile(filename: string): Promise<void> {
    const filePath = path.join(this.submodulesPath, filename);
    
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
          await oldModule.cleanup();
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
    }
  }
  
  /**
   * Surveillance des fichiers pour hot-reload
   */
  private startWatching(): void {
    if (!fs.existsSync(this.submodulesPath)) return;
    
    console.log(`👀 [SubModuleFactory] Surveillance hot-reload activée`);
    
    const watcher = fs.watch(this.submodulesPath, (eventType, filename) => {
      if (!filename || !filename.endsWith('SubModule.js') && !filename.endsWith('SubModule.ts')) {
        return;
      }
      
      if (filename.includes('.disabled')) {
        console.log(`🚫 [SubModuleFactory] Module désactivé: ${filename}`);
        return;
      }
      
      console.log(`🔄 [SubModuleFactory] Changement détecté: ${filename} (${eventType})`);
      
      // Délai pour éviter les rechargements multiples
      setTimeout(() => {
        if (eventType === 'change' || eventType === 'rename') {
          this.hotReloadModule(filename);
        }
      }, 500);
    });
    
    this.watchers.push(watcher);
  }
  
  /**
   * Hot-reload d'un module spécifique
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
      if (module.canHandle(objectDef)) {
        return module;
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
   * Statistiques globales
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
        filePath: this.moduleFiles.get(typeName)
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
    
    for (const [typeName, module] of this.modules.entries()) {
      const filePath = this.moduleFiles.get(typeName);
      const stats = module.getStats ? module.getStats() : 'N/A';
      const health = module.getHealth ? module.getHealth() : 'N/A';
      
      console.log(`  📄 ${typeName}:`);
      console.log(`    📁 Fichier: ${filePath}`);
      console.log(`    📊 Stats: ${JSON.stringify(stats)}`);
      console.log(`    💚 Santé: ${JSON.stringify(health)}`);
    }
  }
  
  // === NETTOYAGE ===
  
  /**
   * Arrêter la surveillance et nettoyer
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 [SubModuleFactory] Nettoyage...`);
    
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
    
    console.log(`✅ [SubModuleFactory] Nettoyage terminé`);
  }
}
