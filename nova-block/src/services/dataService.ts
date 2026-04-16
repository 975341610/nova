import type { Note, Notebook, ElectronAPI } from '../lib/types';
import { localDB } from './localDB';

export interface DataService {
  getAllNotes(): Promise<Note[]>;
  getNote(id: string | number): Promise<Note | undefined>;
  saveNote(note: Partial<Note> & { id: string | number }): Promise<void>;
  deleteNote(id: string | number): Promise<void>;
  getAllNotebooks(): Promise<Notebook[]>;
  saveNotebook(notebook: Notebook): Promise<void>;
  getBacklinks(noteId: string | number): Promise<string[]>;
  getVaultTree(): Promise<import('../lib/types').FileTreeNode[]>;
  renameItem(oldPath: string, newPath: string): Promise<void>;
  deleteItem(path: string): Promise<void>;
  moveItem(sourcePath: string, targetFolder: string): Promise<void>;
  createFolder(folderPath: string): Promise<void>;
  createMarkdownFile(folderPath: string, fileName: string): Promise<string>;
}

class ElectronDataService implements DataService {
  async getBacklinks(noteId: string): Promise<string[]> {
    if (!window.electronAPI) return [];
    return window.electronAPI.getBacklinks(noteId);
  }

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    if (!window.electronAPI) return;
    await window.electronAPI.renameItem(oldPath, newPath);
  }

  async deleteItem(path: string): Promise<void> {
    if (!window.electronAPI) return;
    await window.electronAPI.deleteItem(path);
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    if (!window.electronAPI) return;
    await window.electronAPI.moveItem(sourcePath, targetFolder);
  }

  async createFolder(folderPath: string): Promise<void> {
    if (!window.electronAPI) return;
    await window.electronAPI.createFolder(folderPath);
  }

  async createMarkdownFile(folderPath: string, fileName: string): Promise<string> {
    if (!window.electronAPI) return '';
    return window.electronAPI.createMarkdownFile(folderPath, fileName);
  }
  async getAllNotes(): Promise<Note[]> {
    if (!window.electronAPI) throw new Error('Electron API not available');
    const files = await window.electronAPI.listMarkdownFiles();
    const notes: Note[] = await Promise.all(
      files.map(async (file) => {
        const meta = await window.electronAPI!.getNoteMetadata(file);
        return {
          id: file,
          title: meta?.title || file.replace(/\.md$/, ''),
          tags: meta?.tags || [],
          created_at: meta?.created_at || new Date().toISOString(),
          updated_at: meta?.updated_at,
          frontmatter: meta?.frontmatter,
          summary: '',
          icon: '📄',
          is_title_manually_edited: false,
          properties: [],
          notebook_id: null,
          parent_id: null,
          position: 0,
          links: meta?.links || []
        } as Note;
      })
    );
    return notes;
  }

  async getNote(id: string): Promise<Note | undefined> {
    if (!window.electronAPI) throw new Error('Electron API not available');
    try {
      const fileName = id.endsWith('.md') ? id : `${id}.md`;
      const content = await window.electronAPI.readMarkdownFile(fileName);
      const meta = await window.electronAPI.getNoteMetadata(id);
      return {
        id: fileName,
        title: meta?.title || fileName.replace(/\.md$/, ''),
        content,
        tags: meta?.tags || [],
        created_at: meta?.created_at || new Date().toISOString(),
        updated_at: meta?.updated_at,
        frontmatter: meta?.frontmatter,
        summary: '',
        icon: '📄',
        is_title_manually_edited: false,
        properties: [],
        notebook_id: null,
        parent_id: null,
        position: 0,
        links: meta?.links || []
      } as Note;
    } catch {
      return undefined;
    }
  }

  async saveNote(note: Partial<Note> & { id: string }): Promise<void> {
    if (!window.electronAPI) throw new Error('Electron API not available');
    const fileName = note.id.endsWith('.md') ? note.id : `${note.id}.md`;
    await window.electronAPI.writeMarkdownFile(fileName, note.content || '');
  }

  async deleteNote(id: string): Promise<void> {
    // 暂时不做文件删除，或者主进程实现删除接口
    console.warn('Delete not implemented in Electron yet');
  }

  async getAllNotebooks(): Promise<Notebook[]> {
    return []; // Electron 下暂时不分 Notebook，或者以文件夹区分
  }

  async getVaultTree(): Promise<import('../lib/types').FileTreeNode[]> {
    if (!window.electronAPI) return [];
    return window.electronAPI.getVaultTree();
  }

  async saveNotebook(): Promise<void> {}
}

class BrowserDataService implements DataService {
  async getBacklinks(noteId: string | number): Promise<string[]> {
    // 降级逻辑：在浏览器端，通过搜索所有笔记内容来查找包含 [[noteId]] 的笔记
    try {
      const allNotes = await this.getAllNotes();
      const targetTitle = typeof noteId === 'string' ? noteId.replace('.md', '') : noteId.toString();
      const pattern = `[[${targetTitle}]]`;
      
      return allNotes
        .filter(note => note.content?.includes(pattern))
        .map(note => note.title);
    } catch (err) {
      console.error('BrowserDataService.getBacklinks failed', err);
      return [];
    }
  }
  async getAllNotes() { return localDB.getAllNotes(); }
  async getNote(id: number | string) { return localDB.getNote(id); }
  async saveNote(note: Partial<Note> & { id: string | number }) { return localDB.saveNote(note); }
  async deleteNote(id: number | string) { return localDB.deleteNote(id); }
  async getAllNotebooks() { return localDB.getAllNotebooks(); }
  async saveNotebook(notebook: Notebook) { return localDB.saveNotebook(notebook); }

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    try {
      const id = isNaN(Number(oldPath)) ? oldPath : Number(oldPath);
      const note = await localDB.getNote(id);
      if (note) {
        await localDB.saveNote({ ...note, title: newPath });
      }
    } catch (err) {
      console.error('BrowserDataService.renameItem failed', err);
    }
  }

  async deleteItem(path: string): Promise<void> {
    try {
      const id = isNaN(Number(path)) ? path : Number(path);
      await localDB.deleteNote(id);
    } catch (err) {
      console.error('BrowserDataService.deleteItem failed', err);
    }
  }

  async moveItem(): Promise<void> {}
  async createFolder(): Promise<void> {}
  async createMarkdownFile(): Promise<string> { return ''; }

  async getVaultTree(): Promise<import('../lib/types').FileTreeNode[]> {
    const allNotes = await this.getAllNotes();
    return [{
      id: 'root',
      name: 'All Notes',
      type: 'folder',
      children: allNotes.map(note => ({
        id: note.id.toString(),
        name: note.title,
        type: 'file',
        updated_at: note.updated_at
      }))
    }];
  }
}

export const dataService: DataService = window.electronAPI 
  ? new ElectronDataService() 
  : new BrowserDataService();
