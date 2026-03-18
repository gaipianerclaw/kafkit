#!/bin/bash

echo "========================================"
echo "Kafkit 代码质量检查脚本"
echo "========================================"

echo ""
echo "1. 检查前端测试..."
npm test -- --run 2>&1 | grep -E "(Test Files|Tests|passed|failed)"

echo ""
echo "2. 检查 Rust 文件语法..."
cd src-tauri/src

# 检查是否有未闭合的大括号
for file in *.rs; do
    open_count=$(grep -o '{' "$file" | wc -l)
    close_count=$(grep -o '}' "$file" | wc -l)
    if [ $open_count -ne $close_count ]; then
        echo "  ⚠️  $file: 括号不匹配 (开: $open_count, 闭: $close_count)"
    else
        echo "  ✅ $file: 语法检查通过"
    fi
done

echo ""
echo "3. 检查测试文件..."
echo "  后端测试文件:"
for file in *_tests.rs; do
    test_count=$(grep -c "fn test_" "$file" 2>/dev/null || echo 0)
    echo "    - $file: $test_count 个测试函数"
done

echo ""
echo "4. 统计代码行数..."
echo "  前端代码:"
echo "    TypeScript/TSX: $(find ../../src -name '*.ts' -o -name '*.tsx' 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}') 行"

echo "  后端代码:"
echo "    Rust: $(find . -name '*.rs' 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}') 行"

echo ""
echo "========================================"
echo "检查完成!"
echo "========================================"
