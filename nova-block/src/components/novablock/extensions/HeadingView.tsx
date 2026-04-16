import React from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

export const HeadingView = ({ node, updateAttributes }: any) => {
  const { level, collapsed, id } = node.attrs;
  const isCollapsed = collapsed === true;

  const toggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateAttributes({ collapsed: !isCollapsed });
  };

  const CustomTag = `h${level}` as any;

  return (
    <NodeViewWrapper id={id} className={`group/heading relative mt-6 mb-2 flex items-center ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div 
        className={`shrink-0 w-8 h-8 z-[40] cursor-pointer transition-all duration-200 flex items-center justify-center mr-1
          ${isCollapsed ? 'opacity-100' : 'opacity-10 hover:opacity-100 group-hover/heading:opacity-100'}
        `}
        onClick={toggleCollapse}
        contentEditable={false}
        title={isCollapsed ? '展开' : '收起'}
      >
        <div className="p-1 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-700/50 flex items-center justify-center transition-colors">
          <svg 
            viewBox="0 0 24 24" 
            width="12" 
            height="12" 
            fill="currentColor"
            className={`text-stone-400 group-hover/heading:text-stone-600 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}
          >
            <path d="M9 6l6 6-6 6z" />
          </svg>
        </div>
      </div>
      <CustomTag className="flex-1">
        <NodeViewContent className="inline-block w-full" />
      </CustomTag>
    </NodeViewWrapper>
  );
};
