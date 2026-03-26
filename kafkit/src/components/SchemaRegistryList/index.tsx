import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Server, ChevronRight, AlertCircle } from 'lucide-react';
import { SchemaRegistryService, SchemaRegistryConfig, StoredSchema, SchemaType } from '@/services/schemaRegistry';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface StoredRegistry {
  id: string;
  name: string;
  config: SchemaRegistryConfig;
  createdAt: string;
}

interface SchemaRegistryListProps {
  onSchemaSelect?: (schema: StoredSchema) => void;
  selectedSchemaId?: string;
}

export function SchemaRegistryList({ onSchemaSelect, selectedSchemaId }: SchemaRegistryListProps) {
  const { t } = useTranslation();
  const [registries, setRegistries] = useState<StoredRegistry[]>([]);
  const [selectedRegistryId, setSelectedRegistryId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<StoredSchema[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const [newConfig, setNewConfig] = useState<{
    name: string;
    url: string;
    username: string;
    password: string;
  }>({
    name: '',
    url: '',
    username: '',
    password: ''
  });

  // Load saved registries
  useEffect(() => {
    const saved = localStorage.getItem('kafkit-schema-registries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRegistries(parsed);
      } catch {
        console.error('Failed to parse saved registries');
      }
    }
  }, []);

  // Load schemas when registry is selected
  useEffect(() => {
    if (!selectedRegistryId) {
      setSchemas([]);
      return;
    }

    const registry = registries.find(r => r.id === selectedRegistryId);
    if (!registry) return;

    const service = new SchemaRegistryService(registry.config);
    setSchemasLoading(true);

    service.listSchemas()
      .then(setSchemas)
      .catch(err => {
        console.error('Failed to fetch schemas:', err);
        setSchemas([]);
      })
      .finally(() => setSchemasLoading(false));
  }, [selectedRegistryId, registries]);

  const saveRegistries = (newRegistries: StoredRegistry[]) => {
    setRegistries(newRegistries);
    localStorage.setItem('kafkit-schema-registries', JSON.stringify(newRegistries));
  };

  const handleTestAndAdd = async () => {
    if (!newConfig.name.trim() || !newConfig.url.trim()) return;

    setTestStatus('testing');
    setAddError(null);

    const config: SchemaRegistryConfig = {
      url: newConfig.url.trim(),
      ...(newConfig.username && {
        auth: {
          type: 'basic' as const,
          username: newConfig.username,
          password: newConfig.password
        }
      })
    };

    const service = new SchemaRegistryService(config);

    try {
      await service.listSchemas();
      
      // Success - add the registry
      const newRegistry: StoredRegistry = {
        id: crypto.randomUUID(),
        name: newConfig.name.trim(),
        config,
        createdAt: new Date().toISOString()
      };

      saveRegistries([...registries, newRegistry]);
      setShowAddDialog(false);
      setNewConfig({ name: '', url: '', username: '', password: '' });
      setTestStatus('idle');
    } catch {
      setTestStatus('error');
      setAddError(t('schemaRegistry.connectionFailed'));
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('schemaRegistry.confirmDelete'))) return;
    
    const filtered = registries.filter(r => r.id !== id);
    saveRegistries(filtered);
    
    if (selectedRegistryId === id) {
      setSelectedRegistryId(null);
    }
  };

  const getSchemaTypeBadge = (type?: SchemaType) => {
    switch (type) {
      case 'AVRO':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Avro</Badge>;
      case 'PROTOBUF':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Protobuf</Badge>;
      case 'JSON':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">JSON</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (registries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Server className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center mb-4">
          {t('schemaRegistry.noConfigs')}
        </p>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('schemaRegistry.add')}
        </Button>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="w-[560px] max-w-[90vw]">
            <DialogHeader>
              <DialogTitle>{t('schemaRegistry.addTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('schemaRegistry.nameLabel')}</Label>
                <Input
                  id="name"
                  placeholder={t('schemaRegistry.namePlaceholder')}
                  value={newConfig.name}
                  onChange={e => setNewConfig({ ...newConfig, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">{t('schemaRegistry.urlLabel')}</Label>
                <Input
                  id="url"
                  placeholder="http://localhost:8081"
                  value={newConfig.url}
                  onChange={e => setNewConfig({ ...newConfig, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t('schemaRegistry.usernameLabel')}</Label>
                <Input
                  id="username"
                  value={newConfig.username}
                  onChange={e => setNewConfig({ ...newConfig, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('schemaRegistry.passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newConfig.password}
                  onChange={e => setNewConfig({ ...newConfig, password: e.target.value })}
                />
              </div>
              {addError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {addError}
                </div>
              )}
              <Button 
                onClick={handleTestAndAdd} 
                disabled={testStatus === 'testing' || !newConfig.name.trim() || !newConfig.url.trim()}
                className="w-full"
              >
                {testStatus === 'testing' ? 'Testing...' : t('schemaRegistry.testAndAdd')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Server className="w-5 h-5" />
          {t('schemaRegistry.title')}
        </h2>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          {t('schemaRegistry.add')}
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Registry List */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          {registries.map(registry => (
            <div
              key={registry.id}
              onClick={() => setSelectedRegistryId(registry.id)}
              className={`group px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent transition-colors ${
                selectedRegistryId === registry.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{registry.name}</p>
                <p className="text-xs text-muted-foreground truncate">{registry.config.url}</p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleDelete(registry.id);
                }}
                className="p-1 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Schema List */}
        <div className="flex-1 overflow-hidden">
          {!selectedRegistryId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              选择左侧的 Registry 查看 Schemas
            </div>
          ) : schemasLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              加载中...
            </div>
          ) : schemas.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              暂无 Schemas
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('schemaRegistry.subject')}</TableHead>
                    <TableHead>{t('schemaRegistry.type')}</TableHead>
                    <TableHead>{t('schemaRegistry.versions')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemas.map(schema => (
                    <TableRow
                      key={schema.id}
                      className={`cursor-pointer ${selectedSchemaId === schema.id ? 'bg-accent' : ''}`}
                      onClick={() => onSchemaSelect?.(schema)}
                    >
                      <TableCell className="font-medium">{schema.subject}</TableCell>
                      <TableCell>{getSchemaTypeBadge(schema.type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">v{schema.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-[560px] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{t('schemaRegistry.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('schemaRegistry.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('schemaRegistry.namePlaceholder')}
                value={newConfig.name}
                onChange={e => setNewConfig({ ...newConfig, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">{t('schemaRegistry.urlLabel')}</Label>
              <Input
                id="url"
                placeholder="http://localhost:8081"
                value={newConfig.url}
                onChange={e => setNewConfig({ ...newConfig, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t('schemaRegistry.usernameLabel')}</Label>
              <Input
                id="username"
                value={newConfig.username}
                onChange={e => setNewConfig({ ...newConfig, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('schemaRegistry.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                value={newConfig.password}
                onChange={e => setNewConfig({ ...newConfig, password: e.target.value })}
              />
            </div>
            {addError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {addError}
              </div>
            )}
            <Button 
              onClick={handleTestAndAdd} 
              disabled={testStatus === 'testing' || !newConfig.name.trim() || !newConfig.url.trim()}
              className="w-full"
            >
              {testStatus === 'testing' ? 'Testing...' : t('schemaRegistry.testAndAdd')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
