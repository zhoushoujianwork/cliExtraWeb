#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试交互终端功能
"""

import sys
import os
import time
import subprocess
import requests
import json

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_interactive_terminal():
    """测试交互终端功能"""
    print("🧪 测试交互终端功能")
    
    # 1. 检查Web终端管理器是否可用
    try:
        from app.services.web_terminal import web_terminal_manager
        print("✅ Web终端管理器导入成功")
    except ImportError as e:
        print(f"❌ Web终端管理器导入失败: {e}")
        return False
    
    # 2. 检查依赖包
    try:
        import pexpect
        print("✅ pexpect 包可用")
    except ImportError:
        print("❌ pexpect 包未安装，请运行: pip install pexpect")
        return False
    
    # 3. 检查tmux是否可用
    try:
        result = subprocess.run(['tmux', '-V'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ tmux 可用: {result.stdout.strip()}")
        else:
            print("❌ tmux 不可用")
            return False
    except FileNotFoundError:
        print("❌ tmux 未安装，请安装tmux")
        return False
    
    # 4. 检查cliExtra是否可用
    try:
        result = subprocess.run(['cliExtra', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ cliExtra 可用")
        else:
            print("❌ cliExtra 不可用")
            return False
    except FileNotFoundError:
        print("❌ cliExtra 未安装")
        return False
    
    # 5. 测试Web终端管理器基本功能
    print("\n📋 测试Web终端管理器基本功能:")
    
    # 获取活跃终端列表
    active_terminals = web_terminal_manager.get_active_terminals()
    print(f"当前活跃终端数量: {len(active_terminals)}")
    
    # 清理所有终端
    web_terminal_manager.cleanup_all()
    print("✅ 清理所有终端完成")
    
    print("\n🎯 交互终端功能测试完成")
    return True

def test_frontend_integration():
    """测试前端集成"""
    print("\n🌐 测试前端集成")
    
    # 检查模板文件是否包含交互功能
    template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                'app', 'templates', 'chat_manager.html')
    
    if not os.path.exists(template_path):
        print("❌ 模板文件不存在")
        return False
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查关键功能是否存在
    checks = [
        ('toggleTerminalMode', '切换终端模式函数'),
        ('isInteractiveMode', '交互模式标志'),
        ('terminal_connected', 'WebSocket连接事件'),
        ('terminal_input', 'WebSocket输入事件'),
        ('toggle-terminal-mode', '切换按钮ID')
    ]
    
    for check, desc in checks:
        if check in content:
            print(f"✅ {desc} 存在")
        else:
            print(f"❌ {desc} 缺失")
            return False
    
    print("✅ 前端集成检查完成")
    return True

def test_websocket_events():
    """测试WebSocket事件"""
    print("\n🔌 测试WebSocket事件")
    
    # 检查WebSocket处理文件
    websocket_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                 'app', 'views', 'websocket.py')
    
    if not os.path.exists(websocket_path):
        print("❌ WebSocket处理文件不存在")
        return False
    
    with open(websocket_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查关键WebSocket事件
    events = [
        'join_terminal',
        'leave_terminal', 
        'terminal_input',
        'terminal_resize',
        'terminal_detach',
        'terminal_terminate'
    ]
    
    for event in events:
        if f"@socketio.on('{event}')" in content:
            print(f"✅ WebSocket事件 {event} 存在")
        else:
            print(f"❌ WebSocket事件 {event} 缺失")
            return False
    
    print("✅ WebSocket事件检查完成")
    return True

def main():
    """主测试函数"""
    print("🚀 开始测试交互终端功能\n")
    
    tests = [
        test_interactive_terminal,
        test_frontend_integration,
        test_websocket_events
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            results.append(False)
        print()
    
    # 总结
    passed = sum(results)
    total = len(results)
    
    print("=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有测试通过！交互终端功能已就绪")
        return True
    else:
        print("⚠️  部分测试失败，请检查相关功能")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
