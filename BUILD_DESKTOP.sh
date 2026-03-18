#!/bin/bash

# Kafkit 桌面应用构建脚本
# 适用于 macOS/Linux

set -e

echo "=========================================="
echo "Kafkit 桌面应用构建脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Rust
echo ""
echo "1. 检查 Rust 环境..."
if ! command -v rustc &> /dev/null; then
    echo -e "${YELLOW}Rust 未安装，正在安装...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo -e "${GREEN}✓ Rust 已安装: $(rustc --version)${NC}"
fi

# 确保 cargo 在 PATH 中
export PATH="$HOME/.cargo/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

# 设置默认工具链
rustup default stable 2>/dev/null || true

# 检查 Node.js
echo ""
echo "2. 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    echo "请先安装 Node.js 18+: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 已安装: $(node --version)${NC}"

# 进入项目目录
echo ""
echo "3. 进入项目目录..."
cd "$(dirname "$0")/kafkit"
echo "当前目录: $(pwd)"

# 安装依赖
echo ""
echo "4. 安装前端依赖..."
npm install

# 安装 Tauri CLI
echo ""
echo "5. 安装 Tauri CLI..."
npm install -g @tauri-apps/cli

# 构建桌面应用
echo ""
echo "6. 构建桌面应用..."
echo "这通常需要 5-15 分钟，取决于你的网络和硬件..."
echo ""

npm run tauri:build

# 检查构建结果
echo ""
echo "7. 检查构建结果..."

PLATFORM=$(uname -s)
ARCH=$(uname -m)

case $PLATFORM in
    Darwin)
        if [ "$ARCH" = "arm64" ]; then
            BUNDLE_PATH="src-tauri/target/release/bundle/dmg/*.dmg"
        else
            BUNDLE_PATH="src-tauri/target/release/bundle/dmg/*.dmg"
        fi
        ;;
    Linux)
        BUNDLE_PATH="src-tauri/target/release/bundle/deb/*.deb"
        ;;
    *)
        BUNDLE_PATH="src-tauri/target/release/bundle/"
        ;;
esac

echo ""
echo "=========================================="
if ls $BUNDLE_PATH 1> /dev/null 2>&1; then
    echo -e "${GREEN}✓ 构建成功！${NC}"
    echo ""
    echo "安装包位置:"
    ls -lh $BUNDLE_PATH | awk '{print "  " $9 " (" $5 ")"}'
    echo ""
    echo "安装方式:"
    case $PLATFORM in
        Darwin)
            echo "  双击 .dmg 文件，将 Kafkit 拖到 Applications 文件夹"
            ;;
        Linux)
            echo "  sudo dpkg -i src-tauri/target/release/bundle/deb/*.deb"
            ;;
    esac
else
    echo -e "${YELLOW}⚠ 构建可能已完成，但未找到标准安装包${NC}"
    echo "请检查 src-tauri/target/release/bundle/ 目录"
fi
echo "=========================================="

echo ""
echo "运行应用:"
echo "  ./src-tauri/target/release/kafkit"
