import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Command, ArrowRight } from 'lucide-react';
import { Note } from '../../lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter notes based on title
  const filteredNotes = useMemo(() => {
    if (!query.trim()) {
      return notes.filter(n => !n.is_folder).slice(0, 10);
    }
    const q = query.toLowerCase();
    return notes
      .filter(n => !n.is_folder && n.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, notes]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredNotes.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredNotes.length) % Math.max(1, filteredNotes.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNotes[selectedIndex]) {
          onSelectNote(filteredNotes[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNotes, selectedIndex, onSelectNote, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-border/50">
              <Search className="w-5 h-5 text-muted-foreground mr-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="快速搜索笔记标题..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-lg"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-border/50">
                <Command className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">K</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredNotes.length > 0 ? (
                <div className="space-y-1">
                  {filteredNotes.map((note, index) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        onSelectNote(note);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        index === selectedIndex
                          ? 'bg-nova/10 text-nova ring-1 ring-nova/20'
                          : 'hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          index === selectedIndex ? 'bg-nova/20' : 'bg-muted'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className={`font-medium text-sm ${
                            index === selectedIndex ? 'text-nova' : 'text-foreground'
                          }`}>
                            {note.title || '无标题'}
                          </p>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {note.tags.map(tag => (
                                <span key={tag} className="text-[10px] opacity-60">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={`w-4 h-4 transition-transform ${
                        index === selectedIndex ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                      }`} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-sm">未找到匹配的笔记</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="px-1 py-0.5 bg-background border border-border/50 rounded text-[10px]">↑↓</span>
                  <span>选择</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="px-1 py-0.5 bg-background border border-border/50 rounded text-[10px]">↵</span>
                  <span>打开</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="px-1 py-0.5 bg-background border border-border/50 rounded text-[10px]">ESC</span>
                <span>关闭</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
