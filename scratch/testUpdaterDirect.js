const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

app.whenReady().then(async () => {
  console.log('App ready. Setting up autoUpdater...');
  
  autoUpdater.autoDownload = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.currentVersion = '5.2.0';
  autoUpdater.logger = console;
  
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'tangerinapixel',
    repo: 'edusyspro'
  });

  autoUpdater.on('checking-for-update', () => console.log('EVENT: checking-for-update'));
  autoUpdater.on('update-available', (info) => console.log('EVENT: update-available', info.version));
  autoUpdater.on('update-not-available', (info) => console.log('EVENT: update-not-available', info));
  autoUpdater.on('error', (err) => console.error('EVENT: error:', err));
  autoUpdater.on('download-progress', (p) => console.log('EVENT: download-progress', Math.round(p.percent)));
  autoUpdater.on('update-downloaded', (info) => {
    console.log('EVENT: update-downloaded', info.version);
    app.quit();
  });

  try {
    console.log('Checking for updates...');
    const result = await autoUpdater.checkForUpdates();
    console.log('Check result:', result ? result.updateInfo.version : 'null');
  } catch (err) {
    console.error('Error during checkForUpdates:', err);
  }
});
