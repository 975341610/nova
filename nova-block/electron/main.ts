import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MetadataCache } from './MetadataCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 运行环境常量
const IS_DEV = process.env.NODE_ENV === 'development';
let VAULT_PATH = path.join(app.getPath('userData'), 'test_vault');

const metadataCache = MetadataCache.getInstance();

// 确保测试目录存在
async function ensureVault() {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    await fs.mkdir(VAULT_PATH, { recursive: true });
    // 创建一个演示文件
    const welcomeContent = '# Welcome to Nova\n\nThis is a note with a link to [[SecondNote]].';
    await fs.writeFile(path.join(VAULT_PATH, 'Welcome.md'), welcomeContent, 'utf-8');
    await fs.writeFile(path.join(VAULT_PATH, 'SecondNote.md'), '# Second Note\n\nReference back to [[Welcome]].', 'utf-8');
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (IS_DEV) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// 递归列出所有 Markdown 文件
async function listFilesRecursive(dir: string, baseDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(res, baseDir);
    } else {
      return entry.name.endsWith('.md') ? path.relative(baseDir, res) : [];
    }
  }));
  return files.flat();
}

app.whenReady().then(async () => {
  await ensureVault();
  
  // 初始化全量扫描
  await metadataCache.scanVault(VAULT_PATH);
  // 启动文件监控
  metadataCache.watchVault(VAULT_PATH);
  
  // 注册 IPC 接口
  ipcMain.handle('readMarkdownFile', async (_, relativePath: string) => {
    try {
      const filePath = path.join(VAULT_PATH, relativePath);
      return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      console.error(`[IPC] readMarkdownFile failed: ${relativePath}`, err);
      throw err;
    }
  });

  ipcMain.handle('writeMarkdownFile', async (_, relativePath: string, content: string) => {
    try {
      const filePath = path.join(VAULT_PATH, relativePath);
      // 确保父目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      // 手动触发一次缓存更新
      await metadataCache.updateFileCache(relativePath, content);
      return true;
    } catch (err) {
      console.error(`[IPC] writeMarkdownFile failed: ${relativePath}`, err);
      return false;
    }
  });

  ipcMain.handle('listMarkdownFiles', async () => {
    try {
      return await listFilesRecursive(VAULT_PATH, VAULT_PATH);
    } catch (err) {
      console.error('[IPC] listMarkdownFiles failed', err);
      return [];
    }
  });

  ipcMain.handle('getVaultTree', async (): Promise<any> => {
    try {
      async function buildTree(dir: string, baseDir: string): Promise<any[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const nodes = await Promise.all(entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          
          if (entry.isDirectory()) {
            const children = await buildTree(fullPath, baseDir);
            if (children.length === 0 && !entry.name.startsWith('.')) {
              // 允许空文件夹，但排除隐藏目录
              return {
                id: relativePath,
                name: entry.name,
                type: 'folder',
                children: []
              };
            }
            if (children.length > 0) {
              return {
                id: relativePath,
                name: entry.name,
                type: 'folder',
                children
              };
            }
            return null;
          } else if (entry.name.endsWith('.md')) {
            const stats = await fs.stat(fullPath);
            return {
              id: relativePath,
              name: entry.name.replace(/\.md$/, ''),
              type: 'file',
              extension: '.md',
              updated_at: stats.mtime.toISOString()
            };
          }
          return null;
        }));
        return nodes.filter(Boolean).sort((a: any, b: any) => {
          // 文件夹排在前面，然后按字母排序
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
        });
      }

      return await buildTree(VAULT_PATH, VAULT_PATH);
    } catch (err) {
      console.error('[IPC] getVaultTree failed', err);
      return [];
    }
  });

  ipcMain.handle('getBacklinks', async (_, noteId: string) => {
    return metadataCache.getBacklinks(noteId);
  });

  ipcMain.handle('getTags', async () => {
    return metadataCache.getTags();
  });

  ipcMain.handle('getNotesByTag', async (_, tag: string) => {
    return metadataCache.getNotesByTag(tag);
  });

  ipcMain.handle('getNoteMetadata', async (_, noteId: string) => {
    return metadataCache.getNoteMetadata(noteId);
  });

  ipcMain.handle('setVaultPath', async (_, newPath: string) => {
    try {
      VAULT_PATH = newPath;
      await ensureVault();
      await metadataCache.scanVault(VAULT_PATH);
      metadataCache.watchVault(VAULT_PATH);
      return true;
    } catch (err) {
      console.error(`[IPC] setVaultPath failed: ${newPath}`, err);
      return false;
    }
  });

  ipcMain.handle('getVaultPath', async () => {
    return VAULT_PATH;
  });

  ipcMain.handle('renameItem', async (_, oldRelativePath: string, newRelativePath: string) => {
    try {
      const oldPath = path.join(VAULT_PATH, oldRelativePath);
      const newPath = path.join(VAULT_PATH, newRelativePath);
      await fs.rename(oldPath, newPath);
      return true;
    } catch (err) {
      console.error(`[IPC] renameItem failed: ${oldRelativePath} -> ${newRelativePath}`, err);
      return false;
    }
  });

  ipcMain.handle('deleteItem', async (_, relativePath: string) => {
    try {
      const itemPath = path.join(VAULT_PATH, relativePath);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        await fs.rm(itemPath, { recursive: true, force: true });
      } else {
        await fs.unlink(itemPath);
      }
      return true;
    } catch (err) {
      console.error(`[IPC] deleteItem failed: ${relativePath}`, err);
      return false;
    }
  });

  ipcMain.handle('moveItem', async (_, sourceRelativePath: string, targetFolderRelativePath: string) => {
    try {
      const sourcePath = path.join(VAULT_PATH, sourceRelativePath);
      const targetPath = path.join(VAULT_PATH, targetFolderRelativePath, path.basename(sourceRelativePath));
      await fs.rename(sourcePath, targetPath);
      return true;
    } catch (err) {
      console.error(`[IPC] moveItem failed: ${sourceRelativePath} -> ${targetFolderRelativePath}`, err);
      return false;
    }
  });

  ipcMain.handle('createFolder', async (_, relativePath: string) => {
    try {
      const folderPath = path.join(VAULT_PATH, relativePath);
      await fs.mkdir(folderPath, { recursive: true });
      return relativePath; // 返回创建的文件夹相对路径作为 ID
    } catch (err) {
      console.error(`[IPC] createFolder failed: ${relativePath}`, err);
      return '';
    }
  });

  ipcMain.handle('createMarkdownFile', async (_, folderRelativePath: string, fileName: string) => {
    try {
      const name = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      const filePath = path.join(VAULT_PATH, folderRelativePath, name);
      await fs.writeFile(filePath, '', 'utf-8');
      return path.relative(VAULT_PATH, filePath);
    } catch (err) {
      console.error(`[IPC] createMarkdownFile failed in ${folderRelativePath}`, err);
      return '';
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
