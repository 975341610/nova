import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	readMarkdownFile: (e) => t.invoke("readMarkdownFile", e),
	writeMarkdownFile: (e, n) => t.invoke("writeMarkdownFile", e, n),
	listMarkdownFiles: () => t.invoke("listMarkdownFiles"),
	getBacklinks: (e) => t.invoke("getBacklinks", e),
	getTags: () => t.invoke("getTags"),
	getNotesByTag: (e) => t.invoke("getNotesByTag", e),
	getNoteMetadata: (e) => t.invoke("getNoteMetadata", e),
	getVaultTree: () => t.invoke("getVaultTree"),
	getVaultPath: () => t.invoke("getVaultPath"),
	setVaultPath: (e) => t.invoke("setVaultPath", e),
	renameItem: (e, n) => t.invoke("renameItem", e, n),
	deleteItem: (e) => t.invoke("deleteItem", e),
	moveItem: (e, n) => t.invoke("moveItem", e, n),
	createFolder: (e) => t.invoke("createFolder", e),
	createMarkdownFile: (e, n) => t.invoke("createMarkdownFile", e, n)
});
//#endregion
