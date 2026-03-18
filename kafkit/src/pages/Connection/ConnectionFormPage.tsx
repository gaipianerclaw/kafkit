import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';
import type { ConnectionConfig, AuthConfig, SecurityConfig } from '../../types';

const authTypeOptions = [
  { value: 'none', label: '无认证 (PLAINTEXT)' },
  { value: 'saslPlain', label: 'SASL/PLAIN' },
  { value: 'saslScram', label: 'SASL/SCRAM' },
  { value: 'saslGssapi', label: 'SASL/GSSAPI (Kerberos)' },
  { value: 'ssl', label: 'SSL/TLS' },
];

const protocolOptions = [
  { value: 'PLAINTEXT', label: 'PLAINTEXT' },
  { value: 'SSL', label: 'SSL' },
  { value: 'SASL_PLAINTEXT', label: 'SASL_PLAINTEXT' },
  { value: 'SASL_SSL', label: 'SASL_SSL' },
];

const scramMechanismOptions = [
  { value: 'SCRAM-SHA-256', label: 'SCRAM-SHA-256' },
  { value: 'SCRAM-SHA-512', label: 'SCRAM-SHA-512' },
];

export function ConnectionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const { createConnection, updateConnection, testConnection } = useConnectionStore();
  


  const [formData, setFormData] = useState<ConnectionConfig>({
    name: '',
    bootstrapServers: '',
    auth: { type: 'none' },
    security: { protocol: 'PLAINTEXT' },
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      loadConnection(id);
    }
  }, [id]);

  const loadConnection = async (_connId: string) => {
    try {
      // 这里应该从 API 获取，暂时使用简化方式
      alert('编辑功能需要在桌面端运行');
      navigate('/main/connections');
      // setFormData...
    } catch (error) {
      alert('加载连接失败');
      navigate('/main/connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(formData);
      setTestResult({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id) {
        await updateConnection(id, formData);
      } else {
        await createConnection(formData);
      }
      navigate('/main/connections');
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const updateAuth = (updates: Partial<AuthConfig>) => {
    setFormData(prev => {
      const newAuth = { ...prev.auth, ...updates };
      return {
        ...prev,
        auth: newAuth as AuthConfig,
      };
    });
  };

  const renderAuthFields = () => {
    const { auth } = formData;

    switch (auth.type) {
      case 'saslPlain':
        return (
          <>
            <Input
              label="用户名"
              value={(auth as { username?: string }).username || ''}
              onChange={e => updateAuth({ username: e.target.value })}
              placeholder="username"
            />
            <Input
              label="密码"
              type="password"
              value={(auth as { password?: string }).password || ''}
              onChange={e => updateAuth({ password: e.target.value })}
              placeholder="password"
            />
          </>
        );

      case 'saslScram':
        return (
          <>
            <Select
              label="SCRAM 机制"
              value={(auth as { mechanism?: string }).mechanism || 'SCRAM-SHA-256'}
              onChange={e => updateAuth({ mechanism: e.target.value as 'SCRAM-SHA-256' | 'SCRAM-SHA-512' })}
              options={scramMechanismOptions}
            />
            <Input
              label="用户名"
              value={(auth as { username?: string }).username || ''}
              onChange={e => updateAuth({ username: e.target.value })}
              placeholder="username"
            />
            <Input
              label="密码"
              type="password"
              value={(auth as { password?: string }).password || ''}
              onChange={e => updateAuth({ password: e.target.value })}
              placeholder="password"
            />
          </>
        );

      case 'saslGssapi':
        return (
          <>
            <Input
              label="Principal"
              value={(auth as { principal?: string }).principal || ''}
              onChange={e => updateAuth({ principal: e.target.value })}
              placeholder="kafka/user@EXAMPLE.COM"
            />
            <Input
              label="Keytab 路径 (可选)"
              value={(auth as { keytabPath?: string }).keytabPath || ''}
              onChange={e => updateAuth({ keytabPath: e.target.value })}
              placeholder="/path/to/keytab"
            />
            <Input
              label="Service Name"
              value={(auth as { serviceName?: string }).serviceName || 'kafka'}
              onChange={e => updateAuth({ serviceName: e.target.value })}
              placeholder="kafka"
            />
          </>
        );

      case 'ssl':
        return (
          <>
            <Input
              label="CA 证书路径 (可选)"
              value={(auth as { caCert?: string }).caCert || ''}
              onChange={e => updateAuth({ caCert: e.target.value })}
              placeholder="/path/to/ca.crt"
            />
            <Input
              label="客户端证书路径 (可选)"
              value={(auth as { clientCert?: string }).clientCert || ''}
              onChange={e => updateAuth({ clientCert: e.target.value })}
              placeholder="/path/to/client.crt"
            />
            <Input
              label="客户端密钥路径 (可选)"
              value={(auth as { clientKey?: string }).clientKey || ''}
              onChange={e => updateAuth({ clientKey: e.target.value })}
              placeholder="/path/to/client.key"
            />
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/main/connections')} className="mr-4">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? '编辑连接' : '新建连接'}</h1>
            <p className="text-sm text-muted-foreground">配置 Kafka 集群连接</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium mb-4">基本信息</h2>
            
            <Input
              label="连接名称"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Production Cluster"
            />

            <Input
              label="Bootstrap Servers"
              required
              value={formData.bootstrapServers}
              onChange={e => setFormData(prev => ({ ...prev, bootstrapServers: e.target.value }))}
              placeholder="localhost:9092,localhost:9093"
            />
            <p className="text-xs text-muted-foreground">
              多个地址用逗号分隔，格式：host:port
            </p>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium mb-4">安全设置</h2>

            <Select
              label="安全协议"
              value={formData.security.protocol}
              onChange={e => setFormData(prev => ({
                ...prev,
                security: { ...prev.security, protocol: e.target.value as SecurityConfig['protocol'] }
              }))}
              options={protocolOptions}
            />

            <Select
              label="认证方式"
              value={formData.auth.type}
              onChange={e => {
                const authType = e.target.value;
                let newAuth: AuthConfig;
                switch (authType) {
                  case 'saslPlain':
                    newAuth = { type: 'saslPlain', username: '', password: '' };
                    break;
                  case 'saslScram':
                    newAuth = { type: 'saslScram', mechanism: 'SCRAM-SHA-256', username: '', password: '' };
                    break;
                  case 'saslGssapi':
                    newAuth = { type: 'saslGssapi', principal: '', serviceName: 'kafka' };
                    break;
                  case 'ssl':
                    newAuth = { type: 'ssl' };
                    break;
                  default:
                    newAuth = { type: 'none' };
                }
                setFormData(prev => ({ ...prev, auth: newAuth }));
              }}
              options={authTypeOptions}
            />

            {renderAuthFields()}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.success ? (
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{testResult.success ? '连接成功' : '连接失败'}</p>
                <p className="text-sm mt-1">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleTest} isLoading={testing}>
              测试连接
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => navigate('/main/connections')}>
              取消
            </Button>
            <Button type="submit" isLoading={saving}>
              {isEdit ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
