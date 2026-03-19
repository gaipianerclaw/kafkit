import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Server, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConnectionStore } from '../../stores';
import { useTranslation } from 'react-i18next';

export function ConnectionListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { connections, fetchConnections, deleteConnection, setActiveConnection } = useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(t('connections.deleteConfirm', { name }))) {
      try {
        await deleteConnection(id);
      } catch (error) {
        alert(t('common.delete') + ': ' + (error instanceof Error ? error.message : t('common.unknownError')));
      }
    }
  };

  const handleConnect = (id: string) => {
    setActiveConnection(id);
    navigate('/main/topics');
  };

  const getAuthTypeLabel = (authType: string) => {
    switch (authType) {
      case 'none': return t('topics.authTypeNone') || '无认证';
      case 'saslPlain': return 'SASL/PLAIN';
      case 'saslScram': return 'SASL/SCRAM';
      case 'saslGssapi': return 'SASL/GSSAPI';
      case 'ssl': return 'SSL';
      default: return authType;
    }
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
              <h1 className="text-2xl font-bold">{t('connections.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('connections.manageDesc') || 'Manage Kafka cluster connections'}</p>
            </div>
          </div>
          <Button onClick={() => navigate('/main/connections/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('connections.new')}
          </Button>
        </div>

        {/* Connection List */}
        {connections.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('connections.noConnections')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('connections.createFirst') || 'Create your first Kafka connection'}</p>
            <Button onClick={() => navigate('/main/connections/new')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('connections.new')}
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
                      {getAuthTypeLabel(conn.authType)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConnect(conn.id)}
                  >
                    {t('connections.connect') || 'Connect'}
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
