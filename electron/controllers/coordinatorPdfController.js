/* eslint-env node */
/**
 * Controlador IPC Dedicado: Exportação de Dossiê Institucional em PDF
 * Renderiza o documento oficial em A4 via Chromium headless e apresenta
 * o diálogo nativo do sistema operacional para salvar o arquivo PDF.
 */

const { ipcMain, BrowserWindow, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
let dbAPI = null;
try {
    dbAPI = require('../database').dbAPI;
} catch (_) {
    dbAPI = { getSettings: () => ({}) };
}
const coordinatorSessionManager = require('../services/coordinatorSessionManager');
const { generateCoordinatorStudentDossierHTML } = require('../templates/coordinatorDossierPdfTemplate');

function registerCoordinatorPdfHandlers(getMainWindow) {
    const getWin = () => (typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow);

    ipcMain.handle('coordinator:exportStudentDossierPDF', async (_, { dossier, selectedUnit, selectedUnitName, selectedDiscipline }) => {
        try {
            coordinatorSessionManager.assertCoordinatorAccess();

            if (!dossier) {
                throw new Error('Dados do dossiê não informados para exportação.');
            }

            const settings = dbAPI.getSettings ? dbAPI.getSettings() : {};
            const sessionStatus = coordinatorSessionManager.getStatus ? coordinatorSessionManager.getStatus() : {};

            const options = {
                schoolName: settings.school_name || 'SISTEMA INTEGRADO DE ENSINO',
                coordinatorName: sessionStatus.coordinatorName || 'Coordenação Pedagógica',
                selectedUnit: selectedUnit || 'ALL',
                selectedUnitName: selectedUnitName || (selectedUnit === 'ALL' ? 'Todas as Unidades' : `${selectedUnit}ª Unidade`),
                selectedDiscipline: selectedDiscipline || 'ALL'
            };

            const htmlContent = generateCoordinatorStudentDossierHTML(dossier, options);

            return new Promise((resolve) => {
                const printWindow = new BrowserWindow({
                    show: false,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });

                printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

                printWindow.webContents.on('did-finish-load', async () => {
                    try {
                        const pdfBuffer = await printWindow.webContents.printToPDF({
                            printBackground: true,
                            pageSize: 'A4',
                            marginsType: 1,
                            landscape: false
                        });

                        const sanitizeFilename = (name) => String(name || '').replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                        const safeStudent = sanitizeFilename(dossier.canonical_name || 'Estudante');
                        const safeUnit = sanitizeFilename(options.selectedUnitName);
                        const safeDiscipline = options.selectedDiscipline !== 'ALL'
                            ? ` - ${sanitizeFilename(options.selectedDiscipline)}`
                            : '';

                        const defaultFileName = `Dossiê 360 - ${safeStudent} - ${safeUnit}${safeDiscipline}.pdf`;
                        const mainWindow = getWin();

                        const { filePath } = await dialog.showSaveDialog(mainWindow, {
                            title: 'Salvar Dossiê Oficial em PDF',
                            defaultPath: path.join(app.getPath('documents'), defaultFileName),
                            filters: [
                                { name: 'Documento PDF', extensions: ['pdf'] }
                            ]
                        });

                        if (filePath) {
                            fs.writeFileSync(filePath, pdfBuffer);
                            printWindow.destroy();
                            resolve({ success: true, filePath });
                        } else {
                            printWindow.destroy();
                            resolve({ success: false, cancelled: true });
                        }
                    } catch (err) {
                        printWindow.destroy();
                        resolve({ success: false, error: err.message });
                    }
                });
            });
        } catch (err) {
            console.error('[CoordinatorPdfController] Erro ao exportar dossiê em PDF:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = {
    registerCoordinatorPdfHandlers
};
