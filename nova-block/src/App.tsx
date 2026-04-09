import { useState, useMemo, useEffect } from 'react'
import { NovaBlockEditor } from './components/novablock/NovaBlockEditor'
import { SidebarTree } from './components/sidebar/SidebarTree'
import { MoodboardView } from './components/moodboard/MoodboardView'
import CommandPalette from './components/search/CommandPalette'
import type { Note } from './lib/types'
import { AnimatePresence, motion } from 'framer-motion'
import { MusicProvider, useMusicControls } from './contexts/MusicContext'
import { HabitProvider } from './contexts/HabitContext'
import { TodoProvider } from './contexts/TodoContext'
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
    id: 1,
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
  },
  {
    id: 2,
    title: '🧠 核心架构设计',
    icon: '🧠',
    content: '<h1>核心架构</h1><p>这里是核心架构的技术文档...</p><h2>数据流向</h2><p>采用 Local-first 架构。</p>',
    tags: ['Arch'],
    properties: [],
    links: [],
    notebook_id: null,
    parent_id: null,
    position: 0,
    summary: '',
    is_title_manually_edited: false,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: '快速开始指南',
    icon: '📖',
    content: '<h1>快速开始</h1><p>欢迎使用 NovaBlock。</p>',
    tags: ['Guide'],
    properties: [],
    links: [],
    notebook_id: null,
    parent_id: null,
    position: 0,
    summary: '',
    is_title_manually_edited: false,
    created_at: new Date().toISOString()
  }
]

function App() {
  const [theme] = useState<'dark' | 'light'>('light')
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('nova-block-notes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.length > 0) return parsed
      } catch (e) {
        console.error('Failed to parse notes from local storage', e)
      }
    }
    return INITIAL_NOTES
  })
  const [currentNoteId, setCurrentNoteId] = useState<number>(() => {
    const saved = localStorage.getItem('nova-block-current-note-id')
    return saved ? parseInt(saved) : 1
  })
  const [activeView, setActiveView] = useState<'notes' | 'moodboard'>('notes')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // 全局快捷键 Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 同步到 localStorage
  useEffect(() => {
    localStorage.setItem('nova-block-notes', JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem('nova-block-current-note-id', currentNoteId.toString())
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

  const currentNote = useMemo(() => {
    return notes.find(n => n.id === currentNoteId) || null
  }, [notes, currentNoteId])

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
    const noteId = parseInt(id)
    if (!isNaN(noteId)) {
      setCurrentNoteId(noteId)
      setActiveView('notes')
    }
  }

  const handleAddNote = (parentId: string | null, type: 'file' | 'folder' = 'file') => {
    const newId = Math.max(...notes.map(n => n.id), 0) + 1
    const newNote: Note = {
      id: newId,
      title: type === 'folder' ? 'Untitled Folder' : 'Untitled Note',
      icon: type === 'folder' ? '📂' : '📝',
      content: type === 'folder' ? '' : '<p></p>',
      tags: [],
      properties: [],
      links: [],
      notebook_id: null,
      parent_id: parentId ? parseInt(parentId) : null,
      position: 0,
      sort_key: 'm',
      summary: '',
      is_title_manually_edited: false,
      is_folder: type === 'folder',
      created_at: new Date().toISOString()
    }
    setNotes([...notes, newNote])
    if (type !== 'folder') {
      setCurrentNoteId(newId)
      setActiveView('notes')
    }
  }

  const handleNodeMove = (nodeId: string, parentId: string | null, sortKey: string) => {
    setNotes(prev => prev.map(n => 
      n.id.toString() === nodeId 
        ? { ...n, parent_id: parentId ? parseInt(parentId) : null, sort_key: sortKey }
        : n
    ))
  }

  const handleNodeRename = (nodeId: string, newTitle: string) => {
    setNotes(prev => prev.map(n => n.id.toString() === nodeId ? { ...n, title: newTitle } : n))
  }

  const handleNodeDelete = (nodeId: string, deleteChildren: boolean) => {
    const idToDelete = parseInt(nodeId)
    setNotes(prev => {
      if (deleteChildren) {
        const getDescendants = (parentId: number, nodesList: Note[]): number[] => {
          const children = nodesList.filter(n => n.parent_id === parentId)
          return children.reduce((acc, child) => [...acc, child.id, ...getDescendants(child.id, nodesList)], [] as number[])
        }
        const idsToRemove = new Set([idToDelete, ...getDescendants(idToDelete, prev)])
        
        // Handle current note if it was deleted
        if (idsToRemove.has(currentNoteId)) {
          const remaining = prev.filter(n => !idsToRemove.has(n.id) && !n.is_folder)
          if (remaining.length > 0) setCurrentNoteId(remaining[0].id)
        }
        
        return prev.filter(n => !idsToRemove.has(n.id))
      } else {
        const nodeToDelete = prev.find(n => n.id === idToDelete)
        const parentId = nodeToDelete?.parent_id || null
        
        if (currentNoteId === idToDelete) {
          const remaining = prev.filter(n => n.id !== idToDelete && !n.is_folder)
          if (remaining.length > 0) setCurrentNoteId(remaining[0].id)
        }

        return prev.filter(n => n.id !== idToDelete).map(n => n.parent_id === idToDelete ? { ...n, parent_id: parentId } : n)
      }
    })
  }

  const handleNodeDuplicate = (nodeId: string) => {
    const idToDup = parseInt(nodeId)
    setNotes(prev => {
      const nodeToDup = prev.find(n => n.id === idToDup)
      if (!nodeToDup) return prev

      const newNodes: Note[] = []
      let maxId = Math.max(...prev.map(n => n.id), 0)

      const duplicateRecursive = (originalId: number, newParentId: number | null, isRoot: boolean) => {
        const originalNode = prev.find(n => n.id === originalId)
        if (!originalNode) return

        maxId++
        const newId = maxId
        newNodes.push({
          ...originalNode,
          id: newId,
          title: isRoot ? `${originalNode.title} (副本)` : originalNode.title,
          parent_id: newParentId,
          created_at: new Date().toISOString()
        })

        const children = prev.filter(n => n.parent_id === originalId)
        children.forEach(child => duplicateRecursive(child.id, newId, false))
      }

      duplicateRecursive(idToDup, nodeToDup.parent_id, true)
      return [...prev, ...newNodes]
    })
  }

  const handleMoodboardSelect = () => {
    setActiveView('moodboard')
  }

  const handleSave = async (payload: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === currentNoteId ? { ...n, ...payload } : n))
  }

  return (
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
          onMoodboardSelect={handleMoodboardSelect}
          onQuickSearchOpen={() => setIsCommandPaletteOpen(true)}
          activeView={activeView}
          className="z-20"
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />

        {/* 主编辑区 */}
        <motion.main 
          animate={{ 
            scale: isSidebarCollapsed ? 1 : 0.95,
            borderRadius: isSidebarCollapsed ? "0px" : "16px",
            x: isSidebarCollapsed ? 0 : 0, // 侧边栏变宽时，主页面保持原位但缩放
          }}
          transition={{ 
            duration: 0.4, 
            ease: [0.32, 0.72, 0, 1] 
          }}
          className="flex-1 h-full relative overflow-hidden flex flex-col z-10 bg-background shadow-2xl origin-left"
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
            {activeView === 'notes' ? (
              <motion.div
                key={`note-${currentNoteId}`}
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 h-full"
              >
                <NovaBlockEditor 
                  note={currentNote} 
                  onSave={handleSave}
                  onNotify={(text, tone) => console.log(`[NovaNotify] ${tone}: ${text}`)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="moodboard"
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1 h-full"
              >
                <MoodboardView />
              </motion.div>
            )}
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

        {/* 全局装饰 */}
        <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-50 pointer-events-none" />
        
        {/* 全局悬浮音乐胶囊 */}
        <FloatingMusicCapsule />
        
        {/* 全局音乐列表 (单例) */}
         <MusicGlobalUI />
       </div>
       </TodoProvider>
       </HabitProvider>
     </MusicProvider>
  )
}

export default App
