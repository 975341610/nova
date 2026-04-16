export type NoteProperty = {
  id: number | string;
  note_id: number | string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multi_select';
  value: string;
};

export type StickerData = {
  id: string;
  type: 'image';     // Stickers are purely images/decorations
  url: string;       // Image sticker path
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type StickyNoteData = {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  content: string; // HTML string
};

export type BackgroundPaperType = 'none' | 'dot' | 'line' | 'grid';

export type Note = {
  id: number | string;
  title: string;
  icon?: string;
  content?: string;
  type?: string;
  summary: string;
  is_title_manually_edited: boolean;
  tags: string[];
  properties: NoteProperty[];
  sticky_notes?: StickyNoteData[];
  stickers?: StickerData[];
  links: (number | string)[];
  notebook_id: number | string | null;
  parent_id: number | string | null;
  position: number;
  sort_key?: string;
  is_folder?: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_draft?: boolean;
  background_paper?: BackgroundPaperType;
  frontmatter?: Record<string, any>;
};

export type OutlineItem = {
  id: string;
  text: string;
  level: number;
};

export type Notebook = {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  deleted_at?: string | null;
};

export type TrashState = {
  notes: Note[];
  notebooks: Notebook[];
};

export type Task = {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  task_type: 'meeting' | 'work' | 'travel' | 'errand' | 'study' | 'personal';
  deadline: string | null;
  created_at: string;
};

export type Citation = {
  note_id: number | null;
  title: string;
  chunk_id: string;
  score: number;
  excerpt: string;
};

export type AskResponse = {
  answer: string;
  citations: Citation[];
  mode: string;
};

export type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  mode?: 'chat' | 'rag' | 'agent';
  created_at: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updated_at: string;
};

export type ModelConfig = {
  provider: string;
  api_key: string;
  base_url: string;
  model_name: string;
};

export type ToastMessage = {
  id: number;
  tone: 'success' | 'error' | 'info';
  text: string;
};

export type UserStats = {
  exp: number;
  level: number;
  total_captures: number;
  current_theme: string;
  wallpaper_url?: string;
};

export type Achievement = {
  id: number;
  name: string;
  description: string;
  condition_type: string;
  condition_value: number;
  icon: string;
  created_at: string;
};

export type UserAchievement = {
  id: number;
  achievement_id: number;
  unlocked_at: string;
  achievement: Achievement;
};

export type FileTreeNode = {
  id: string; // 相对路径或唯一标识
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  extension?: string;
  updated_at?: string;
};

export type AppStatus = 'INIT' | 'LOADING_BACKEND' | 'LOADING_FRONTEND' | 'READY' | 'ERROR';

export type BGMState = {
  isPlaying: boolean;
  volume: number;
  tracks: string[];
  currentTrack: string | null;
};

export type NoteTemplate = {
  id: number;
  name: string;
  content: string;
  icon: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export interface ThemeConfig {
  version: string;
  slashMenu: {
    opacity: number;
    blur: number;
    backgroundColor: string;
    foregroundColor: string;
    borderColor: string;
  };
  textMenu: {
    opacity: number;
    blur: number;
    backgroundColor: string;
    foregroundColor: string;
    borderColor: string;
  };
  blockMenu: {
    opacity: number;
    blur: number;
    backgroundColor: string;
    foregroundColor: string;
    borderColor: string;
  };
}

export interface ElectronAPI {
  readMarkdownFile: (path: string) => Promise<string>;
  writeMarkdownFile: (path: string, content: string) => Promise<boolean>;
  listMarkdownFiles: () => Promise<string[]>;
  getBacklinks: (noteId: string) => Promise<string[]>;
  getTags: () => Promise<string[]>;
  getNotesByTag: (tag: string) => Promise<string[]>;
  getNoteMetadata: (noteId: string) => Promise<any>;
  getVaultTree: () => Promise<FileTreeNode[]>;
  getVaultPath: () => Promise<string>;
  setVaultPath: (path: string) => Promise<boolean>;
  renameItem: (oldPath: string, newPath: string) => Promise<boolean>;
  deleteItem: (path: string) => Promise<boolean>;
  moveItem: (sourcePath: string, targetFolder: string) => Promise<boolean>;
  createFolder: (folderPath: string) => Promise<boolean>;
  createMarkdownFile: (folderPath: string, fileName: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    electron?: {
      ipcInvoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
