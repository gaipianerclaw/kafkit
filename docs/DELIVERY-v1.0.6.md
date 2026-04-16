# Kafkit v1.0.6 交付文档

> **版本**: 1.0.6  
> **分支**: `feature/v1.0.6-consumer-monitoring`  
> **日期**: 2026-04-15  
> **状态**: Phase 4 - 验收交付

---

## 1. 交付物清单

| 类别 | 文件/模块 | 说明 |
|------|----------|------|
| **文档** | `docs/SRS-v1.0.6.md` | 需求规格说明书 |
| **文档** | `docs/TDD-v1.0.6.md` | 技术设计文档 |
| **文档** | `docs/DELIVERY-v1.0.6.md` | 本交付文档 |
| **文档** | `CHANGELOG.md` | 更新日志 |
| **文档** | `README.md` | 安装说明更新 |
| **代码** | `kafkit/src/pages/Dashboard/` | 监控仪表盘页面 |
| **代码** | `kafkit/src-tauri/tauri.conf.json` | Windows 安装修复配置 |
| **代码** | `kafkit/src-tauri/src/services.rs` | 消费延迟查询修复 |
| **代码** | `kafkit/src/i18n/locales/*.json` | 国际化资源 |
| **测试** | `kafkit/src/**/__tests__/*` | 新增单元测试 |

---

## 2. 功能变更摘要

### 2.1 新增功能：消费者监控仪表盘

- **全局统计卡片**: 实时显示总消费组数、健康状态分布、总 Lag 数量
- **Lag 趋势图**: 展示最近 10 分钟各消费组的 Lag 变化曲线
- **消费组列表**: 支持按 Lag 排序、按状态筛选、按 Group ID 搜索
- **分区级详情**: 点击行展开查看各 Topic-Partition 的 Current Offset / Log End Offset / Lag
- **自动刷新**: 10 秒间隔自动刷新，支持暂停/继续

### 2.2 Bug 修复：Windows 10 安装失败

- 将 `webviewInstallMode` 从 `downloadBootstrapper` 改为 `skip`
- 解决 MSI 安装器在部分 Win10 系统上报错 -1 的问题
- README 新增 WebView2 前置依赖说明

### 2.3 Bug 修复：消费组 Lag 查询为空

- **根因**: `get_consumer_lag` 使用无 `group.id` 的通用 client 查询 committed offsets，导致永远返回空
- **修复**: 为每个消费组创建带 `group.id` 的专属 BaseConsumer 进行查询
- **附加修复**: 正确处理 `Offset::Invalid`，避免未消费 topic 产生虚假巨大 lag

---

## 3. 构建与部署指南

### 3.1 环境要求

- Rust 1.75+
- Node.js 18+
- npm 或 yarn

### 3.2 本地开发构建

```bash
cd kafkit
npm install
npm run tauri:dev
```

### 3.3 生产构建

```bash
cd kafkit
npm run tauri:build
```

构建产物位于 `kafkit/src-tauri/target/release/bundle/`：
- macOS: `Kafkit_1.0.6_aarch64.dmg`, `Kafkit_1.0.6_x64.dmg`
- Linux: `kafkit_1.0.6_amd64.deb`, `kafkit-1.0.6-1.x86_64.rpm`
- Windows: `Kafkit_1.0.6_x64-setup.exe`, `Kafkit_1.0.6_x64.msi`

### 3.4 Windows 安装注意事项

由于安装包不再自动安装 WebView2，用户需确保系统已安装 WebView2 Runtime：
- Windows 11: 通常已预装
- Windows 10: 如未安装，请从 [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 下载

---

## 4. 使用说明

### 4.1 监控仪表盘

1. 在左侧导航栏点击 **"监控仪表盘"**（Activity 图标）
2. 页面自动加载当前连接的所有消费组及 Lag 数据
3. 数据每 10 秒自动刷新，可点击右上角 **暂停/继续/刷新**
4. **统计卡片**:
   - 总消费组数：当前连接下的消费组总数
   - 健康状态：按 Lag 阈值分类（健康/警告/危险）
   - 总 Lag：所有消费组 Lag 之和
5. **趋势图**: 鼠标悬停可查看各消费组在对应时间点的 Lag 值
6. **消费组列表**:
   - 点击表头可排序
   - 使用搜索框按 Group ID 过滤
   - 使用下拉框按健康状态筛选
   - 点击行可展开查看分区级详情

### 4.2 健康状态阈值

| 状态 | Lag 范围 | 颜色 |
|------|---------|------|
| 健康 | < 1,000 | 绿色 |
| 警告 | 1,000 ~ 10,000 | 黄色 |
| 危险 | > 10,000 | 红色 |

---

## 5. 测试结果

```
Test Files  18 passed (18)
     Tests  205 passed | 2 skipped (207)
```

新增测试覆盖：
- `formatters.test.ts` — 数字格式化、时间格式化
- `useLagHistory.test.ts` — Lag 历史数据管理
- `StatCards.test.tsx` — 统计卡片组件渲染

---

## 6. 已知限制

1. **仅支持单连接监控**：不跨集群聚合数据
2. **趋势数据不持久化**：仅保留最近 10 分钟（60 个数据点），切换页面或重启应用后重置
3. **无系统级通知**：Lag 告警仅在前端 UI 显示
4. **Windows 需预装 WebView2**：v1.0.6 MSI 不再自动安装 WebView2

---

## 7. 后续建议

| 版本 | 建议优化项 |
|------|-----------|
| v1.0.7 | 消息消费过滤（按 Key/Value 正则过滤） |
| v1.0.7 | 生产者消息模板保存 |
| v1.0.7 | 连接健康状态后台检测 + 状态指示灯 |
| 后续 | 数据导出增强（Parquet/Avro） |

---

## 8. 分支状态

当前所有改动已提交至分支 `feature/v1.0.6-consumer-monitoring`，可直接用于：
- 合并到 `main` / `develop`
- 触发 CI/CD 构建发布包

---

**交付完成，等待验收。**
