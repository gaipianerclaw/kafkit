import { useNavigate, useLocation, Outlet } from 'react-router-dom';
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
import { SettingsPage } from '../../pages/Settings/SettingsPage';
import { ConnectionListPage } from '../../pages/Connection/ConnectionListPage';
import { GroupListPage } from '../../pages/Groups/GroupListPage';


export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeConnection, fetchConnections } = useConnectionStore();
  const { tabs, activeTabId, activateTab, closeAllTabs } = useTabStore();
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);
  const [isTopicPanelOpen, setIsTopicPanelOpen] = useState(true);
  useEffect(() => {
    fetchConnections();
  }, []);

  // Clear all tabs when switching connections
  useEffect(() => {
    if (activeConnection) {
      closeAllTabs();
    }
  }, [activeConnection]);

  // When there is an active tab, show tab content, otherwise show topic panel workspace
  const hasActiveTab = activeTabId !== null && tabs.length > 0;
  
  // Check current route - exact match for list pages, exclude sub-routes
  const isHomeRoute = location.pathname === '/main' || location.pathname === '/main/';
  const isGroupsRoute = location.pathname === '/main/groups';
  const isSettingsRoute = location.pathname === '/main/settings';
  const isConnectionsRoute = location.pathname === '/main/connections';
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
    navigate(path);
  }, [activateTab, navigate]);

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
      />

      {/* Main Workspace - Third column */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Tab Bar */}
        {tabs.length > 0 && (
          <TabBar onNewTab={() => setShowNewTabDialog(true)} />
        )}
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden h-full flex flex-col relative">
          {/* Always render TabContent to preserve tab state, hide when no active tab */}
          <div className={hasActiveTab ? 'flex-1 flex flex-col' : 'hidden'}>
            <TabContent />
          </div>
          
          {/* Show page content when no active tab */}
          {!hasActiveTab && (
            <div className="absolute inset-0 w-full h-full bg-background z-10">
              {isGroupsRoute ? (
                <GroupListPage />
              ) : isSettingsRoute ? (
                <SettingsPage />
              ) : isConnectionsRoute ? (
                <ConnectionListPage />
              ) : isHomeRoute || isTopicsRoute ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Home className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg mb-2">欢迎使用 Kafkit</p>
                  <p className="text-sm">
                    {activeConnection 
                      ? '在左侧 Topic 面板中选择一个 Topic 开始' 
                      : '请先选择一个 Kafka 连接'}
                  </p>
                </div>
              ) : (
                /* Render child routes (e.g., /main/connections/new) */
                <Outlet />
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
