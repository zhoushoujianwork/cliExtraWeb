// Web终端JavaScript组件

class WebTerminal {
    constructor(instanceId) {
        this.instanceId = instanceId;
        this.isConnected = false;
        this.modal = null;
        this.terminalElement = null;
        this.inputElement = null;
        this.statusElement = null;
        this.buffer = '';
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // WebSocket事件监听
        socket.on('terminal_output', (data) => {
            if (data.instance_id === this.instanceId) {
                this.appendOutput(data.output);
            }
        });
        
        socket.on('terminal_joined', (data) => {
            if (data.instance_id === this.instanceId) {
                this.updateStatus('connected');
                console.log(`已加入Web终端房间: ${this.instanceId}`);
            }
        });
        
        socket.on('terminal_left', (data) => {
            if (data.instance_id === this.instanceId) {
                this.updateStatus('disconnected');
                console.log(`已离开Web终端房间: ${this.instanceId}`);
            }
        });
    }
    
    async create() {
        try {
            // 创建Web终端
            const response = await fetch(`/api/terminal/create/${this.instanceId}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showModal();
                this.connectWebSocket();
                return true;
            } else {
                alert('创建Web终端失败: ' + result.error);
                return false;
            }
        } catch (error) {
            console.error('创建Web终端失败:', error);
            alert('创建Web终端失败: ' + error.message);
            return false;
        }
    }
    
    showModal() {
        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade web-terminal-modal" id="webTerminalModal_${this.instanceId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="web-terminal-toolbar">
                            <h6 class="web-terminal-title">Web终端 - 实例 ${this.instanceId}</h6>
                            <div class="web-terminal-controls">
                                <button class="web-terminal-btn web-terminal-btn-detach" onclick="webTerminals['${this.instanceId}'].detach()">
                                    分离 (Ctrl+A,D)
                                </button>
                                <button class="web-terminal-btn web-terminal-btn-terminate" onclick="webTerminals['${this.instanceId}'].terminate()">
                                    终止连接
                                </button>
                                <button class="web-terminal-btn web-terminal-btn-close" onclick="webTerminals['${this.instanceId}'].close()">
                                    关闭
                                </button>
                            </div>
                        </div>
                        <div class="modal-body">
                            <div class="web-terminal-container">
                                <div class="web-terminal-status disconnected" id="terminalStatus_${this.instanceId}">
                                    未连接
                                </div>
                                <div class="web-terminal" id="terminal_${this.instanceId}"></div>
                                <input type="text" class="web-terminal-input" id="terminalInput_${this.instanceId}" 
                                       placeholder="输入命令..." autocomplete="off">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById(`webTerminalModal_${this.instanceId}`);
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 获取元素引用
        this.modal = new bootstrap.Modal(document.getElementById(`webTerminalModal_${this.instanceId}`));
        this.terminalElement = document.getElementById(`terminal_${this.instanceId}`);
        this.inputElement = document.getElementById(`terminalInput_${this.instanceId}`);
        this.statusElement = document.getElementById(`terminalStatus_${this.instanceId}`);
        
        // 设置输入事件
        this.setupInputHandlers();
        
        // 显示模态框
        this.modal.show();
        
        // 模态框关闭时清理
        document.getElementById(`webTerminalModal_${this.instanceId}`).addEventListener('hidden.bs.modal', () => {
            this.cleanup();
        });
        
        // 聚焦到输入框
        setTimeout(() => {
            this.inputElement.focus();
        }, 500);
    }
    
    setupInputHandlers() {
        // 输入框事件
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const input = this.inputElement.value;
                this.sendInput(input + '\r');
                this.inputElement.value = '';
                e.preventDefault();
            } else if (e.key === 'Tab') {
                this.sendInput('\t');
                e.preventDefault();
            } else if (e.ctrlKey) {
                // 处理Ctrl组合键
                if (e.key === 'c') {
                    this.sendInput('\x03'); // Ctrl+C
                    e.preventDefault();
                } else if (e.key === 'd') {
                    this.sendInput('\x04'); // Ctrl+D
                    e.preventDefault();
                } else if (e.key === 'z') {
                    this.sendInput('\x1a'); // Ctrl+Z
                    e.preventDefault();
                }
            }
        });
        
        // 处理特殊按键
        this.inputElement.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp') {
                this.sendInput('\x1b[A'); // 上箭头
            } else if (e.key === 'ArrowDown') {
                this.sendInput('\x1b[B'); // 下箭头
            } else if (e.key === 'ArrowRight') {
                this.sendInput('\x1b[C'); // 右箭头
            } else if (e.key === 'ArrowLeft') {
                this.sendInput('\x1b[D'); // 左箭头
            }
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.updateTerminalSize();
        });
    }
    
    connectWebSocket() {
        // 加入Web终端房间
        socket.emit('join_terminal', { instance_id: this.instanceId });
    }
    
    sendInput(input) {
        if (this.isConnected) {
            socket.emit('terminal_input', {
                instance_id: this.instanceId,
                input: input
            });
        }
    }
    
    appendOutput(output) {
        if (this.terminalElement) {
            // 处理ANSI转义序列，保留颜色
            const processedOutput = this.processAnsiCodes(output);
            
            // 创建临时元素来处理HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.terminalElement.innerHTML + processedOutput;
            
            // 限制内容长度
            const lines = tempDiv.innerHTML.split('\n');
            if (lines.length > 1000) {
                tempDiv.innerHTML = lines.slice(-800).join('\n');
            }
            
            this.terminalElement.innerHTML = tempDiv.innerHTML;
            
            // 自动滚动到底部
            this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
        }
    }
    
    processAnsiCodes(text) {
        if (!text) return '';
        
        // ANSI颜色映射
        const ansiColors = {
            '30': '#000000', '31': '#ff6b6b', '32': '#51cf66', '33': '#ffd43b',
            '34': '#74c0fc', '35': '#d0bfff', '36': '#3bc9db', '37': '#f8f9fa',
            '90': '#868e96', '91': '#ff8787', '92': '#69db7c', '93': '#ffe066',
            '94': '#91a7ff', '95': '#e599f7', '96': '#66d9ef', '97': '#ffffff',
            '40': '#000000', '41': '#ff6b6b', '42': '#51cf66', '43': '#ffd43b',
            '44': '#74c0fc', '45': '#d0bfff', '46': '#3bc9db', '47': '#f8f9fa'
        };
        
        // 处理ANSI转义序列
        let result = text.replace(/\x1b\[([0-9;]+)m/g, (match, codes) => {
            const codeList = codes.split(';');
            const styles = [];
            
            for (const code of codeList) {
                if (code === '0' || code === '') {
                    return '</span><span style="color: #d4d4d4;">';
                } else if (code === '1') {
                    styles.push('font-weight: bold');
                } else if (code === '2') {
                    styles.push('opacity: 0.7');
                } else if (code === '3') {
                    styles.push('font-style: italic');
                } else if (code === '4') {
                    styles.push('text-decoration: underline');
                } else if (ansiColors[code]) {
                    if (code.startsWith('4')) {
                        styles.push(`background-color: ${ansiColors[code]}`);
                    } else {
                        styles.push(`color: ${ansiColors[code]}`);
                    }
                }
            }
            
            if (styles.length > 0) {
                return `</span><span style="${styles.join('; ')}">`;
            }
            return '';
        });
        
        // 包装在span中以确保样式正确
        result = `<span style="color: #d4d4d4;">${result}</span>`;
        
        // 处理换行
        result = result.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>');
        
        return result;
    }
    
    updateStatus(status) {
        if (this.statusElement) {
            this.statusElement.className = `web-terminal-status ${status}`;
            this.statusElement.textContent = status === 'connected' ? '已连接' : '未连接';
            this.isConnected = (status === 'connected');
        }
    }
    
    updateTerminalSize() {
        if (this.terminalElement) {
            const rect = this.terminalElement.getBoundingClientRect();
            const rows = Math.floor(rect.height / 20); // 假设行高20px
            const cols = Math.floor(rect.width / 8);   // 假设字符宽8px
            
            socket.emit('terminal_resize', {
                instance_id: this.instanceId,
                rows: Math.max(rows, 10),
                cols: Math.max(cols, 40)
            });
        }
    }
    
    async detach() {
        try {
            const response = await fetch(`/api/terminal/detach/${this.instanceId}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.appendOutput('\r\n[tmux会话已分离，继续在后台运行]\r\n');
                setTimeout(() => {
                    this.close();
                }, 2000);
            } else {
                alert('分离失败: ' + result.error);
            }
        } catch (error) {
            console.error('分离Web终端失败:', error);
            alert('分离失败: ' + error.message);
        }
    }
    
    async terminate() {
        if (confirm('确定要终止Web终端连接吗？这不会影响Screen会话本身。')) {
            try {
                const response = await fetch(`/api/terminal/terminate/${this.instanceId}`, {
                    method: 'POST'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.appendOutput('\r\n[Web终端连接已终止]\r\n');
                    setTimeout(() => {
                        this.close();
                    }, 1000);
                } else {
                    alert('终止失败: ' + result.error);
                }
            } catch (error) {
                console.error('终止Web终端失败:', error);
                alert('终止失败: ' + error.message);
            }
        }
    }
    
    close() {
        if (this.modal) {
            this.modal.hide();
        }
    }
    
    cleanup() {
        // 离开WebSocket房间
        socket.emit('leave_terminal', { instance_id: this.instanceId });
        
        // 清理DOM
        const modalElement = document.getElementById(`webTerminalModal_${this.instanceId}`);
        if (modalElement) {
            modalElement.remove();
        }
        
        // 从全局对象中移除
        if (window.webTerminals && window.webTerminals[this.instanceId]) {
            delete window.webTerminals[this.instanceId];
        }
        
        console.log(`Web终端已清理: ${this.instanceId}`);
    }
}

// 全局Web终端管理
window.webTerminals = window.webTerminals || {};

// 创建Web终端的全局函数
function createWebTerminal(instanceId) {
    // 如果已存在，先关闭
    if (window.webTerminals[instanceId]) {
        window.webTerminals[instanceId].close();
    }
    
    // 创建新的Web终端
    const terminal = new WebTerminal(instanceId);
    window.webTerminals[instanceId] = terminal;
    
    return terminal.create();
}

// 页面卸载时清理所有Web终端
window.addEventListener('beforeunload', () => {
    if (window.webTerminals) {
        Object.values(window.webTerminals).forEach(terminal => {
            terminal.cleanup();
        });
    }
});
