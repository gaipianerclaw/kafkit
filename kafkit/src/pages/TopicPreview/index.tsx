/**
 * TopicPreview - Preview tab for viewing topic details and messages
 * Can be converted to consumer/producer tab
 */
import { useState } from 'react';
import { Eye, Download, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTabStore } from '../../stores';

interface TopicPreviewProps {
  tabId: string;
  topic: string;
  connectionId: string;
}

export function TopicPreview({ tabId, topic, connectionId }: TopicPreviewProps) {
  const { convertTab } = useTabStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');

  // 转换为消费者 tab
  const handleStartConsume = () => {
    convertTab(tabId, 'consumer');
  };

  // 转换为生产者 tab
  const handleStartProduce = () => {
    convertTab(tabId, 'producer');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{topic}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex items-center gap-1">
            <Eye className="w-3 h-3" />
            预览
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleStartConsume} className="gap-1">
            <Download className="w-4 h-4" />
            开始消费
          </Button>
          <Button variant="outline" size="sm" onClick={handleStartProduce} className="gap-1">
            <Send className="w-4 h-4" />
            发送消息
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="h-10 border-b border-border flex items-center px-4 gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`text-sm pb-2 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          概览
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`text-sm pb-2 border-b-2 transition-colors ${
            activeTab === 'messages'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          消息预览
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Basic Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Topic</p>
                <p className="text-lg font-semibold truncate">{topic}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">连接</p>
                <p className="text-lg font-semibold">{connectionId.slice(0, 8)}...</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">状态</p>
                <p className="text-lg font-semibold text-green-600">就绪</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">快速操作</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleStartConsume}>
                  <Download className="w-4 h-4 mr-2" />
                  开始消费消息
                </Button>
                <Button variant="outline" size="sm" onClick={handleStartProduce}>
                  <Send className="w-4 h-4 mr-2" />
                  发送测试消息
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">关于预览模式</h3>
              <p className="text-sm text-muted-foreground">
                预览模式允许您快速查看 Topic 信息。点击"开始消费"或"发送消息"按钮
                可将此标签页转换为消费者或生产者模式。
              </p>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="text-center text-muted-foreground py-12">
            <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>点击"开始消费"查看消息</p>
            <p className="text-sm mt-1">开始消费后将显示实时消息</p>
          </div>
        )}
      </div>
    </div>
  );
}
