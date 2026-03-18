import { useNavigate } from 'react-router-dom';
import { Database, Plus, Settings } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';
import { useEffect } from 'react';

export function WelcomePage() {
  const navigate = useNavigate();
  const { connections, fetchConnections, setActiveConnection } = useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnect = (id: string) => {
    setActiveConnection(id);
    navigate('/main/topics');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Database className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-3">Kafkit</h1>
        <p className="text-lg text-muted-foreground">跨平台 Kafka 桌面客户端</p>
      </div>

      {connections.length > 0 ? (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            选择连接
          </h2>
          <div className="space-y-2">
            {connections.map((conn) => (
              <button
                key={conn.id}
                onClick={() => handleConnect(conn.id)}
                className="w-full flex items-center p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors text-left"
              >
                <div className={`w-3 h-3 rounded-full mr-4 ${
                  conn.isConnected ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{conn.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {conn.bootstrapServers.join(', ')}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="pt-4 flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/main/connections')}>
              <Settings className="w-4 h-4 mr-2" />
              管理连接
            </Button>
            <Button onClick={() => navigate('/main/connections/new')}>
              <Plus className="w-4 h-4 mr-2" />
              新建连接
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-muted-foreground mb-6">暂无连接配置</p>
          <Button size="lg" onClick={() => navigate('/main/connections/new')}>
            <Plus className="w-5 h-5 mr-2" />
            创建第一个连接
          </Button>
        </div>
      )}
    </div>
  );
}
