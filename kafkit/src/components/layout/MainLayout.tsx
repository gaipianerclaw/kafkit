import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home,
  Users, 
  Settings
} from 'lucide-react';
import { useConnectionStore, useTabStore } from '../../stores';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import { QuickSearch } from '../QuickSearch';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { TabBar } from '../TabBar';
import { TabContent } from '../TabBar/TabContent';
import { NewTabDialog } from '../TabBar/NewTabDialog';
import { TopicPanel } from '../TopicPanel';
import { TopicDetailView } from '../TopicDetailView';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeConnection, fetchConnections } = useConnectionStore();
  const { tabs, activeTabId, activateTab } = useTabStore();
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);
  const [isTopicPanelOpen, setIsTopicPanelOpen] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  // When there is an active tab, show tab content, otherwise show topic panel workspace
  const hasActiveTab = activeTabId !== null && tabs.length > 0;
  
  // Check current route
  const isHomeRoute = location.pathname === '/main' || location.pathname === '/main/';
  const isGroupsRoute = location.pathname === '/main/groups';
  const isSettingsRoute = location.pathname === '/main/settings';
  const isConnectionsRoute = location.pathname.startsWith('/main/connections');
  const isTopicsRoute = location.pathname === '/main/topics';

  // Global keyboard shortcuts
  const handleRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent('kafkit:refresh'));
  }, []);

  const handleQuickSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('kafkit:quickSearch'));
  }, []);

  useKeyboardShortcuts([
    { key: 'r', ctrl: true, handler: handleRefresh, description: 'Refresh' },
    { key: 'k', ctrl: true, handler: handleQuickSearch, description: 'Quick search' },
  ]);

  // Handle sidebar navigation - deactivate tab to show workspace
  const handleNavClick = useCallback((path: string) => {
    activateTab(null);
    setSelectedTopic(null);
    navigate(path);
  }, [activateTab, navigate]);

  // Handle topic selection
  const handleSelectTopic = useCallback((topic: string) => {
    setSelectedTopic(topic);
    // Deactivate any active tab to show the topic detail
    activateTab(null);
  }, [activateTab]);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Navigation only */}
      <aside className="w-16 h-screen border-r border-border bg-card flex flex-col flex-shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-border">
          <img src="/logo.png" alt="Kafkit" className="w-8 h-8 rounded-lg" />
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 py-3 space-y-2 overflow-y-auto">
          {/* Home */}
          <button
            onClick={() => handleNavClick('/main/topics')}
            className={`w-full flex items-center justify-center py-3 transition-colors ${
              isTopicsRoute || isHomeRoute
                ? 'text-primary bg-primary/10 border-r-2 border-r-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Topic 管理"
          >
            <Home className="w-5 h-5" />
          </button>
          
          {/* Groups */}
          <button
            onClick={() => handleNavClick('/main/groups')}
            className={`w-full flex items-center justify-center py-3 transition-colors ${
              isGroupsRoute
                ? 'text-primary bg-primary/10 border-r-2 border-r-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={t('nav.consumerGroups')}
          >
            <Users className="w-5 h-5" />
          </button>
        </nav>

        {/* Footer - Settings */}
        <div className="py-3 border-t border-border">
          <button
            onClick={() => handleNavClick('/main/settings')}
            className={`w-full flex items-center justify-center py-3 transition-colors ${
              isSettingsRoute
                ? 'text-primary bg-primary/10 border-r-2 border-r-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={t('nav.settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Topic Panel - Second column */}
      <TopicPanel 
        isOpen={isTopicPanelOpen} 
        onToggle={() => setIsTopicPanelOpen(!isTopicPanelOpen)}
        selectedTopic={selectedTopic}
        onSelectTopic={handleSelectTopic}
      />

      {/* Main Workspace - Third column */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Tab Bar */}
        {tabs.length > 0 && (
          <TabBar onNewTab={() => setShowNewTabDialog(true)} />
        )}
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden h-full flex flex-col">
          {hasActiveTab ? (
            <TabContent />
          ) : selectedTopic ? (
            <TopicDetailView topicName={selectedTopic} />
          ) : (
            <div className="w-full h-full p-4">
              {/* Default workspace view when no active tab */}
              {isGroupsRoute ? (
                <div>消费组页面（待实现）</div>
              ) : isSettingsRoute ? (
                <div>设置页面（待实现）</div>
              ) : isConnectionsRoute ? (
                <div>连接管理页面（待实现）</div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Home className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg mb-2">欢迎使用 Kafkit</p>
                  <p className="text-sm">
                    {activeConnection 
                      ? '在左侧 Topic 面板中选择一个 Topic 查看详情' 
                      : '请先选择一个 Kafka 连接'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* New Tab Dialog */}
      <NewTabDialog 
        isOpen={showNewTabDialog} 
        onClose={() => setShowNewTabDialog(false)} 
      />
      
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp />
      
      {/* Quick Search */}
      <QuickSearch />
    </div>
  );
}
