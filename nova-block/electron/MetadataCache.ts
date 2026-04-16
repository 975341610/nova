import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export interface NoteMetadata {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  tags: string[];
  links: string[];
  frontmatter: Record<string, any>;
}

export class MetadataCache {
  private static instance: MetadataCache;
  private notes: Map<string, NoteMetadata> = new Map();
  private backlinks: Map<string, string[]> = new Map();
  private tagsIndex: Map<string, string[]> = new Map();
  private vaultPath: string = '';

  private constructor() {}

  public static getInstance(): MetadataCache {
    if (!MetadataCache.instance) {
      MetadataCache.instance = new MetadataCache();
    }
    return MetadataCache.instance;
  }

  /**
   * 提取内容中的 [[link]] 双向链接
   */
  public extractLinks(content: string): string[] {
    const regex = /\[\[(.*?)\]\]/g;
    const matches = content.matchAll(regex);
    const links = new Set<string>();
    for (const match of matches) {
      if (match[1]) {
        // 处理 [[Link|Alias]] 的情况
        const link = match[1].split('|')[0].trim();
        links.add(link);
      }
    }
    return Array.from(links);
  }

  /**
   * 提取内容中的 #tag 标签
   */
  public extractTags(content: string): string[] {
    const regex = /(?:^|\s)#([\w\u4e00-\u9fa5\/-]+)/g;
    const matches = content.matchAll(regex);
    const tags = new Set<string>();
    for (const match of matches) {
      if (match[1]) {
        tags.add(match[1]);
      }
    }
    return Array.from(tags);
  }

  /**
   * 解析 YAML Frontmatter
   */
  public parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
    const regex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
    const match = content.match(regex);
    if (match) {
      try {
        const fm = yaml.load(match[1]) as Record<string, any>;
        return {
          frontmatter: fm || {},
          body: content.slice(match[0].length)
        };
      } catch (e) {
        console.error('Failed to parse frontmatter', e);
      }
    }
    return { frontmatter: {}, body: content };
  }

  /**
   * 更新单个文件的缓存
   */
  public async updateFileCache(relativePath: string, content?: string) {
    const noteId = relativePath.endsWith('.md') ? relativePath.replace(/\.md$/, '') : relativePath;
    
    let fileContent = content;
    if (fileContent === undefined && this.vaultPath) {
      try {
        fileContent = await fs.readFile(path.join(this.vaultPath, relativePath), 'utf-8');
      } catch (e) {
        console.error(`Failed to read file ${relativePath} for cache update`, e);
        return;
      }
    }

    if (fileContent === undefined) return;

    const { frontmatter, body } = this.parseFrontmatter(fileContent);
    const links = this.extractLinks(body);
    const bodyTags = this.extractTags(body);
    
    // 合并 frontmatter 中的 tags
    const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [];
    const allTags = Array.from(new Set([...bodyTags, ...fmTags]));

    const oldNote = this.notes.get(noteId);
    const oldLinks = oldNote?.links || [];
    const oldTags = oldNote?.tags || [];

    // 更新 Note 元数据
    this.notes.set(noteId, {
      id: noteId,
      title: frontmatter.title || path.basename(noteId),
      created_at: frontmatter.created_at,
      updated_at: frontmatter.updated_at,
      tags: allTags,
      links: links,
      frontmatter
    });

    // 更新反向链接
    // 1. 移除旧的引用
    for (const oldLink of oldLinks) {
      const existingBacklinks = this.backlinks.get(oldLink) || [];
      this.backlinks.set(oldLink, existingBacklinks.filter(id => id !== noteId));
    }
    // 2. 添加新的引用
    for (const newLink of links) {
      const existingBacklinks = this.backlinks.get(newLink) || [];
      if (!existingBacklinks.includes(noteId)) {
        this.backlinks.set(newLink, [...existingBacklinks, noteId]);
      }
    }

    // 更新标签索引
    // 1. 移除旧标签索引
    for (const oldTag of oldTags) {
      const existingNotes = this.tagsIndex.get(oldTag) || [];
      this.tagsIndex.set(oldTag, existingNotes.filter(id => id !== noteId));
    }
    // 2. 添加新标签索引
    for (const newTag of allTags) {
      const existingNotes = this.tagsIndex.get(newTag) || [];
      if (!existingNotes.includes(noteId)) {
        this.tagsIndex.set(newTag, [...existingNotes, noteId]);
      }
    }
  }

  /**
   * 移除文件缓存
   */
  public removeFileCache(relativePath: string) {
    const noteId = relativePath.endsWith('.md') ? relativePath.replace(/\.md$/, '') : relativePath;
    const oldNote = this.notes.get(noteId);
    if (!oldNote) return;

    this.notes.delete(noteId);

    // 移除反向链接
    for (const oldLink of oldNote.links) {
      const existingBacklinks = this.backlinks.get(oldLink) || [];
      this.backlinks.set(oldLink, existingBacklinks.filter(id => id !== noteId));
    }

    // 移除标签索引
    for (const oldTag of oldNote.tags) {
      const existingNotes = this.tagsIndex.get(oldTag) || [];
      this.tagsIndex.set(oldTag, existingNotes.filter(id => id !== noteId));
    }
  }

  /**
   * 获取反向链接
   */
  public getBacklinks(noteId: string): string[] {
    const id = noteId.endsWith('.md') ? noteId.replace(/\.md$/, '') : noteId;
    return this.backlinks.get(id) || [];
  }

  /**
   * 获取所有标签
   */
  public getTags(): string[] {
    return Array.from(this.tagsIndex.keys());
  }

  /**
   * 根据标签获取笔记列表
   */
  public getNotesByTag(tag: string): string[] {
    return this.tagsIndex.get(tag) || [];
  }

  /**
   * 获取笔记元数据
   */
  public getNoteMetadata(noteId: string): NoteMetadata | undefined {
    const id = noteId.endsWith('.md') ? noteId.replace(/\.md$/, '') : noteId;
    return this.notes.get(id);
  }

  /**
   * 全量扫描 Vault 目录 (递归)
   */
  public async scanVault(vaultPath: string) {
    this.vaultPath = vaultPath;
    this.notes.clear();
    this.backlinks.clear();
    this.tagsIndex.clear();

    const scanDir = async (dir: string, baseDir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
          await scanDir(fullPath, baseDir);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          await this.updateFileCache(relativePath);
        }
      }
    };

    try {
      await scanDir(vaultPath, vaultPath);
      console.log(`[MetadataCache] Scanned ${this.notes.size} notes.`);
    } catch (e) {
      console.error('[MetadataCache] Failed to scan vault', e);
    }
  }

  /**
   * 启动文件监控 (递归)
   */
  public watchVault(vaultPath: string) {
    this.vaultPath = vaultPath;
    // 注意：Node.js 的 fs.watch 在某些平台上递归支持有限，但 Electron 环境通常可以设置 recursive: true
    watch(vaultPath, { recursive: true }, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.md')) return;

      // filename 已经是相对路径（在支持递归的系统上）
      const relativePath = filename;
      const fullPath = path.join(vaultPath, relativePath);

      if (eventType === 'rename') {
        try {
          await fs.access(fullPath);
          console.log(`[MetadataCache] File added/renamed: ${relativePath}`);
          await this.updateFileCache(relativePath);
        } catch {
          console.log(`[MetadataCache] File deleted: ${relativePath}`);
          this.removeFileCache(relativePath);
        }
      } else if (eventType === 'change') {
        console.log(`[MetadataCache] File changed: ${relativePath}`);
        await this.updateFileCache(relativePath);
      }
    });
    console.log(`[MetadataCache] Watching ${vaultPath} (recursive)`);
  }

  public clear() {
    this.links.clear();
    this.backlinks.clear();
  }
}
