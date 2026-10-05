/* eslint-env node */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDB } = require('./database');
const { setupAutoBackup } = require('./services/backupService');

const { registerDbHandlers } = require('./controllers/dbController');
const { registerAiHandlers } = require('./controllers/aiController');
const { registerAuthHandlers } = require('./controllers/authController');
const { registerPdfHandlers } = require('./controllers/pdfController');
const { registerCloudHandlers } = require('./controllers/cloudController');
const { registerPlanArchiveHandlers } = require('./controllers/planArchiveController');
const { registerDiagnosisArchiveHandlers } = require('./controllers/diagnosisArchiveController');
const { registerLicenseHandlers } = require('./controllers/licenseController');
const { registerCoordinatorHandlers } = require('./controllers/coordinatorController');
const { registerCoordinatorUnitDossierHandlers } = require('./controllers/coordinatorUnitDossierController');
const { registerCoordinatorPdfHandlers } = require('./controllers/coordinatorPdfController');
const { registerCoordinatorSettingsHandlers } = require('./controllers/coordinatorSettingsController');
const { registerCloudVaultHandlers } = require('./controllers/cloudVaultController');
const { initAutoUpdater } = require('./services/updateService');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Gestão Pedagógica',
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        autoHideMenuBar: true,
        show: true,
        backgroundColor: '#020617',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    
    mainWindow.maximize();

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
        // No desenvolvimento, aponta para o servidor Vite
        mainWindow.loadURL('http://localhost:5178');
        // mainWindow.webContents.openDevTools();
    } else {
        // Na produção, aponta para os arquivos estáticos do build
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
}

app.whenReady().then(() => {
    // Inicia o banco de dados e o backup automático
    initDB();
    setupAutoBackup();
    
    // Registra os controllers IPC
    const getMainWindow = () => mainWindow;
    registerDbHandlers();
    registerAiHandlers();
    registerAuthHandlers();
    registerPdfHandlers(getMainWindow);
    registerCloudHandlers(getMainWindow);
    registerPlanArchiveHandlers();
    registerDiagnosisArchiveHandlers();
    registerLicenseHandlers();
    registerCoordinatorHandlers(getMainWindow);
    registerCoordinatorUnitDossierHandlers();
    registerCoordinatorPdfHandlers(getMainWindow);
    registerCoordinatorSettingsHandlers(getMainWindow);
    registerCloudVaultHandlers();
    initAutoUpdater(getMainWindow);

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
