import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, X, Hash, Users, Settings, Server, ArrowRight } from 'lucide-react';
import { useConnectionStore } from '../../stores';

interface SearchItem {
  id: string;
  type: 'topic' | 'nav' | 'action' | 'consumer-group';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export function QuickSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [topics, setTopics] = useState<Array<{ name: string; partitionCount: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeConnection, connections, setActiveConnection } = useConnectionStore();

  // 监听快速搜索事件
  useEffect(() => {
    const handleQuickSearch = () => {
      console.log('[QuickSearch] Opening...');
      setIsOpen(true);
      setQuery('');
      setSelectedIndex(0);
      loadTopics();
    };

    window.addEventListener('kafkit:quickSearch', handleQuickSearch);
    return () => window.removeEventListener('kafkit:quickSearch', handleQuickSearch);
  }, [activeConnection]);

  // 加载 topics
  const loadTopics = async () => {
    if (!activeConnection) return;
    try {
      const service = await import('../../services/tauriService');
      const data = await service.listTopics(activeConnection);
      setTopics(data.map((t: any) => ({ name: t.name, partitionCount: t.partitionCount })));
    } catch (e) {
      console.error('[QuickSearch] Failed to load topics:', e);
    }
  };

  // 构建搜索项
  const searchItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];

    // 导航项
    items.push(
      {
        id: 'nav-topics',
        type: 'nav',
        title: t('nav.topics'),
        subtitle: t('quickSearch.goToTopics', 'Go to Topic Management'),
        icon: <Hash className="w-5 h-5" />,
        action: () => { navigate('/main/topics'); setIsOpen(false); },
        keywords: ['topic', 'topics', '主题', '列表'],
      },
      {
        id: 'nav-groups',
        type: 'nav',
        title: t('nav.consumerGroups'),
        subtitle: t('quickSearch.goToGroups', 'Go to Consumer Groups'),
        icon: <Users className="w-5 h-5" />,
        action: () => { navigate('/main/groups'); setIsOpen(false); },
        keywords: ['group', 'consumer', '消费组', '消费者'],
      },
      {
        id: 'nav-settings',
        type: 'nav',
        title: t('nav.settings'),
        subtitle: t('quickSearch.goToSettings', 'Go to Settings'),
        icon: <Settings className="w-5 h-5" />,
        action: () => { navigate('/main/settings'); setIsOpen(false); },
        keywords: ['setting', 'settings', '设置'],
      },
      {
        id: 'nav-connections',
        type: 'nav',
        title: t('connections.title'),
        subtitle: t('quickSearch.goToConnections', 'Manage Connections'),
        icon: <Server className="w-5 h-5" />,
        action: () => { navigate('/main/connections'); setIsOpen(false); },
        keywords: ['connection', 'connections', '连接'],
      }
    );

    // Topic 项
    topics.forEach(topic => {
      items.push({
        id: `topic-${topic.name}`,
        type: 'topic',
        title: topic.name,
        subtitle: t('quickSearch.topicPartitions', { count: topic.partitionCount }),
        icon: <Hash className="w-5 h-5 text-primary" />,
        action: () => { 
          navigate(`/main/topics/${encodeURIComponent(topic.name)}`); 
          setIsOpen(false); 
        },
        keywords: ['topic', topic.name],
      });
    });

    // 连接项
    connections.forEach(conn => {
      items.push({
        id: `conn-${conn.id}`,
        type: 'action',
        title: conn.name,
        subtitle: t('quickSearch.switchConnection', 'Switch to this connection'),
        icon: <Server className={`w-5 h-5 ${conn.isConnected ? 'text-green-500' : 'text-gray-400'}`} />,
        action: () => { 
          setActiveConnection(conn.id); 
          setIsOpen(false); 
        },
        keywords: ['connection', conn.name],
      });
    });

    return items;
  }, [topics, connections, t, navigate, setActiveConnection]);

  // 过滤搜索项
  const filteredItems = useMemo(() => {
    if (!query.trim()) return searchItems.slice(0, 10);
    
    const q = query.toLowerCase();
    return searchItems.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle?.toLowerCase().includes(q)) return true;
      return item.keywords.some(k => k.toLowerCase().includes(q));
    }).slice(0, 20);
  }, [searchItems, query]);

  // 键盘导航
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
        break;
    }
  }, [isOpen, filteredItems, selectedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 重置选中项当过滤结果变化时
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-[20vh]">
      <div className="bg-card border border-border rounded-lg w-[600px] max-w-[90vw] shadow-2xl overflow-hidden">
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('quickSearch.placeholder', 'Search topics, navigate, or run commands...')}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">ESC</kbd>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('quickSearch.noResults', 'No results found')}
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === selectedIndex 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className={`flex-shrink-0 ${index === selectedIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className={`text-xs truncate ${index === selectedIndex ? 'text-primary/70' : 'text-muted-foreground'}`}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↑↓</kbd>
              {t('quickSearch.navigate', 'Navigate')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↵</kbd>
              {t('quickSearch.select', 'Select')}
            </span>
          </div>
          <span>{filteredItems.length} {t('quickSearch.results', 'results')}</span>
        </div>
      </div>
    </div>
  );
}
