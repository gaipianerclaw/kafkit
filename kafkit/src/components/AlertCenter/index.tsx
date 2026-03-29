import { useState, useEffect, useCallback } from 'react';

import { Bell } from 'lucide-react';
import { MonitorService } from '@/services/monitor';
import type { Alert, AlertStats } from '@/services/monitor';
import { Button } from '@/components/ui/Button';
import { AlertSettings } from './AlertSettings';
import {
  Popover,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useConnectionStore } from '@/stores';
import { listConsumerGroups, getConsumerLag } from '@/services/tauriService';

// 简化的告警项渲染函数
function renderAlertItem(alert: Alert) {
  const severityColors: Record<string, string> = {
    info: '#3b82f6',
    warning: '#eab308',
    error: '#ef4444',
    critical: '#dc2626'
  };
  
  const statusStyles: Record<string, React.CSSProperties> = {
    active: { background: '#fff' },
    acknowledged: { background: '#f9fafb', opacity: 0.7 },
    resolved: { background: '#f0fdf4', opacity: 0.8 }
  };
  
  const statusLabels: Record<string, string> = {
    active: '未处理',
    acknowledged: '已确认',
    resolved: '已恢复'
  };
  
  return (
    <div style={{
      padding: '16px', 
      borderBottom: '1px solid #e5e7eb',
      borderLeft: `4px solid ${severityColors[alert.severity] || '#6b7280'}`,
      ...(statusStyles[alert.status] || {}),
      minHeight: '80px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        fontWeight: 600, 
        fontSize: '14px', 
        marginBottom: '8px', 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '8px',
        flexWrap: 'wrap',
        wordBreak: 'break-all'
      }}>
        <span style={{flex: 1}}>{alert.title}</span>
        {alert.status === 'resolved' && (
          <span style={{
            fontSize: '11px', 
            color: '#16a34a', 
            background: '#dcfce7', 
            padding: '2px 8px', 
            borderRadius: '4px',
            flexShrink: 0
          }}>
            ✓ 已恢复
          </span>
        )}
      </div>
      <div style={{
        fontSize: '13px', 
        color: '#4b5563',
        marginBottom: '8px',
        wordBreak: 'break-word',
        lineHeight: '1.5'
      }}>{alert.message}</div>
      <div style={{fontSize: '11px', color: '#9ca3af'}}>
        状态: {statusLabels[alert.status] || alert.status} | 级别: {alert.severity} | 时间: {new Date(alert.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

// 主组件
export function AlertCenter() {
  // 调试标记 - 确认代码版本
  console.log('[AlertCenter] Component loaded - v20240329 with test button');

  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    warning: 0,
    error: 0,
    critical: 0,
    resolved: 0
  });
  const [filter, setFilter] = useState<Alert['status'] | 'all'>('active');
  const [monitorStatus, setMonitorStatus] = useState<'running' | 'stopped'>('stopped');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const monitor = MonitorService.getInstance();
  const { activeConnection, connections } = useConnectionStore();
  
  // 更新告警列表
  const updateAlerts = useCallback(() => {
    setAlerts(monitor.getAlerts({ 
      status: filter === 'all' ? undefined : filter 
    }));
    setStats(monitor.getStats());
    setMonitorStatus(monitor.isActive() ? 'running' : 'stopped');
  }, [monitor, filter]);
  
  // 检查消费延迟
  const checkConsumerLag = useCallback(async () => {
    if (!activeConnection) return;
    
    const connection = connections.find(c => c.id === activeConnection);
    if (!connection) return;
    
    try {
      // 获取消费组列表
      const groups = await listConsumerGroups(activeConnection);
      
      for (const group of groups) {
        try {
          // 获取每个消费组的延迟数据
          const lagData = await getConsumerLag(activeConnection, group.groupId);
          
          // 转换为 MonitorService 需要的格式
          const processedLagData = lagData.map(lag => ({
            topic: lag.topic,
            partition: lag.partition,
            lag: lag.lag
          }));
          
          // 传递给 MonitorService 处理
          monitor.processConsumerLagData(
            activeConnection,
            connection.name,
            group.groupId,
            processedLagData
          );
        } catch (error) {
          console.error(`[AlertCenter] Failed to get lag for group ${group.groupId}:`, error);
        }
      }
    } catch (error) {
      console.error('[AlertCenter] Failed to list consumer groups:', error);
    }
  }, [activeConnection, connections, monitor]);
  
  // 初始化
  useEffect(() => {
    updateAlerts();
    
    // 启动监控服务
    if (!monitor.isActive()) {
      monitor.start();
    }
    
    // 监听事件
    monitor.on('alert:new', updateAlerts);
    monitor.on('alert:acknowledged', updateAlerts);
    monitor.on('alert:dismissed', updateAlerts);
    monitor.on('alert:resolved', updateAlerts);
    monitor.on('stats:changed', updateAlerts);
    
    return () => {
      monitor.off('alert:new', updateAlerts);
      monitor.off('alert:acknowledged', updateAlerts);
      monitor.off('alert:dismissed', updateAlerts);
      monitor.off('alert:resolved', updateAlerts);
      monitor.off('stats:changed', updateAlerts);
    };
  }, [monitor, updateAlerts]);
  
  // 定期监控消费延迟
  useEffect(() => {
    if (!activeConnection) return;
    
    // 立即检查一次
    checkConsumerLag();
    
    // 每 30 秒检查一次
    const timer = setInterval(() => {
      checkConsumerLag();
    }, 30000);
    
    return () => {
      clearInterval(timer);
    };
  }, [activeConnection, checkConsumerLag]);
  
  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('[data-alert-center]')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // 注：确认和忽略功能已简化，后续可添加回来
  
  // 清除全部
  const handleDismissAll = () => {
    if (filter === 'all') {
      monitor.dismissAll('acknowledged');
    } else {
      monitor.dismissAll(filter);
    }
  };
  
  // 获取角标颜色
  const getBadgeVariant = () => {
    if (stats.critical > 0) return 'destructive';
    if (stats.error > 0) return 'default';
    if (stats.warning > 0) return 'secondary';
    return 'outline';
  };
  
  return (
    <>
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label="告警中心"
        >
          <Bell className="h-5 w-5" />
          {stats.active > 0 && (
            <Badge 
              variant={getBadgeVariant()}
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {stats.active > 99 ? '99+' : stats.active}
            </Badge>
          )}
          {monitorStatus === 'running' && stats.active === 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      
      {isOpen && (
        <div 
          data-alert-center="true"
          style={{
            position: 'fixed',
            top: '50px',
            right: '20px',
            width: '450px', 
            background: 'white', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px 16px', 
            borderBottom: '1px solid #e5e7eb', 
            background: '#fff'
          }}>
            <div>
              <div style={{fontWeight: 600, fontSize: '16px', color: '#111827'}}>
                告警中心 ({alerts.length})
              </div>
              <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>
                {monitorStatus === 'running' ? '监控运行中' : '监控已停止'}
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Alert['status'] | 'all')}
                style={{
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  background: '#fff',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                <option value="all">全部</option>
                <option value="active">未处理</option>
                <option value="acknowledged">已确认</option>
                <option value="resolved">已恢复</option>
              </select>
            </div>
          </div>
          
          {/* 告警列表 */}
          <div style={{maxHeight: '350px', overflow: 'auto', background: '#fff'}}>
            {alerts.length === 0 ? (
              <div style={{padding: '48px 24px', textAlign: 'center'}}>
                <div style={{fontSize: '14px', color: '#9ca3af', marginBottom: '4px'}}>暂无告警</div>
                <div style={{fontSize: '12px', color: '#d1d5db'}}>
                  当前筛选: {filter === 'all' ? '全部' : filter === 'active' ? '未处理' : filter === 'acknowledged' ? '已确认' : '已恢复'}
                </div>
              </div>
            ) : (
              <div style={{padding: '8px 0'}}>
                {alerts.map((alert) => renderAlertItem(alert))}
              </div>
            )}
          </div>
          
          {/* 底部 */}
          <div style={{padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div style={{fontSize: '12px', color: '#6b7280', display: 'flex', gap: '12px'}}>
                <span>总计: <b>{stats.total}</b></span>
                <span>活跃: <b style={{color: stats.active > 0 ? '#dc2626' : '#6b7280'}}>{stats.active}</b></span>
                <span>警告: <b>{stats.warning}</b></span>
                <span>错误: <b>{stats.error}</b></span>
                <span>已恢复: <b style={{color: '#16a34a'}}>{stats.resolved}</b></span>
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                {alerts.length > 0 && (
                  <button
                    onClick={handleDismissAll}
                    style={{
                      fontSize: '12px', 
                      color: '#6b7280', 
                      padding: '4px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    清除全部
                  </button>
                )}
                <button
                  onClick={() => setSettingsOpen(true)}
                  style={{
                    fontSize: '12px', 
                    color: '#2563eb', 
                    padding: '4px 10px',
                    border: '1px solid #2563eb',
                    borderRadius: '4px',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Popover>
    
    {/* 设置弹窗 */}
    <AlertSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

// 导出类型
export type { Alert, AlertStats, AlertSeverity } from '@/services/monitor';
export default AlertCenter;
