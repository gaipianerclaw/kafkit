/**
 * NewTabDialog - Dialog for creating new consumer/producer tabs
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Send, X } from 'lucide-react';
import { useTabStore, useConnectionStore } from '../../stores';
import { useTranslation } from 'react-i18next';

interface NewTabDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewTabDialog({ isOpen, onClose }: NewTabDialogProps) {
  const { t } = useTranslation();
  void t; // Will be used for i18n in the future
  const navigate = useNavigate();
  const { addTab } = useTabStore();
  const { activeConnection, connections } = useConnectionStore();
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<'consumer' | 'producer'>('consumer');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const activeConn = connections.find(c => c.id === activeConnection);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!topic.trim()) {
      setError('请输入 Topic 名称');
      return;
    }

    if (!activeConnection) {
      setError('请先选择连接');
      return;
    }

    // Add new tab
    addTab(type, topic.trim(), activeConnection);
    
    // Reset and close
    setTopic('');
    onClose();
  };

  const handleBrowseTopics = () => {
    onClose();
    navigate('/main/topics');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-[400px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-medium">新建标签页</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">类型</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('consumer')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  type === 'consumer'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <Radio className="w-4 h-4" />
                消费者
              </button>
              <button
                type="button"
                onClick={() => setType('producer')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  type === 'producer'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <Send className="w-4 h-4" />
                生产者
              </button>
            </div>
          </div>

          {/* Connection Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium">连接</label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              {activeConn ? (
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeConn.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {activeConn.name}
                </span>
              ) : (
                <span className="text-muted-foreground">未选择连接</span>
              )}
            </div>
          </div>

          {/* Topic Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入 Topic 名称"
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBrowseTopics}
              className="text-sm text-primary hover:underline"
            >
              浏览 Topic 列表 →
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
