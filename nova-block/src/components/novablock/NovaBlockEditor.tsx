import { formatUrl } from "../../lib/api";
import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import type { ChainedCommands } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import DragHandle from '@tiptap/extension-drag-handle-react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { motion, AnimatePresence } from 'framer-motion';
import { StickerLayer } from '../editor/StickerLayer';
import { StickyNotesLayer } from '../editor/StickyNotesLayer';
import { StickerPanel } from '../editor/StickerPanel';
import type { StickerData, StickyNoteData } from '../../lib/types';
import { 
    GripVertical, Bold, Italic, 
    Underline, Eraser, Cpu, Strikethrough, Timer,
    Type, Heading1, Heading2, Heading3, CheckSquare, Table as TableIcon, Code, Quote, Sparkles, Zap, Waves,
    Link as LinkIcon, Highlighter, Trash2, Copy, Replace, ListPlus, Minus,
    Trash, Columns, Rows, Film, Music, FileText, MonitorPlay, StickyNote as StickyNoteIcon,
    List, ListOrdered, ArrowUpToLine, ArrowDownToLine, CopyPlus, StickyNote, Smile, X,
    Layout, Bot
} from 'lucide-react';

import { 
    AudioNode, CalloutNode, DatabaseTableCell, DatabaseTableHeader, 
    EmbedNode, ResizableImage, TaskItem, TaskList, VideoNode, WikiLink,
    SlashCommands, FileNode, Heading, MathInline, MathBlock, Footnote, 
    ColumnGroup, Column, HighlightBlock,
    WashiTape, JournalStamp, Blockquote, CodeBlock, FilePlaceholder, FileUpload,
    CountdownNode, MusicPlayerNode, MiniCalendarNode, KanbanNode, HabitTrackerNode, TodoNode,
    Emoticon, SliderExtension, NoteLink, TextEffect
  } from '../../lib/tiptapExtensions';

import type { Note } from '../../lib/types';

import { EditorHeader } from '../editor/EditorHeader';
import { PropertyPanel } from '../editor/PropertyPanel';
import { getSuggestionConfig } from '../notion/SlashMenuConfig';
import { getNoteLinkSuggestionConfig } from './extensions/NoteLinkConfig';
import { TableOfContents } from './components/TableOfContents';
import { EmoticonPanel } from '../editor/EmoticonPanel';

const NOVA_BLOCK_SLASH_ITEMS = [
  // 0. AI 助理 (AI Assistant)
  { label: 'AI 写作', description: '向本地大模型提问 (Gemma-4-E2B)', group: '🤖 AI 助理', icon: <Bot size={18} className="text-purple-500" />, keywords: ['ai', 'write', 'bot', 'gemma'], action: (chain: ChainedCommands, editor?: any) => {
    const prompt = window.prompt('告诉 AI 你想写什么 (Gemma-4-E2B-it):');
    if (!prompt) return chain;
    
    setTimeout(async () => {
      if (!editor) return;
      try {
        const { api } = await import('../../lib/api');
        
        let streamBuffer = '';
        
        await api.streamInlineAI(
          { prompt, context: editor.getText(), action: 'ask' },
          (chunk: string) => {
            streamBuffer += chunk;
            
            // 扫描并处理完整的 <Action> 标签
            // 我们需要处理可能在同一个 chunk 中的多个标签
            const scanAndExecute = () => {
              const startTag = '<Action';
              const endTag = '</Action>';
              
              const startIndex = streamBuffer.indexOf(startTag);
              if (startIndex !== -1) {
                const endIndex = streamBuffer.indexOf(endTag, startIndex);
                
                if (endIndex !== -1) {
                  // 1. 提取 Action 之前的文本并插入编辑器
                  const textBefore = streamBuffer.slice(0, startIndex);
                  if (textBefore.trim()) {
                    editor.chain().focus().insertContent(textBefore).run();
                  }
                  
                  // 2. 解析 Action 标签
                  const fullTag = streamBuffer.slice(startIndex, endIndex + endTag.length);
                  const match = /<Action\s+type="([^"]+)"(?:\s+language="([^"]+)")?>([\s\S]*?)<\/Action>/.exec(fullTag);
                  
                  if (match) {
                    const [, type, language, value] = match;
                    console.log(`[AI Action parsed] ${type}: ${value}`);
                    window.dispatchEvent(new CustomEvent('ai-action', { 
                      detail: { type, value: value.trim(), attrs: { language } } 
                    }));
                  }
                  
                  // 3. 消费 Buffer
                  streamBuffer = streamBuffer.slice(endIndex + endTag.length);
                  
                  // 递归扫描，处理紧随其后的标签
                  scanAndExecute();
                } else {
                  // 找到了开头但没找到结尾，说明标签还在流中，暂不处理
                  // 但如果 buffer 开头到 startIndex 之间有内容，可以先插入
                  if (startIndex > 0) {
                    const textBefore = streamBuffer.slice(0, startIndex);
                    editor.chain().focus().insertContent(textBefore).run();
                    streamBuffer = streamBuffer.slice(startIndex);
                  }
                }
              } else {
                // 没找到标签开头，如果 buffer 中没有半截标签前缀，直接插入文本
                // 注意：要防止 '<Act' 这种分片被当作普通文本
                const possibleStart = streamBuffer.lastIndexOf('<');
                if (possibleStart !== -1 && startTag.startsWith(streamBuffer.slice(possibleStart))) {
                  // 可能是半截标签，保留 buffer
                  if (possibleStart > 0) {
                    const textBefore = streamBuffer.slice(0, possibleStart);
                    editor.chain().focus().insertContent(textBefore).run();
                    streamBuffer = streamBuffer.slice(possibleStart);
                  }
                } else {
                  // 确认不是标签，全部插入
                  editor.chain().focus().insertContent(streamBuffer).run();
                  streamBuffer = '';
                }
              }
            };

            scanAndExecute();
          }
        );
      } catch (err: any) {
        console.error(err);
        editor.chain().focus().insertContent(`\n[AI 生成失败: ${err.message}]`).run();
      }
    }, 10);

    return chain;
  } },

  // 1. 文本格式 (Text Formatting)
  { label: '加粗', description: '选中文本并加粗', group: '文本格式', icon: <Bold size={18} />, keywords: ['bold', 'b'], action: (chain: ChainedCommands) => chain.toggleBold() },
  { label: '倾斜', description: '选中文本并倾斜', group: '文本格式', icon: <Italic size={18} />, keywords: ['italic', 'i'], action: (chain: ChainedCommands) => chain.toggleItalic() },
  { label: '删除线', description: '选中文本并添加删除线', group: '文本格式', icon: <Strikethrough size={18} />, keywords: ['strike', 's'], action: (chain: ChainedCommands) => chain.toggleStrike() },
  { label: '高亮', description: '背景着色', group: '文本格式', icon: <Highlighter size={18} />, keywords: ['highlight'], action: (chain: ChainedCommands) => chain.toggleHighlight() },
  { label: '代码', description: '内联代码样式', group: '文本格式', icon: <Code size={18} />, keywords: ['code', 'inline'], action: (chain: ChainedCommands) => chain.toggleCode() },
  { label: '数学公式', description: '内联 LaTeX 公式', group: '文本格式', icon: <Sparkles size={18} />, keywords: ['math', 'latex'], action: (chain: ChainedCommands) => chain.setMark('mathInline', { latex: 'E=mc^2' }) },
  { label: '清除格式', description: '移除所有格式', group: '文本格式', icon: <Eraser size={18} />, keywords: ['clear'], action: (chain: ChainedCommands) => chain.unsetAllMarks() },

  // 2. 段落设置 (Paragraph Settings)
  { label: '正文', description: '普通文本段落', group: '段落设置', icon: <Type size={18} />, keywords: ['p', 'text'], action: (chain: ChainedCommands) => chain.setNode('paragraph') },
  { label: '一级标题', description: '最大标题 (H1)', group: '段落设置', icon: <Heading1 size={18} />, keywords: ['h1'], action: (chain: ChainedCommands) => chain.setNode('heading', { level: 1 }) },
  { label: '二级标题', description: '中标题 (H2)', group: '段落设置', icon: <Heading2 size={18} />, keywords: ['h2'], action: (chain: ChainedCommands) => chain.setNode('heading', { level: 2 }) },
  { label: '三级标题', description: '小标题 (H3)', group: '段落设置', icon: <Heading1 size={14} />, keywords: ['h3'], action: (chain: ChainedCommands) => chain.setNode('heading', { level: 3 }) },
  { label: '四级标题', description: '微标题 (H4)', group: '段落设置', icon: <Heading2 size={14} />, keywords: ['h4'], action: (chain: ChainedCommands) => chain.setNode('heading', { level: 4 }) },
  { label: '五级标题', description: '微标题 (H5)', group: '段落设置', icon: <Heading1 size={12} />, keywords: ['h5'], action: (chain: ChainedCommands) => chain.setNode('heading', { level: 5 }) },
  { label: '六级标题', description: '微标题 (H6)', group: '段落设置', icon: <Heading2 size={12} />, keywords: ['h6'], action: (chain: ChainedCommands) => chain.setNode('heading', { level: 6 }) },
  { label: '有序列表', description: '数字编号列表', group: '段落设置', icon: <ListPlus size={18} className="rotate-180" />, keywords: ['ol', 'ordered'], action: (chain: ChainedCommands) => chain.toggleOrderedList() },
  { label: '无序列表', description: '圆点符号列表', group: '段落设置', icon: <ListPlus size={18} />, keywords: ['ul', 'bullet'], action: (chain: ChainedCommands) => chain.toggleBulletList() },
  { label: '待办事项', description: '复选框任务', group: '段落设置', icon: <CheckSquare size={18} />, keywords: ['todo', 'task'], action: (chain: ChainedCommands) => chain.toggleTaskList() },
  { label: '表情', description: '插入内联表情', group: '段落设置', icon: <Smile size={18} />, keywords: ['emoji', 'emoticon', 'bqb'], action: (chain: ChainedCommands) => {
    // 转发一个事件让外部弹窗处理，或者在这里能拿到上下文
    window.dispatchEvent(new CustomEvent('open-emoticon-panel'));
    return chain;
  } },
  { label: '引用', description: '块级引用', group: '段落设置', icon: <Quote size={18} />, keywords: ['quote', 'blockquote'], action: (chain: ChainedCommands) => chain.toggleBlockquote() },

  // 3. 插入 (Insert)
  { label: '表格', description: '插入数据表', group: '插入', icon: <TableIcon size={18} />, keywords: ['table'], action: (chain: ChainedCommands) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  { label: '代码块', description: '带语法高亮的块', group: '插入', icon: <Cpu size={18} />, keywords: ['codeblock'], action: (chain: ChainedCommands) => chain.setCodeBlock() },
  { label: '数学公式块', description: '居中 LaTeX 公式', group: '插入', icon: <Sparkles size={18} />, keywords: ['mathblock'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'mathBlock', attrs: { latex: '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}' } }) },
  { label: '高亮块', description: '带背景的警示框', group: '插入', icon: <Highlighter size={18} />, keywords: ['callout', 'highlightblock'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'highlightBlock', content: [{ type: 'paragraph' }] }) },
  { label: '分栏', description: '创建左右双栏', group: '插入', icon: <Columns size={18} />, keywords: ['column', 'layout'], action: (chain: ChainedCommands) => chain.insertContent({ 
    type: 'columnGroup', 
    content: [
      { type: 'column', content: [{ type: 'paragraph' }] },
      { type: 'column', content: [{ type: 'paragraph' }] }
    ] 
  }) },
  { label: '注脚', description: '在页面中插入注脚标记', group: '插入', icon: <Quote size={14} />, keywords: ['footnote'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'footnote' }) },
  { label: '分割线', description: '水平分界线', group: '插入', icon: <Minus size={18} />, keywords: ['divider', 'hr'], action: (chain: ChainedCommands) => chain.setHorizontalRule() },
  { label: '图片', description: '插入图片 URL', group: '插入', icon: <Replace size={18} />, keywords: ['image', 'picture'], action: (chain: ChainedCommands) => {
    const url = window.prompt('Image URL:');
    if (url) return chain.setImage({ src: url });
    return chain;
  } },
  { label: '视频', description: '插入视频文件', group: '插入', icon: <Film size={18} />, keywords: ['video', 'mp4'], action: (chain: ChainedCommands) => {
    const url = window.prompt('Video URL:');
    if (url) return chain.insertContent({ type: 'videoNode', attrs: { src: url } });
    return chain;
  } },
  { label: '音频', description: '插入音频文件', group: '插入', icon: <Music size={18} />, keywords: ['audio', 'mp3'], action: (chain: ChainedCommands) => {
    const url = window.prompt('Audio URL:');
    if (url) return chain.insertContent({ type: 'audioNode', attrs: { src: url } });
    return chain;
  } },
  { label: '文件附件', description: '插入任何文件', group: '插入', icon: <FileText size={18} />, keywords: ['file', 'attachment'], action: (chain: ChainedCommands) => {
    const url = window.prompt('File URL:');
    const name = window.prompt('File Name:');
    if (url) return chain.insertContent({ type: 'fileNode', attrs: { src: url, name: name || '未命名文件' } });
    return chain;
  } },
  { label: '链接到笔记', description: '搜索并引用其他笔记', group: '插入', icon: <LinkIcon size={18} />, keywords: ['link', 'note', 'backlink', 'gl'], action: (chain: ChainedCommands) => chain.insertContent('[[') },
  { label: '嵌入 (B站/YouTube)', description: '嵌入外站视频或网页', group: '插入', icon: <MonitorPlay size={18} />, keywords: ['embed', 'bilibili', 'youtube', 'iframe', 'bzhan'], action: (chain: ChainedCommands) => {
    const url = window.prompt('请输入 B站、YouTube 或其他可嵌入网页的链接:');
    if (!url) return chain;

    let embedUrl = url;
    // 智能解析 B 站链接 (提取 BV 号)
    const bvidMatch = url.match(/(?:bilibili\.com\/video\/|b23\.tv\/)(BV[\w]+)/i);
    if (bvidMatch && bvidMatch[1]) {
      embedUrl = `https://player.bilibili.com/player.html?bvid=${bvidMatch[1]}&high_quality=1&danmaku=0&autoplay=0`;
    }
    // 智能解析 YouTube 链接
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
    if (ytMatch && ytMatch[1]) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    return chain.insertContent({ type: 'embedNode', attrs: { src: embedUrl } });
  } },
  { label: '图片轮播', description: '插入高级图片轮播组件', group: '插入', icon: <Layout size={18} />, keywords: ['slider', 'carousel', 'lunbo'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'slider', attrs: { images: [] } }) },

  // 4. 手账装饰 (Scrapbook Decoration)
  { label: '和纸胶带', description: '插入装饰性胶带', group: '手账装饰', icon: <Highlighter size={18} className="text-pink-400" />, keywords: ['tape', 'washi'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'washiTape' }) },
  { label: '便利贴', description: '独立浮动的彩色便利贴', group: '手账装饰', icon: <StickyNoteIcon size={18} className="text-yellow-400" />, keywords: ['note', 'sticky'], action: () => window.dispatchEvent(new CustomEvent('add-sticky-note')) },

  // 5. 🧩 精致小组件 (Exquisite Widgets)
  { label: '倒计时', description: '莫兰迪配色倒计时', group: '🧩 精致小组件', icon: <Timer size={18} />, keywords: ['countdown', 'djs'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'countdown' }) },
  { label: '黑胶播放器', description: '带动画的音乐播放器', group: '🧩 精致小组件', icon: <Music size={18} />, keywords: ['music', 'player'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'musicPlayer' }) },
  { label: '迷你日历', description: '极简月历打卡', group: '🧩 精致小组件', icon: <List size={18} />, keywords: ['calendar', 'checkin'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'miniCalendar' }) },
  { label: '打卡日历 (V2)', description: '多维拟物打卡日历', group: '🧩 精致小组件', icon: <CheckSquare size={18} />, keywords: ['habit', 'tracker', 'dk'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'habitTracker' }) },
  { label: '全局待办 (Sync)', description: '多笔记同步待办清单', group: '🧩 精致小组件', icon: <CheckSquare size={18} className="text-[#8BA494]" />, keywords: ['todo', 'widget', 'sync', 'task'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'todoWidget' }) },
  { label: '多列看板 (Kanban)', description: '手账风进度看板', group: '🧩 精致小组件', icon: <Columns size={18} />, keywords: ['kanban', 'kb'], action: (chain: ChainedCommands) => chain.insertContent({ type: 'kanban' }) },
];

interface NovaBlockEditorProps {
  note: Note | null;
  onSave: (payload: any) => Promise<void>;
  onNotify?: (text: string, tone?: 'success' | 'error' | 'info') => void;
}

/**
 * NovaBlockEditor (Sprint 3 Core)
 * 极致性能、uipro 专业视觉
 */
export const NovaBlockEditor = React.memo<NovaBlockEditorProps>(({
  note, onSave, onNotify
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(note?.created_at || null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [fps, setFps] = useState(0);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [targetPos, setTargetPos] = useState<number | null>(null);
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [isStickerMode, setIsStickerMode] = useState(false);
  const [isStickerPanelOpen, setIsStickerPanelOpen] = useState(false);
  const [isEmoticonPanelOpen, setIsEmoticonPanelOpen] = useState(false);
  const blockMenuRef = useRef<HTMLDivElement>(null);
  const emoticonPanelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStickers(note?.stickers || []);
    setStickyNotes(note?.sticky_notes || []);
  }, [note?.id, note?.stickers, note?.sticky_notes]);

  const handleStickersChange = useCallback((newStickers: StickerData[]) => {
    setStickers(newStickers);
    if (latestNoteRef.current) {
      latestNoteRef.current = { ...latestNoteRef.current, stickers: newStickers };
    }
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  const handleStickyNotesChange = useCallback((newNotes: StickyNoteData[]) => {
    setStickyNotes(newNotes);
    if (latestNoteRef.current) {
      latestNoteRef.current = { ...latestNoteRef.current, sticky_notes: newNotes };
    }
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  useEffect(() => {
    const handleAddSticker = (e?: Event) => {
      const detail = (e as CustomEvent<{ content?: string; url?: string; type?: 'image' | 'text'; x?: number; y?: number }>)?.detail;
      const type = detail?.type || (detail?.url ? 'image' : 'text');
      
      const defaultX = scrollContainerRef.current ? scrollContainerRef.current.clientWidth / 2 - 100 : 100;
      const defaultY = scrollContainerRef.current ? scrollContainerRef.current.scrollTop + 100 : 100;

      const x = detail?.x ?? defaultX;
      const y = detail?.y ?? defaultY;

      if (type === 'image' && detail?.url) {
        const newSticker: StickerData = {
          id: Math.random().toString(36).substring(7),
          type: 'image',
          url: detail.url,
          x,
          y,
          scale: 1,
          rotation: (Math.random() - 0.5) * 10,
          opacity: 1,
        };
        handleStickersChange([...stickers, newSticker]);
      } else {
        const newSticky: StickyNoteData = {
          id: Math.random().toString(36).substring(7),
          x,
          y,
          color: 'rgba(254, 240, 138, 1)',
          rotation: (Math.random() - 0.5) * 10,
          content: detail?.content || '<p></p>',
        };
        handleStickyNotesChange([...stickyNotes, newSticky]);
      }
    };
    window.addEventListener('add-sticky-note', handleAddSticker as EventListener);
    
    const handleOpenEmoticon = (e?: any) => {
      if (e && e.stopPropagation) e.stopPropagation();
      setIsEmoticonPanelOpen(true);
    };
    window.addEventListener('open-emoticon-panel', handleOpenEmoticon);

    const handleAIAction = (e: any) => {
      const { type, value, attrs } = e.detail;
      console.log(`[NovaBlock] Handling AI Action: ${type}`, { value, attrs });
      
      if (type === 'set_title') {
        const newTitle = value.trim();
        if (newTitle) {
          const currentNote = latestNoteRef.current;
          if (currentNote) {
            const payload = { ...currentNote, title: newTitle, is_title_manually_edited: true };
            onSave(payload);
            latestNoteRef.current = payload;
          }
          // 同步更新编辑器内容顶部的 H1
          if (editor) {
            const firstNode = editor.state.doc.firstChild;
            if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
              // 更新已存在的 H1
              editor.chain().setNodeSelection(0).insertContent({
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: newTitle }]
              }).run();
            } else {
              // 在顶部插入新的 H1
              editor.chain().insertContentAt(0, {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: newTitle }]
              }).run();
            }
          }
        }
      } else if (type === 'set_tags') {
        const tags = value.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '');
        if (tags.length > 0) {
          const currentNote = latestNoteRef.current;
          if (currentNote) {
            const payload = { ...currentNote, tags };
            onSave(payload);
            latestNoteRef.current = payload;
          }
          // 在编辑器中插入标签（通常在标题下方）
          if (editor) {
            const tagText = tags.map((t: string) => `#${t}`).join(' ');
            // 查找是否有 H1，如果有，在 H1 后面插入
            const firstNode = editor.state.doc.firstChild;
            let insertPos = 0;
            if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
              insertPos = firstNode.nodeSize;
            }
            editor.chain().insertContentAt(insertPos, {
              type: 'paragraph',
              content: [{ type: 'text', text: tagText }]
            }).run();
          }
        }
      } else if (type === 'insert_code_block') {
        if (editor) {
          // 内容清理：剥离可能存在的 ``` 包装
          const cleanValue = value.replace(/```[a-z]*\n?/gi, '').replace(/\n?```$/gi, '').trim();
          editor.chain().focus().insertContent({
            type: 'codeBlock',
            attrs: { language: attrs?.language || 'plain' },
            content: [{ type: 'text', text: cleanValue }]
          }).run();
        }
      } else if (type === 'insert_todo') {
        if (editor) {
          const cleanValue = value.replace(/```[a-z]*\n?/gi, '').replace(/\n?```$/gi, '').trim();
          editor.chain().focus().insertContent({
            type: 'taskList',
            content: [{
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: cleanValue }] }]
            }]
          }).run();
        }
      } else if (type === 'insert_text') {
        if (editor) {
          editor.chain().focus().insertContent(value).run();
        }
      }
    };
    window.addEventListener('ai-action', handleAIAction);

    return () => {
      window.removeEventListener('add-sticky-note', handleAddSticker as EventListener);
      window.removeEventListener('open-emoticon-panel', handleOpenEmoticon);
      window.removeEventListener('ai-action', handleAIAction);
    };
  }, [stickers, stickyNotes, handleStickersChange, handleStickyNotesChange, onSave]);

  const slashItemsRef = useRef<any[]>(NOVA_BLOCK_SLASH_ITEMS);
  slashItemsRef.current = NOVA_BLOCK_SLASH_ITEMS;
  
  // 保持对最新 note 的引用，防止在 useEditor 闭包中拿到旧的 state 导致属性被覆盖
  const latestNoteRef = useRef(note);
  useEffect(() => {
    latestNoteRef.current = note;
  }, [note]);

  // 核心 Tiptap 扩展配置 (高性能 memo 模式)
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      link: false,
      underline: false,
    }),
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Blockquote,
    CodeBlock,
    Link.configure({ openOnClick: true, autolink: true }),
    Highlight,
    UnderlineExtension,
    TiptapTable.configure({ resizable: true }),
    TableRow,
    DatabaseTableHeader,
    DatabaseTableCell,
    MathInline,
    MathBlock,
    Footnote,
    ColumnGroup,
    Column,
    HighlightBlock,
    AudioNode,
    VideoNode,
    EmbedNode,
    FileNode,
    CalloutNode,
    WikiLink,
    TaskList,
    TaskItem.configure({ nested: true }),
    ResizableImage.configure({ inline: false }),
    WashiTape,
    JournalStamp,
    FilePlaceholder,
    FileUpload,
    CountdownNode,
    MusicPlayerNode,
    MiniCalendarNode,
    KanbanNode,
    HabitTrackerNode,
    TodoNode,
    Emoticon,
    SliderExtension,
    TextEffect,
    NoteLink.configure({ suggestion: getNoteLinkSuggestionConfig() }),
    SlashCommands.configure({ suggestion: getSuggestionConfig(slashItemsRef) }),
  ], []);

  const [outline, setOutline] = useState<any[]>([]);
  const outlineTimerRef = useRef<any>(null);

  // 提取大纲数据用于 TOC
  const updateOutline = useCallback((editorInstance: Editor) => {
    if (outlineTimerRef.current) {
      clearTimeout(outlineTimerRef.current);
    }
    
    outlineTimerRef.current = setTimeout(() => {
      const items: any[] = [];
      let foldLevel: number | null = null;
      
      editorInstance.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const currentLevel = node.attrs.level;
          
          // 逻辑与 CollapsibleHeading 保持一致
          if (foldLevel !== null && currentLevel <= foldLevel) {
            foldLevel = null;
          }

          // 如果处于折叠范围内，不加入大纲
          if (foldLevel !== null) return false;

          const text = node.textContent;
          const displayText = text.trim() === '' ? '无标题' : text;
          const id = node.attrs.id || `h-pending-${pos}`;
          
          items.push({
            id,
            text: displayText,
            level: currentLevel,
          });

          if (node.attrs.collapsed) {
            foldLevel = currentLevel;
          }
          return false;
        }
        
        if (node.isBlock && foldLevel !== null) return false;
        return true;
      });

      // 只有在结构或核心数据发生变化时才更新状态
      setOutline((prev) => {
        // 关键：如果当前包含 pending ID，或者之前包含 pending ID，必须允许更新以达到最终稳定状态
        const hasPending = items.some(it => it.id.startsWith('h-pending-'));
        const prevHasPending = prev.some(it => it.id.startsWith('h-pending-'));

        if (!hasPending && !prevHasPending && 
            prev.length === items.length && 
            prev.every((item, i) => item.id === items[i].id && item.text === items[i].text && item.level === items[i].level)) {
          return prev;
        }
        return items;
      });
    }, 500); // 500ms 防抖，大幅提升输入性能，杜绝 React 渲染死锁
  }, []);

  const editor = useEditor({
    extensions,
    content: note?.content || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // 避免重复设置状态导致 React React 死循环
      if (!isDirty) {
        setIsDirty(true);
      }
      
      const html = editor.getHTML();
      const currentLatestNote = latestNoteRef.current;
      const payload: any = { ...currentLatestNote, content: html };
      
      if (!currentLatestNote?.is_title_manually_edited) {
        // Extract title from the first text-containing block
        const docContent = editor.getJSON().content || [];
        let autoTitle = '';
        for (const block of docContent) {
          if (block.content && block.content.length > 0) {
            autoTitle = block.content.map((n: any) => n.text || '').join('');
            if (autoTitle.trim() !== '') {
              break; // use the first non-empty text
            }
          }
        }
        if (autoTitle.trim() !== '') {
          payload.title = autoTitle.trim();
        } else {
          payload.title = '未命名手账';
        }
      }
      
      latestNoteRef.current = payload;
      // 这里不要在每次按键时立刻 await onSave(payload)，因为 onUpdate 是同步触发的高频事件
      // 让 handleSave (debounced) 去接管保存逻辑，极大提高输入性能
      // 只有在需要立即更新大纲时，才调用 updateOutline(editor);
      updateOutline(editor);
    },
    onTransaction: ({ editor }) => {
      // 在事务提交后更新大纲，捕捉拖拽和属性变化
      updateOutline(editor);
    },
    onCreate: ({ editor }) => {
      // 强制运行一次 ID 补全
      // @ts-ignore
      editor.commands.ensureHeadingIds();
      updateOutline(editor);
    },
    editorProps: {
      attributes: {
        class: 'novablock-editor prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px] w-full mx-auto pt-4 px-12 mb-32 font-sans text-foreground selection:bg-primary/20'
      },
      handleKeyDown: (view, event) => {
        // `/e` + Enter -> 打开表情面板（阻止换行，并删除触发文本）
        if (event.key !== 'Enter') return false;

        const { state } = view;
        const { selection } = state;
        if (!selection.empty) return false;

        const { from } = selection;
        if (from < 2) return false;

        const trigger = state.doc.textBetween(from - 2, from, '\0', '\0');
        if (trigger !== '/e') return false;

        // 确保 `/e` 是一个独立触发（前一个字符为空或空白）
        const prevChar = from - 3 >= 0 ? state.doc.textBetween(from - 3, from - 2, '\0', '\0') : '';
        if (prevChar && !/\s/.test(prevChar)) return false;

        event.preventDefault();
        const tr = state.tr.delete(from - 2, from);
        view.dispatch(tr);
        setIsEmoticonPanelOpen(true);
        return true;
      },
    }
  }, [extensions, updateOutline]);

  // 保存逻辑
  const handleSave = async (content?: string, updates?: Partial<Note>) => {
    const currentNote = latestNoteRef.current;
    if (!currentNote) return;
    
    // 合并最新的编辑器内容和传入的增量更新 (如天气、心情)
    const html = content || editor?.getHTML() || '';
    const payloadToSave = { ...currentNote, ...updates, content: html };

    // 如果已经在保存中，避免并发冲突
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(payloadToSave);
      // 同时更新 latestNoteRef 防止马上下一次输入时拿到旧数据
      latestNoteRef.current = payloadToSave;
      
      // 注意：仅当当前编辑器内容与保存时的内容一致时，才取消脏标记
      // 避免在保存过程中用户输入的内容被覆盖丢失
      if (!isDirty || editor?.getHTML() === html) {
        setIsDirty(false);
      }
      
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Save failed:', err);
      onNotify?.('保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 自动保存 (debounce)
  const timerRef = useRef<any>(null);
  useEffect(() => {
    // 只要有改动，就设置定时器
    if (!isDirty) return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty]);

  const [blockMenuPos, setBlockMenuPos] = useState({ top: 0, bottom: 'auto' });
  const blockMenuContentRef = useRef<HTMLDivElement>(null);

  // 视口边界检测：防止菜单被遮挡
  useLayoutEffect(() => {
    if (isBlockMenuOpen && blockMenuContentRef.current) {
      const rect = blockMenuContentRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // 如果底部超出视口，向上偏移
      if (rect.bottom > viewportHeight - 20) {
        setBlockMenuPos({ top: 'auto' as any, bottom: 0 as any });
      } else {
        setBlockMenuPos({ top: 0, bottom: 'auto' as any });
      }
    }
  }, [isBlockMenuOpen]);

  // 点击外部关闭块菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(event.target as Node)) {
        setIsBlockMenuOpen(false);
      }
    };

    if (isBlockMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBlockMenuOpen]);

  // 点击外部关闭表情面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emoticonPanelRef.current && !emoticonPanelRef.current.contains(event.target as Node)) {
        setIsEmoticonPanelOpen(false);
      }
    };

    if (isEmoticonPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmoticonPanelOpen]);

  // 处理拖拽手柄点击：捕获当前 Block 位置
  const handleGripClick = (e: React.MouseEvent) => {
    if (!editor) return;

    if (!isBlockMenuOpen) {
      // 通过点击坐标找到对应的 Tiptap 节点位置
      const view = editor.view;
      const editorRect = view.dom.getBoundingClientRect();
      
      // X 轴稍微往编辑器内部偏一点，Y 轴用点击位置
      const x = editorRect.left + 50; 
      const y = e.clientY;
      
      const posAtCoords = view.posAtCoords({ left: x, top: y });
      if (posAtCoords) {
        const $pos = editor.state.doc.resolve(posAtCoords.pos);
        // 找到当前层级的 block 节点起始位置 (depth 1 为根节点的直接子节点，即 block)
        // 在 Tiptap 中，大部分 block 位于 depth 1
        const blockPos = $pos.before(1);
        setTargetPos(blockPos);
        
        // 选中该节点以示反馈并为后续指令做准备
        editor.commands.setNodeSelection(blockPos);
      }
    }
    
    setIsBlockMenuOpen(!isBlockMenuOpen);
  };
  
  // 性能监控 (uipro 核心铁律：性能第一)
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    const updateFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(updateFps);
    };
    const animId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  const [prevNoteId, setPrevNoteId] = useState<number | string | undefined>(note?.id);

  // 同步内容 (仅在切换笔记，或编辑器完全为空但有内容时)
  useEffect(() => {
    if (!editor || !note?.id) return;
    
    if (note.id !== prevNoteId) {
      editor.commands.setContent(note.content || '<p></p>', { emitUpdate: false });
      // 切换内容后，强制补齐 ID 并更新大纲
      // @ts-ignore
      editor.commands.ensureHeadingIds();
      setPrevNoteId(note.id);
      updateOutline(editor);
    }
  }, [note?.id, note?.content, editor, prevNoteId, updateOutline]);

  // 同步预览/编辑模式
  useEffect(() => {
    if (editor) {
      editor.setEditable(viewMode === 'edit');
    }
  }, [editor, viewMode]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex flex-col h-full bg-transparent overflow-hidden"
    >
      
      {/* 性能仪表盘 */}
      <div className="fixed top-6 left-6 z-[100] flex items-center gap-2 px-3 py-1.5 bg-background/40 hover:bg-background/80 rounded-full backdrop-blur-xl border border-border/20 pointer-events-none transition-all duration-300 shadow-soft">
        <Cpu size={12} className={fps < 55 ? 'text-destructive' : 'text-primary'} />
        <span className="text-[10px] font-mono font-bold text-muted-foreground">{fps} FPS</span>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative scrollbar-hide pt-0 custom-scrollbar"
        onDragOver={(e) => {
          if (isStickerMode) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          if (!isStickerMode) return;
          e.preventDefault();
          
          try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            
            const stickerData = JSON.parse(dataStr);
            if (stickerData.type === 'image' && stickerData.url) {
              // 计算相对于 scrollContainer 的坐标
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top + e.currentTarget.scrollTop;

              window.dispatchEvent(new CustomEvent('add-sticky-note', { 
                detail: { 
                  url: stickerData.url, 
                  type: 'image',
                  x: x - 50, // 居中落点
                  y: y - 50 
                } 
              }));
            }
          } catch (err) {
            console.error('Failed to handle sticker drop:', err);
          }
        }}
      >
        <div className="flex flex-col w-full max-w-[900px] mx-auto pb-40">
          <div className="px-12 mt-6">
            <EditorHeader
              icon={note?.icon ?? '📝'}
              title={note?.title ?? '未命名手账'}
              isTitleManuallyEdited={note?.is_title_manually_edited ?? false}
              breadcrumbs={[]}
              onSelectBreadcrumb={() => {}}
              savePhase={isSaving ? 'saving' : isDirty ? 'queued' : 'idle'}
              isDirty={isDirty}
              lastSavedAt={lastSavedAt}
              showRelations={false}
              showOutline={false}
              viewMode={viewMode}
              isStickerMode={isStickerMode}
              onSave={() => handleSave()}
              onUpdateTitle={(newTitle, isManual) => {
                const currentNote = latestNoteRef.current;
                if(currentNote) {
                  const payload = { ...currentNote, title: newTitle, is_title_manually_edited: isManual };
                  onSave(payload);
                  latestNoteRef.current = payload;
                }
              }}
              onToggleRelations={() => {}}
              onOutlineEnter={() => {}}
              onOutlineLeave={() => {}}
              onSetViewMode={setViewMode}
              onToggleStickerMode={() => {
                const newMode = !isStickerMode;
                setIsStickerMode(newMode);
                if (newMode) setIsStickerPanelOpen(true);
                else setIsStickerPanelOpen(false);
              }}
              onOpenStickerPanel={() => setIsStickerPanelOpen(true)}
              onClearStickers={() => handleStickersChange([])}
            />

            {note && (
              <div 
                className="mt-1 px-0"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <PropertyPanel 
                  note={note} 
                  onUpdate={(updated) => {
                    const currentNote = latestNoteRef.current;
                    if (currentNote) {
                      const payload = { ...currentNote, ...updated, silent: true };
                      onSave(payload);
                      latestNoteRef.current = { ...currentNote, ...updated };
                    }
                  }}
                  onFlushSave={(updates) => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    handleSave(editor?.getHTML(), updates);
                  }}
                />
              </div>
            )}
          </div>

          <div className="relative group/editor mt-2 w-full">
            {/* Block 拖拽手柄 */}
            {editor && (
              <DragHandle 
                editor={editor} 
                pluginKey="DragHandle"
              >
                <div className="flex items-center gap-1 group/handle relative" ref={blockMenuRef}>
                  <div 
                    onClick={handleGripClick}
                    className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing text-stone-400 group-hover/handle:text-stone-600 transition-colors drag-handle"
                  >
                    <GripVertical size={16} />
                  </div>


                  <AnimatePresence>
                    {isBlockMenuOpen && (
                      <motion.div
                        ref={blockMenuContentRef}
                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -10 }}
                        style={{ ...blockMenuPos }}
                        className="absolute left-8 z-[110] w-64 overflow-hidden rounded-2xl border border-border/10 bg-popover/80 backdrop-blur-2xl shadow-soft flex flex-col"
                      >
                        <div className="flex flex-col max-h-[60vh] overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-2 gap-1.5">
                          {/* Section: Turn Into */}
                          <div className="px-1 py-1">
                            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2 px-1">转换为 (Turn Into)</p>
                            <div className="grid grid-cols-5 gap-1 px-1">
                              {[
                                { label: '正文', title: '转换为正文', icon: <Type size={16} />, action: () => editor.chain().focus().setNode('paragraph').run() },
                                { label: 'H1', title: '转换为一级标题', icon: <Heading1 size={16} />, action: () => editor.chain().focus().setNode('heading', { level: 1 }).run() },
                                { label: 'H2', title: '转换为二级标题', icon: <Heading2 size={16} />, action: () => editor.chain().focus().setNode('heading', { level: 2 }).run() },
                                { label: 'H3', title: '转换为三级标题', icon: <Heading3 size={16} />, action: () => editor.chain().focus().setNode('heading', { level: 3 }).run() },
                                { label: '引用', title: '转换为引用', icon: <Quote size={16} />, action: () => editor.chain().focus().toggleBlockquote().run() },
                                { label: '列表', title: '转换为无序列表', icon: <List size={16} />, action: () => editor.chain().focus().toggleBulletList().run() },
                                { label: '有序', title: '转换为有序列表', icon: <ListOrdered size={16} />, action: () => editor.chain().focus().toggleOrderedList().run() },
                                { label: '任务', title: '转换为任务列表', icon: <CheckSquare size={16} />, action: () => editor.chain().focus().toggleTaskList().run() },
                                { label: '代码', title: '转换为代码块', icon: <Code size={16} />, action: () => editor.chain().focus().setCodeBlock().run() },
                                { label: '分割线', title: '插入分割线', icon: <Minus size={16} />, action: () => editor.chain().focus().setHorizontalRule().run() },
                              ].map((item) => (
                                <button 
                                  key={item.label}
                                  title={item.title}
                                  onClick={() => {
                                    item.action();
                                    setIsBlockMenuOpen(false);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-all duration-200"
                                >
                                  {item.icon}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="h-px bg-border/20 mx-2" />

                          {/* Section: Actions */}
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1.5 px-1">操作 (Actions)</p>
                          <div className="flex flex-col gap-0.5">
                            <button 
                              onClick={() => {
                                if (targetPos !== null) {
                                  editor.chain().insertContentAt(targetPos, { type: 'paragraph' }).focus().run();
                                }
                                setIsBlockMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                            >
                              <ArrowUpToLine size={14} /> 在上方插入空行
                            </button>
                            <button 
                              onClick={() => {
                                if (targetPos !== null) {
                                  const node = editor.state.doc.nodeAt(targetPos);
                                  const endPos = targetPos + (node?.nodeSize || 0);
                                  editor.chain().insertContentAt(endPos, { type: 'paragraph' }).focus().run();
                                }
                                setIsBlockMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                            >
                              <ArrowDownToLine size={14} /> 在下方插入空行
                            </button>
                            <button 
                              onClick={() => {
                                if (targetPos !== null) {
                                  const node = editor.state.doc.nodeAt(targetPos);
                                  if (node) {
                                    const endPos = targetPos + node.nodeSize;
                                    editor.chain().insertContentAt(endPos, node.toJSON()).focus().run();
                                  }
                                }
                                setIsBlockMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                            >
                              <CopyPlus size={14} /> 复制该块并插入
                            </button>
                            <button 
                              onClick={() => {
                                if (targetPos !== null) {
                                  const node = editor.state.doc.nodeAt(targetPos);
                                  if (node) {
                                    // 获取当前块的 HTML 内容进行复制操作
                                    
                                    // 更好的获取 HTML 方式
                                    const tempEditor = new Editor({
                                      extensions: extensions,
                                      content: node.toJSON(),
                                    });
                                    const finalHtml = tempEditor.getHTML();
                                    tempEditor.destroy();

                                    editor.chain().focus().deleteRange({ from: targetPos, to: targetPos + node.nodeSize }).run();
                                    window.dispatchEvent(new CustomEvent('add-sticky-note', { detail: { content: finalHtml } }));
                                  }
                                }
                                setIsBlockMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                            >
                              <StickyNote size={14} /> 转换为便利贴
                            </button>
                            <button 
                              onClick={() => {
                                let content = '';
                                if (targetPos !== null) {
                                  content = editor.state.doc.nodeAt(targetPos)?.textContent || '';
                                } else {
                                  const { from, to } = editor.state.selection;
                                  content = editor.state.doc.textBetween(from, to, '\n');
                                }
                                navigator.clipboard.writeText(content);
                                onNotify?.('已复制纯文本', 'success');
                                setIsBlockMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                            >
                              <Copy size={14} /> 复制纯文本
                            </button>
                          </div>
                        </div>

                        <div className="h-px bg-border/20 mx-2" />

                        <div className="px-2 py-1.5">
                            <button 
                              onClick={() => {
                                if (targetPos !== null) {
                                  const node = editor.state.doc.nodeAt(targetPos);
                                  editor.chain().focus().deleteRange({ from: targetPos, to: targetPos + (node?.nodeSize || 0) }).run();
                                } else {
                                  editor.chain().focus().deleteSelection().run();
                                }
                                setIsBlockMenuOpen(false);
                             }}
                             className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
                           >
                             <Trash2 size={14} /> 删除块
                           </button>
                         </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </DragHandle>
            )}

            {/* 表格浮动菜单 */}
            {editor && (
              <BubbleMenu 
                editor={editor} 
                shouldShow={({ editor }) => editor.isActive('table')}
                // @ts-ignore
                tippyOptions={{ 
                  duration: 100,
                  offset: [0, 10],
                  maxWidth: 'none',
                  zIndex: 110,
                } as any}
                className="flex overflow-hidden rounded-2xl border border-border/20 bg-popover/80 backdrop-blur-2xl shadow-soft p-1.5"
              >
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => editor.chain().focus().addColumnBefore().run()}
                    className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-all duration-300"
                    title="在前插入列"
                  >
                    <Columns size={16} className="rotate-180" />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-all duration-300"
                    title="在后插入列"
                  >
                    <Columns size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    className="p-2 rounded-xl hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-all duration-300"
                    title="删除列"
                  >
                    <Trash size={14} className="rotate-90" />
                  </button>
                  
                  <div className="w-px h-5 bg-border/20 mx-1" />

                  <button 
                    onClick={() => editor.chain().focus().addRowBefore().run()}
                    className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-all duration-300"
                    title="在前插入行"
                  >
                    <Rows size={16} className="rotate-180" />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-all duration-300"
                    title="在后插入行"
                  >
                    <Rows size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    className="p-2 rounded-xl hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-all duration-300"
                    title="删除行"
                  >
                    <Trash size={14} />
                  </button>

                  <div className="w-px h-5 bg-border/20 mx-1" />

                  <button 
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="p-2 rounded-xl hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-all duration-300"
                    title="删除表格"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </BubbleMenu>
            )}

            {/* 浮动菜单 */}
            {editor && (
              <BubbleMenu 
                editor={editor} 
                // @ts-ignore
                tippyOptions={{ 
                  duration: 150,
                  offset: [0, 10],
                  maxWidth: 'none',
                  zIndex: 110,
                  animation: 'fade',
                } as any}
                shouldShow={({ editor }: { editor: Editor }) => {
                  const { selection } = editor.state;
                  const isNodeSelection = selection instanceof NodeSelection;
                  
                  return (
                    !isBlockMenuOpen && 
                    !selection.empty && 
                    !isNodeSelection &&
                    !editor.isActive('table')
                  );
                }}
                className="flex overflow-hidden rounded-2xl border border-border/20 bg-popover/80 backdrop-blur-2xl shadow-soft p-1.5"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-center gap-1"
                >
                  <button 
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('bold') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="加粗"
                  >
                    <Bold size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('italic') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="斜体"
                  >
                    <Italic size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleUnderline().run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('underline') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="下划线"
                  >
                    <Underline size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleStrike().run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('strike') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="删除线"
                  >
                    <Strikethrough size={16} />
                  </button>
                  
                  <div className="w-px h-5 bg-border/20 mx-1" />

                  <button 
                    onClick={() => {
                      const url = window.prompt('URL:', editor.getAttributes('link').href);
                      if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                      } else if (url === '') {
                        editor.chain().focus().unsetLink().run();
                      }
                    }} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('link') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="插入链接"
                  >
                    <LinkIcon size={16} />
                  </button>

                  <button 
                    onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffec3d' }).run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('highlight') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="高亮"
                  >
                    <Highlighter size={16} />
                  </button>

                  <button 
                    onClick={() => editor.chain().focus().toggleCode().run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('code') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="内联代码"
                  >
                    <Code size={16} />
                  </button>

                  <div className="w-px h-5 bg-border/20 mx-1" />

                  {/* Text Effects */}
                  <button 
                    onClick={() => editor.chain().focus().toggleTextEffect({ effect: 'gradient' }).run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('textEffect', { effect: 'gradient' }) ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="动态渐变特效"
                  >
                    <Sparkles size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleTextEffect({ effect: 'bounce' }).run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('textEffect', { effect: 'bounce' }) ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="动感跳动特效"
                  >
                    <Waves size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleTextEffect({ effect: 'neon' }).run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('textEffect', { effect: 'neon' }) ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="赛博霓虹特效"
                  >
                    <Zap size={16} />
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().toggleTextEffect({ effect: 'typewriter' }).run()} 
                    className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${editor.isActive('textEffect', { effect: 'typewriter' }) ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="打字机特效"
                  >
                    <Type size={16} />
                  </button>

                  <div className="w-px h-5 bg-border/20 mx-1" />
                  
                  <button 
                    onClick={() => editor.chain().focus().unsetAllMarks().run()} 
                    className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-300"
                    title="清除格式"
                  >
                    <Eraser size={16} />
                  </button>

                  <div className="w-px h-5 bg-border/20 mx-1" />

                  <div className="relative">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEmoticonPanelOpen((v) => !v);
                      }}
                      className={`p-2 rounded-xl hover:bg-accent transition-all duration-300 ${isEmoticonPanelOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                      title="表情包"
                    >
                      <Smile size={16} />
                    </button>
                  </div>
                </motion.div>
              </BubbleMenu>
            )}
            
            {/* 三层架构渲染 */}
            {/* Layer 2: Stickers (Decorations) */}
            <StickerLayer 
              stickers={stickers} 
              isEditable={isStickerMode}
              onChange={handleStickersChange} 
            />

            {/* Layer 1: Tiptap Editor */}
            <EditorContent 
              editor={editor} 
              className={`relative z-30 transition-all duration-500 ${isStickerMode ? 'opacity-40 blur-[1px] pointer-events-none' : 'opacity-100 blur-0'}`} 
            />

            {/* Layer 0: Sticky Notes (Top Layer) - Independent of Sticker Mode blur */}
            <StickyNotesLayer
              notes={stickyNotes}
              onChange={handleStickyNotesChange}
            />

            {/* Global Emoticon Panel (Detached from BubbleMenu) */}
            <AnimatePresence>
              {isEmoticonPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999]"
                  ref={emoticonPanelRef}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <EmoticonPanel
                    onSelect={(emoticon) => {
                      editor?.chain().focus().setEmoticon({ src: formatUrl(emoticon.url), alt: emoticon.name }).run();
                      setIsEmoticonPanelOpen(false);
                    }}
                  />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEmoticonPanelOpen(false);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center shadow-md hover:bg-accent transition-colors"
                    aria-label="关闭表情面板"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* TOC 挂载在滚动容器内部，相对定位 */}
        <TableOfContents outline={outline} scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>} />
      </div>

      <AnimatePresence>
        {isStickerPanelOpen && (
          <StickerPanel 
            onClose={() => setIsStickerPanelOpen(false)}
            onSelect={(url) => {
              window.dispatchEvent(new CustomEvent('add-sticky-note', { 
                detail: { url: formatUrl(url), type: 'image' } 
              }));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaving && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-primary text-primary-foreground px-6 py-3 rounded-2xl shadow-soft"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase">手写记忆同步中...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
