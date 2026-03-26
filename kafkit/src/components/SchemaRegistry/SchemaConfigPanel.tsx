import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Plus, Trash2, RefreshCw, FileCode } from 'lucide-react';
import { Button } from '../ui/Button';

interface SchemaRegistryConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
}

interface SchemaInfo {
  subject: string;
  versions: number[];
  latestVersion: number;
  schemaType: 'AVRO' | 'PROTOBUF' | 'JSON';
}

export function SchemaConfigPanel() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<SchemaRegistryConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // 加载已保存的配置
  useEffect(() => {
    const saved = localStorage.getItem('schema-registry-configs');
    if (saved) {
      try {
        setConfigs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load schema registry configs:', e);
      }
    }
  }, []);

  // 保存配置
  const saveConfigs = (newConfigs: SchemaRegistryConfig[]) => {
    setConfigs(newConfigs);
    localStorage.setItem('schema-registry-configs', JSON.stringify(newConfigs));
  };

  // 测试连接
  const testConnection = async (config: SchemaRegistryConfig): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.schemaregistry.v1+json',
      };
      
      if (config.username && config.password) {
        headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
      }

      const response = await fetch(`${config.url}/subjects`, {
        method: 'GET',
        headers,
      });

      return response.ok;
    } catch (e) {
      console.error('Schema Registry connection test failed:', e);
      return false;
    }
  };

  // 获取所有 schemas
  const fetchSchemas = async (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    setLoading(true);
    setSelectedConfig(configId);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.schemaregistry.v1+json',
      };
      
      if (config.username && config.password) {
        headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
      }

      // 获取所有 subjects
      const subjectsResponse = await fetch(`${config.url}/subjects`, { headers });
      if (!subjectsResponse.ok) throw new Error('Failed to fetch subjects');
      
      const subjects: string[] = await subjectsResponse.json();
      
      // 获取每个 subject 的详细信息
      const schemaInfos: SchemaInfo[] = [];
      
      for (const subject of subjects.slice(0, 50)) { // 限制数量避免过多请求
        try {
          const versionsResponse = await fetch(`${config.url}/subjects/${subject}/versions`, { headers });
          if (!versionsResponse.ok) continue;
          
          const versions: number[] = await versionsResponse.json();
          
          // 获取最新版本
          const latestResponse = await fetch(`${config.url}/subjects/${subject}/versions/latest`, { headers });
          if (!latestResponse.ok) continue;
          
          const latest = await latestResponse.json();
          
          schemaInfos.push({
            subject,
            versions,
            latestVersion: Math.max(...versions),
            schemaType: latest.schemaType || 'AVRO',
          });
        } catch (e) {
          console.warn(`Failed to fetch schema info for ${subject}:`, e);
        }
      }

      setSchemas(schemaInfos);
    } catch (e) {
      console.error('Failed to fetch schemas:', e);
      alert(t('schemaRegistry.fetchError', 'Failed to fetch schemas'));
    } finally {
      setLoading(false);
    }
  };

  // 添加新配置
  const addConfig = async (config: Omit<SchemaRegistryConfig, 'id'>) => {
    const newConfig: SchemaRegistryConfig = {
      ...config,
      id: Date.now().toString(),
    };

    // 测试连接
    const connected = await testConnection(newConfig);
    if (!connected) {
      alert(t('schemaRegistry.connectionFailed', 'Connection failed. Please check URL and credentials.'));
      return false;
    }

    saveConfigs([...configs, newConfig]);
    setShowAddDialog(false);
    return true;
  };

  // 删除配置
  const deleteConfig = (id: string) => {
    if (confirm(t('schemaRegistry.confirmDelete', 'Are you sure you want to delete this configuration?'))) {
      saveConfigs(configs.filter(c => c.id !== id));
      if (selectedConfig === id) {
        setSelectedConfig(null);
        setSchemas([]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 配置列表 */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Database className="w-5 h-5" />
          {t('schemaRegistry.title', 'Schema Registry')}
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          {t('schemaRegistry.add', 'Add')}
        </Button>
      </div>

      {configs.length === 0 ? (
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded text-center">
          {t('schemaRegistry.noConfigs', 'No Schema Registry configurations. Click "Add" to create one.')}
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map(config => (
            <div
              key={config.id}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedConfig === config.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => fetchSchemas(config.id)}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{config.name}</div>
                  <div className="text-xs text-muted-foreground">{config.url}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConfig === config.id && loading && (
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConfig(config.id);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schema 列表 */}
      {selectedConfig && schemas.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            {t('schemaRegistry.schemas', 'Schemas')} ({schemas.length})
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('schemaRegistry.subject', 'Subject')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('schemaRegistry.type', 'Type')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('schemaRegistry.versions', 'Versions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schemas.map(schema => (
                  <tr key={schema.subject} className="hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono text-xs">{schema.subject}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        schema.schemaType === 'AVRO'
                          ? 'bg-orange-100 text-orange-700'
                          : schema.schemaType === 'PROTOBUF'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {schema.schemaType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {schema.latestVersion} {t('schemaRegistry.latest', 'latest')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 添加配置对话框 */}
      {showAddDialog && (
        <AddSchemaRegistryDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={addConfig}
        />
      )}
    </div>
  );
}

// 添加配置对话框
function AddSchemaRegistryDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (config: Omit<SchemaRegistryConfig, 'id'>) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
  });
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    const success = await onAdd(form);
    setTesting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-[500px] max-w-[90vw] shadow-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-medium">{t('schemaRegistry.addTitle', 'Add Schema Registry')}</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">
              {t('schemaRegistry.nameLabel', 'Name')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={t('schemaRegistry.namePlaceholder', 'My Schema Registry')}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
              required
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground block mb-1.5">
              {t('schemaRegistry.urlLabel', 'URL')}
            </label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="http://localhost:8081"
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">
                {t('schemaRegistry.usernameLabel', 'Username (optional)')}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">
                {t('schemaRegistry.passwordLabel', 'Password (optional)')}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={testing}>
              {t('schemaRegistry.testAndAdd', 'Test & Add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
