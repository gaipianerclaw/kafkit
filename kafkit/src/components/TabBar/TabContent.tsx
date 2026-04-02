/**
 * TabContent - Render all tabs with Keep-Alive
 * This preserves component state when switching between tabs
 * 
 * Note: We use visibility:hidden instead of display:none for inactive tabs
 * to ensure virtual scrolling works correctly (it needs visible dimensions)
 */
import { useTabStore } from '../../stores';
import { ConsumerPage } from '../../pages/Consumer/ConsumerPage';
import { ProducerPage } from '../../pages/Producer/ProducerPage';
import { TopicPreview } from '../../pages/TopicPreview';

export function TabContent() {
  const { tabs, activeTabId } = useTabStore();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">没有打开的标签页</p>
          <p className="text-sm">在左侧 Topic 面板中选择一个 Topic 开始</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        
        return (
          <div
            key={tab.id}
            style={{ 
              width: '100%', 
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              visibility: isActive ? 'visible' : 'hidden',
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex: isActive ? 1 : 0
            }}
          >
            {tab.type === 'topic-preview' ? (
              <TopicPreview
                tabId={tab.id}
                topic={tab.topic}
                connectionId={tab.connectionId}
              />
            ) : tab.type === 'consumer' ? (
              <ConsumerPage
                tabId={tab.id}
                topic={tab.topic}
                connectionId={tab.connectionId}
                isActive={isActive}
              />
            ) : (
              <ProducerPage
                tabId={tab.id}
                topic={tab.topic}
                connectionId={tab.connectionId}
                isActive={isActive}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
