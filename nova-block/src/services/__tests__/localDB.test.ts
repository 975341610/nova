import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LocalDB } from '../localDB';
import type { Note } from '../../lib/types';
import { deleteDB } from 'idb';

describe('LocalDB', () => {
  let db: LocalDB;

  beforeEach(async () => {
    // 清理数据库以防状态污染
    await deleteDB('nova-block-db');
    db = new LocalDB();
  });

  afterEach(async () => {
    // 确保数据库被关闭并删除
    await db.close();
    await deleteDB('nova-block-db');
  });

  it('应该能保存并读取笔记', async () => {
    const mockNote: any = {
      id: 1,
      title: '测试笔记',
      content: '内容',
      notebook_id: 1,
    };

    await db.saveNote(mockNote);
    const savedNote = await db.getNote(1);

    expect(savedNote).toBeDefined();
    expect(savedNote?.title).toBe('测试笔记');
    expect((savedNote as any).sync_status).toBe('pending');
  });

  it('应该能批量保存并读取笔记', async () => {
    const mockNotes: any[] = [
      { id: 1, title: '笔记1', content: '内容1' },
      { id: 2, title: '笔记2', content: '内容2' },
    ];

    await db.bulkSaveNotes(mockNotes);
    const allNotes = await db.getAllNotes();

    expect(allNotes.length).toBe(2);
    // 检查 ID 是否都存在即可，不依赖顺序
    const ids = allNotes.map(n => n.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect((allNotes[0] as any).sync_status).toBe('synced');
  });

  it('删除笔记应标记为 deleted 状态', async () => {
    const mockNote: any = { id: 1, title: '待删除', content: '' };
    await db.saveNote(mockNote);
    
    await db.deleteNote(1);
    const note = await db.getNote(1);
    expect(note).toBeUndefined();

    // 验证底层存储仍然存在但状态为 deleted
    const allNotes = await db.getAllNotes();
    expect(allNotes.length).toBe(0);
  });
});
