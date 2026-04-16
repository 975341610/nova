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

class HybridDataService implements DataService {
  async getBacklinks(noteId: string | number): Promise<string[]> {
    if (window.electronAPI) {
      return window.electronAPI.getBacklinks(noteId.toString());
    }
    // 降级逻辑：在浏览器端，通过搜索所有笔记内容来查找包含 [[noteId]] 的笔记
    try {
      const allNotes = await this.getAllNotes();
      const targetTitle = typeof noteId === 'string' ? noteId.replace('.md', '') : noteId.toString();
      const pattern = `[[${targetTitle}]]`;
      
      return allNotes
        .filter(note => note.content?.includes(pattern))
        .map(note => note.title);
    } catch (err) {
      console.error('HybridDataService.getBacklinks failed', err);
      return [];
    }
  }

  async getAllNotes(): Promise<Note[]> {
    if (window.electronAPI) {
      // 📂 Phase 4: 在 Electron 模式下，我们需要同时获取文件和目录
      // 我们通过 getVaultTree 获取结构并扁平化为 Note 数组
      const tree = await window.electronAPI.getVaultTree();
      const notes: Note[] = [];
      
      const flatten = async (nodes: any[], parentId: string | null = null) => {
        for (const node of nodes) {
          const isFolder = node.type === 'folder';
          const meta = !isFolder ? await window.electronAPI!.getNoteMetadata(node.id) : null;
          
          notes.push({
            id: node.id,
            title: meta?.title || node.name,
            tags: meta?.tags || [],
            created_at: meta?.created_at || new Date().toISOString(),
            updated_at: node.updated_at || meta?.updated_at,
            frontmatter: meta?.frontmatter,
            summary: '',
            icon: isFolder ? '📂' : '📄',
            is_title_manually_edited: false,
            properties: [],
            notebook_id: null,
            parent_id: parentId,
            position: 0,
            links: meta?.links || [],
            is_folder: isFolder
          } as Note);
          
          if (isFolder && node.children) {
            await flatten(node.children, node.id);
          }
        }
      };
      
      await flatten(tree);
      return notes;
    }
    return localDB.getAllNotes();
  }

  async getNote(id: string | number): Promise<Note | undefined> {
    if (window.electronAPI) {
      try {
        const fileName = id.toString().endsWith('.md') ? id.toString() : `${id}.md`;
        const content = await window.electronAPI.readMarkdownFile(fileName);
        const meta = await window.electronAPI.getNoteMetadata(id.toString());
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
    return localDB.getNote(id);
  }

  async saveNote(note: Partial<Note> & { id: string | number }): Promise<void> {
    if (window.electronAPI) {
      const fileName = note.id.toString().endsWith('.md') ? note.id.toString() : `${note.id}.md`;
      
      // 📂 Electron 模式下，读取旧笔记以合并 Metadata
      try {
        const currentMeta = await window.electronAPI.getNoteMetadata(note.id.toString());
        const currentContent = await window.electronAPI.readMarkdownFile(fileName).catch(() => '');
        
        const newTitle = note.title !== undefined ? note.title : (currentMeta?.title || fileName.replace(/\.md$/, ''));
        const newTags = note.tags !== undefined ? note.tags : (currentMeta?.tags || []);
        const newContent = note.content !== undefined ? note.content : currentContent;

        // 构建 YAML frontmatter
        const fm: Record<string, any> = {
          ...(currentMeta?.frontmatter || {}),
          id: note.id.toString(),
          title: newTitle,
          tags: newTags,
          updated_at: new Date().toISOString(),
          parent_id: note.parent_id !== undefined ? note.parent_id : (currentMeta?.parent_id || null),
          is_folder: note.is_folder !== undefined ? note.is_folder : (currentMeta?.is_folder || false)
        };

        const fmString = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
        const fullMarkdown = fmString + newContent;
        
        await window.electronAPI.writeMarkdownFile(fileName, fullMarkdown);
      } catch (err) {
        // 如果是新创建且没有 Metadata 的情况，直接写入简略版
        const fm = {
          id: note.id.toString(),
          title: note.title || fileName.replace(/\.md$/, ''),
          tags: note.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          parent_id: note.parent_id || null,
          is_folder: note.is_folder || false
        };
        const fmString = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
        await window.electronAPI.writeMarkdownFile(fileName, fmString + (note.content || ''));
      }
      return;
    }
    return localDB.saveNote(note);
  }

  async deleteNote(id: string | number): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.deleteItem(id.toString());
      return;
    }
    return localDB.deleteNote(id);
  }

  async getAllNotebooks(): Promise<Notebook[]> {
    if (window.electronAPI) return [];
    return localDB.getAllNotebooks();
  }

  async saveNotebook(notebook: Notebook): Promise<void> {
    if (window.electronAPI) return;
    return localDB.saveNotebook(notebook);
  }

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    if (window.electronAPI) {
      // 📂 Electron 模式下，重命名需要同时更新文件内容里的 title metadata
      try {
        const id = oldPath;
        const note = await this.getNote(id);
        if (note) {
          const newTitle = newPath.split('/').pop()?.replace('.md', '') || newPath;
          // 先更新 metadata 中的 title，然后触发文件系统重命名
          await this.saveNote({ ...note, title: newTitle });
          await window.electronAPI.renameItem(oldPath, newPath);
        } else {
          await window.electronAPI.renameItem(oldPath, newPath);
        }
      } catch (err) {
        console.error('HybridDataService.renameItem (Electron) failed', err);
        await window.electronAPI.renameItem(oldPath, newPath);
      }
      return;
    }
    
    try {
      const id = isNaN(Number(oldPath)) ? oldPath : Number(oldPath);
      const note = await localDB.getNote(id);
      if (note) {
        const newTitle = newPath.split('/').pop()?.replace('.md', '') || newPath;
        await localDB.saveNote({ ...note, title: newTitle });
      }
    } catch (err) {
      console.error('HybridDataService.renameItem failed', err);
    }
  }

  async deleteItem(path: string): Promise<void> {
    return this.deleteNote(path);
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    if (window.electronAPI) {
      // 📂 Electron 模式：更新 parent_id metadata 并在 FS 移动
      try {
        const note = await this.getNote(sourcePath);
        if (note) {
          const targetParentId = targetFolder === 'root' || targetFolder === '' ? null : targetFolder;
          await this.saveNote({ ...note, parent_id: targetParentId });
        }
        await window.electronAPI.moveItem(sourcePath, targetFolder);
      } catch (err) {
        console.error('HybridDataService.moveItem (Electron) failed', err);
        await window.electronAPI.moveItem(sourcePath, targetFolder);
      }
      return;
    }

    try {
      const id = isNaN(Number(sourcePath)) ? sourcePath : Number(sourcePath);
      const targetParentId = targetFolder === 'root' || targetFolder === '' 
        ? null 
        : (isNaN(Number(targetFolder)) ? targetFolder : Number(targetFolder));
      
      const note = await localDB.getNote(id);
      if (note) {
        await localDB.saveNote({ ...note, parent_id: targetParentId });
      }
    } catch (err) {
      console.error('HybridDataService.moveItem failed', err);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.createFolder(folderPath);
      return;
    }

    try {
      const parts = folderPath.split('/');
      const folderName = parts.pop() || '新文件夹';
      const parentIdStr = parts.join('/'); // 修复 parentId 的提取逻辑
      const parentId = parentIdStr === '' ? null : (isNaN(Number(parentIdStr)) ? parentIdStr : Number(parentIdStr));

      const newFolder: Note = {
        id: `folder_${Date.now()}`,
        title: folderName,
        is_folder: true,
        parent_id: parentId,
        content: '',
        tags: [],
        properties: [],
        links: [],
        notebook_id: null,
        position: 0,
        sort_key: 'm',
        summary: '',
        is_title_manually_edited: false,
        created_at: new Date().toISOString(),
      } as Note;
      
      await localDB.saveNote(newFolder);
    } catch (err) {
      console.error('HybridDataService.createFolder failed', err);
    }
  }

  async createMarkdownFile(folderPath: string, fileName: string): Promise<string> {
    if (window.electronAPI) {
      return await window.electronAPI.createMarkdownFile(folderPath, fileName);
    }

    try {
      const parentId = folderPath ? (isNaN(Number(folderPath)) ? folderPath : Number(folderPath)) : null;
      const newId = `note_${Date.now()}`;
      const newNote: Note = {
        id: newId,
        title: fileName || '无标题笔记',
        is_folder: false,
        parent_id: parentId,
        content: '',
        tags: [],
        properties: [],
        links: [],
        notebook_id: null,
        position: 0,
        sort_key: 'm',
        summary: '',
        is_title_manually_edited: false,
        created_at: new Date().toISOString(),
      } as Note;
      
      await localDB.saveNote(newNote);
      return newId;
    } catch (err) {
      console.error('HybridDataService.createMarkdownFile failed', err);
      return '';
    }
  }

  async getVaultTree(): Promise<import('../lib/types').FileTreeNode[]> {
    if (window.electronAPI) {
      return window.electronAPI.getVaultTree();
    }
    const allNotes = await this.getAllNotes();
    
    // 构建树形结构逻辑
    const nodeMap = new Map<string | number, import('../lib/types').FileTreeNode>();
    const rootNodes: import('../lib/types').FileTreeNode[] = [];

    // 第一遍：创建所有节点
    allNotes.forEach(note => {
      nodeMap.set(note.id, {
        id: note.id.toString(),
        name: note.title,
        type: note.is_folder ? 'folder' : 'file',
        children: note.is_folder ? [] : undefined,
        updated_at: note.updated_at
      });
    });

    // 第二遍：建立父子关系
    allNotes.forEach(note => {
      const currentNode = nodeMap.get(note.id)!;
      if (note.parent_id !== undefined && note.parent_id !== null && nodeMap.has(note.parent_id)) {
        const parentNode = nodeMap.get(note.parent_id)!;
        if (parentNode.children) {
          parentNode.children.push(currentNode);
        } else {
          parentNode.type = 'folder';
          parentNode.children = [currentNode];
        }
      } else {
        rootNodes.push(currentNode);
      }
    });

    return rootNodes;
  }
}

export const dataService: DataService = new HybridDataService();
