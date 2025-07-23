#!/usr/bin/env python3
"""
聊天快捷键功能测试脚本
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
            print(f"🧪 测试页面: http://localhost:{PORT}/test_keyboard_shortcuts.html")
            print(f"📁 服务目录: {test_dir}")
            print("\n" + "="*50)
            print("快捷键测试说明:")
            print("="*50)
            print("1. Enter - 发送消息")
            print("2. Shift+Enter - 换行")
            print("3. Esc - 清空输入框")
            print("4. Ctrl+L - 清空聊天记录")
            print("5. Ctrl+K - 聚焦到输入框")
            print("6. ↑ (输入框为空时) - 上一条历史消息")
            print("7. ↓ - 下一条历史消息")
            print("8. Ctrl+1-9 - 插入快速文本")
            print("9. F1 或 Ctrl+/ - 显示快捷键帮助")
            print("="*50)
            print("\n按 Ctrl+C 停止服务器")
            
            # 自动打开浏览器
            test_url = f"http://localhost:{PORT}/test_keyboard_shortcuts.html"
            webbrowser.open(test_url)
            
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
    print("🧪 开始快捷键功能测试...")
    
    # 检查必要文件是否存在
    project_root = Path(__file__).parent.parent
    chat_js = project_root / "app" / "static" / "js" / "chat_functionality.js"
    test_html = project_root / "test" / "test_keyboard_shortcuts.html"
    
    print(f"📁 项目根目录: {project_root}")
    print(f"📄 聊天功能JS: {chat_js}")
    print(f"📄 测试页面: {test_html}")
    
    if not chat_js.exists():
        print(f"❌ 找不到聊天功能文件: {chat_js}")
        return False
        
    if not test_html.exists():
        print(f"❌ 找不到测试页面: {test_html}")
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
        'saveMessageToHistory'
    ]
    
    missing_functions = []
    for func in required_functions:
        if f'function {func}' not in js_content:
            missing_functions.append(func)
    
    if missing_functions:
        print(f"❌ 缺少以下函数: {', '.join(missing_functions)}")
        return False
    
    print("✅ 所有必要函数都存在")
    return True

def main():
    """主函数"""
    print("🎯 聊天快捷键功能测试工具")
    print("="*40)
    
    if len(sys.argv) > 1 and sys.argv[1] == '--check':
        # 只检查功能，不启动服务器
        if run_functionality_test():
            print("\n✅ 功能测试通过!")
            return 0
        else:
            print("\n❌ 功能测试失败!")
            return 1
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
