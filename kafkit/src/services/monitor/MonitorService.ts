import { EventEmitter } from './EventEmitter';
import type { 
  Alert, 
  AlertRule, 
  AlertStats, 
  AlertType,
  AlertSeverity,
  ConsumerLagMetadata,
  ConnectionLostMetadata
} from './types';
import { DEFAULT_ALERT_RULES, DEFAULT_MONITOR_CONFIG } from './types';

/**
 * 监控服务 - 单例模式
 * 
 * 功能：
 * 1. 消费延迟监控
 * 2. 连接健康检查
 * 3. Topic 增长监控
 * 4. 告警通知（桌面通知、声音、角标）
 */
export class MonitorService extends EventEmitter {
  private static instance: MonitorService;
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lagCache: Map<string, { lag: number; timestamp: number }> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();
  private isRunning = false;
  
  private readonly STORAGE_KEYS = {
    ALERTS: 'kafkit-alerts-v2',
    RULES: 'kafkit-alert-rules-v2',
    CONFIG: 'kafkit-monitor-config'
  };
  
  private constructor() {
    super();
    this.loadFromStorage();
  }
  
  static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }
  
  // ============ 生命周期 ============
  
  start(): void {
    if (this.isRunning) return;
    
    console.log('[Monitor] Starting monitoring service...');
    this.isRunning = true;
    
    // 加载默认规则（如果没有）
    if (this.rules.length === 0) {
      this.loadDefaultRules();
    }
    
    // 启动所有启用的规则
    this.rules.filter(r => r.enabled).forEach(rule => {
      this.startRuleMonitoring(rule);
    });
    
    // 请求桌面通知权限
    this.requestNotificationPermission();
    
    this.emit('monitor:started');
  }
  
  stop(): void {
    if (!this.isRunning) return;
    
    console.log('[Monitor] Stopping monitoring service...');
    this.isRunning = false;
    
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    
    this.emit('monitor:stopped');
  }
  
  isActive(): boolean {
    return this.isRunning;
  }
  
  // ============ 规则管理 ============
  
  getRules(): AlertRule[] {
    return [...this.rules];
  }
  
  getRule(id: string): AlertRule | undefined {
    return this.rules.find(r => r.id === id);
  }
  
  addRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: crypto.randomUUID()
    };
    
    this.rules.push(newRule);
    this.saveRules();
    
    if (this.isRunning && newRule.enabled) {
      this.startRuleMonitoring(newRule);
    }
    
    this.emit('rule:added', newRule);
    return newRule;
  }
  
  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    const oldRule = this.rules[index];
    this.rules[index] = { ...oldRule, ...updates };
    
    this.saveRules();
    
    // 重启监控
    if (this.isRunning) {
      this.stopRuleMonitoring(id);
      if (this.rules[index].enabled) {
        this.startRuleMonitoring(this.rules[index]);
      }
    }
    
    this.emit('rule:updated', this.rules[index]);
    return this.rules[index];
  }
  
  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.stopRuleMonitoring(id);
    const deleted = this.rules.splice(index, 1)[0];
    this.saveRules();
    
    this.emit('rule:deleted', deleted);
    return true;
  }
  
  toggleRule(id: string, enabled: boolean): AlertRule | null {
    return this.updateRule(id, { enabled });
  }
  
  // ============ 告警管理 ============
  
  getAlerts(options?: {
    status?: Alert['status'];
    type?: AlertType;
    severity?: AlertSeverity;
    limit?: number;
  }): Alert[] {
    let result = [...this.alerts];
    
    if (options?.status) {
      result = result.filter(a => a.status === options.status);
    }
    if (options?.type) {
      result = result.filter(a => a.type === options.type);
    }
    if (options?.severity) {
      result = result.filter(a => a.severity === options.severity);
    }
    
    result.sort((a, b) => b.createdAt - a.createdAt);
    
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result;
  }
  
  getAlert(id: string): Alert | undefined {
    return this.alerts.find(a => a.id === id);
  }
  
  getStats(): AlertStats {
    const active = this.alerts.filter(a => a.status === 'active');
    return {
      total: this.alerts.length,
      active: active.length,
      warning: active.filter(a => a.severity === 'warning').length,
      error: active.filter(a => a.severity === 'error').length,
      critical: active.filter(a => a.severity === 'critical').length,
      resolved: this.alerts.filter(a => a.status === 'resolved').length
    };
  }
  
  getUnreadCount(): number {
    return this.alerts.filter(a => a.status === 'active').length;
  }
  
  acknowledge(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert || alert.status !== 'active') return false;
    
    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    this.saveAlerts();
    
    this.emit('alert:acknowledged', alert);
    this.emit('stats:changed', this.getStats());
    return true;
  }
  
  dismiss(id: string): boolean {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    const alert = this.alerts[index];
    this.alerts.splice(index, 1);
    this.saveAlerts();
    
    this.emit('alert:dismissed', alert);
    this.emit('stats:changed', this.getStats());
    return true;
  }
  
  dismissAll(status?: Alert['status']): number {
    let toDismiss: Alert[];
    
    if (status) {
      toDismiss = this.alerts.filter(a => a.status === status);
      this.alerts = this.alerts.filter(a => a.status !== status);
    } else {
      toDismiss = [...this.alerts];
      this.alerts = [];
    }
    
    this.saveAlerts();
    
    toDismiss.forEach(alert => {
      this.emit('alert:dismissed', alert);
    });
    this.emit('stats:changed', this.getStats());
    
    return toDismiss.length;
  }
  
  clearOldAlerts(days: number = 7): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const toClear = this.alerts.filter(a => a.createdAt < cutoff);
    
    this.alerts = this.alerts.filter(a => a.createdAt >= cutoff);
    this.saveAlerts();
    
    return toClear.length;
  }
  
  // 解决特定连接的所有连接断开告警（当连接恢复时调用）
  resolveConnectionAlerts(connectionId: string): number {
    let resolvedCount = 0;
    
    this.alerts.forEach(alert => {
      if (alert.type === 'connection_lost' && 
          alert.status === 'active' &&
          (alert.metadata as any)?.connectionId === connectionId) {
        alert.status = 'resolved';
        alert.resolvedAt = Date.now();
        resolvedCount++;
        
        this.emit('alert:resolved', alert);
        console.log(`[Monitor] Alert resolved for connection ${connectionId}: ${alert.title}`);
      }
    });
    
    if (resolvedCount > 0) {
      this.saveAlerts();
      this.emit('stats:changed', this.getStats());
    }
    
    return resolvedCount;
  }
  
  // ============ 监控逻辑 ============
  
  private startRuleMonitoring(rule: AlertRule): void {
    this.stopRuleMonitoring(rule.id);
    
    // 立即执行一次
    this.checkRule(rule);
    
    // 定时执行
    const timer = setInterval(async () => {
      await this.checkRule(rule);
    }, DEFAULT_MONITOR_CONFIG.checkInterval);
    
    this.timers.set(rule.id, timer);
    console.log(`[Monitor] Started monitoring rule: ${rule.name}`);
  }
  
  private stopRuleMonitoring(ruleId: string): void {
    const timer = this.timers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(ruleId);
      console.log(`[Monitor] Stopped monitoring rule: ${ruleId}`);
    }
  }
  
  private async checkRule(rule: AlertRule): Promise<void> {
    try {
      switch (rule.type) {
        case 'consumer_lag':
          await this.checkConsumerLag(rule);
          break;
        case 'connection_lost':
          await this.checkConnectionHealth(rule);
          break;
      }
    } catch (error) {
      console.error(`[Monitor] Check failed for rule ${rule.name}:`, error);
    }
  }
  
  // ============ 具体监控实现 ============
  
  private async checkConsumerLag(rule: AlertRule): Promise<void> {
    // 从 connectionStore 获取活跃连接
    const connections = this.getActiveConnections();
    
    for (const conn of connections) {
      try {
        // 这里需要接入实际的消费组 API
        // 暂时使用模拟数据
        const groups = await this.fetchConsumerGroups(conn.id);
        
        for (const group of groups) {
          const lags = await this.fetchConsumerGroupLag(conn.id, group);
          
          for (const lag of lags) {
            const cacheKey = `${conn.id}:${group}:${lag.topic}:${lag.partition}`;
            // const lastLag = this.lagCache.get(cacheKey)?.lag || 0;
            
            // 检查是否超过阈值
            if (lag.lag > rule.condition.threshold) {
              // 检查持续时间
              const cacheEntry = this.lagCache.get(cacheKey);
              const now = Date.now();
              
              if (cacheEntry && (now - cacheEntry.timestamp) >= rule.condition.duration * 1000) {
                // 检查冷却时间
                const lastAlert = this.lastAlertTime.get(cacheKey);
                if (!lastAlert || (now - lastAlert) > rule.condition.cooldown * 1000) {
                  this.createAlert({
                    ruleId: rule.id,
                    type: 'consumer_lag',
                    severity: this.calculateLagSeverity(lag.lag, rule.condition.threshold),
                    title: `消费延迟: ${group}`,
                    message: `Topic: ${lag.topic}, Partition: ${lag.partition}, Lag: ${lag.lag.toLocaleString()}`,
                    metadata: {
                      connectionId: conn.id,
                      consumerGroup: group,
                      topic: lag.topic,
                      partition: lag.partition,
                      currentLag: lag.lag,
                      threshold: rule.condition.threshold
                    } as ConsumerLagMetadata
                  });
                  
                  this.lastAlertTime.set(cacheKey, now);
                }
              }
            }
            
            this.lagCache.set(cacheKey, { lag: lag.lag, timestamp: Date.now() });
          }
        }
      } catch (error) {
        console.error(`[Monitor] Failed to check lag for ${conn.id}:`, error);
      }
    }
  }
  
  private async checkConnectionHealth(rule: AlertRule): Promise<void> {
    const connections = this.getActiveConnections();
    
    for (const conn of connections) {
      try {
        const isHealthy = await this.checkConnection(conn.id);
        const wasHealthy = this.connectionStatus.get(conn.id);
        
        // 状态从健康变为不健康
        if (wasHealthy !== false && !isHealthy) {
          const cacheKey = `conn:${conn.id}`;
          const lastAlert = this.lastAlertTime.get(cacheKey);
          const now = Date.now();
          
          if (!lastAlert || (now - lastAlert) > rule.condition.cooldown * 1000) {
            this.createAlert({
              ruleId: rule.id,
              type: 'connection_lost',
              severity: 'error',
              title: `连接断开: ${conn.name}`,
              message: `无法连接到 Kafka 集群 ${conn.name}，请检查网络或配置`,
              metadata: {
                connectionId: conn.id,
                connectionName: conn.name,
                retryCount: 0,
                maxRetries: 3
              } as ConnectionLostMetadata
            });
            
            this.lastAlertTime.set(cacheKey, now);
          }
        }
        
        this.connectionStatus.set(conn.id, isHealthy);
      } catch (error) {
        console.error(`[Monitor] Failed to check connection ${conn.id}:`, error);
      }
    }
  }
  
  // ============ 外部数据接入接口 ============
  
  /**
   * 处理消费延迟数据 - 由外部组件调用
   * @param connectionId 连接ID
   * @param connectionName 连接名称
   * @param groupId 消费组ID
   * @param lagData 延迟数据
   */
  processConsumerLagData(
    connectionId: string,
    connectionName: string,
    groupId: string,
    lagData: Array<{topic: string; partition: number; lag: number}>
  ): void {
    const rule = this.rules.find(r => r.type === 'consumer_lag' && r.enabled);
    if (!rule) return;
    
    const now = Date.now();
    
    for (const item of lagData) {
      const cacheKey = `${connectionId}:${groupId}:${item.topic}:${item.partition}`;
      
      // 更新缓存
      this.lagCache.set(cacheKey, { lag: item.lag, timestamp: now });
      
      // 检查是否超过阈值
      if (item.lag > rule.condition.threshold) {
        // 检查冷却时间
        const lastAlert = this.lastAlertTime.get(cacheKey);
        if (!lastAlert || (now - lastAlert) > rule.condition.cooldown * 1000) {
          this.createAlert({
            ruleId: rule.id,
            type: 'consumer_lag',
            severity: this.calculateLagSeverity(item.lag, rule.condition.threshold),
            title: `消费延迟: ${groupId}`,
            message: `连接: ${connectionName}, Topic: ${item.topic}, Partition: ${item.partition}, Lag: ${item.lag.toLocaleString()}`,
            metadata: {
              connectionId,
              consumerGroup: groupId,
              topic: item.topic,
              partition: item.partition,
              currentLag: item.lag,
              threshold: rule.condition.threshold
            } as ConsumerLagMetadata
          });
          
          this.lastAlertTime.set(cacheKey, now);
          console.log(`[Monitor] Consumer lag alert created for ${groupId}/${item.topic}`);
        }
      }
    }
  }
  
  // ============ 告警创建与通知 ============
  
  private createAlert(data: Omit<Alert, 'id' | 'createdAt' | 'status' | 'notified'>): void {
    const alert: Alert = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'active',
      notified: {
        desktop: false,
        sound: false
      }
    };
    
    // 限制告警数量
    if (this.alerts.length >= DEFAULT_MONITOR_CONFIG.maxAlerts) {
      // 删除最旧的已确认告警
      const oldAckIndex = this.alerts.findIndex(a => a.status === 'acknowledged');
      if (oldAckIndex !== -1) {
        this.alerts.splice(oldAckIndex, 1);
      } else {
        // 如果没有已确认的，删除最旧的
        this.alerts.pop();
      }
    }
    
    this.alerts.unshift(alert);
    this.saveAlerts();
    
    // 发送通知
    this.sendNotification(alert);
    
    // 触发事件
    this.emit('alert:new', alert);
    this.emit('stats:changed', this.getStats());
    
    console.log(`[Monitor] Alert created: ${alert.title}`);
  }
  
  private async sendNotification(alert: Alert): Promise<void> {
    const rule = this.rules.find(r => r.id === alert.ruleId);
    if (!rule) return;
    
    // 桌面通知
    if (rule.notification.desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notification = new Notification(alert.title, {
          body: alert.message,
          icon: '/logo.png',
          tag: alert.id,
          requireInteraction: alert.severity === 'critical'
        });
        
        notification.onclick = () => {
          this.emit('alert:clicked', alert);
          window.focus();
        };
        
        alert.notified.desktop = true;
      } catch (e) {
        console.error('[Monitor] Desktop notification failed:', e);
      }
    }
    
    // 声音通知
    if (rule.notification.sound) {
      this.playAlertSound(alert.severity);
      alert.notified.sound = true;
    }
    
    // 自动消失
    if (rule.notification.autoDismiss > 0 && alert.status === 'active') {
      setTimeout(() => {
        if (alert.status === 'active') {
          this.acknowledge(alert.id);
        }
      }, rule.notification.autoDismiss * 1000);
    }
  }
  
  private playAlertSound(severity: AlertSeverity): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 根据级别使用不同频率
      const frequency = {
        info: 440,
        warning: 554,
        error: 698,
        critical: 880
      }[severity];
      
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error('[Monitor] Failed to play sound:', e);
    }
  }
  
  private calculateLagSeverity(lag: number, threshold: number): AlertSeverity {
    const ratio = lag / threshold;
    if (ratio >= 10) return 'critical';
    if (ratio >= 5) return 'error';
    if (ratio >= 2) return 'warning';
    return 'info';
  }
  
  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error('[Monitor] Failed to request notification permission:', e);
      }
    }
  }
  
  // ============ 存储 ============
  
  private saveAlerts(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.ALERTS, JSON.stringify(this.alerts));
    } catch (e) {
      console.error('[Monitor] Failed to save alerts:', e);
    }
  }
  
  private saveRules(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.RULES, JSON.stringify(this.rules));
    } catch (e) {
      console.error('[Monitor] Failed to save rules:', e);
    }
  }
  
  private loadFromStorage(): void {
    try {
      const alertsData = localStorage.getItem(this.STORAGE_KEYS.ALERTS);
      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
        // 清理过期告警
        this.clearOldAlerts(DEFAULT_MONITOR_CONFIG.retentionDays);
      }
      
      const rulesData = localStorage.getItem(this.STORAGE_KEYS.RULES);
      if (rulesData) {
        this.rules = JSON.parse(rulesData);
      }
    } catch (e) {
      console.error('[Monitor] Failed to load from storage:', e);
    }
  }
  
  private loadDefaultRules(): void {
    DEFAULT_ALERT_RULES.forEach(rule => {
      this.addRule(rule);
    });
  }
  
  // ============ 外部接口适配（需接入实际服务） ============
  
  private getActiveConnections(): Array<{id: string; name: string}> {
    // TODO: 接入 connectionStore
    // 临时返回空数组，实际需要实现
    void this.connectionStatus; // 避免未使用警告
    return [];
  }
  
  private async fetchConsumerGroups(_connectionId: string): Promise<string[]> {
    // TODO: 接入 tauriService
    return [];
  }
  
  private async fetchConsumerGroupLag(
    _connectionId: string, 
    _group: string
  ): Promise<Array<{topic: string; partition: number; lag: number}>> {
    // TODO: 接入 tauriService
    return [];
  }
  
  private async checkConnection(_connectionId: string): Promise<boolean> {
    // TODO: 接入 tauriService
    return true;
  }
  
  // 供外部调用的方法 - 直接创建告警，不依赖内部检查
  reportConnectionStatus(connectionId: string, isHealthy: boolean, error?: string): void {
    const wasHealthy = this.connectionStatus.get(connectionId);
    this.connectionStatus.set(connectionId, isHealthy);
    
    console.log(`[Monitor] Connection ${connectionId} status: ${isHealthy ? 'healthy' : 'unhealthy'}, was: ${wasHealthy}`);
    
    // 状态从健康变为不健康（或首次不健康）
    if (wasHealthy !== false && !isHealthy) {
      const rule = this.rules.find(r => r.type === 'connection_lost' && r.enabled);
      
      if (rule) {
        const cacheKey = `conn:${connectionId}`;
        const lastAlert = this.lastAlertTime.get(cacheKey);
        const now = Date.now();
        
        // 检查冷却时间
        if (!lastAlert || (now - lastAlert) > rule.condition.cooldown * 1000) {
          this.createAlert({
            ruleId: rule.id,
            type: 'connection_lost',
            severity: 'error',
            title: `连接断开: ${connectionId}`,
            message: error || `无法连接到 Kafka 集群，请检查网络或配置`,
            metadata: {
              connectionId: connectionId,
              connectionName: connectionId,
              retryCount: 0,
              maxRetries: 3
            } as ConnectionLostMetadata
          });
          
          this.lastAlertTime.set(cacheKey, now);
          console.log(`[Monitor] Connection lost alert created for ${connectionId}`);
        } else {
          console.log(`[Monitor] Connection alert skipped due to cooldown for ${connectionId}`);
        }
      } else {
        console.log(`[Monitor] No enabled connection_lost rule found`);
      }
    }
    
    // 状态从不健康变为健康 - 自动解决相关告警
    if (wasHealthy === false && isHealthy) {
      console.log(`[Monitor] Connection ${connectionId} recovered, resolving alerts...`);
      const resolved = this.resolveConnectionAlerts(connectionId);
      if (resolved > 0) {
        console.log(`[Monitor] Resolved ${resolved} alerts for connection ${connectionId}`);
      }
    }
  }
  
  reportConsumerLag(
    connectionId: string,
    group: string,
    topic: string,
    partition: number,
    lag: number
  ): void {
    const cacheKey = `${connectionId}:${group}:${topic}:${partition}`;
    this.lagCache.set(cacheKey, { lag, timestamp: Date.now() });
  }
  
  // 清理资源
  destroy(): void {
    this.stop();
    this.removeAllListeners();
    MonitorService.instance = null as any;
  }
}

// 导出单例
export default MonitorService.getInstance();

// 导出类型
export * from './types';
