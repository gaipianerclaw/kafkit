import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-radix';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Bell, Settings } from 'lucide-react';
import { MonitorService } from '@/services/monitor';
import type { AlertRule, AlertType } from '@/services/monitor';

interface AlertSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  consumer_lag: '消费延迟',
  connection_lost: '连接断开',
  produce_error: '生产错误',
  consume_error: '消费错误',
};

export function AlertSettings({ open, onOpenChange }: AlertSettingsProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AlertRule>>({});
  const monitor = MonitorService.getInstance();

  useEffect(() => {
    if (open) {
      setRules(monitor.getRules());
    }
  }, [open, monitor]);

  const handleSave = () => {
    if (!editingRule.name || !editingRule.type) return;

    const ruleData: Omit<AlertRule, 'id'> = {
      name: editingRule.name,
      enabled: editingRule.enabled ?? true,
      type: editingRule.type as AlertType,
      condition: {
        metric: editingRule.condition?.metric || 'lag',
        operator: editingRule.condition?.operator || 'gt',
        threshold: editingRule.condition?.threshold ?? 1000,
        duration: editingRule.condition?.duration ?? 60,
        cooldown: editingRule.condition?.cooldown ?? 300,
      },
      notification: {
        desktop: editingRule.notification?.desktop ?? true,
        sound: editingRule.notification?.sound ?? true,
        badge: editingRule.notification?.badge ?? true,
        autoDismiss: editingRule.notification?.autoDismiss ?? 0,
      },
    };

    if ('id' in editingRule && editingRule.id) {
      monitor.updateRule(editingRule.id, ruleData);
    } else {
      monitor.addRule(ruleData);
    }

    setRules(monitor.getRules());
    setIsEditing(false);
    setEditingRule({});
  };

  const handleDelete = (id: string) => {
    monitor.deleteRule(id);
    setRules(monitor.getRules());
  };

  const handleToggle = (id: string, enabled: boolean) => {
    monitor.toggleRule(id, enabled);
    setRules(monitor.getRules());
  };

  const startNewRule = () => {
    setEditingRule({
      type: 'consumer_lag',
      enabled: true,
      condition: { 
        metric: 'lag',
        operator: 'gt',
        threshold: 1000, 
        duration: 60, 
        cooldown: 300 
      },
      notification: { 
        desktop: true, 
        sound: true, 
        badge: true,
        autoDismiss: 0 
      },
    });
    setIsEditing(true);
  };

  const editRule = (rule: AlertRule) => {
    setEditingRule({ ...rule });
    setIsEditing(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Settings className="w-5 h-5" />
              告警规则设置
            </DialogTitle>
            <Button size="sm" onClick={startNewRule} className="gap-1">
              <Plus className="w-4 h-4" />
              新建规则
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4 max-h-[60vh] overflow-y-auto">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>规则名称</Label>
                <Input
                  value={editingRule.name || ''}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, name: e.target.value })
                  }
                  placeholder="例如：消费延迟告警"
                />
              </div>

              <div className="space-y-2">
                <Label>告警类型</Label>
                <Select
                  value={editingRule.type}
                  onValueChange={(v) =>
                    setEditingRule({ ...editingRule, type: v as AlertType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumer_lag">消费延迟</SelectItem>
                    <SelectItem value="connection_lost">连接断开</SelectItem>
                    <SelectItem value="produce_error">生产错误</SelectItem>
                    <SelectItem value="consume_error">消费错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>阈值</Label>
                  <Input
                    type="number"
                    value={editingRule.condition?.threshold || 0}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        condition: {
                          ...editingRule.condition,
                          metric: editingRule.condition?.metric || 'lag',
                          operator: editingRule.condition?.operator || 'gt',
                          threshold: parseInt(e.target.value),
                        } as AlertRule['condition'],
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>持续时间(秒)</Label>
                  <Input
                    type="number"
                    value={editingRule.condition?.duration || 0}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        condition: {
                          ...editingRule.condition,
                          metric: editingRule.condition?.metric || 'lag',
                          operator: editingRule.condition?.operator || 'gt',
                          duration: parseInt(e.target.value),
                        } as AlertRule['condition'],
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>冷却时间(秒)</Label>
                  <Input
                    type="number"
                    value={editingRule.condition?.cooldown || 0}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        condition: {
                          ...editingRule.condition,
                          metric: editingRule.condition?.metric || 'lag',
                          operator: editingRule.condition?.operator || 'gt',
                          cooldown: parseInt(e.target.value),
                        } as AlertRule['condition'],
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>通知方式</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.notification?.desktop ?? true}
                      onCheckedChange={(v) =>
                        setEditingRule({
                          ...editingRule,
                          notification: {
                            desktop: v,
                            sound: editingRule.notification?.sound ?? true,
                            badge: editingRule.notification?.badge ?? true,
                            autoDismiss: editingRule.notification?.autoDismiss ?? 0,
                          },
                        })
                      }
                    />
                    <span className="text-sm">桌面通知</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.notification?.sound ?? true}
                      onCheckedChange={(v) =>
                        setEditingRule({
                          ...editingRule,
                          notification: {
                            desktop: editingRule.notification?.desktop ?? true,
                            sound: v,
                            badge: editingRule.notification?.badge ?? true,
                            autoDismiss: editingRule.notification?.autoDismiss ?? 0,
                          },
                        })
                      }
                    />
                    <span className="text-sm">声音提醒</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.notification?.badge ?? true}
                      onCheckedChange={(v) =>
                        setEditingRule({
                          ...editingRule,
                          notification: {
                            desktop: editingRule.notification?.desktop ?? true,
                            sound: editingRule.notification?.sound ?? true,
                            badge: v,
                            autoDismiss: editingRule.notification?.autoDismiss ?? 0,
                          },
                        })
                      }
                    />
                    <span className="text-sm">角标提醒</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingRule({});
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleSave}>保存</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无告警规则</p>
                  <p className="text-sm mt-1">点击"新建规则"创建第一个告警规则</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{rule.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ALERT_TYPE_LABELS[rule.type]}
                        </Badge>
                        {!rule.enabled && (
                          <Badge variant="secondary" className="text-xs">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        阈值: {rule.condition.threshold.toLocaleString()} | 
                        持续: {rule.condition.duration}s | 
                        冷却: {rule.condition.cooldown}s
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) => handleToggle(rule.id, v)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => editRule(rule)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AlertSettings;
