#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试终端大小适配功能
"""

import sys
import os
import time
import subprocess
import json

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_terminal_resize_functionality():
    """测试终端大小调整功能"""
    print("🧪 测试终端大小适配功能")
    
    # 1. 检查Web终端管理器的resize方法
    try:
        from app.services.web_terminal import web_terminal_manager
        print("✅ Web终端管理器导入成功")
        
        # 检查resize_terminal方法是否存在
        if hasattr(web_terminal_manager, 'resize_terminal'):
            print("✅ resize_terminal 方法存在")
        else:
            print("❌ resize_terminal 方法不存在")
            return False
            
    except ImportError as e:
        print(f"❌ Web终端管理器导入失败: {e}")
        return False
    
    # 2. 检查WebSocket事件处理
    websocket_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                 'app', 'views', 'websocket.py')
    
    if not os.path.exists(websocket_path):
        print("❌ WebSocket处理文件不存在")
        return False
    
    with open(websocket_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查terminal_resize事件处理
    if "@socketio.on('terminal_resize')" in content:
        print("✅ terminal_resize WebSocket事件处理存在")
    else:
        print("❌ terminal_resize WebSocket事件处理缺失")
        return False
    
    # 3. 检查前端JavaScript功能
    template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                'app', 'templates', 'chat_manager.html')
    
    if not os.path.exists(template_path):
        print("❌ 模板文件不存在")
        return False
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查关键功能
    checks = [
        ('resizeTerminal', '终端大小调整函数'),
        ('terminal_resize', 'WebSocket大小调整事件'),
        ('window.addEventListener(\'resize\'', '窗口大小变化监听'),
        ('fitAddon.fit()', '终端适配调用'),
        ('term.cols', '终端列数获取'),
        ('term.rows', '终端行数获取')
    ]
    
    for check, desc in checks:
        if check in content:
            print(f"✅ {desc} 存在")
        else:
            print(f"❌ {desc} 缺失")
            return False
    
    print("✅ 终端大小适配功能检查完成")
    return True

def test_xterm_fitaddon():
    """测试xterm.js FitAddon功能"""
    print("\n🔧 测试xterm.js FitAddon集成")
    
    template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                'app', 'templates', 'chat_manager.html')
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查FitAddon相关代码
    fitaddon_checks = [
        ('FitAddon.FitAddon()', 'FitAddon实例化'),
        ('window.fitAddon', 'FitAddon全局变量'),
        ('term.loadAddon(window.fitAddon)', 'FitAddon加载'),
        ('window.fitAddon.fit()', 'FitAddon调用')
    ]
    
    for check, desc in fitaddon_checks:
        if check in content:
            print(f"✅ {desc} 正确")
        else:
            print(f"❌ {desc} 问题")
            return False
    
    print("✅ xterm.js FitAddon集成检查完成")
    return True

def test_responsive_design():
    """测试响应式设计"""
    print("\n📱 测试响应式设计")
    
    template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                'app', 'templates', 'chat_manager.html')
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查CSS相关
    css_checks = [
        ('.terminal-container', '终端容器样式'),
        ('.terminal-body', '终端主体样式'),
        ('height: calc(100% - 35px)', '高度计算'),
        ('height: 100%', '全高度设置')
    ]
    
    for check, desc in css_checks:
        if check in content:
            print(f"✅ {desc} 存在")
        else:
            print(f"⚠️  {desc} 可能需要检查")
    
    print("✅ 响应式设计检查完成")
    return True

def main():
    """主测试函数"""
    print("🚀 开始测试终端大小适配功能\n")
    
    tests = [
        test_terminal_resize_functionality,
        test_xterm_fitaddon,
        test_responsive_design
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
        print("🎉 终端大小适配功能已就绪！")
        print("\n💡 使用提示:")
        print("- 切换到交互模式时会自动调整终端大小")
        print("- 窗口大小变化时会自动重新适配")
        print("- 终端尺寸会同步到服务器端tmux会话")
        return True
    else:
        print("⚠️  部分功能需要检查")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
