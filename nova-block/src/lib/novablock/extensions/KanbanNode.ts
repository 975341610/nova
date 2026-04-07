import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { KanbanComponent } from '../../../components/widgets/KanbanComponent';

export const KanbanNode = Node.create({
  name: 'kanban',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      columns: {
        default: [
          { title: '待办', tasks: [{ id: '1', content: '写日记', completed: false }] },
          { title: '进行中', tasks: [] },
          { title: '已完成', tasks: [] },
        ],
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="kanban"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'kanban' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KanbanComponent);
  },
});
