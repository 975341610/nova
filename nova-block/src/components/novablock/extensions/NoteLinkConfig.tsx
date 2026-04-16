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

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(NoteLinkSuggestion, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

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
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return component.ref?.onKeyDown(props);
      },

      onExit() {
        if (popup && popup.length > 0) {
          popup[0].destroy();
        }
        if (component) {
          component.destroy();
        }
      },
    };
  },
});
