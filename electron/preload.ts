import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data: any) => ipcRenderer.invoke('save-data', data),
  exportBackup: (data: any) => ipcRenderer.invoke('export-backup', data),
  importBackup: () => ipcRenderer.invoke('import-backup'),
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),
  writeToClipboard: (text: string) => ipcRenderer.invoke('write-to-clipboard', text),
  saveSrtFile: (content: string) => ipcRenderer.invoke('save-srt-file', content),
});