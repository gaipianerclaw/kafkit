#!/bin/bash

echo "=========================================="
echo "🚀 Kafkit Electron 构建"
echo "=========================================="

cd /Users/lailai/workspace/kimi_workspace/kafka-connector/kafkit

echo ""
echo "📦 安装 Electron 依赖..."
cd electron
npm install

echo ""
echo "🎨 复制前端构建产物..."
cd ..
npm run build

echo ""
echo "🚀 启动 Electron 应用..."
cd electron
npm start
