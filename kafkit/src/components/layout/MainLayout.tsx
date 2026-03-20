import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  List, 
  Users, 
  Settings, 
  Plus,
  ChevronDown,
  Server
} from 'lucide-react';
import { useConnectionStore } from '../../stores';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function MainLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { connections, activeConnection, fetchConnections, setActiveConnection } = useConnectionStore();
  const [showConnectionMenu, setShowConnectionMenu] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const activeConn = connections.find(c => c.id === activeConnection);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 h-screen border-r border-border bg-card flex flex-col flex-shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border">
          <img src="/logo.png" alt="Kafkit" className="w-8 h-8 mr-2 rounded-lg" />
          <span className="font-semibold text-lg">Kafkit</span>
        </div>

        {/* Connection Selector */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <button
              onClick={() => setShowConnectionMenu(!showConnectionMenu)}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center min-w-0">
                <Server className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {activeConn ? activeConn.name : t('connections.selectConnection')}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            </button>

            {showConnectionMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
                {connections.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => {
                      setActiveConnection(conn.id);
                      setShowConnectionMenu(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted transition-colors ${
                      activeConnection === conn.id ? 'bg-muted' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      conn.isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="truncate">{conn.name}</span>
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => {
                    navigate('/main/connections/new');
                    setShowConnectionMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-primary hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('connections.new')}
                </button>
                <button
                  onClick={() => {
                    navigate('/main/connections');
                    setShowConnectionMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t('connections.title')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLink
            to="/main/topics"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <List className="w-4 h-4 mr-3" />
            {t('nav.topics')}
          </NavLink>
          <NavLink
            to="/main/groups"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Users className="w-4 h-4 mr-3" />
            {t('nav.consumerGroups')}
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <NavLink
            to="/main/settings"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Settings className="w-4 h-4 mr-3" />
            {t('nav.settings')}
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
