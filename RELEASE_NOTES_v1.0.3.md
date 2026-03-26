# Kafkit v1.0.3 Release Notes

## 🚀 性能优化

### 虚拟滚动
- **消息列表虚拟化**: 消费消息使用虚拟列表渲染，大幅提升大消息量性能
- **内存管理**: 添加消息数量上限（10000条），超过时自动清理早期消息
- **内存警告**: 消息数量超过 5000 条时显示警告，提示用户导出到文件

## 🛡️ 错误处理增强

### 友好错误提示
- **Kafka 错误码映射**: 将技术错误码转换为中文/英文友好提示
- **错误解决建议**: 为常见错误提供具体的解决方案
- **可重试错误识别**: 网络超时等临时错误支持一键重试

### 新增错误类型支持
- NetworkException - 网络连接失败
- UnknownTopicOrPartition - Topic 不存在
- NotLeaderForPartition - Leader 选举中
- AuthorizationFailed - 认证失败
- SSLHandshakeFailed - SSL 握手失败
- TimeoutException - 请求超时

## 🐛 Bug 修复

- **修复页面滚动问题**: 为 Topic 详情等页面添加 `h-full min-h-0`，确保配置参数可滚动查看

## 🔧 技术改进

- **组件化**: 将消息列表拆分为独立组件，提升代码可维护性
- **国际化**: 完善错误处理和内存警告的翻译支持

## 📦 下载

### macOS
- **Apple Silicon**: Kafkit_1.0.3_aarch64.dmg
- **Intel**: Kafkit_1.0.3_x64.dmg

### Linux
- **Ubuntu/Debian**: kafkit_1.0.3_amd64.deb
- **Fedora/RHEL**: kafkit-1.0.3-1.x86_64.rpm

### Windows
- **Installer**: Kafkit_1.0.3_x64-setup.exe
- **MSI**: Kafkit_1.0.3_x64.msi

## 📝 升级说明

从 v1.0.2 升级：
1. 下载对应平台的安装包
2. 直接安装即可覆盖旧版本
3. 连接配置等数据会自动保留

## 🙏 致谢

感谢所有提交 Issue 和 PR 的贡献者！
