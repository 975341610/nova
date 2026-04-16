import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readMarkdownFile: (relativePath: string) => ipcRenderer.invoke('readMarkdownFile', relativePath),
  writeMarkdownFile: (relativePath: string, content: string) => ipcRenderer.invoke('writeMarkdownFile', relativePath, content),
  listMarkdownFiles: () => ipcRenderer.invoke('listMarkdownFiles'),
  getBacklinks: (noteId: string) => ipcRenderer.invoke('getBacklinks', noteId),
  getTags: () => ipcRenderer.invoke('getTags'),
  getNotesByTag: (tag: string) => ipcRenderer.invoke('getNotesByTag', tag),
  getNoteMetadata: (noteId: string) => ipcRenderer.invoke('getNoteMetadata', noteId),
  getVaultTree: () => ipcRenderer.invoke('getVaultTree'),
  getVaultPath: () => ipcRenderer.invoke('getVaultPath'),
  setVaultPath: (path: string) => ipcRenderer.invoke('setVaultPath', path),
  renameItem: (oldPath: string, newPath: string) => ipcRenderer.invoke('renameItem', oldPath, newPath),
  deleteItem: (path: string) => ipcRenderer.invoke('deleteItem', path),
  moveItem: (sourcePath: string, targetFolder: string) => ipcRenderer.invoke('moveItem', sourcePath, targetFolder),
  createFolder: (folderPath: string) => ipcRenderer.invoke('createFolder', folderPath),
  createMarkdownFile: (folderPath: string, fileName: string) => ipcRenderer.invoke('createMarkdownFile', folderPath, fileName),
});
