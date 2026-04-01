/**
 * TabContent - Render active tab content (Consumer or Producer)
 */
import { useTabStore } from '../../stores';
import { ConsumerPage } from '../../pages/Consumer/ConsumerPage';
import { ProducerPage } from '../../pages/Producer/ProducerPage';

export function TabContent() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">没有选择标签页</p>
          <p className="text-sm">点击 + 按钮新建消费者或生产者标签页</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {activeTab.type === 'consumer' ? (
        <ConsumerPage
          tabId={activeTab.id}
          topic={activeTab.topic}
          connectionId={activeTab.connectionId}
        />
      ) : (
        <ProducerPage
          tabId={activeTab.id}
          topic={activeTab.topic}
          connectionId={activeTab.connectionId}
        />
      )}
    </div>
  );
}
