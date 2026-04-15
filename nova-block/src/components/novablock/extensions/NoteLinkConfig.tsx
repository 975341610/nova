import { ReactRenderer } from '@tiptap/react';
import tippy, { sticky } from 'tippy.js';
import { NoteLinkSuggestion } from './NoteLinkSuggestion';

export const getNoteLinkSuggestionConfig = () => ({
  items: ({ query }: { query: string }) => {
    try {
      // 🚀 核心优化：改用 window.novaNotes 全局同步获取已加载的所有笔记。
      // 彻底避开 api.listNotes() 的异步生命周期问题。
      const notes = (window as any).novaNotes || [];
      
      return notes
        .filter((note: any) => 
          !note.is_folder && // 链接时排除文件夹
          (note.title || '').toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10);
    } catch (error) {
      console.error('Failed to filter notes for suggestion:', error);
      return [];
    }
  },

  render: () => {
    let component: any;
    let popup: any;
    const getPopupInstance = () => {
      const instance = popup?.[0];

      if (!instance || instance.state?.isDestroyed) {
        return null;
      }

      return instance;
    };

    const ensurePopup = (props: any) => {
      if (!props.clientRect) {
        return null;
      }

      const existingInstance = getPopupInstance();

      if (!existingInstance) {
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'note-link-menu',
          arrow: false,
          sticky: true,
          zIndex: 99999, // Ensure it's above other elements
          plugins: [sticky],
        });
      }

      return getPopupInstance();
    };

    return {
      onStart: (props: any) => {
        if (!props.clientRect) {
          return;
        }

        component = new ReactRenderer(NoteLinkSuggestion, {
          props,
          editor: props.editor,
        });
        
        ensurePopup(props);
      },

      onUpdate(props: any) {
        if (!component || !component.element) return;
        
        component.updateProps(props);
        const instance = ensurePopup(props);
        
        if (!props.clientRect) {
          instance?.hide();
          return;
        }

        if (instance && !instance.state.isDestroyed) {
          instance.setProps({
            getReferenceClientRect: props.clientRect,
          });
        }
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          getPopupInstance()?.hide();
          return true;
        }

        if (!component || !component.ref) return false;
        return component.ref.onKeyDown(props);
      },

      onExit() {
        const instance = getPopupInstance();

        if (instance && !instance.state.isDestroyed) {
          instance.destroy();
        }

        popup = null;

        if (component) {
          try {
            component.destroy();
          } catch (e) {
            console.warn('NoteLinkSuggestion component destroy failed:', e);
          }
          component = null;
        }
      },
    };
  },
});
