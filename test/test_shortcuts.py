#!/usr/bin/env python3
"""
聊天快捷键和工具栏功能测试脚本
"""

import os
import sys
import webbrowser
import http.server
import socketserver
from pathlib import Path

def start_test_server():
    """启动测试服务器"""
    # 获取项目根目录
    project_root = Path(__file__).parent.parent
    test_dir = project_root / "test"
    
    # 切换到测试目录
    os.chdir(test_dir)
    
    # 启动简单的HTTP服务器
    PORT = 8888
    Handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🚀 测试服务器启动成功!")
            print(f"📍 服务地址: http://localhost:{PORT}")
            print(f"🧪 快捷键测试: http://localhost:{PORT}/test_keyboard_shortcuts.html")
            print(f"🔧 工具栏测试: http://localhost:{PORT}/test_toolbar.html")
            print(f"📁 服务目录: {test_dir}")
            print("\n" + "="*60)
            print("功能测试说明:")
            print("="*60)
            print("【快捷键功能】")
            print("1. Enter - 发送消息")
            print("2. Shift+Enter - 换行")
            print("3. Esc - 清空输入框")
            print("4. Ctrl+L - 清空聊天记录")
            print("5. Ctrl+K - 聚焦输入框")
            print("6. ↑/↓ - 浏览历史消息")
            print("7. Ctrl+1-9 - 插入快速文本")
            print("8. F1 - 显示帮助")
            print()
            print("【工具栏功能】")
            print("1. 📤 发送按钮 - 发送消息")
            print("2. ↶ 撤销按钮 - 撤销上一条消息")
            print("3. 🧹 清空按钮 - 清空输入框")
            print("4. 📜 历史按钮 - 重新编辑上一条消息")
            print("5. ⌨️ 帮助按钮 - 显示快捷键帮助")
            print("="*60)
            print("\n按 Ctrl+C 停止服务器")
            
            # 自动打开浏览器
            shortcuts_url = f"http://localhost:{PORT}/test_keyboard_shortcuts.html"
            toolbar_url = f"http://localhost:{PORT}/test_toolbar.html"
            
            print(f"\n🌐 正在打开测试页面...")
            webbrowser.open(shortcuts_url)
            
            # 延迟打开第二个页面
            import threading
            def open_toolbar():
                import time
                time.sleep(2)
                webbrowser.open(toolbar_url)
            
            threading.Thread(target=open_toolbar).start()
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n🛑 测试服务器已停止")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {PORT} 已被占用，请先停止其他服务或使用其他端口")
        else:
            print(f"❌ 启动服务器失败: {e}")

def run_functionality_test():
    """运行功能测试"""
    print("🧪 开始聊天功能测试...")
    
    # 检查必要文件是否存在
    project_root = Path(__file__).parent.parent
    chat_js = project_root / "app" / "static" / "js" / "chat_functionality.js"
    shortcuts_html = project_root / "test" / "test_keyboard_shortcuts.html"
    toolbar_html = project_root / "test" / "test_toolbar.html"
    
    print(f"📁 项目根目录: {project_root}")
    print(f"📄 聊天功能JS: {chat_js}")
    print(f"📄 快捷键测试页面: {shortcuts_html}")
    print(f"📄 工具栏测试页面: {toolbar_html}")
    
    missing_files = []
    if not chat_js.exists():
        missing_files.append(str(chat_js))
    if not shortcuts_html.exists():
        missing_files.append(str(shortcuts_html))
    if not toolbar_html.exists():
        missing_files.append(str(toolbar_html))
    
    if missing_files:
        print(f"❌ 找不到以下文件:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    print("✅ 所有必要文件都存在")
    
    # 检查JavaScript文件中的关键函数
    with open(chat_js, 'r', encoding='utf-8') as f:
        js_content = f.read()
    
    required_functions = [
        'sendMessage',
        'clearMessageInput',
        'clearChatMessages',
        'recallLastMessage',
        'recallNextMessage',
        'insertQuickText',
        'showKeyboardShortcuts',
        'saveMessageToHistory',
        'undoLastMessage',  # 新增的撤销功能
        'updateToolbarButtonStates',  # 新增的工具栏状态管理
        'initToolbar'  # 新增的工具栏初始化
    ]
    
    missing_functions = []
    for func in required_functions:
        if f'function {func}' not in js_content:
            missing_functions.append(func)
    
    if missing_functions:
        print(f"❌ 缺少以下函数: {', '.join(missing_functions)}")
        return False
    
    print("✅ 所有必要函数都存在")
    
    # 检查HTML模板中的工具栏结构
    template_file = project_root / "app" / "templates" / "chat_manager.html"
    if template_file.exists():
        with open(template_file, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        required_elements = [
            'chat-toolbar',
            'toolbar-btn',
            'send-btn',
            'input-wrapper'
        ]
        
        missing_elements = []
        for element in required_elements:
            if element not in template_content:
                missing_elements.append(element)
        
        if missing_elements:
            print(f"⚠️  模板中缺少以下元素: {', '.join(missing_elements)}")
        else:
            print("✅ 模板结构完整")
    
    return True

def main():
    """主函数"""
    print("🎯 聊天快捷键和工具栏功能测试工具")
    print("="*50)
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--check':
            # 只检查功能，不启动服务器
            if run_functionality_test():
                print("\n✅ 功能测试通过!")
                return 0
            else:
                print("\n❌ 功能测试失败!")
                return 1
        elif sys.argv[1] == '--shortcuts':
            # 只测试快捷键
            if run_functionality_test():
                print("\n🚀 启动快捷键测试服务器...")
                PORT = 8888
                shortcuts_url = f"http://localhost:{PORT}/test_keyboard_shortcuts.html"
                webbrowser.open(shortcuts_url)
                return 0
        elif sys.argv[1] == '--toolbar':
            # 只测试工具栏
            if run_functionality_test():
                print("\n🚀 启动工具栏测试服务器...")
                PORT = 8888
                toolbar_url = f"http://localhost:{PORT}/test_toolbar.html"
                webbrowser.open(toolbar_url)
                return 0
    else:
        # 运行功能测试并启动服务器
        if run_functionality_test():
            print("\n🚀 启动测试服务器...")
            start_test_server()
            return 0
        else:
            print("\n❌ 功能测试失败，无法启动服务器")
            return 1

if __name__ == "__main__":
    sys.exit(main())
