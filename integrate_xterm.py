#!/usr/bin/env python3
"""
快速集成xterm.js的脚本
替换现有的Web终端实现
"""

import os
import shutil

def backup_original_files():
    """备份原始文件"""
    files_to_backup = [
        'app/static/js/web_terminal.js',
        'app/static/css/web_terminal.css',
        'app/templates/chat_manager.html'
    ]
    
    backup_dir = 'backup_original'
    os.makedirs(backup_dir, exist_ok=True)
    
    for file_path in files_to_backup:
        if os.path.exists(file_path):
            backup_path = os.path.join(backup_dir, os.path.basename(file_path))
            shutil.copy2(file_path, backup_path)
            print(f"✅ 备份: {file_path} -> {backup_path}")

def create_xterm_integration():
    """创建xterm.js集成文件"""
    
    # 1. 更新HTML模板
    html_template = '''
<!-- 在chat_manager.html的head部分添加 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />

<!-- 在body结束前添加 -->
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
'''
    
    # 2. 创建新的Web终端JS
    js_content = '''
/**
 * 基于xterm.js的专业Web终端
 */
class XTermWebTerminal {
    constructor(instanceId) {
        this.instanceId = instanceId;
        this.terminal = null;
        this.fitAddon = null;
        this.isConnected = false;
        this.modal = null;
    }
    
    create() {
        // 创建模态框
        this.modal = document.createElement('div');
        this.modal.className = 'modal fade web-terminal-modal';
        this.modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-dark text-light">
                        <h5 class="modal-title">Web终端 - 实例 ${this.instanceId}</h5>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-warning" onclick="this.detach()">分离</button>
                            <button class="btn btn-sm btn-danger" onclick="this.terminate()">终止</button>
                            <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                    </div>
                    <div class="modal-body p-0">
                        <div id="xterm-container-${this.instanceId}" style="height: 500px;"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // 初始化xterm.js
        this.terminal = new Terminal({
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff',
                selection: '#3a3d41',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5'
            },
            fontSize: 14,
            fontFamily: 'Fira Code, Courier New, monospace',
            cursorBlink: true,
            scrollback: 1000
        });
        
        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        
        // 打开终端
        this.terminal.open(document.getElementById(`xterm-container-${this.instanceId}`));
        this.fitAddon.fit();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 显示模态框
        const modalInstance = new bootstrap.Modal(this.modal);
        modalInstance.show();
        
        return true;
    }
    
    setupEventListeners() {
        // WebSocket事件
        socket.on('terminal_output', (data) => {
            if (data.instance_id === this.instanceId && this.terminal) {
                this.terminal.write(data.output);
            }
        });
        
        // 终端输入
        this.terminal.onData((data) => {
            if (this.isConnected) {
                socket.emit('terminal_input', {
                    instance_id: this.instanceId,
                    input: data
                });
            }
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            if (this.fitAddon) {
                this.fitAddon.fit();
            }
        });
        
        // 模态框显示时调整大小
        this.modal.addEventListener('shown.bs.modal', () => {
            if (this.fitAddon) {
                setTimeout(() => this.fitAddon.fit(), 100);
            }
        });
    }
    
    connect() {
        socket.emit('join_terminal', { instance_id: this.instanceId });
        this.isConnected = true;
        this.terminal.writeln('\\r\\n[Web终端已连接]\\r\\n');
    }
    
    detach() {
        if (this.isConnected) {
            socket.emit('terminal_detach', { instance_id: this.instanceId });
            this.terminal.writeln('\\r\\n[tmux会话已分离，继续在后台运行]\\r\\n');
            this.close();
        }
    }
    
    terminate() {
        if (this.isConnected) {
            socket.emit('terminal_terminate', { instance_id: this.instanceId });
            this.terminal.writeln('\\r\\n[Web终端连接已终止]\\r\\n');
            this.close();
        }
    }
    
    close() {
        this.isConnected = false;
        if (this.modal) {
            const modalInstance = bootstrap.Modal.getInstance(this.modal);
            if (modalInstance) {
                modalInstance.hide();
            }
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
            }, 300);
        }
    }
}

// 全局函数，供按钮调用
function createWebTerminal(instanceId) {
    const terminal = new XTermWebTerminal(instanceId);
    if (terminal.create()) {
        terminal.connect();
    }
}
'''
    
    # 3. 创建简化的Thinking组件
    thinking_js = '''
/**
 * 简化的Thinking状态显示
 */
class SimpleThinking {
    constructor() {
        this.instances = {};
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    }
    
    start(instanceId, message = 'Thinking...') {
        // 如果已经有thinking显示，先停止
        this.stop(instanceId);
        
        const container = document.getElementById('chatHistory');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-message p-3 mb-2 border-start border-primary border-3';
        thinkingDiv.id = `thinking-${instanceId}`;
        thinkingDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="thinking-spinner me-2 text-primary">⠋</span>
                <span class="text-primary">${message}</span>
            </div>
        `;
        
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;
        
        // 启动动画
        let frameIndex = 0;
        const interval = setInterval(() => {
            const spinner = thinkingDiv.querySelector('.thinking-spinner');
            if (spinner) {
                frameIndex = (frameIndex + 1) % this.frames.length;
                spinner.textContent = this.frames[frameIndex];
            }
        }, 100);
        
        this.instances[instanceId] = { div: thinkingDiv, interval };
    }
    
    stop(instanceId, finalMessage = null) {
        const instance = this.instances[instanceId];
        if (instance) {
            clearInterval(instance.interval);
            
            if (finalMessage) {
                instance.div.innerHTML = `
                    <div class="d-flex align-items-center">
                        <span class="me-2 text-success">✓</span>
                        <span class="text-success">完成</span>
                    </div>
                `;
                // 2秒后移除
                setTimeout(() => {
                    if (instance.div.parentNode) {
                        instance.div.parentNode.removeChild(instance.div);
                    }
                }, 2000);
            } else {
                // 直接移除
                if (instance.div.parentNode) {
                    instance.div.parentNode.removeChild(instance.div);
                }
            }
            
            delete this.instances[instanceId];
        }
    }
}

// 全局实例
window.simpleThinking = new SimpleThinking();

// 集成到现有的WebSocket处理
const originalStreamingHandler = socket._callbacks['$instance_streaming_response'] || [];
socket.off('instance_streaming_response');

socket.on('instance_streaming_response', function(data) {
    // 检查是否是thinking状态
    if (data.accumulated_content.includes('Thinking...')) {
        window.simpleThinking.start(data.instance_id, 'AI正在思考...');
        return;
    }
    
    // 停止thinking显示
    window.simpleThinking.stop(data.instance_id);
    
    // 调用原有处理逻辑
    originalStreamingHandler.forEach(handler => handler(data));
});
'''
    
    # 写入文件
    with open('app/static/js/xterm_terminal.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    with open('app/static/js/simple_thinking.js', 'w', encoding='utf-8') as f:
        f.write(thinking_js)
    
    print("✅ 创建了新的集成文件:")
    print("   - app/static/js/xterm_terminal.js")
    print("   - app/static/js/simple_thinking.js")
    
    print("\n📝 手动步骤:")
    print("1. 在 chat_manager.html 的 <head> 中添加:")
    print("   <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css\" />")
    print("\n2. 在 </body> 前添加:")
    print("   <script src=\"https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js\"></script>")
    print("   <script src=\"https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js\"></script>")
    print("   <script src=\"{{ url_for('static', filename='js/simple_thinking.js') }}\"></script>")
    print("   <script src=\"{{ url_for('static', filename='js/xterm_terminal.js') }}\"></script>")

def main():
    print("🚀 开始集成xterm.js...")
    
    # 备份原始文件
    backup_original_files()
    
    # 创建集成文件
    create_xterm_integration()
    
    print("\n✅ 集成完成！")
    print("\n🎯 优势:")
    print("   - 专业的终端体验")
    print("   - 完整的ANSI颜色支持") 
    print("   - 优化的Thinking显示")
    print("   - 无需复杂的自定义实现")

if __name__ == "__main__":
    main()
