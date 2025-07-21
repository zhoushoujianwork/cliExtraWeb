#!/bin/bash

# Q Chat Manager 环境检查脚本

echo "=== Q Chat Manager 环境检查 ==="
echo ""

# 检查Python
echo "1. 检查Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ $PYTHON_VERSION"
else
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查Q CLI
echo ""
echo "2. 检查Q CLI..."
if command -v q &> /dev/null; then
    Q_VERSION=$(q --version 2>&1 | head -1)
    echo "✅ $Q_VERSION"
else
    echo "❌ Q CLI 未安装"
    echo "请安装: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/cli-install.html"
fi

# 检查tmux
echo ""
echo "3. 检查tmux..."
if command -v tmux &> /dev/null; then
    TMUX_VERSION=$(tmux -V)
    echo "✅ $TMUX_VERSION"
else
    echo "❌ tmux 未安装"
    echo "请安装:"
    echo "  macOS: brew install tmux"
    echo "  Linux: sudo apt-get install tmux"
    exit 1
fi

# 检查虚拟环境
echo ""
echo "4. 检查虚拟环境..."
if [ -d "venv" ]; then
    echo "✅ 虚拟环境存在"
    
    # 检查依赖
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        if python3 -c "import flask" 2>/dev/null; then
            echo "✅ Flask 已安装"
        else
            echo "⚠️  Flask 未安装，需要运行启动脚本"
        fi
        deactivate 2>/dev/null || true
    fi
else
    echo "⚠️  虚拟环境不存在，需要运行启动脚本"
fi

# 检查tmux脚本
echo ""
echo "5. 检查tmux脚本..."
if [ -f "bin/screen_q_chat.sh" ]; then
    if [ -x "bin/screen_q_chat.sh" ]; then
        echo "✅ tmux脚本存在且可执行"
    else
        echo "⚠️  tmux脚本存在但不可执行"
        chmod +x bin/screen_q_chat.sh
        echo "✅ 已修复脚本权限"
    fi
else
    echo "❌ tmux脚本不存在"
    exit 1
fi

# 检查启动脚本
echo ""
echo "6. 检查启动脚本..."
for script in "start.sh" "start_new.sh"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "✅ $script 存在且可执行"
        else
            echo "⚠️  $script 存在但不可执行"
            chmod +x "$script"
            echo "✅ 已修复 $script 权限"
        fi
    else
        echo "❌ $script 不存在"
    fi
done

echo ""
echo "=== 检查完成 ==="
echo ""
echo "🚀 如果所有检查都通过，可以运行:"
echo "  ./start.sh"
echo "  或"
echo "  ./start_new.sh"
echo ""
echo "🌐 应用将在 http://localhost:5001 启动"
