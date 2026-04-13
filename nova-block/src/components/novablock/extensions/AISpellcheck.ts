import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { api } from '../../../lib/api';

const spellcheckPluginKey = new PluginKey('ai-spellcheck-plugin');

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
      async runCheck(view: any, text: string) {
        if (this.isChecking) return;
        this.isChecking = true;
        try {
          const result = await api.spellcheck(text);
          const errors = result.errors || [];
          
          const mappedErrors: any[] = [];
          const decorations: Decoration[] = [];
          
          // Re-find the node in current document state to get latest position
          const { tr } = view.state;
          let latestStartPos = -1;
          
          view.state.doc.descendants((node: any, pos: number) => {
            if (node.isBlock && node.textContent === text) {
              latestStartPos = pos;
              return false;
            }
          });
          
          if (latestStartPos === -1) return;

          errors.forEach(err => {
            // Use the offset directly from the backend
            const from = latestStartPos + 1 + err.offset;
            const to = from + err.word.length;
            
            // Validate that the word at this position matches (safety check)
            const wordAtPos = text.substring(err.offset, err.offset + err.word.length);
            if (wordAtPos === err.word) {
              mappedErrors.push({ ...err, from, to });
              decorations.push(
                Decoration.inline(from, to, {
                  class: 'ai-spellcheck-error',
                  style: 'text-decoration: underline wavy red; cursor: pointer; background: rgba(255,0,0,0.05);',
                })
              );
            }
          });
          
          this.errors = mappedErrors;
          
          // Dispatch transaction to update decorations
          const dispatchTr = view.state.tr;
          dispatchTr.setMeta(spellcheckPluginKey, { 
            type: 'setDecorations', 
            decorations: DecorationSet.create(dispatchTr.doc, decorations) 
          });
          view.dispatch(dispatchTr);
          
        } catch (e) {
          console.error('Spellcheck failed:', e);
        } finally {
          this.isChecking = false;
        }
      }
    };
  },

  addProseMirrorPlugins() {
    const { editor, options, storage } = this;
    let debounceTimer: any = null;

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
            compositionend: (view, event) => {
              // Trigger spellcheck immediately when Chinese input method completion
              const { selection } = view.state;
              const node = selection.$from.parent;
              
              if (node.type.name === 'paragraph' && node.textContent.trim().length > 0) {
                // We use a small delay to let the DOM update before reading content
                setTimeout(() => {
                  this.storage.runCheck(view, node.textContent);
                }, 100);
              }
              return false;
            },
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
                const rect = (event.target as HTMLElement).getBoundingClientRect();
                
                // Dispatch event instead of window.confirm
                window.dispatchEvent(new CustomEvent('open-spellcheck-suggestion', {
                  detail: {
                    error,
                    rect: {
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height
                    }
                  }
                }));
                return true;
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
                const { state } = view;
                const node = state.selection.$from.parent;
                
                // Only check if it's a paragraph and has content
                if (node.type.name !== 'paragraph' || node.textContent.trim().length === 0) return;
                
                await storage.runCheck(view, node.textContent);
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
