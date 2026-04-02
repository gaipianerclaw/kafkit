/**
 * TabItem - Individual tab component
 */
import { useState } from 'react';
import { X, Radio, Send, Eye } from 'lucide-react';
import { Tab, TabType } from '../../stores';

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  index: number;
}

const getTabIcon = (type: TabType) => {
  switch (type) {
    case 'topic-preview':
      return <Eye className="w-3 h-3" />;
    case 'consumer':
      return <Radio className="w-3 h-3" />;
    case 'producer':
      return <Send className="w-3 h-3" />;
    default:
      return null;
  }
};

const getTabColor = (type: TabType, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground';
  switch (type) {
    case 'topic-preview':
      return 'text-gray-600';
    case 'consumer':
      return 'text-blue-600';
    case 'producer':
      return 'text-green-600';
    default:
      return 'text-foreground';
  }
};

export function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  index
}: TabItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e, index);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, index);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={onContextMenu}
      onClick={onActivate}
      className={`
        group relative flex items-center gap-1.5 px-3 py-2 
        min-w-[120px] max-w-[200px] cursor-pointer select-none
        border-r border-border/50
        transition-colors duration-150
        ${isActive 
          ? 'bg-background text-foreground border-b-2 border-b-primary' 
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
        }
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'bg-primary/10' : ''}
      `}
    >
      {/* Tab Icon */}
      <span className={getTabColor(tab.type, isActive)}>
        {getTabIcon(tab.type)}
      </span>

      {/* Tab Title */}
      <span className="flex-1 truncate text-xs font-medium">
        {tab.title}
      </span>

      {/* Dirty Indicator */}
      {tab.isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      )}

      {/* Close Button */}
      <button
        onClick={handleClose}
        className={`
          p-0.5 rounded opacity-0 group-hover:opacity-100
          hover:bg-muted-foreground/20 transition-all
          ${isActive ? 'opacity-100' : ''}
        `}
        title="关闭标签页"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
