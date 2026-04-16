import { ReactRenderer } from '@tiptap/react';
import tippy, { sticky } from 'tippy.js';
import { SlashMenu, type SlashItem } from './SlashMenu';

export const getSuggestionConfig = (itemsRef: React.MutableRefObject<SlashItem[]>, isAiEnabled: boolean = true) => ({
  items: ({ query }: { query: string }) => {
    const items = itemsRef.current;
    const filtered = items.filter(item => {
      // AI 过滤逻辑
      if (item.requiresAI && !isAiEnabled) return false;

      const q = query.toLowerCase();
      return item.label.toLowerCase().includes(q) || item.keywords.some(k => k.toLowerCase().includes(q));
    });
    return filtered.slice(0, 50);
  },

  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashMenu, {
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
          theme: 'slash-menu',
          arrow: false,
          hideOnClick: false,
          zIndex: 120, // 确保高于拖拽手柄
          sticky: true,
          plugins: [sticky],
        });

        return { popup };
      },

      onUpdate(props: any) {
        component.updateProps(props);

        // 如果 props.clientRect 存在，则更新 popup 位置
        if (props.clientRect) {
          // 增加健壮性检查：确保 popup 存在且 [0] 索引有效
          const tippyInstance = Array.isArray(popup) ? popup[0] : popup;
          
          if (!tippyInstance) {
            // 如果由于某种原因 popup 未创建，重新创建它
            popup = tippy('body', {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              theme: 'slash-menu',
              arrow: false,
              hideOnClick: false,
              zIndex: 120,
              sticky: true,
              plugins: [sticky],
            });
            return;
          }
          
          tippyInstance.setProps({
            getReferenceClientRect: props.clientRect,
          });
        }
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          if (popup && popup[0]) {
            popup[0].hide();
          }
          return true;
        }

        return component?.ref?.onKeyDown(props);
      },

      onExit() {
        if (popup && popup[0]) {
          popup[0].destroy();
        }
        if (component) {
          component.destroy();
        }
        popup = null;
        component = null;
      },
    };
  },
});
