import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { api } from '../../../lib/api';

export interface AISpellcheckOptions {
  debounceMs: number;
}

export const AISpellcheck = Extension.create<AISpellcheckOptions>({
  name: 'aiSpellcheck',

  addOptions() {
    return {
      debounceMs: 800,
    };
  },

  addStorage() {
    return {
      errors: [] as Array<{ word: string; suggestion: string; reason: string; from: number; to: number }>,
      isChecking: false,
    };
  },

  addProseMirrorPlugins() {
    const { editor, options, storage } = this;
    let debounceTimer: any = null;

    const spellcheckPluginKey = new PluginKey('ai-spellcheck-plugin');

    return [
      new Plugin({
        key: spellcheckPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            // Map decorations through transactions (e.g. typing)
            let set = oldSet.map(tr.mapping, tr.doc);
            
            // Handle custom action to set new decorations
            const action = tr.getMeta(spellcheckPluginKey);
            if (action && action.type === 'setDecorations') {
              return action.decorations;
            }
            
            return set;
          },
        },
        props: {
          decorations(state) {
            return spellcheckPluginKey.getState(state);
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) return false;
              
              const errors = storage.errors;
              const error = errors.find(e => pos.pos >= e.from && pos.pos <= e.to);
              
              if (error) {
                // Simplified: use browser title for tooltip
                (event.target as HTMLElement).title = `Suggestion: ${error.suggestion} (${error.reason})`;
              }
              return false;
            },
            click: (view, event) => {
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) return false;
              
              const errors = storage.errors;
              const errorIdx = errors.findIndex(e => pos.pos >= e.from && pos.pos <= e.to);
              
              if (errorIdx !== -1) {
                const error = errors[errorIdx];
                if (window.confirm(`Correct "${error.word}" to "${error.suggestion}"?\nReason: ${error.reason}`)) {
                  const { tr } = view.state;
                  tr.insertText(error.suggestion, error.from, error.to);
                  
                  // Clear this specific error
                  storage.errors.splice(errorIdx, 1);
                  
                  // Re-render decorations
                  const newDecos = storage.errors.map(e => 
                    Decoration.inline(e.from, e.to, {
                      class: 'ai-spellcheck-error',
                      style: 'text-decoration: underline wavy red; cursor: pointer;',
                    })
                  );
                  tr.setMeta(spellcheckPluginKey, { 
                    type: 'setDecorations', 
                    decorations: DecorationSet.create(tr.doc, newDecos) 
                  });
                  
                  view.dispatch(tr);
                  return true;
                }
              }
              return false;
            }
          }
        },
        view(editorView) {
          return {
            update: (view, prevState) => {
              const docChanged = !view.state.doc.eq(prevState.doc);
              if (!docChanged) return;

              if (debounceTimer) clearTimeout(debounceTimer);
              
              debounceTimer = setTimeout(async () => {
                const { selection } = view.state;
                const $pos = selection.$from;
                const node = $pos.parent;
                
                // Only check if it's a paragraph and has content
                if (node.type.name !== 'paragraph' || !node.textContent.trim()) return;
                
                const startPos = $pos.before();
                const text = node.textContent;
                
                storage.isChecking = true;
                try {
                  const result = await api.spellcheck(text);
                  const errors = result.errors || [];
                  
                  const mappedErrors: any[] = [];
                  const decorations: Decoration[] = [];
                  
                  errors.forEach(err => {
                    const index = text.indexOf(err.word);
                    if (index !== -1) {
                      const from = startPos + 1 + index;
                      const to = from + err.word.length;
                      
                      mappedErrors.push({ ...err, from, to });
                      decorations.push(
                        Decoration.inline(from, to, {
                          class: 'ai-spellcheck-error',
                          style: 'text-decoration: underline wavy red; cursor: pointer;',
                        })
                      );
                    }
                  });
                  
                  storage.errors = mappedErrors;
                  
                  // Dispatch transaction to update decorations
                  const tr = view.state.tr;
                  tr.setMeta(spellcheckPluginKey, { 
                    type: 'setDecorations', 
                    decorations: DecorationSet.create(tr.doc, decorations) 
                  });
                  view.dispatch(tr);
                  
                } catch (e) {
                  console.error('Spellcheck failed:', e);
                } finally {
                  storage.isChecking = false;
                }
              }, options.debounceMs);
            },
            destroy: () => {
              if (debounceTimer) clearTimeout(debounceTimer);
            }
          };
        }
      }),
    ];
  },
});
