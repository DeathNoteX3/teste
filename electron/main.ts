import { app, BrowserWindow, ipcMain, dialog, shell, clipboard, session } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import fs from 'fs/promises';

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const store = new Store({ name: 'video-dashboard-data' });

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false, // Do not show the window until it's ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(process.env.VITE_PUBLIC, 'vite.svg'),
  })

  // Remove the default menu bar
  win.setMenu(null);

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devtools in development
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
    // Open devtools in production for debugging
    win.webContents.openDevTools()
  }

  // Show the window only when the content is ready to be displayed
  win.once('ready-to-show', () => {
    win?.show()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          VITE_DEV_SERVER_URL
            ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.youtube.com; connect-src 'self' ws:;"
            : "default-src 'self' file:; script-src 'self' file:; style-src 'self' 'unsafe-inline' file:; img-src 'self' data: https://img.youtube.com file:;"
        ]
      }
    });
  });
  createWindow();
});

// IPC Handlers
ipcMain.handle('load-data', () => {
  return store.get('appData');
});

ipcMain.handle('save-data', (event, data) => {
  store.set('appData', data);
});

ipcMain.handle('export-backup', async (event, data) => {
  if (!win) return { success: false, error: 'Main window not available' };
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar Backup',
    defaultPath: `videodash_backup_${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  if (!canceled && filePath) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Export cancelled' };
});

ipcMain.handle('import-backup', async () => {
  if (!win) return { success: false, error: 'Main window not available' };
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Importar Backup',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!canceled && filePaths.length > 0) {
    try {
      const data = await fs.readFile(filePaths[0], 'utf-8');
      return { success: true, data: JSON.parse(data) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Import cancelled' };
});

// Handle opening external links in the default browser
ipcMain.handle('open-external-link', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to open external link:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});

ipcMain.handle('save-srt-file', async (event, content) => {
  if (!win) return { success: false, error: 'Main window not available' };
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar Arquivo SRT',
    defaultPath: `legendas.srt`,
    filters: [{ name: 'SubRip Subtitle', extensions: ['srt'] }],
  });
  if (!canceled && filePath) {
    try {
      await fs.writeFile(filePath, content);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Save cancelled' };
});