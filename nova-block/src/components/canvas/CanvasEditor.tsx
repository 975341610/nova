import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
  type Viewport,
} from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  LayoutGrid,
  Link2,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import type { Note } from '../../lib/types';

type CanvasTextNodeData = {
  title: string;
  body: string;
  // 仅用于运行时注入，序列化时会剥离
  onChange?: (id: string, patch: { title?: string; body?: string }) => void;
};

type CanvasReferenceNodeData = {
  noteId: number;
  title: string;
  icon: string;
  summary: string;
  tags: string[];
};

type CanvasTextNode = Node<CanvasTextNodeData, 'canvas-text-card'>;

type CanvasReferenceNode = Node<CanvasReferenceNodeData, 'canvas-note-reference'>;

type CanvasNode = CanvasTextNode | CanvasReferenceNode;

type CanvasSerialized = {
  version: 'v1';
  nodes: CanvasNode[];
  edges: Edge[];
  viewport?: Viewport;
};

type CanvasEditorProps = {
  note: Note | null;
  notes: Note[];
  onSave: (payload: Partial<Note>) => Promise<void> | void;
  onNotify?: (text: string, tone: 'success' | 'error' | 'info') => void;
};

const TEXT_NODE_TYPE = 'canvas-text-card';
const REFERENCE_NODE_TYPE = 'canvas-note-reference';

const createTextNode = (id: string, x: number, y: number): CanvasTextNode => ({
  id,
  type: TEXT_NODE_TYPE,
  position: { x, y },
  data: {
    title: '灵感便签',
    body: '',
    onChange: () => undefined,
  },
  dragHandle: '.canvas-card-drag-handle',
  style: { width: 280 },
});

const createReferenceNode = (id: string, sourceNote: Note, x: number, y: number): CanvasReferenceNode => ({
  id,
  type: REFERENCE_NODE_TYPE,
  position: { x, y },
  data: {
    noteId: sourceNote.id,
    title: sourceNote.title || '无标题笔记',
    icon: sourceNote.icon || '📝',
    summary: summarizeNote(sourceNote),
    tags: sourceNote.tags || [],
  },
  dragHandle: '.canvas-card-drag-handle',
  style: { width: 320 },
});

function summarizeNote(note: Note) {
  const plainText = (note.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText ? plainText.slice(0, 84) : '点击即可回到该笔记，继续完善你的灵感脉络。';
}

function parseCanvasContent(content?: string): CanvasSerialized {
  if (!content) {
    return { version: 'v1', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }

  try {
    const parsed = JSON.parse(content) as Partial<CanvasSerialized>;
    return {
      version: 'v1',
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      viewport: parsed.viewport ?? { x: 0, y: 0, zoom: 1 },
    };
  } catch {
    return { version: 'v1', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }
}

function TextCardNode({ id, data, selected }: NodeProps<CanvasTextNode>) {
  return (
    <div
      className={`group rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(255,248,240,0.92))] shadow-[0_20px_70px_-28px_rgba(244,173,138,0.55),0_10px_24px_-16px_rgba(92,74,58,0.25)] backdrop-blur-xl transition-all duration-300 ${
        selected ? 'ring-2 ring-[#e7b28a]/70 shadow-[0_24px_80px_-26px_rgba(231,178,138,0.7),0_16px_34px_-18px_rgba(109,78,56,0.28)]' : 'hover:-translate-y-0.5'
      }`}
    >
      <div className="canvas-card-drag-handle flex items-center justify-between gap-3 rounded-t-[28px] border-b border-[#efd8c5]/80 bg-[linear-gradient(90deg,rgba(255,236,223,0.95),rgba(255,247,240,0.9))] px-4 py-3 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 text-[#8c5b3b]">
          <StickyNote size={15} />
          <span className="text-xs font-semibold tracking-[0.16em] uppercase">文本卡片</span>
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-[#f4b78f] shadow-[0_0_0_6px_rgba(244,183,143,0.16)]" />
      </div>
      <div className="space-y-3 px-4 pb-4 pt-3">
        <input
          value={data.title}
          onChange={(event) => data.onChange?.(id, { title: event.target.value })}
          placeholder="写下这张卡片的标题"
          className="w-full rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-sm font-semibold text-[#5f4330] outline-none transition focus:border-[#edc7a9] focus:bg-white"
        />
        <textarea
          value={data.body}
          onChange={(event) => data.onChange?.(id, { body: event.target.value })}
          placeholder="记录零散灵感、任务拆解、会议要点……"
          className="min-h-[128px] w-full resize-none rounded-[22px] border border-transparent bg-[#fffdfa]/88 px-3 py-3 text-sm leading-6 text-[#6f5a4d] outline-none transition focus:border-[#edd6c3] focus:bg-white"
        />
      </div>
    </div>
  );
}

function ReferenceCardNode({ data, selected }: NodeProps<CanvasReferenceNode>) {
  return (
    <div
      className={`group rounded-[30px] border border-[#dbe9f4] bg-[linear-gradient(145deg,rgba(244,250,255,0.95),rgba(255,255,255,0.92))] shadow-[0_24px_80px_-32px_rgba(136,190,235,0.55),0_12px_26px_-18px_rgba(80,113,141,0.22)] backdrop-blur-xl transition-all duration-300 ${
        selected ? 'ring-2 ring-[#9fc9ea]/70 shadow-[0_28px_90px_-34px_rgba(136,190,235,0.7),0_16px_34px_-18px_rgba(80,113,141,0.26)]' : 'hover:-translate-y-0.5'
      }`}
    >
      <div className="canvas-card-drag-handle flex items-center justify-between gap-3 rounded-t-[30px] border-b border-[#d8e8f4] bg-[linear-gradient(90deg,rgba(231,244,255,0.95),rgba(245,250,255,0.92))] px-4 py-3 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 text-[#4a7fa8]">
          <Link2 size={15} />
          <span className="text-xs font-semibold tracking-[0.16em] uppercase">笔记引用</span>
        </div>
        <div className="rounded-full border border-[#cfe4f4] bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#5a84a4]">#{data.noteId}</div>
      </div>
      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#fef6ef,#f6fbff)] text-xl shadow-inner">
            {data.icon || '📝'}
          </div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('nova-select-note', { detail: { noteId: data.noteId } }));
              }}
              title="点击打开笔记"
              className="truncate text-left text-sm font-semibold text-[#35546d] transition hover:text-[#2f6d96] hover:underline"
            >
              {data.title || '无标题笔记'}
            </button>
            <div className="mt-1 text-xs leading-5 text-[#6d8496]">{data.summary}</div>
          </div>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#dcebf7] bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#5d85a6]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotePickerModal({
  isOpen,
  notes,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  notes: Note[];
  onClose: () => void;
  onSelect: (note: Note) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredNotes = useMemo(() => {
    const available = notes.filter((item) => !item.is_folder);
    if (!query.trim()) return available.slice(0, 12);

    const q = query.toLowerCase();
    return available
      .filter((item) => item.title.toLowerCase().includes(q) || summarizeNote(item).toLowerCase().includes(q) || (item.tags || []).some((tag) => tag.toLowerCase().includes(q)))
      .slice(0, 12);
  }, [notes, query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredNotes.length, 1));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(filteredNotes.length, 1)) % Math.max(filteredNotes.length, 1));
      }

      if (event.key === 'Enter' && filteredNotes[selectedIndex]) {
        event.preventDefault();
        onSelect(filteredNotes[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredNotes, isOpen, onClose, onSelect, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-[#fff9f4]/55 px-4 pt-[12vh] backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,248,244,0.93))] shadow-[0_30px_120px_-36px_rgba(240,170,140,0.55)]"
          >
            <div className="flex items-center gap-3 border-b border-[#f2dfcf] px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#fff1e6,#eff8ff)] text-[#c17e55] shadow-inner">
                <Search size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#6e4b35]">添加笔记引用</div>
                <div className="text-xs text-[#9f826f]">搜索标题、摘要或标签，选中后立即落点到画布</div>
              </div>
              <button
                onClick={onClose}
                className="rounded-2xl border border-[#f0dfd4] bg-white/80 p-2 text-[#9a7a66] transition hover:border-[#ebc9b1] hover:text-[#7a5238]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-[#f4e5da] px-5 py-4">
              <div className="flex items-center gap-3 rounded-[24px] border border-[#f0dfd4] bg-white/85 px-4 py-3 shadow-[0_10px_26px_-22px_rgba(213,155,117,0.5)]">
                <Search size={16} className="text-[#c28b65]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="搜索想嵌入到画布里的笔记..."
                  className="w-full bg-transparent text-sm text-[#5b4333] outline-none placeholder:text-[#b09280]"
                />
              </div>
            </div>

            <div className="max-h-[48vh] overflow-y-auto px-3 py-3">
              {filteredNotes.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotes.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full rounded-[24px] border px-4 py-3 text-left transition-all ${
                        index === selectedIndex
                          ? 'border-[#edd0b7] bg-[linear-gradient(135deg,rgba(255,242,233,0.96),rgba(239,248,255,0.96))] shadow-[0_16px_34px_-28px_rgba(215,160,120,0.65)]'
                          : 'border-transparent bg-white/70 hover:border-[#f0dfd4] hover:bg-white/90'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#fff6ef,#eef8ff)] text-lg shadow-inner">
                          {item.icon || '📝'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[#5a4232]">{item.title || '无标题笔记'}</div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#8f7768]">{summarizeNote(item)}</div>
                          {item.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 4).map((tag) => (
                                <span key={tag} className="rounded-full bg-[#f7efe7] px-2 py-1 text-[10px] font-medium text-[#9c775e]">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center text-[#9e846f]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(145deg,#fff1e8,#f2f8ff)] text-[#cb8d65] shadow-inner">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#6e4e3a]">没有找到匹配的笔记</div>
                    <div className="mt-1 text-xs">可以换个关键词，或者先在侧边栏创建一篇新笔记。</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CanvasBoard({ note, notes, onSave, onNotify }: CanvasEditorProps) {
  const parsedContent = useMemo(() => parseCanvasContent(note?.content), [note?.content]);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(parsedContent.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsedContent.edges);
  const [viewport, setViewport] = useState<Viewport>(parsedContent.viewport ?? { x: 0, y: 0, zoom: 1 });
  const [pickerMode, setPickerMode] = useState<'toolbar' | 'context' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  const [selection, setSelection] = useState<OnSelectionChangeParams<CanvasNode>>({ nodes: [], edges: [] });
  const [isDraggingNoteFromSidebar, setIsDraggingNoteFromSidebar] = useState(false);
  const reactFlow = useReactFlow();
  const saveTimerRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const pendingDropPositionRef = useRef<{ x: number; y: number } | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    idRef.current = Math.max(0, ...parsedContent.nodes.map((item) => Number(String(item.id).replace(/[^0-9]/g, '')) || 0));
    setNodes(
      parsedContent.nodes.map((item) =>
        item.type === TEXT_NODE_TYPE
          ? {
              ...item,
              data: {
                title: (item.data as CanvasTextNodeData | undefined)?.title ?? '灵感便签',
                body: (item.data as CanvasTextNodeData | undefined)?.body ?? '',
                onChange: () => undefined,
              },
            }
          : item,
      ),
    );
    setEdges(parsedContent.edges);
    setViewport(parsedContent.viewport ?? { x: 0, y: 0, zoom: 1 });
  }, [note?.id, parsedContent, setEdges, setNodes]);

  const didInitViewportRef = useRef(false);

  useEffect(() => {
    if (didInitViewportRef.current) return;
    didInitViewportRef.current = true;
    reactFlow.setViewport(viewport, { duration: 0 });
  }, [reactFlow]);

  const nextId = useCallback((prefix: string) => {
    idRef.current += 1;
    return `${prefix}-${idRef.current}`;
  }, []);

  const getCanvasCenter = useCallback(() => {
    const rect = canvasWrapperRef.current?.getBoundingClientRect();
    if (rect) {
      return reactFlow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    return reactFlow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [reactFlow]);

  const updateTextNode = useCallback((id: string, patch: { title?: string; body?: string }) => {
    setNodes((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.type !== TEXT_NODE_TYPE) return item;
        return {
          ...item,
          data: {
            ...item.data,
            ...patch,
          },
        };
      }),
    );
  }, [setNodes]);

  const hydratedNodes = useMemo(
    () =>
      nodes.map((item) => {
        if (item.type !== TEXT_NODE_TYPE) return item;
        return {
          ...item,
          data: {
            ...item.data,
            onChange: updateTextNode,
          },
        };
      }),
    [nodes, updateTextNode],
  );

  const nodeTypes = useMemo(
    () => ({
      [TEXT_NODE_TYPE]: TextCardNode,
      [REFERENCE_NODE_TYPE]: ReferenceCardNode,
    }),
    [],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((prev) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#d7a685' },
            style: { stroke: '#d7a685', strokeWidth: 2 },
          },
          prev,
        ),
      );
    },
    [setEdges],
  );

  const handleAddTextCard = useCallback(() => {
    const center = getCanvasCenter();
    setNodes((prev) => [...prev, createTextNode(nextId('text'), center.x - 140, center.y - 90)]);
    onNotify?.('已添加文本卡片', 'success');
  }, [getCanvasCenter, nextId, onNotify, setNodes]);

  const openNotePicker = useCallback((mode: 'toolbar' | 'context', position?: { x: number; y: number }) => {
    pendingDropPositionRef.current = position ?? null;
    setPickerMode(mode);
    setContextMenu(null);
  }, []);

  const insertReferenceNode = useCallback(
    (sourceNote: Note, position?: { x: number; y: number }) => {
      const fallback = getCanvasCenter();
      const targetPosition = position ?? pendingDropPositionRef.current ?? { x: fallback.x + 80, y: fallback.y - 120 };
      setNodes((prev) => [...prev, createReferenceNode(nextId('ref'), sourceNote, targetPosition.x, targetPosition.y)]);
      setPickerMode(null);
      pendingDropPositionRef.current = null;
      onNotify?.(`已将《${sourceNote.title || '无标题笔记'}》放入画布`, 'success');
    },
    [getCanvasCenter, nextId, onNotify, setNodes],
  );

  const removeSelection = useCallback(() => {
    const selectedNodeIds = new Set(selection.nodes.map((item) => item.id));
    const selectedEdgeIds = new Set(selection.edges.map((item) => item.id));
    if (!selectedNodeIds.size && !selectedEdgeIds.size) return;

    setNodes((prev) => prev.filter((item) => !selectedNodeIds.has(item.id)));
    setEdges((prev) => prev.filter((item) => !selectedEdgeIds.has(item.id) && !selectedNodeIds.has(item.source) && !selectedNodeIds.has(item.target)));
    onNotify?.('已移除选中元素', 'info');
  }, [onNotify, selection.edges, selection.nodes, setEdges, setNodes]);

  const saveSnapshot = useMemo(() => {
    const serializedNodes: CanvasNode[] = hydratedNodes.map((item) => {
      if (item.type === TEXT_NODE_TYPE) {
        return {
          ...item,
          data: {
            title: item.data.title,
            body: item.data.body,
          },
        } satisfies CanvasTextNode;
      }

      return item;
    });

    return JSON.stringify({
      version: 'v1',
      nodes: serializedNodes,
      edges,
      viewport,
    } satisfies CanvasSerialized);
  }, [edges, hydratedNodes, viewport]);

  useEffect(() => {
    if (!note) return;
    if (saveSnapshot === (note.content || '')) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      onSave({ content: saveSnapshot });
    }, 650);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [note, onSave, saveSnapshot]);

  useEffect(() => {
    const handleDelete = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      removeSelection();
    };

    window.addEventListener('keydown', handleDelete);
    return () => window.removeEventListener('keydown', handleDelete);
  }, [removeSelection]);

  const handleCanvasContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      const paneBounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
      if ((event.target as HTMLElement).closest('.react-flow__node')) return;

      const flowPosition = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({
        x: Math.min(event.clientX, paneBounds.right - 200),
        y: Math.min(event.clientY, paneBounds.bottom - 100),
        flowX: flowPosition.x,
        flowY: flowPosition.y,
      });
    },
    [reactFlow],
  );

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingNoteFromSidebar(false);
      const noteId = event.dataTransfer.getData('application/x-nova-note-id');
      if (!noteId) return;
      const matched = notes.find((item) => item.id === Number(noteId) && !item.is_folder);
      if (!matched) return;
      const flowPosition = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      insertReferenceNode(matched, flowPosition);
    },
    [insertReferenceNode, notes, reactFlow],
  );

  const handleCanvasDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('application/x-nova-note-id')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDraggingNoteFromSidebar(true);
    }
  }, []);

  const handleCanvasDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!(event.currentTarget as HTMLDivElement).contains(event.relatedTarget as HTMLElement | null)) {
      setIsDraggingNoteFromSidebar(false);
    }
  }, []);

  useEffect(() => {
    const hideMenus = () => setContextMenu(null);
    window.addEventListener('click', hideMenus);
    return () => window.removeEventListener('click', hideMenus);
  }, []);

  if (!note) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">请选择一张画布开始创作</div>;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,226,214,0.55),transparent_26%),radial-gradient(circle_at_top_right,rgba(214,236,255,0.52),transparent_28%),linear-gradient(180deg,#fffaf5_0%,#fffdfb_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,211,186,0.28),transparent_20%),radial-gradient(circle_at_85%_12%,rgba(188,224,255,0.22),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(255,233,210,0.18),transparent_24%)]" />
      <div className="absolute inset-0 opacity-[0.45]" style={{ backgroundImage: 'var(--paper-texture)' }} />

      <div
        ref={canvasWrapperRef}
        className="relative z-10 h-full w-full"
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
      >
        <ReactFlow
          nodes={hydratedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onMoveEnd={(_, currentViewport) => setViewport(currentViewport)}
          onSelectionChange={setSelection}
          fitView={hydratedNodes.length === 0}
          minZoom={0.25}
          maxZoom={2}
          selectionOnDrag
          panOnDrag
          elevateNodesOnSelect
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#d7a685' },
            style: { stroke: '#d7a685', strokeWidth: 2 },
          }}
          className="canvas-flow"
          onPaneContextMenu={(event) => handleCanvasContextMenu(event as any)}
        >
          <Background id="dots" variant={BackgroundVariant.Dots} color="rgba(214,170,138,0.28)" gap={24} size={1.4} />
          <MiniMap
            pannable
            zoomable
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid rgba(233, 216, 200, 0.8)',
              borderRadius: 24,
              boxShadow: '0 20px 50px -28px rgba(216, 160, 124, 0.45)',
            }}
            nodeBorderRadius={18}
            nodeColor={(node) => (node.type === REFERENCE_NODE_TYPE ? '#c6e2f7' : '#f7d2b8')}
          />
          <Controls
            position="bottom-left"
            showInteractive={false}
            className="!overflow-hidden !rounded-[22px] !border !border-white/80 !bg-white/86 !shadow-[0_18px_48px_-26px_rgba(210,155,120,0.5)] !backdrop-blur-xl"
          />

          <Panel position="top-left">
            <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,241,0.9))] px-5 py-4 shadow-[0_28px_90px_-34px_rgba(233,173,140,0.52)] backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#fff1e6,#eef8ff)] text-[#cb8358] shadow-inner">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#6d4d39]">{note.title || '无标题画布'}</div>
                  <div className="mt-1 text-xs leading-5 text-[#a1806d]">无界拖拽、框选连线、文本卡片与笔记引用同屏协作，轻量又顺手。</div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel position="top-center">
            <div className="flex items-center gap-2 rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,248,244,0.92))] px-3 py-2 shadow-[0_30px_90px_-36px_rgba(229,169,134,0.5)] backdrop-blur-xl">
              <button
                onClick={handleAddTextCard}
                className="flex items-center gap-2 rounded-[22px] bg-[linear-gradient(145deg,#fff3ea,#fffaf6)] px-4 py-2 text-sm font-medium text-[#8a5d3f] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(231,170,136,0.65)]"
              >
                <Plus size={16} />
                添加文本卡片
              </button>
              <button
                onClick={() => openNotePicker('toolbar', getCanvasCenter())}
                className="flex items-center gap-2 rounded-[22px] bg-[linear-gradient(145deg,#eef7ff,#fbfdff)] px-4 py-2 text-sm font-medium text-[#4f7ea0] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(150,194,230,0.65)]"
              >
                <Search size={16} />
                引用笔记
              </button>
              <div className="hidden items-center gap-2 rounded-full bg-[#fff5ee] px-3 py-2 text-xs text-[#a47b61] sm:flex">
                <Sparkles size={14} />
                也支持从左侧侧边栏直接拖进来
              </div>
            </div>
          </Panel>

          <Panel position="bottom-center">
            <div className="rounded-full border border-white/80 bg-white/82 px-4 py-2 text-xs text-[#9c7b67] shadow-[0_18px_50px_-28px_rgba(205,152,116,0.46)] backdrop-blur-xl">
              框选多个节点后可直接拖拽；按 Delete / Backspace 可快速删除选中元素。
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {isDraggingNoteFromSidebar && (
        <div className="pointer-events-none absolute inset-6 z-20 rounded-[34px] border-2 border-dashed border-[#d7ab87] bg-[radial-gradient(circle_at_center,rgba(255,243,233,0.52),rgba(247,251,255,0.42))] shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_28px_90px_-44px_rgba(219,162,128,0.55)] backdrop-blur-sm" />
      )}

      {contextMenu && (
        <div
          className="fixed z-[110] min-w-[190px] overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,248,243,0.94))] py-2 shadow-[0_30px_100px_-34px_rgba(220,162,126,0.52)] backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              setNodes((prev) => [...prev, createTextNode(nextId('text'), contextMenu.flowX, contextMenu.flowY)]);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#6a4a36] transition hover:bg-[#fff3ea]"
          >
            <StickyNote size={15} className="text-[#cb885d]" /> 添加文本卡片
          </button>
          <button
            onClick={() => openNotePicker('context', { x: contextMenu.flowX, y: contextMenu.flowY })}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#5b7d99] transition hover:bg-[#eef7ff]"
          >
            <FileText size={15} className="text-[#6fa1c7]" /> 添加笔记
          </button>
        </div>
      )}

      <NotePickerModal
        isOpen={pickerMode !== null}
        notes={notes}
        onClose={() => {
          setPickerMode(null);
          pendingDropPositionRef.current = null;
        }}
        onSelect={(selectedNote) => insertReferenceNode(selectedNote)}
      />

      <button
        onClick={removeSelection}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2 rounded-full border border-white/85 bg-white/90 px-4 py-3 text-sm font-medium text-[#936953] shadow-[0_20px_54px_-28px_rgba(205,148,112,0.5)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[#744835]"
      >
        <Trash2 size={16} />
        删除选中
      </button>
    </div>
  );
}

export function CanvasEditor(props: CanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <CanvasBoard {...props} />
    </ReactFlowProvider>
  );
}
