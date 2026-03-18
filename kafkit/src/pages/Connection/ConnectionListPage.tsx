import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Server, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';

export function ConnectionListPage() {
  const navigate = useNavigate();
  const { connections, fetchConnections, deleteConnection, setActiveConnection } = useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除连接 "${name}" 吗？`)) {
      try {
        await deleteConnection(id);
      } catch (error) {
        alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  const handleConnect = (id: string) => {
    setActiveConnection(id);
    navigate('/main/topics');
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mr-4">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">连接管理</h1>
              <p className="text-sm text-muted-foreground">管理 Kafka 集群连接</p>
            </div>
          </div>
          <Button onClick={() => navigate('/main/connections/new')}>
            <Plus className="w-4 h-4 mr-2" />
            新建连接
          </Button>
        </div>

        {/* Connection List */}
        {connections.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无连接</h3>
            <p className="text-sm text-muted-foreground mb-4">创建你的第一个 Kafka 连接</p>
            <Button onClick={() => navigate('/main/connections/new')}>
              <Plus className="w-4 h-4 mr-2" />
              新建连接
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full mr-4 flex-shrink-0 ${
                  conn.isConnected ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{conn.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {conn.bootstrapServers.join(', ')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                      {conn.authType === 'none' ? '无认证' : 
                       conn.authType === 'saslPlain' ? 'SASL/PLAIN' :
                       conn.authType === 'saslScram' ? 'SASL/SCRAM' :
                       conn.authType === 'saslGssapi' ? 'SASL/GSSAPI' :
                       conn.authType === 'ssl' ? 'SSL' : conn.authType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConnect(conn.id)}
                  >
                    连接
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/main/connections/${conn.id}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(conn.id, conn.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
