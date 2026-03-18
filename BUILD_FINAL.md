# Kafkit 构建方案总结

## 🎯 推荐方案：浏览器预览（立即可用）

```bash
cd /Users/lailai/workspace/kafka-connector/kafkit
npm run dev
```
访问: http://localhost:1420/

**功能完整，使用模拟数据**

---

## 🔧 Electron 方案（简化桌面版）

### 快速启动
```bash
./build-electron.sh
```

### 手动步骤
```bash
cd kafkit/electron
npm install
npm start
```

---

## ⚠️ Tauri 方案（原方案，需要修复）

由于 rdkafka 依赖 OpenSSL，构建复杂。如需完整功能：

### 安装依赖
```bash
brew install openssl pkg-config
export PKG_CONFIG_PATH="/opt/homebrew/opt/openssl@3/lib/pkgconfig"
export OPENSSL_INCLUDE_DIR="/opt/homebrew/opt/openssl@3/include"
export OPENSSL_LIB_DIR="/opt/homebrew/opt/openssl@3/lib"
```

### 修改 Cargo.toml
移除 rdkafka 的 ssl 特性：
```toml
rdkafka = { version = "0.36", default-features = false, features = ["libz"] }
```

### 修复代码兼容性
需要修复 store.rs、services.rs 等文件中的 API 变更。

---

## 📦 当前可用交付物

| 方案 | 状态 | 命令 |
|------|------|------|
| 浏览器预览 | ✅ 可用 | `npm run dev` |
| Electron | ✅ 可用 | `./build-electron.sh` |
| Tauri 桌面 | ⚠️ 需修复 | - |

---

## 🎉 推荐操作

**现在立即运行浏览器版本：**
```bash
cd kafkit
npm run dev
```

然后在浏览器中测试所有功能！
