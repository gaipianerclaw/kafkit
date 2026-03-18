#!/bin/bash

# Kafkit 桌面应用构建脚本
# 使用方法: ./build-desktop.sh

set -e

echo "=========================================="
echo "🚀 Kafkit 桌面应用构建"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 确保 cargo 在 PATH 中
export PATH="$HOME/.cargo/bin:$PATH"
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# 检查 Rust
echo ""
echo "📦 检查 Rust 环境..."
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}✗ Rust 未安装${NC}"
    echo "请先安装 Rust:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo -e "${GREEN}✓ Rust: $(rustc --version)${NC}"
echo -e "${GREEN}✓ Cargo: $(cargo --version)${NC}"

# 检查 Node.js
echo ""
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

# 进入项目目录
cd "$(dirname "$0")/kafkit"
echo ""
echo "📂 项目目录: $(pwd)"

# 安装前端依赖
echo ""
echo "📥 安装前端依赖..."
npm install

# 构建前端
echo ""
echo "🔨 构建前端..."
npm run build

# 添加 Tauri 目标（如果是 Mac）
echo ""
echo "🎯 配置构建目标..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "检测到 macOS，添加 aarch64-apple-darwin 目标..."
    rustup target add aarch64-apple-darwin 2>/dev/null || true
fi

# 构建桌面应用
echo ""
echo "🚀 构建桌面应用..."
echo "   这可能需要 5-15 分钟，请耐心等待..."
echo ""

cargo tauri build

# 检查构建结果
echo ""
echo "=========================================="
echo "📦 构建完成!"
echo "=========================================="

PLATFORM=$(uname -s)
ARCH=$(uname -m)

# 查找构建产物
if [[ "$OSTYPE" == "darwin"* ]]; then
    BUNDLE_DIR="src-tauri/target/release/bundle"
    if [ -d "$BUNDLE_DIR" ]; then
        echo ""
        echo -e "${GREEN}✓ 安装包位置:${NC}"
        find "$BUNDLE_DIR" -name "*.dmg" -o -name "*.app" 2>/dev/null | while read f; do
            size=$(du -h "$f" | cut -f1)
            echo "  📄 $f ($size)"
        done
        
        echo ""
        echo "🎉 安装方法:"
        echo "  1. 双击 .dmg 文件"
        echo "  2. 将 Kafkit 拖到 Applications 文件夹"
        echo "  3. 从 Launchpad 或 Applications 启动 Kafkit"
    fi
    
    # 显示可执行文件位置
    if [ -f "src-tauri/target/release/kafkit" ]; then
        echo ""
        echo "⚡ 直接运行（无需安装）:"
        echo "  ./src-tauri/target/release/kafkit"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    BUNDLE_DIR="src-tauri/target/release/bundle"
    if [ -d "$BUNDLE_DIR/deb" ]; then
        echo -e "${GREEN}✓ 安装包:${NC}"
        ls -lh $BUNDLE_DIR/deb/*.deb 2>/dev/null || true
        echo ""
        echo "安装命令:"
        echo "  sudo dpkg -i $BUNDLE_DIR/deb/*.deb"
    fi
fi

echo ""
echo "=========================================="
echo "🎊 构建成功!"
echo "=========================================="
