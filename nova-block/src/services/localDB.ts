import { openDB, type IDBPDatabase } from 'idb';
import type { Note, Notebook } from '../lib/types';

interface NovaDB {
  notes: {
    key: string | number;
    value: Note & {
      sync_status: 'synced' | 'pending' | 'deleted';
      local_updated_at: number;
    };
    indexes: { 'by-notebook': string | number | null };
  };
  notebooks: {
    key: string | number;
    value: Notebook & {
      sync_status: 'synced' | 'pending' | 'deleted';
      local_updated_at: number;
    };
  };
}

const DB_NAME = 'nova-block-db';
const DB_VERSION = 1;

export class LocalDB {
  private dbPromise: Promise<IDBPDatabase<NovaDB>>;

  constructor() {
    this.dbPromise = openDB<NovaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const noteStore = db.createObjectStore('notes', {
          keyPath: 'id',
        });
        noteStore.createIndex('by-notebook', 'notebook_id');

        db.createObjectStore('notebooks', {
          keyPath: 'id',
        });
      },
    });
  }

  async getAllNotes(): Promise<Note[]> {
    const db = await this.dbPromise;
    const notes = await db.getAll('notes');
    return notes
      .filter(n => n.sync_status !== 'deleted')
      .sort((a, b) => b.local_updated_at - a.local_updated_at);
  }

  async getNote(id: number | string): Promise<Note | undefined> {
    const db = await this.dbPromise;
    const note = await db.get('notes', id);
    return note?.sync_status === 'deleted' ? undefined : note;
  }

  async saveNote(note: Partial<Note>): Promise<void> {
    const db = await this.dbPromise;
    
    // 如果没有 ID，则自动生成一个 (UUID 风格或时间戳)
    const effectiveId = note.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const existing = await db.get('notes', effectiveId);
    
    const updatedNote = {
      ...(existing || {}),
      ...note,
      id: effectiveId,
      sync_status: 'pending' as const,
      local_updated_at: Date.now(),
    } as Note & { sync_status: 'synced' | 'pending' | 'deleted'; local_updated_at: number; };

    await db.put('notes', updatedNote);
  }

  async bulkSaveNotes(notes: Note[], status: 'synced' | 'pending' = 'synced'): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('notes', 'readwrite');
    for (const note of notes) {
      await tx.store.put({
        ...note,
        sync_status: status,
        local_updated_at: Date.now(),
      } as Note & { sync_status: 'synced' | 'pending' | 'deleted'; local_updated_at: number; });
    }
    await tx.done;
  }

  async deleteNote(id: number | string): Promise<void> {
    const db = await this.dbPromise;
    const note = await db.get('notes', id);
    if (note) {
      await db.put('notes', {
        ...note,
        sync_status: 'deleted',
        local_updated_at: Date.now(),
      });
    }
  }

  // Notebooks
  async getAllNotebooks(): Promise<Notebook[]> {
    const db = await this.dbPromise;
    const notebooks = await db.getAll('notebooks');
    return notebooks.filter(n => n.sync_status !== 'deleted');
  }

  async saveNotebook(notebook: Notebook): Promise<void> {
    const db = await this.dbPromise;
    await db.put('notebooks', {
      ...notebook,
      sync_status: 'pending',
      local_updated_at: Date.now(),
    } as Notebook & { sync_status: 'synced' | 'pending' | 'deleted'; local_updated_at: number; });
  }

  async bulkSaveNotebooks(notebooks: Notebook[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('notebooks', 'readwrite');
    for (const notebook of notebooks) {
      await tx.store.put({
        ...notebook,
        sync_status: 'synced',
        local_updated_at: Date.now(),
      } as Notebook & { sync_status: 'synced' | 'pending' | 'deleted'; local_updated_at: number; });
    }
    await tx.done;
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
  }
}

// 📂 Phase 4: 使用懒加载单例模式，防止顶层初始化污染测试/生产环境
let dbInstance: LocalDB | null = null;

export const getLocalDB = (): LocalDB => {
  if (!dbInstance) {
    dbInstance = new LocalDB();
  }
  return dbInstance;
};

// 📂 Phase 4: 暴露重置方法，方便测试环境清理句柄
export const resetLocalDB = async () => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
};
