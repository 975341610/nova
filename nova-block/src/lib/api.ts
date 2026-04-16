import { localDB } from '../services/localDB';
import type { 
  AskResponse, 
  ModelConfig, 
  Note, 
  NoteTemplate,
  Notebook, 
  NoteProperty, 
  Task, 
  TrashState, 
  UserStats,
  UserAchievement,
  ElectronAPI
} from './types';
export const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('strato-https-proxy')) {
      return `https://${window.location.hostname.replace(/^[0-9]+-/, '8765-')}/api`;
    }
    if (window.location.hostname.includes('aime-app.bytedance.net')) {
      return `https://${window.location.hostname}/api`;
    }
    
    // 如果是本地 Vite 开发服务器 (5173 / 4173)，则强制请求本地 8765 后端
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port === '5173' || window.location.port === '4173') {
        return 'http://127.0.0.1:8765/api';
      }
    }
  }
  
  return 'http://127.0.0.1:8765/api';
};

/**
 * 格式化 API 返回的相对路径为绝对 URL
 */
export const formatUrl = (url: string | undefined | null) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  const base = getApiBase(); // e.g. http://127.0.0.1:8765/api
  
  // 如果路径以 /api 开头，我们需要处理掉重复的 /api
  if (url.startsWith('/api/')) {
    const apiBaseWithoutTrailingSlash = base.endsWith('/api') ? base.slice(0, -4) : base;
    return `${apiBaseWithoutTrailingSlash}${url}`;
  }
  
  // 否则直接拼接
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};



// Helper to call IPC or fallback to fetch
async function invoke<T>(channel: string, path: string, options?: any): Promise<T> {
  if (window.electron?.ipcInvoke) {
    // 📂 彻底切换到 Electron IPC 进行本地直接 CRUD
    // 坚决不使用 fetch 向本地 Python 后端发起 HTTP 请求
    try {
      const payload = options?.body ? JSON.parse(options.body) : options?.params || options;
      return await window.electron.ipcInvoke(channel, payload);
    } catch (e) {
      console.error(`IPC call to ${channel} failed:`, e);
      throw e; // 在 Electron 环境下，IPC 失败就不再回退到 fetch，防止违反离线优先原则
    }
  }
  
  // Fallback to FastAPI REST API (only if electron is not available, e.g. web preview)
  const API_BASE = getApiBase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export const api = {
  listNotes: async () => {
    // 📂 Electron 桌面端直接模式 (Phase 4)
    if (window.electronAPI) {
      const files = await window.electronAPI.listMarkdownFiles();
      const notes: Note[] = await Promise.all(files.map(async (file) => {
        const meta = await window.electronAPI!.getNoteMetadata(file);
        return {
          id: file,
          title: meta?.title || file.replace(/\.md$/, ''),
          content: '', // 列表页不需要全文
          tags: meta?.tags || [],
          links: [],
          created_at: meta?.created_at || new Date().toISOString(),
          updated_at: meta?.updated_at,
          frontmatter: meta?.frontmatter,
          summary: '',
          icon: '📄',
          is_title_manually_edited: false,
          properties: [],
          notebook_id: null,
          parent_id: null,
          position: 0
        } as Note;
      }));
      return notes;
    }

    // 🌐 浏览器降级模式 (IndexedDB)
    const localNotes = await localDB.getAllNotes();
    
    // 异步同步逻辑 (如果是 Web 模式且有后端)
    if (!window.electronAPI) {
      (async () => {
        try {
          const remoteNotes = await invoke<Note[]>('notes:list', '/notes');
          await localDB.bulkSaveNotes(remoteNotes);
        } catch (e) {
          console.warn('Sync failed:', e);
        }
      })();
    }

    return localNotes;
  },

  getNote: async (noteId: number | string) => {
    if (window.electronAPI && typeof noteId === 'string') {
      const content = await window.electronAPI.readMarkdownFile(noteId.endsWith('.md') ? noteId : `${noteId}.md`);
      const meta = await window.electronAPI.getNoteMetadata(noteId);
      return {
        id: noteId,
        title: meta?.title || (typeof noteId === 'string' ? noteId.replace(/\.md$/, '') : 'Untitled'),
        content,
        tags: meta?.tags || [],
        links: meta?.links || [],
        created_at: meta?.created_at || new Date().toISOString(),
        updated_at: meta?.updated_at,
        frontmatter: meta?.frontmatter,
        summary: '',
        icon: '📄',
        is_title_manually_edited: false,
        properties: [],
        notebook_id: null,
        parent_id: null,
        position: 0
      } as Note;
    }

    const localNote = await localDB.getNote(noteId as number);
    if (localNote) {
      if (!window.electronAPI) {
        (async () => {
          try {
            const remoteNote = await invoke<Note>('notes:get', `/notes/${noteId}`);
            await localDB.saveNote(remoteNote);
          } catch (e) {
            console.warn(`Sync failed for note ${noteId}:`, e);
          }
        })();
      }
      return localNote;
    }
    
    const remoteNote = await invoke<Note>('notes:get', `/notes/${noteId}`);
    await localDB.saveNote(remoteNote);
    return remoteNote;
  },

  listNotebooks: async () => {
    const localNotebooks = await localDB.getAllNotebooks();
    (async () => {
      try {
        const remoteNotebooks = await invoke<Notebook[]>('notebooks:list', '/notebooks');
        await localDB.bulkSaveNotebooks(remoteNotebooks);
      } catch (e) {
        console.warn('Sync notebooks failed:', e);
      }
    })();
    return localNotebooks;
  },

  createNotebook: async (payload: { name: string; icon?: string }) => {
    const notebook = await invoke<Notebook>('notebooks:create', '/notebooks', { method: 'POST', body: JSON.stringify(payload) });
    await localDB.saveNotebook(notebook);
    return notebook;
  },

  updateNotebook: async (notebookId: number, payload: { name?: string; icon?: string }) => {
    const notebook = await invoke<Notebook>('notebooks:update', `/notebooks/${notebookId}`, { params: { id: notebookId, ...payload } });
    await localDB.saveNotebook(notebook);
    return notebook;
  },

  deleteNotebook: async (notebookId: number) => {
    const res = await invoke('notebooks:delete', `/notebooks/${notebookId}`, { params: { id: notebookId } });
    // TODO: 完善本地 Notebook 删除逻辑
    return res;
  },

  restoreNotebook: (notebookId: number) => invoke<Notebook>('notebooks:restore', `/notebooks/${notebookId}/restore`, { params: { id: notebookId } }),
  purgeNotebook: (notebookId: number) => invoke('notebooks:purge', `/notebooks/${notebookId}/purge`, { params: { id: notebookId } }),

  createNote: async (payload: { title: string; content: string; notebook_id?: number | null; icon?: string; parent_id?: number | null; is_title_manually_edited?: boolean; tags?: string[] }) => {
    if (window.electronAPI) {
      const noteId = `${payload.title || 'Untitled'}.md`;
      const fm: Record<string, any> = {
        id: noteId,
        title: payload.title,
        tags: payload.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const fmString = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
      const fullMarkdown = fmString + (payload.content || '');
      await window.electronAPI.writeMarkdownFile(noteId, fullMarkdown);
      return {
        id: noteId,
        ...payload,
        created_at: fm.created_at,
        frontmatter: fm,
        summary: '',
        icon: '📄',
        is_title_manually_edited: false,
        properties: [],
        links: [],
        notebook_id: null,
        parent_id: null,
        position: 0
      } as Note;
    }

    // 这是一个特殊的 case，创建需要先拿到后端分配的真实 ID 才能进行后续操作（如双链）
    // 但为了响应速度，我们可以先创建一个临时的本地 ID 并在同步后修正，
    // 不过目前为了稳妥起见，创建操作保持同步等待，或后续实现乐观创建。
    const note = await invoke<Note>('notes:create', '/notes', { method: 'POST', body: JSON.stringify(payload) });
    await localDB.saveNote(note);
    return note;
  },

  updateNote: async (noteId: number | string, payload: { title?: string; content?: string; icon?: string; parent_id?: number | null; is_title_manually_edited?: boolean; tags?: string[], file_path?: string }) => {
    // 📂 Electron 桌面端直接模式 (Phase 4)
    if (window.electronAPI && typeof noteId === 'string') {
      const current = await api.getNote(noteId);
      const newContent = payload.content !== undefined ? payload.content : current.content || '';
      const newTags = payload.tags !== undefined ? payload.tags : current.tags;
      const newTitle = payload.title !== undefined ? payload.title : current.title;

      // 构建 YAML frontmatter
      const fm: Record<string, any> = {
        ...(current.frontmatter || {}),
        title: newTitle,
        tags: newTags,
        updated_at: new Date().toISOString()
      };
      if (!fm.id) fm.id = noteId;
      if (!fm.created_at) fm.created_at = current.created_at;

      // 序列化 (正文如果本身含有 frontmatter 需要剥离，但这里我们假设 content 只是正文)
      const fmString = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
      // 注意：这里简单的序列化可能不够健壮，但在受控环境下可用。
      // 如果要更健壮，需要在 main 进程或这里引用 js-yaml (但 js-yaml 主要是解析)
      
      const fullMarkdown = fmString + newContent;
      await window.electronAPI.writeMarkdownFile(noteId.endsWith('.md') ? noteId : `${noteId}.md`, fullMarkdown);
      return { ...current, ...payload, tags: newTags, title: newTitle } as Note;
    }

    // 离线优先：立即保存到本地
    const currentNote = await localDB.getNote(noteId);
    if (currentNote) {
      const optimisticNote = { ...currentNote, ...payload };
      await localDB.saveNote(optimisticNote as any);
    }

    // 异步同步到后端
    (async () => {
      try {
        const updatedRemote = await invoke<Note>('notes:update', `/notes/${noteId}`, { params: { id: noteId, ...payload } });
        // 同步成功后，标记为已同步
        const noteWithStatus = { ...updatedRemote, sync_status: 'synced' } as any;
        await localDB.saveNote(noteWithStatus);
      } catch (e) {
        console.warn(`Background sync failed for note ${noteId}:`, e);
      }
    })();

    // 立即返回（如果是更新操作且本地已有）
    return currentNote ? ({ ...currentNote, ...payload } as Note) : await invoke<Note>('notes:update', `/notes/${noteId}`, { params: { id: noteId, ...payload } });
  },

  updateNoteTags: (noteId: number, tags: string[]) =>
    invoke<Note>('notes:update-tags', `/notes/${noteId}/tags`, { params: { id: noteId, tags } }),
  moveNote: (noteId: number, payload: { notebook_id?: number | null; position: number; parent_id?: number | null }) =>
    invoke<Note>('notes:move', `/notes/${noteId}/move`, { params: { id: noteId, ...payload } }),
  bulkMoveNotes: (payload: { note_ids: number[]; notebook_id?: number | null; position: number; parent_id?: number | null }) =>
    invoke<{ notes: Note[] }>('notes:bulk-move', '/notes/bulk-move', { method: 'POST', body: JSON.stringify(payload) }),
  bulkDeleteNotes: (payload: { note_ids: number[]; position?: number }) =>
    invoke<{ notes: Note[] }>('notes:bulk-delete', '/notes/bulk-delete', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNote: async (noteId: number | string) => {
    // 离线优先：本地标记删除
    await localDB.deleteNote(noteId);
    
    // 异步同步到后端
    (async () => {
      try {
        await invoke('notes:delete', `/notes/${noteId}`, { params: { id: noteId } });
      } catch (e) {
        console.warn(`Background delete failed for note ${noteId}:`, e);
      }
    })();
    
    return { status: 'deleted' };
  },
  listNotesFiltered: (propertyName: string, propertyValue: string) => 
    invoke<Note[]>('notes:list-filtered', `/notes?property_name=${encodeURIComponent(propertyName)}&property_value=${encodeURIComponent(propertyValue)}`, { params: { propertyName, propertyValue } }),
  restoreNote: (noteId: number) => invoke<Note>('notes:restore', `/notes/${noteId}/restore`, { params: { id: noteId } }),
  purgeNote: (noteId: number) => invoke('notes:purge', `/notes/${noteId}/purge`, { params: { id: noteId } }),
  purgeTrash: () => invoke('trash:purge', '/trash/purge'),
  getTrash: async () => {
    const res = await invoke<any>('trash:get', '/trash');
    if (!res || Array.isArray(res)) return { notes: [], notebooks: [] };
    return res as TrashState;
  },
  listTasks: () => invoke<Task[]>('tasks:list', '/tasks'),
  createTask: (payload: { title: string; status?: string; priority?: string; task_type?: string; deadline?: string | null }) =>
    invoke<Task>('tasks:create', '/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (taskId: number, payload: { title?: string; status?: string; priority?: string; task_type?: string; deadline?: string | null }) =>
    invoke<Task>('tasks:update', `/tasks/${taskId}`, { params: { id: taskId, ...payload } }),
  deleteTask: (taskId: number) => invoke('tasks:delete', `/tasks/${taskId}`, { params: { id: taskId } }),
  clearCompletedTasks: () => invoke('tasks:clear-completed', '/tasks/clear-completed'),
  ask: (payload: { question: string; mode: 'chat' | 'rag' | 'agent' }) =>
    invoke<AskResponse>('ai:ask', '/ask', { method: 'POST', body: JSON.stringify(payload) }),
  streamInlineAI: async (payload: { prompt: string; context: string; action: string }, onChunk: (chunk: string) => void) => {
    if (window.electron?.ipcInvoke) {
      return window.electron.ipcInvoke('ai:stream-inline', payload, (chunk: string) => onChunk(chunk));
    }
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/ai/inline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              onChunk(parsed.text);
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', data, e);
          }
        }
      }
    }
  },
  getModelConfig: () => invoke<ModelConfig>('config:get-model', '/model-config'),
  updateModelConfig: (payload: ModelConfig) =>
    invoke<ModelConfig>('config:update-model', '/model-config', { method: 'POST', body: JSON.stringify(payload) }),
  
  // Streaming AI and File uploads still use network requests (or we can wrap them later)
  // For now, these are less critical than CRUD saving
  streamChat: async (payload: { question: string; mode: string }, onChunk: (chunk: string) => void) => {
    if (window.electron?.ipcInvoke) {
      // Use IPC for streaming if implemented
      try {
        await window.electron.ipcInvoke('ai:stream-chat', payload, (chunk: string) => onChunk(chunk));
        return;
      } catch (e) {
        console.warn('IPC streaming failed, falling back to fetch', e);
      }
    }
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  },
  upload: async (files: File[], noteId?: number | string) => {
    const API_BASE = getApiBase();
    const CHUNK_SIZE = 1024 * 256; // 256KB chunks (Strato proxy is extremely strict)

    const results = await Promise.all(files.map(async (file) => {
      if (file.size <= CHUNK_SIZE) {
        // Small files, use simple upload
        const formData = new FormData();
        formData.append('file', file);
        if (noteId) formData.append('note_id', noteId.toString());
        const response = await fetch(`${API_BASE}/media/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      } else {
        // Large files, use chunked upload
        const initForm = new FormData();
        initForm.append('filename', file.name);
        initForm.append('size', file.size.toString());
        if (noteId) initForm.append('note_id', noteId.toString());
        
        const initRes = await fetch(`${API_BASE}/media/upload/init`, { method: 'POST', body: initForm });
        if (!initRes.ok) throw new Error('Failed to init upload');
        const { upload_id } = await initRes.json();

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const chunkForm = new FormData();
          chunkForm.append('upload_id', upload_id);
          chunkForm.append('chunk_index', i.toString());
          chunkForm.append('file', chunk);
          if (noteId) chunkForm.append('note_id', noteId.toString());
          
          const chunkRes = await fetch(`${API_BASE}/media/upload/chunk`, { method: 'POST', body: chunkForm });
          if (!chunkRes.ok) throw new Error(`Failed to upload chunk ${i}`);
        }

        const compForm = new FormData();
        compForm.append('upload_id', upload_id);
        compForm.append('filename', file.name);
        compForm.append('content_type', file.type);
        if (noteId) compForm.append('note_id', noteId.toString());
        
        const compRes = await fetch(`${API_BASE}/media/upload/complete`, { method: 'POST', body: compForm });
        if (!compRes.ok) throw new Error('Failed to complete upload');
        return compRes.json();
      }
    }));
    return results;
  },
  getUserStats: async () => {
    const res = await invoke<any>('user:get-stats', '/user/stats');
    if (!res || Array.isArray(res)) return { exp: 0, level: 1, total_captures: 0, current_theme: 'dark' };
    return res as UserStats;
  },
  listUserAchievements: () => invoke<UserAchievement[]>('user:list-achievements', '/user/achievements'),
  updateUserTheme: (theme: string) => invoke<UserStats>('user:update-theme', '/user/theme', { params: { theme } }),
  updateUserWallpaper: (wallpaperUrl: string) => invoke<UserStats>('user:update-wallpaper', '/user/wallpaper', { params: { wallpaper_url: wallpaperUrl } }),
  listBgm: () => invoke<string[]>('bgm:list', '/bgm/list'),
  getBgmStreamUrl: (filename: string) => {
    const API_BASE = getApiBase();
    return `${API_BASE}/bgm/stream/${encodeURIComponent(filename)}`;
  },
  getSystemVersion: () => invoke<{ version: string; git_commit?: string; build_time?: string; executable?: string }>('system:version', '/system/version'),
  openFile: (path: string) => invoke('system:open-file', '/system/open-file', { method: 'POST', body: JSON.stringify({ path }) }),
  // 音乐库列表必须走后端扫描（HTTP），避免 Electron IPC 缺失导致库永远为空
  listMusicLibrary: async () => {
    const API_BASE = getApiBase();
    const response = await fetch(`${API_BASE}/media/music-library`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  saveMusicLink: (payload: { title: string; url: string; cover?: string }) =>
    invoke<any>('media:music-link', '/media/music-link', { method: 'POST', body: JSON.stringify(payload) }),
  uploadMusic: async (file: File, cover?: File) => {
    const API_BASE = getApiBase();
    const formData = new FormData();
    formData.append('file', file);
    if (cover) formData.append('cover', cover);
    const response = await fetch(`${API_BASE}/media/music-upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  
  // AI Plugin status and hardware check
  getAIPluginStatus: () => invoke<{ enabled: boolean }>('ai:plugin-status', '/ai/plugin-status'),
  updateAIPluginConfig: (payload: { enabled?: boolean; num_ctx?: number }) => 
    invoke<{ enabled: boolean; num_ctx: number }>('ai:toggle-plugin', '/ai/toggle-plugin', { method: 'POST', body: JSON.stringify(payload) }),
  updateOllama: () => invoke<{ status: string; output?: string; message?: string }>('ai:update-ollama', '/ai/update-ollama', { method: 'POST' }),
  checkAIHardware: () => invoke<{ compatible: boolean; details: string }>('ai:hardware-check', '/ai/hardware-check'),
  spellcheck: (text: string) =>
    invoke<{ errors: Array<{ word: string; suggestion: string; reason: string; offset: number }> }>('text:spellcheck', '/text/spellcheck', { method: 'POST', body: JSON.stringify({ text }) }),
  importDictionary: (text: string) =>
    invoke<{ status: string; count: number; message: string }>('text:dictionary:import', '/text/dictionary/import', { method: 'POST', body: JSON.stringify({ text }) }),
  
  // Dummy implementations for PropertyPanel
  suggestTags: (content: string) => 
    invoke<{ tags: string[] }>('ai:suggest-tags', '/ai/suggest-tags', { method: 'POST', body: JSON.stringify({ content }) }),
  updateNoteProperty: async (noteId: number, propertyId: number, payload: any) => {
    console.log('Dummy updateNoteProperty called for note:', noteId, 'propertyId:', propertyId, 'payload:', payload);
    return { id: propertyId, ...payload } as NoteProperty;
  },
  createNoteProperty: async (noteId: number, property: { name: string; type: string; value: any }) => {
    console.log('Dummy createNoteProperty called for note:', noteId, 'property:', property);
    return { ...property, id: Math.random() } as NoteProperty;
  },

  // Template APIs
  listTemplates: () => invoke<NoteTemplate[]>('templates:list', '/templates'),
  createTemplate: (payload: { name: string; content: string; icon?: string; category?: string }) =>
    invoke<NoteTemplate>('templates:create', '/templates', { method: 'POST', body: JSON.stringify(payload) }),
  updateTemplate: (templateId: number, payload: { name?: string; content?: string; icon?: string; category?: string }) =>
    invoke<NoteTemplate>('templates:update', `/templates/${templateId}`, { method: 'PATCH', params: { id: templateId, ...payload } }),
  deleteTemplate: (templateId: number) => invoke('templates:delete', `/templates/${templateId}`, { method: 'DELETE', params: { id: templateId } }),
};
