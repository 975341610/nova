import { describe, it, expect } from 'vitest';
import type { FileTreeNode, Note } from '../../lib/types';

describe('Folder Tree Adapter Logic', () => {
  const mockFileTree: FileTreeNode[] = [
    {
      id: 'Folder A',
      name: 'Folder A',
      type: 'folder',
      children: [
        {
          id: 'Folder A/Note 1.md',
          name: 'Note 1',
          type: 'file',
          extension: '.md',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
    },
    {
      id: 'Note 2.md',
      name: 'Note 2',
      type: 'file',
      extension: '.md',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  it('should map FileTreeNode to Sidebar TreeNode format', () => {
    const mapNode = (node: FileTreeNode): any => ({
      id: node.id,
      title: node.name,
      isFolder: node.type === 'folder',
      children: node.children?.map(mapNode)
    });

    const sidebarTree = mockFileTree.map(mapNode);

    expect(sidebarTree).toHaveLength(2);
    expect(sidebarTree[0].id).toBe('Folder A');
    expect(sidebarTree[0].isFolder).toBe(true);
    expect(sidebarTree[0].children).toHaveLength(1);
    expect(sidebarTree[0].children[0].id).toBe('Folder A/Note 1.md');
    expect(sidebarTree[0].children[0].title).toBe('Note 1');
    expect(sidebarTree[0].children[0].isFolder).toBe(false);
  });

  it('should handle nested folders correctly', () => {
    const nestedTree: FileTreeNode[] = [
      {
        id: 'A',
        name: 'A',
        type: 'folder',
        children: [
          {
            id: 'A/B',
            name: 'B',
            type: 'folder',
            children: [
              { id: 'A/B/C.md', name: 'C', type: 'file' }
            ]
          }
        ]
      }
    ];

    const mapNode = (node: FileTreeNode): any => ({
      id: node.id,
      title: node.name,
      isFolder: node.type === 'folder',
      children: node.children?.map(mapNode)
    });

    const mapped = nestedTree.map(mapNode);
    expect(mapped[0].children[0].children[0].id).toBe('A/B/C.md');
  });
});
