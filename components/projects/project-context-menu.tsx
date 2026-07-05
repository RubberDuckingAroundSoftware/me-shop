'use client';

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownItem } from '@/components/ui/dropdown-menu';

export interface ProjectContextMenuProps {
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectContextMenu({
  onRename,
  onDelete,
}: ProjectContextMenuProps) {
  return (
    <DropdownMenu
      aria-label="Project actions"
      triggerClassName="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
      trigger={<MoreHorizontal className="h-4 w-4" />}
    >
      <DropdownItem onSelect={onRename} icon={<Pencil className="h-4 w-4" />}>
        Rename
      </DropdownItem>
      <DropdownItem
        onSelect={onDelete}
        danger
        icon={<Trash2 className="h-4 w-4" />}
      >
        Delete
      </DropdownItem>
    </DropdownMenu>
  );
}
