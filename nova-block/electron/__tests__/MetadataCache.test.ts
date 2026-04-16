import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataCache } from '../MetadataCache';

describe('MetadataCache', () => {
  let cache: MetadataCache;

  beforeEach(() => {
    cache = MetadataCache.getInstance();
    cache.clear();
  });

  it('应该正确提取双向链接', () => {
    const content = '这是一个 [[链接1]] 和一个 [[链接2]]，还有重复的 [[链接1]]';
    const links = cache.extractLinks(content);
    expect(links).toContain('链接1');
    expect(links).toContain('链接2');
    expect(links.length).toBe(2);
  });

  it('应该能正确维护正向链接和反向链接', () => {
    const noteA = 'NoteA';
    const contentA = '提到 [[NoteB]] 和 [[NoteC]]';
    cache.updateFileCache(noteA, contentA);

    expect(cache.getBacklinks('NoteB')).toContain('NoteA');
    expect(cache.getBacklinks('NoteC')).toContain('NoteA');
    expect(cache.getBacklinks('NoteD')).toEqual([]);
  });

  it('更新文件时应该增量更新反向链接', () => {
    const noteA = 'NoteA';
    cache.updateFileCache(noteA, '提到 [[NoteB]]');
    expect(cache.getBacklinks('NoteB')).toContain('NoteA');

    // 修改 A，移除对 B 的引用，添加对 C 的引用
    cache.updateFileCache(noteA, '提到 [[NoteC]]');
    expect(cache.getBacklinks('NoteB')).not.toContain('NoteA');
    expect(cache.getBacklinks('NoteC')).toContain('NoteA');
  });

  it('删除文件时应该清理其产生的所有反向链接', () => {
    const noteA = 'NoteA';
    cache.updateFileCache(noteA, '提到 [[NoteB]]');
    expect(cache.getBacklinks('NoteB')).toContain('NoteA');

    cache.removeFileCache(noteA);
    expect(cache.getBacklinks('NoteB')).not.toContain('NoteA');
  });

  it('getBacklinks 应该能处理 .md 后缀', () => {
    cache.updateFileCache('NoteA', '提到 [[NoteB]]');
    expect(cache.getBacklinks('NoteB.md')).toContain('NoteA');
  });
});
