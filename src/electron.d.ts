export interface IElectronAPI {
  loadData: () => Promise<any>;
  saveData: (data: any) => Promise<void>;
  exportBackup: (data: any) => Promise<{ success: boolean; error?: string }>;
  importBackup: () => Promise<{ success: boolean; data?: any; error?: string }>;
  openExternalLink: (url: string) => Promise<{ success: boolean; error?: string }>;
  writeToClipboard: (text: string) => Promise<void>;
  saveSrtFile: (content: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}