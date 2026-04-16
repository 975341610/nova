import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, FileText, ArrowRightLeft, RefreshCw } from 'lucide-react';
import type { Note } from '../../lib/types';
import { dataService } from '../../services/dataService';

interface BacklinksPanelProps {
  currentNoteId: number | string | null;
  onSelectNote: (note: Note) => void;
}

const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ currentNoteId, onSelectNote }) => {
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const [links, setLinks] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLinks = async () => {
    if (!currentNoteId) return;
    setLoading(true);
    try {
      const allNotes = await dataService.getAllNotes();
      const currentNoteIdStr = String(currentNoteId);
      
      // 1. 正向链接 (Forward Links)
      const currentNote = allNotes.find(n => String(n.id) === currentNoteIdStr);
      let forwardLinks: Note[] = [];
      if (currentNote && currentNote.content) {
        // 同时支持 data-id 属性和 [[WikiLink]] 语法
        const dataIdPattern = /data-id=["']?(\d+)["']?/g;
        const wikiPattern = /\[\[(.*?)\]\]/g;
        
        const dataIdMatches = [...currentNote.content.matchAll(dataIdPattern)].map(m => m[1]);
        const wikiMatches = [...currentNote.content.matchAll(wikiPattern)].map(m => m[1]);
        
        const idsOrTitles = Array.from(new Set([...dataIdMatches, ...wikiMatches]));
        
        forwardLinks = allNotes.filter(n => 
          idsOrTitles.includes(String(n.id)) || 
          idsOrTitles.includes(n.title)
        );
      }
      setLinks(forwardLinks);

      // 2. 反向链接 (Backlinks) - 使用双擎适配的 dataService
      const backlinkIdsOrTitles = await dataService.getBacklinks(currentNoteIdStr);
      
      const backlinksArr = allNotes.filter(n => 
        backlinkIdsOrTitles.includes(String(n.id)) || 
        backlinkIdsOrTitles.includes(n.title)
      );
      
      setBacklinks(backlinksArr);

    } catch (error) {
      console.error('Failed to parse links:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    
    // 监听全局笔记变更事件以实时刷新双向链接
    const handleUpdate = () => fetchLinks();
    window.addEventListener('nova-notes-updated', handleUpdate);
    return () => window.removeEventListener('nova-notes-updated', handleUpdate);
  }, [currentNoteId]);

  if (!currentNoteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 opacity-40">
        <ArrowRightLeft size={32} className="text-muted-foreground" />
        <div className="text-xs text-muted-foreground">选择一篇笔记以查看其关联关系</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/30">
      <div className="p-4 flex items-center justify-between border-b border-border/10">
        <div className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest flex items-center gap-2">
          <ArrowRightLeft size={12} />
          双向链接 (Bi-directional)
        </div>
        <button 
          onClick={fetchLinks}
          className={`p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground transition-all ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        {/* Backlinks Section */}
        <section className="space-y-3">
          <h4 className="px-2 text-[10px] font-semibold text-primary/60 flex items-center gap-1.5">
            <LinkIcon size={10} className="rotate-45" />
            反向链接 (Linked to here)
          </h4>
          <div className="space-y-1">
            {backlinks.length > 0 ? (
              backlinks.map(note => (
                <button
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                    {note.icon || <FileText size={14} />}
                  </div>
                  <span className="truncate flex-1">{note.title}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-[10px] text-muted-foreground/40 italic">暂无笔记引用此篇</div>
            )}
          </div>
        </section>

        {/* Forward Links Section */}
        <section className="space-y-3">
          <h4 className="px-2 text-[10px] font-semibold text-muted-foreground/60 flex items-center gap-1.5">
            <LinkIcon size={10} />
            正向链接 (Links in this note)
          </h4>
          <div className="space-y-1">
            {links.length > 0 ? (
              links.map(note => (
                <button
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent text-muted-foreground/50 group-hover:text-primary group-hover:bg-primary/5 transition-colors shrink-0">
                    {note.icon || <FileText size={14} />}
                  </div>
                  <span className="truncate flex-1">{note.title}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-[10px] text-muted-foreground/40 italic">此篇笔记未引用其他笔记</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BacklinksPanel;
