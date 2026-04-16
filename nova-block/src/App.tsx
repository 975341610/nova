import { useState, useMemo, useEffect, useCallback } from 'react'
import { NovaBlockEditor } from './components/novablock/NovaBlockEditor'
import { CanvasEditor } from './components/canvas/CanvasEditor'
import { SidebarTree } from './components/sidebar/SidebarTree'
import CommandPalette from './components/search/CommandPalette'
import { SettingsDialog } from './components/SettingsDialog'
import { TemplatePicker } from './components/editor/TemplatePicker'
import { applyThemeConfig, getThemeConfig } from './lib/themeUtils'
import type { Note, NoteTemplate } from './lib/types'
import { api } from './lib/api'
import { dataService } from './services/dataService'
import { AnimatePresence, motion } from 'framer-motion'
import { MusicProvider, useMusicControls } from './contexts/MusicContext'
import { HabitProvider } from './contexts/HabitContext'
import { TodoProvider } from './contexts/TodoContext'
import { AIProvider } from './contexts/AIContext'
import { FloatingMusicCapsule } from './components/widgets/FloatingMusicCapsule'
import { PlaylistPopover } from './components/widgets/PlaylistPopover'

function MusicGlobalUI() {
  const { playlistPopoverAnchor, closePlaylist } = useMusicControls();
  return (
    <AnimatePresence>
      {playlistPopoverAnchor && (
        <PlaylistPopover
          onClose={closePlaylist}
          portal
          anchorRect={playlistPopoverAnchor}
        />
      )}
    </AnimatePresence>
  );
}

// 初始模拟数据

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: '🚀 星核笔记：第二大脑',
    icon: '🚀',
    content: `
      <h1>NovaBlock 星核笔记</h1>
      <p>这是一个完全独立运行的 <strong>Sprint 3 编辑器</strong> 预览工程。</p>
      <h2>核心特性</h2>
      <ul>
        <li><strong>高性能</strong>：始终保持 60 FPS 的流畅输入。</li>
        <li><strong>Fractional Indexing</strong>：支持无限嵌套的块移动。</li>
        <li><strong>AI 原生</strong>：深度集成的星核助手。</li>
      </ul>
      <h2>快速交互</h2>
      <p>点击右侧的 <strong>TOC</strong> 试试看！</p>
      <h3>斜杠菜单</h3>
      <p>在行首输入 <code>/</code> 即可呼出全能菜单。</p>
    `,
    tags: ['NovaBlock', 'Preview'],
    properties: [
      { id: 1, note_id: 1, name: '类型', type: 'select', value: '核心架构' },
      { id: 2, note_id: 1, name: '优先级', type: 'select', value: '最高级' }
    ],
    links: [],
    notebook_id: null,
    parent_id: null,
    position: 0,
    summary: '',
    is_title_manually_edited: false,
    created_at: new Date().toISOString()
  } as Note,
]

function App() {
  const [theme] = useState<'dark' | 'light'>('light')
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNoteId, setCurrentNoteId] = useState<string | number>('')
  const [activeView, setActiveView] = useState<'notes'>('notes')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [templateModal, setTemplateModal] = useState<{
    isOpen: boolean;
    mode: 'select' | 'save';
    parentId: string | null;
  }>({ isOpen: false, mode: 'select', parentId: null });

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      const allNotes = await dataService.getAllNotes();
      if (allNotes.length > 0) {
        setNotes(allNotes);
        const savedId = localStorage.getItem('nova-block-current-note-id');
        setCurrentNoteId(savedId || allNotes[0].id);
      } else {
        setNotes(INITIAL_NOTES);
        setCurrentNoteId(INITIAL_NOTES[0].id);
      }
    };
    init();
  }, []);

  // 侧边栏切换
  const toggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  // 全局快捷键 Cmd+K 和 笔记跳转事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
      }
    }
    
    const handleSelectNoteEvent = (e: any) => {
      const noteId = e.detail?.noteId;
      if (noteId) {
        setCurrentNoteId(noteId);
        setActiveView('notes');
      }
    };

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('nova-select-note', handleSelectNoteEvent)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('nova-select-note', handleSelectNoteEvent)
    }
  }, [currentNoteId])

  // 同步到存储
  useEffect(() => {
    if (notes.length > 0) {
      // 在 Browser 模式下继续使用 localStorage/IndexedDB
      if (!window.electronAPI) {
        localStorage.setItem('nova-block-notes', JSON.stringify(notes))
      }
    }
    // @ts-ignore
    window.novaNotes = notes
    window.dispatchEvent(new Event('nova-notes-updated'))
  }, [notes])

  useEffect(() => {
    if (currentNoteId) {
      localStorage.setItem('nova-block-current-note-id', currentNoteId.toString())
    }
  }, [currentNoteId])

  // 同步主题到 html 标签
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // 初始化主题配置
  useEffect(() => {
    applyThemeConfig(getThemeConfig());
  }, []);

  const currentNote = useMemo(() => {
    return notes.find(n => n.id === currentNoteId) || null
  }, [notes, currentNoteId])

  const loadNoteContent = useCallback(async (noteId: string | number) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || (note.content !== undefined && note.content !== '')) return;

    try {
      const fullNote = await dataService.getNote(noteId);
      if (fullNote) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: fullNote.content } : n));
      }
    } catch (err) {
      console.error('Failed to load note content:', err);
    }
  }, [notes]);

  useEffect(() => {
    if (activeView === 'notes' && currentNoteId) {
      loadNoteContent(currentNoteId);
    }
  }, [currentNoteId, activeView, loadNoteContent]);

  // 节点转换 (TreeNode <-> Note)
  const treeNodes = useMemo(() => {
    return notes.map(n => ({
      id: n.id.toString(),
      parentId: n.parent_id ? n.parent_id.toString() : null,
      sortKey: n.sort_key || 'm',
      title: n.title,
      isFolder: n.is_folder
    }))
  }, [notes])

  const handleSelectNode = (id: string) => {
    setCurrentNoteId(id)
    setActiveView('notes')
  }

  const handleAddNote = async (parentId: string | null, type: 'file' | 'folder' | 'canvas' = 'file') => {
    const isFolder = type === 'folder'
    const isCanvas = type === 'canvas'
    
    // 生成 ID：优先使用 randomUUID，Electron 下可用文件名，Browser 下也改用字符串 ID 确保一致性
    const newId = window.electronAPI 
      ? `note_${Date.now()}.md` 
      : (crypto.randomUUID ? crypto.randomUUID() : `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    const newNote: Note = {
      id: newId,
      title: isFolder ? '无标题文件夹' : isCanvas ? '无标题画布' : '无标题笔记',
      icon: isFolder ? '📂' : isCanvas ? '🧩' : '📝',
      content: isFolder
        ? ''
        : isCanvas
          ? JSON.stringify({ version: 'v1', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
          : '<p></p>',
      type: isCanvas ? 'canvas' : undefined,
      tags: [],
      properties: [],
      links: [],
      notebook_id: null,
      parent_id: parentId ? (window.electronAPI ? parentId : (isNaN(parseInt(parentId)) ? parentId : parseInt(parentId))) : null,
      position: 0,
      sort_key: 'm',
      summary: '',
      is_title_manually_edited: false,
      is_folder: isFolder,
      created_at: new Date().toISOString(),
    } as Note

    await dataService.saveNote(newNote as any);
    setNotes([...notes, newNote])

    if (!isFolder) {
      setCurrentNoteId(newId)
      setActiveView('notes')
    }
  }

  const handleNodeMove = (nodeId: string, parentId: string | null, sortKey: string) => {
    const finalParentId = parentId ? (window.electronAPI ? parentId : parseInt(parentId)) : null;
    setNotes(prev => prev.map(n => 
      n.id.toString() === nodeId 
        ? { ...n, parent_id: finalParentId, sort_key: sortKey } as Note
        : n
    ))
  }

  const handleNodeRename = (nodeId: string, newTitle: string) => {
    setNotes(prev => prev.map(n => n.id.toString() === nodeId ? { ...n, title: newTitle } : n))
  }

  const handleNodeDelete = (nodeId: string, deleteChildren: boolean) => {
    // 简化的删除逻辑
    setNotes(prev => prev.filter(n => n.id.toString() !== nodeId));
    dataService.deleteNote(window.electronAPI ? nodeId : parseInt(nodeId));
  }

  const handleNodeDuplicate = (nodeId: string) => {
    // 简化的克隆逻辑
    const nodeToDup = notes.find(n => n.id.toString() === nodeId);
    if (nodeToDup) {
      handleAddNote(nodeToDup.parent_id?.toString() || null, nodeToDup.type as any);
    }
  }

  const handleTemplateCreate = (parentId: string | null) => {
    setTemplateModal({ isOpen: true, mode: 'select', parentId });
  };

  const handleSaveAsTemplate = () => {
    setTemplateModal({ isOpen: true, mode: 'save', parentId: null });
  };

  const handleSelectTemplate = (template: NoteTemplate) => {
    const newId = window.electronAPI 
      ? `note_${Date.now()}.md` 
      : (crypto.randomUUID ? crypto.randomUUID() : `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
    const newNote: Note = {
      id: newId,
      title: template.name,
      icon: template.icon || '📝',
      content: template.content,
      tags: [],
      properties: [],
      links: [],
      notebook_id: null,
      parent_id: templateModal.parentId ? (isNaN(parseInt(templateModal.parentId)) ? templateModal.parentId : parseInt(templateModal.parentId)) : null,
      position: 0,
      sort_key: 'm',
      summary: '',
      is_title_manually_edited: false,
      is_folder: false,
      created_at: new Date().toISOString(),
    };

    setNotes([...notes, newNote]);
    setCurrentNoteId(newId);
    setActiveView('notes');
    setTemplateModal({ ...templateModal, isOpen: false });
  };

  const handleSaveTemplate = async (name: string) => {
    if (!currentNote) return;
    try {
      await api.createTemplate({
        name,
        content: currentNote.content || '',
        icon: currentNote.icon,
        category: '用户模板'
      });
      // 可以添加 Toast 通知
      console.log('Template saved successfully');
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleSave = async (payload: Partial<Note>) => {
    // 关键修复：确保 payload 中包含当前笔记的 ID
    const effectiveId = payload.id || currentNoteId;
    if (!effectiveId) {
      console.error('[App] Cannot save note: currentNoteId is missing');
      return;
    }

    const updatedNote = { ...currentNote, ...payload, id: effectiveId } as Note;
    await dataService.saveNote(updatedNote);
    setNotes(prev => prev.map(n => n.id === effectiveId ? updatedNote : n))
  }

  return (
    <AIProvider>
    <MusicProvider>
      <HabitProvider>
        <TodoProvider>
          <div className="flex h-screen w-full bg-background text-foreground font-sans selection:bg-primary/30 overflow-hidden relative theme-transition">
        {/* 全局背景质感 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.05),transparent_70%)] pointer-events-none z-0" />
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none z-0" style={{ backgroundImage: "var(--paper-texture)" }} />

        {/* 侧边栏 */}
        <SidebarTree 
          initialNodes={treeNodes}
          notes={notes}
          onNodeSelect={handleSelectNode}
          onNodeAdd={handleAddNote}
          onNodeMove={handleNodeMove}
          onNodeRename={handleNodeRename}
          onNodeDelete={handleNodeDelete}
          onNodeDuplicate={handleNodeDuplicate}
          onTemplateCreate={handleTemplateCreate}
          onQuickSearchOpen={() => setIsCommandPaletteOpen(true)}
          onSettingsOpen={() => setIsSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* 主编辑区 */}
        <motion.main 
          initial={false}
          animate={{ 
            scale: isSidebarCollapsed ? 1 : 0.98,
            borderRadius: isSidebarCollapsed ? "0px" : "24px",
            // 侧边栏宽度从 280 变到 64，差值 216。
            // 当展开时，主页面缩小并向右偏移一点，保持呼吸感
            x: isSidebarCollapsed ? 0 : 0, 
          }}
          transition={{ 
            duration: 0.5, 
            ease: [0.32, 0.72, 0, 1] 
          }}
          className="flex-1 h-full relative overflow-hidden flex flex-col z-10 bg-background shadow-[0_0_50px_rgba(0,0,0,0.1)] origin-left"
        >
          {/* 主页面遮罩 - 当侧边栏展开时显现 */}
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/5 z-50 pointer-events-none"
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`note-${currentNoteId}`}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 h-full"
            >
              {currentNote?.type === 'canvas' ? (
                <CanvasEditor
                  note={currentNote}
                  notes={notes}
                  onSave={handleSave}
                  onNotify={(text, tone) => console.log(`[NovaNotify] ${tone}: ${text}`)}
                />
              ) : (
                <NovaBlockEditor 
                  note={currentNote} 
                  onSave={handleSave}
                  onNotify={(text, tone) => console.log(`[NovaNotify] ${tone}: ${text}`)}
                  onSaveAsTemplate={handleSaveAsTemplate}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* 底部装饰线 */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent absolute bottom-0 left-0" />
        </motion.main>

        {/* Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          notes={notes}
          onSelectNote={(note) => handleSelectNode(note.id.toString())}
        />

        {/* Settings Dialog */}
        <SettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* 全局装饰 */}
        <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-50 pointer-events-none" />
        
        {/* 全局悬浮音乐胶囊 */}
        <FloatingMusicCapsule />
        
        {/* 全局音乐列表 (单例) */}
         <MusicGlobalUI />

         <TemplatePicker 
           isOpen={templateModal.isOpen}
           mode={templateModal.mode}
           onClose={() => setTemplateModal({ ...templateModal, isOpen: false })}
           onSelect={handleSelectTemplate}
           onSave={handleSaveTemplate}
         />
       </div>
        </TodoProvider>
        </HabitProvider>
      </MusicProvider>
    </AIProvider>
  )
}

export default App
