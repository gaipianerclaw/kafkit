import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useConnectionStore } from '../../stores';
import { getConnection } from '../../services/tauriService';
import type { ConnectionConfig, AuthConfig, SecurityConfig } from '../../types';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
  const { createConnection, updateConnection, testConnection } = useConnectionStore();
  


  const [formData, setFormData] = useState<ConnectionConfig>({
    name: '',
    bootstrapServers: '',
    auth: { type: 'none' },
    security: { protocol: 'PLAINTEXT' },
    options: {},
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

  const loadConnection = async (connId: string) => {
    try {
      // 直接从 API 获取连接详情
      const connection = await getConnection(connId);
      
      // 加载连接数据到表单（bootstrapServers 从数组转换为逗号分隔的字符串）
      setFormData({
        name: connection.name,
        bootstrapServers: Array.isArray(connection.bootstrapServers) 
          ? connection.bootstrapServers.join(', ')
          : connection.bootstrapServers,
        auth: connection.auth || { type: 'none' },
        security: connection.security || { protocol: 'PLAINTEXT' },
        options: connection.options || {},
      });
    } catch (error) {
      alert(t('connections.alerts.loadFailed'));
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
        message: error instanceof Error ? error.message : t('connections.alerts.testFailed'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    console.log('[Kafkit] Submitting form:', JSON.stringify(formData, null, 2));
    try {
      // 确保 options 字段存在
      const configToSubmit: ConnectionConfig = {
        ...formData,
        options: formData.options || {},
      };
      
      if (isEdit && id) {
        await updateConnection(id, configToSubmit);
      } else {
        await createConnection(configToSubmit);
      }
      navigate('/main/connections');
    } catch (error) {
      console.error('[Kafkit] Save failed:', error);
      alert(t('connections.alerts.saveFailed') + ': ' + (error instanceof Error ? error.message : t('common.unknownError')));
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
              label={t('connections.form.username')}
              value={(auth as { username?: string }).username || ''}
              onChange={e => updateAuth({ username: e.target.value })}
              placeholder="username"
            />
            <Input
              label={t('connections.form.password')}
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
              label={t('connections.form.scramMechanism')}
              value={(auth as { mechanism?: string }).mechanism || 'SCRAM-SHA-256'}
              onChange={e => updateAuth({ mechanism: e.target.value as 'SCRAM-SHA-256' | 'SCRAM-SHA-512' })}
              options={scramMechanismOptions}
            />
            <Input
              label={t('connections.form.username')}
              value={(auth as { username?: string }).username || ''}
              onChange={e => updateAuth({ username: e.target.value })}
              placeholder="username"
            />
            <Input
              label={t('connections.form.password')}
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
              label={t('connections.form.keytabPath')}
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
              label={t('connections.form.caCert')}
              value={(auth as { caCert?: string }).caCert || ''}
              onChange={e => updateAuth({ caCert: e.target.value })}
              placeholder="/path/to/ca.crt"
            />
            <Input
              label={t('connections.form.clientCert')}
              value={(auth as { clientCert?: string }).clientCert || ''}
              onChange={e => updateAuth({ clientCert: e.target.value })}
              placeholder="/path/to/client.crt"
            />
            <Input
              label={t('connections.form.clientKey')}
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

  // Build auth type options with translations
  const authTypeOptions = [
    { value: 'none', label: t('connections.authTypes.none') },
    { value: 'saslPlain', label: 'SASL/PLAIN' },
    { value: 'saslScram', label: 'SASL/SCRAM' },
    { value: 'saslGssapi', label: 'SASL/GSSAPI (Kerberos)' },
    { value: 'ssl', label: 'SSL/TLS' },
  ];

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">{t('common.loading')}</div>;
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
            <h1 className="text-2xl font-bold">{isEdit ? t('connections.edit') : t('connections.new')}</h1>
            <p className="text-sm text-muted-foreground">{t('connections.manageDesc')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{t('connections.form.basicInfo')}</h2>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    name: 'EC2 Kafka Test',
                    bootstrapServers: 'ec2-dmz-kafka-01:9092',
                    auth: { type: 'none' },
                    security: { protocol: 'PLAINTEXT' },
                    options: {},
                  });
                }}
                className="text-xs text-primary hover:underline"
              >
                {t('connections.form.fillTestConfig')}
              </button>
            </div>
            
            <Input
              label={t('connections.name')}
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('connections.form.namePlaceholder')}
            />

            <Input
              label={t('connections.bootstrapServers')}
              required
              value={formData.bootstrapServers}
              onChange={e => setFormData(prev => ({ ...prev, bootstrapServers: e.target.value }))}
              placeholder={t('connections.form.serversPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('connections.form.serversHint')}
            </p>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium mb-4">{t('connections.form.security')}</h2>

            <Select
              label={t('connections.protocol')}
              value={formData.security.protocol}
              onChange={e => setFormData(prev => ({
                ...prev,
                security: { ...prev.security, protocol: e.target.value as SecurityConfig['protocol'] }
              }))}
              options={protocolOptions}
            />

            <Select
              label={t('connections.authType')}
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
                <p className="font-medium">{testResult.success ? t('connections.testSuccess') : t('connections.testFailed')}</p>
                <p className="text-sm mt-1">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleTest} isLoading={testing}>
              {t('connections.test')}
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => navigate('/main/connections')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={saving}>
              {isEdit ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
