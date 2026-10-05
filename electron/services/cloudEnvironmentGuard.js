const { app } = require('electron');

/**
 * cloudEnvironmentGuard.js
 * 
 * Especialidade: Isolamento de Ambientes & Prevenção de Contaminação Dev/IA
 * 
 * Garante que instâncias de desenvolvimento, scripts de teste ou comandos
 * disparados por ferramentas de automação/IA não sobrescrevam a conta oficial
 * de nuvem dos professores sem isolamento estrito.
 */

class CloudEnvironmentGuard {
    /**
     * Verifica se a execução atual é em ambiente de desenvolvimento ou teste.
     * Trata cenários onde o módulo é carregado fora do ciclo principal do Electron (ex: scripts node puros).
     */
    /**
     * Verifica se a execução atual é em ambiente de desenvolvimento ou teste.
     * Implementa checagem Air-Gap Profunda (Defense-in-Depth):
     * 1. Status de empacotamento: !app.isPackaged
     * 2. Variável de ambiente: process.env.NODE_ENV === 'development' ou 'test'
     * 3. Análise forense de path: verifica se __dirname ou app.getAppPath() contém
     *    indicadores de workspace ou árvore de desenvolvimento ('node_modules', 'src', 'scratch', etc).
     */
    static isDevEnvironment() {
        // 1. Variável de ambiente explícita
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
            return true;
        }

        // 2. Checagem do runtime do Electron
        if (app && typeof app.isPackaged !== 'undefined' && !app.isPackaged) {
            return true;
        }

        // 3. Inspeção Forense de Path (Air-Gap Profundo)
        try {
            const currentDir = (__dirname || '').toLowerCase();
            const appPath = (app && typeof app.getAppPath === 'function') 
                ? (app.getAppPath() || '').toLowerCase() 
                : '';

            const devPathIndicators = [
                'node_modules',
                '\\src\\',
                '/src/',
                '\\scratch\\',
                '/scratch/',
                'gestão pedagógica - novo backup',
                'electron-builder'
            ];

            const matchesDir = devPathIndicators.some(ind => currentDir.includes(ind.toLowerCase()));
            const matchesAppPath = devPathIndicators.some(ind => appPath.includes(ind.toLowerCase()));

            if (matchesDir || matchesAppPath) {
                return true;
            }
        } catch (_) {
            // Em caso de exceção de I/O, adota postura segura
        }

        if (!app || typeof app.isPackaged === 'undefined') {
            return process.env.NODE_ENV !== 'production';
        }

        return !app.isPackaged;
    }

    /**
     * Verifica se o auto-sync (sincronização automática em background) está autorizado.
     * Em ambiente de desenvolvimento, o auto-sync é BLOQUEADO por padrão para
     * impedir que o hot-reload ou testes da IA contaminem o banco da nuvem.
     */
    static isAutoSyncAllowed() {
        if (this.isDevEnvironment()) {
            // Em dev, só sincroniza se houver flag explícita de override no ambiente
            return process.env.ALLOW_DEV_CLOUD_SYNC === 'true';
        }
        return true;
    }

    /**
     * Define o nome de arquivo na nuvem de acordo com o ambiente.
     * Produção -> edusys_pro_backup.json
     * Desenvolvimento/IA -> edusys_dev_sandbox.json (nunca afeta produção)
     */
    static getTargetBackupFilename() {
        if (this.isDevEnvironment() && process.env.ALLOW_PROD_SYNC_IN_DEV !== 'true') {
            return 'edusys_dev_sandbox.json';
        }
        return 'edusys_pro_backup.json';
    }

    /**
     * Registra log de auditoria operacional no console com contexto de segurança.
     */
    static auditLog(action, details = {}) {
        const isDev = this.isDevEnvironment();
        const timestamp = new Date().toISOString();
        console.log(`[CloudSecurityGuard | ${timestamp}] [${isDev ? 'DEV-SANDBOX' : 'PROD'}] ${action}`, details);
    }
}

module.exports = CloudEnvironmentGuard;
