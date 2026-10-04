const { ipcMain, BrowserWindow, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { dbAPI } = require('../database');
const {
    generateHTML,
    generateStudentReportHTML,
    generateUnitAgendaHTML,
    generateLessonPlanHTML,
    generateStudentActivitiesHTML,
    generateStudentPendenciesReportHTML
} = require('../templates/pdfTemplates');
const { generateStudentBehaviorReportHTML } = require('../templates/studentBehaviorPdfTemplate');
const { generateActivityBookHTML } = require('../templates/activityBookEngine');

function registerPdfHandlers(getMainWindow) {
    const getWin = () => (typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow);

    ipcMain.handle('pdf:exportGrades', async (_, { turmaName, unitName, grades }) => {
        const settings = dbAPI.getSettings();
        const htmlContent = generateHTML(turmaName, unitName, grades, settings);

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
                        landscape: false
                    });

                    const sanitizeFilename = (name) => name.replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeTurma = sanitizeFilename(turmaName);
                    const safeUnit = sanitizeFilename(unitName);
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Boletim em PDF',
                        defaultPath: path.join(app.getPath('documents'), `Notas - ${safeTurma} - ${safeUnit}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });

    ipcMain.handle('pdf:exportStudentReport', async (_, { turmaName, unitName, studentName, grades, parecerTexto }) => {
        const settings = dbAPI.getSettings();
        const htmlContent = generateStudentReportHTML(turmaName, unitName, studentName, grades, parecerTexto, settings);

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

                    const sanitizeFilename = (name) => name.replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeStudent = sanitizeFilename(studentName);
                    const safeTurma = sanitizeFilename(turmaName);
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Boletim Individual em PDF',
                        defaultPath: path.join(app.getPath('documents'), `Boletim Individual - ${safeStudent} - ${safeTurma}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });

    ipcMain.handle('pdf:exportUnitAgenda', async (_, { turmaName, unitName, agendaItems }) => {
        const settings = dbAPI.getSettings();
        const htmlContent = generateUnitAgendaHTML(turmaName, unitName, agendaItems, settings);

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

                    const sanitizeFilename = (name) => name.replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeTurma = sanitizeFilename(turmaName);
                    const safeUnidade = sanitizeFilename(unitName);
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Agenda da Unidade em PDF',
                        defaultPath: path.join(app.getPath('documents'), `Planejamento de Atividades - ${safeTurma} - ${safeUnidade}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });

    ipcMain.handle('pdf:exportLessonPlan', async (_, { planData, planText, title, unitLabel, professorName }) => {
        const settings = dbAPI.getSettings();
        const dataPayload = planData || planText;
        const htmlContent = generateLessonPlanHTML(dataPayload, title, settings, unitLabel, professorName);

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

                    const sanitizeFilename = (name) => name.replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeTitle = sanitizeFilename(title || 'Plano de Aula');
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Plano de Aula em PDF',
                        defaultPath: path.join(app.getPath('documents'), `${safeTitle}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });

    ipcMain.handle('pdf:exportStudentActivities', async (_, { planData, planText, title, unitLabel, professorName, options }) => {
        const settings = dbAPI.getSettings();
        const dataPayload = planData || planText;
        const htmlContent = await generateActivityBookHTML(dataPayload, title, settings, unitLabel, professorName, options || {});

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

                    const sanitizeFilename = (name) => name.replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeTitle = sanitizeFilename(title || 'Atividades do Aluno');
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Folha de Atividades do Aluno em PDF',
                        defaultPath: path.join(app.getPath('documents'), `${safeTitle}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });

    ipcMain.handle('pdf:exportStudentPendencies', async (_, data) => {
        const settings = dbAPI.getSettings();
        const htmlContent = generateStudentPendenciesReportHTML({
            ...data,
            schoolName: settings?.school_name || data.schoolName
        });

        return new Promise((resolve) => {
            const printWindow = new BrowserWindow({
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

            printWindow.webContents.on('did-fail-load', (_, __, desc) => {
                printWindow.destroy();
                resolve({ success: false, error: desc || 'Falha ao carregar documento para impressão' });
            });

            printWindow.webContents.on('did-finish-load', async () => {
                try {
                    const pdfBuffer = await printWindow.webContents.printToPDF({
                        printBackground: true,
                        pageSize: 'A4',
                        marginsType: 1,
                        landscape: false
                    });

                    const sanitizeFilename = (name) => (name || '').replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeStudent = sanitizeFilename(data.studentName || 'Estudante');
                    const safeTurma = sanitizeFilename(data.turmaName || 'Turma');
                    const safeUnit = sanitizeFilename(data.unidade ? `${data.unidade}ª Unidade` : 'Unidade');
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Relatório de Lições e Pendências em PDF',
                        defaultPath: path.join(app.getPath('documents'), `Licoes - ${safeStudent} - ${safeTurma} - ${safeUnit}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });

    // Dossiê Comportamental Individual para Conselho de Classe
    ipcMain.handle('pdf:exportStudentBehavior', async (_, data) => {
        const settings = dbAPI.getSettings();
        const htmlContent = generateStudentBehaviorReportHTML({
            ...data,
            schoolName: settings?.school_name || data.schoolName
        });

        return new Promise((resolve) => {
            const printWindow = new BrowserWindow({
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

            printWindow.webContents.on('did-fail-load', (_, __, desc) => {
                printWindow.destroy();
                resolve({ success: false, error: desc || 'Falha ao carregar documento para impressão' });
            });

            printWindow.webContents.on('did-finish-load', async () => {
                try {
                    const pdfBuffer = await printWindow.webContents.printToPDF({
                        printBackground: true,
                        pageSize: 'A4',
                        marginsType: 1,
                        landscape: false
                    });

                    const sanitizeFilename = (name) => (name || '').replace(/[\/\\?%*:|"<>\.]/g, '').trim();
                    const safeStudent = sanitizeFilename(data.studentName || 'Estudante');
                    const safeTurma = sanitizeFilename(data.turmaName || 'Turma');
                    const safeUnit = sanitizeFilename(data.unidade ? `${data.unidade}ª Unidade` : 'Unidade');
                    
                    const mainWindow = getWin();
                    const { filePath } = await dialog.showSaveDialog(mainWindow, {
                        title: 'Salvar Dossiê Comportamental para Conselho de Classe (PDF)',
                        defaultPath: path.join(app.getPath('documents'), `Comportamento - ${safeStudent} - ${safeTurma} - ${safeUnit}.pdf`),
                        filters: [
                            { name: 'Arquivos PDF', extensions: ['pdf'] }
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
    });
}

module.exports = {
    registerPdfHandlers
};
