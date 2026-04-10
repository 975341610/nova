import React, { useState, useMemo } from 'react';
import { Search, FileText, X } from 'lucide-react';
import type { Note } from '../../lib/types';

interface GlobalSearchPanelProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onClose: () => void;
}

const GlobalSearchPanel: React.FC<GlobalSearchPanelProps> = ({
  notes,
  onSelectNote,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  // 辅助函数：将 HTML 转换为纯文本并去除多余空白
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const q = query.toLowerCase();
    const searchResults: { note: Note; snippet: string; matches: number }[] = [];

    notes.forEach(note => {
      if (note.is_folder) return;

      const titleMatch = note.title.toLowerCase().includes(q);
      
      // 合并主内容和所有便利贴内容进行全局搜索
      let fullContent = note.content || "";
      if (note.sticky_notes && note.sticky_notes.length > 0) {
        fullContent += " " + note.sticky_notes.map(sn => sn.content || "").join(" ");
      }
      
      // 合并标签内容，让标签也能被全局搜索到
      if (note.tags && note.tags.length > 0) {
        fullContent += " " + note.tags.join(" ");
      }
      
      const textContent = stripHtml(fullContent);
      const contentLower = textContent.toLowerCase();
      const contentMatchIndex = contentLower.indexOf(q);

      if (titleMatch || contentMatchIndex !== -1) {
        let snippet = "";
        if (contentMatchIndex !== -1) {
          const start = Math.max(0, contentMatchIndex - 30);
          const end = Math.min(textContent.length, contentMatchIndex + query.length + 50);
          snippet = textContent.substring(start, end);
          if (start > 0) snippet = "..." + snippet;
          if (end < textContent.length) snippet = snippet + "...";
        } else {
          snippet = textContent.substring(0, 80) + (textContent.length > 80 ? "..." : "");
        }

        searchResults.push({
          note,
          snippet,
          matches: (contentLower.match(new RegExp(q, 'g')) || []).length + (titleMatch ? 1 : 0)
        });
      }
    });

    return searchResults.sort((a, b) => b.matches - a.matches);
  }, [query, notes]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-nova/30 text-nova-foreground rounded-sm px-0.5 font-medium border-b-2 border-nova/50">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-xl animate-in slide-in-from-left duration-300">
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" /> 全局搜索
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在所有笔记中搜索..."
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-nova/20 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.map(({ note, snippet }) => (
              <button
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/30 group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-muted-foreground group-hover:text-nova transition-colors" />
                  <span className="text-sm font-medium truncate">
                    {highlightText(note.title || '无标题', query)}
                  </span>
                </div>
                {snippet && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {highlightText(snippet, query)}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">未找到与 "{query}" 相关的结果</p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-xs opacity-60">输入至少两个字符开始搜索</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearchPanel;
