import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Layout, Check, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { NoteTemplate } from '../../lib/types';

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'select' | 'save';
  onSelect?: (template: NoteTemplate) => void;
  onSave?: (name: string) => void;
  initialContent?: string;
}

export function TemplatePicker({ isOpen, onClose, mode, onSelect, onSave }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (isOpen && mode === 'select') {
      loadTemplates();
    }
    return () => {
      isMounted.current = false;
    };
  }, [isOpen, mode]);

  const loadTemplates = async () => {
    if (isMounted.current) setLoading(true);
    try {
      const data = await api.listTemplates();
      if (isMounted.current) setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleSave = () => {
    if (newName.trim() && onSave) {
      onSave(newName.trim());
      setNewName('');
      onClose();
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个模板吗？')) {
      try {
        await api.deleteTemplate(id);
        setTemplates(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Failed to delete template:', err);
      }
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-accent/10">
              <h3 className="font-bold flex items-center gap-2">
                <Layout size={18} className="text-primary" />
                {mode === 'select' ? '选择模板' : '另存为模板'}
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-accent rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {mode === 'select' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="搜索模板..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-accent/30 border border-border/40 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground text-sm animate-pulse">
                      正在加载模板库...
                    </div>
                  ) : filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredTemplates.map(template => (
                        <div
                          key={template.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelect?.(template)}
                          onKeyDown={(e) => e.key === 'Enter' && onSelect?.(template)}
                          className="group w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all text-left cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg bg-accent/40 flex items-center justify-center text-xl shrink-0 group-hover:bg-primary/10 transition-colors">
                            {template.icon || '📄'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{template.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate opacity-60">
                              {template.category || '通用'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleDeleteTemplate(e, template.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-md transition-colors"
                              title="删除模板"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="p-1.5 text-primary">
                              <Check size={16} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-2">
                      <div className="text-muted-foreground text-sm">暂无匹配模板</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      模板名称
                    </label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="如：每日复盘、项目周报..."
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      className="w-full bg-accent/30 border border-border/40 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[11px] text-primary/70 leading-relaxed">
                    将当前笔记的内容（含文本、布局、贴纸等）保存到模板库，方便后续一键创建。
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/40 bg-accent/5 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                取消
              </button>
              {mode === 'save' && (
                <button
                  disabled={!newName.trim()}
                  onClick={handleSave}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  保存模板
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
