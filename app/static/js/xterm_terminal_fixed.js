/**
 * 修复版本：真正连接tmux会话的Web终端
 */
class XTermWebTerminal {
    constructor(instanceId) {
        this.instanceId = instanceId;
        this.terminal = null;
        this.fitAddon = null;
        this.isConnected = false;
        this.modal = null;
        this.sessionName = null;
    }
    
    async create() {
        try {
            // 1. 获取tmux会话信息
            const sessionInfo = await this.getSessionInfo();
            if (!sessionInfo) {
                alert('无法获取实例的tmux会话信息');
                return false;
            }
            
            this.sessionName = sessionInfo.session;
            
            // 2. 创建模态框
            this.createModal();
            
            // 3. 初始化xterm.js
            this.initTerminal();
            
            // 4. 连接到tmux会话
            await this.connectToTmux();
            
            // 5. 显示模态框
            const modalInstance = new bootstrap.Modal(this.modal);
            modalInstance.show();
            
            return true;
        } catch (error) {
            console.error('创建Web终端失败:', error);
            alert('创建Web终端失败: ' + error.message);
            return false;
        }
    }
    
    async getSessionInfo() {
        try {
            const response = await fetch(`/api/instances/${this.instanceId}/session-info`);
            if (!response.ok) {
                throw new Error('获取会话信息失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取会话信息失败:', error);
            return null;
        }
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal fade web-terminal-modal';
        this.modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content bg-dark">
                    <div class="modal-header bg-secondary text-light border-0">
                        <h5 class="modal-title">
                            <i class="fas fa-terminal me-2"></i>
                            tmux会话: ${this.sessionName}
                        </h5>
                        <div class="d-flex gap-2">
                            <span id="connection-status-${this.instanceId}" class="badge bg-warning">连接中...</span>
                            <button class="btn btn-sm btn-warning" onclick="webTerminals['${this.instanceId}'].detach()">
                                <i class="fas fa-eject me-1"></i>分离
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="webTerminals['${this.instanceId}'].terminate()">
                                <i class="fas fa-times me-1"></i>终止
                            </button>
                            <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                    </div>
                    <div class="modal-body p-0">
                        <div id="xterm-container-${this.instanceId}" style="height: 600px; background: #1e1e1e;"></div>
                    </div>
                    <div class="modal-footer bg-secondary border-0 py-2">
                        <small class="text-light">
                            <i class="fas fa-info-circle me-1"></i>
                            使用 Ctrl+B, D 分离会话 | ESC 退出全屏
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    initTerminal() {
        this.terminal = new Terminal({
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff',
                selection: '#3a3d41',
                black: '#000000',
                red: '#ff6b6b',
                green: '#51cf66',
                yellow: '#ffd43b',
                blue: '#74c0fc',
                magenta: '#d0bfff',
                cyan: '#3bc9db',
                white: '#f8f9fa',
                brightBlack: '#868e96',
                brightRed: '#ff8787',
                brightGreen: '#69db7c',
                brightYellow: '#ffe066',
                brightBlue: '#91a7ff',
                brightMagenta: '#e599f7',
                brightCyan: '#66d9ef',
                brightWhite: '#ffffff'
            },
            fontSize: 14,
            fontFamily: 'Fira Code, Courier New, monospace',
            cursorBlink: true,
            scrollback: 10000,
            allowTransparency: false
        });
        
        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        
        // 打开终端
        this.terminal.open(document.getElementById(`xterm-container-${this.instanceId}`));
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 调整大小
        setTimeout(() => {
            this.fitAddon.fit();
        }, 100);
    }
    
    setupEventListeners() {
        // 终端输入处理
        this.terminal.onData((data) => {
            if (this.isConnected) {
                // 发送输入到后端
                socket.emit('terminal_input', {
                    instance_id: this.instanceId,
                    session_name: this.sessionName,
                    input: data
                });
            }
        });
        
        // WebSocket事件监听
        socket.on('terminal_output', (data) => {
            if (data.instance_id === this.instanceId && this.terminal) {
                this.terminal.write(data.output);
            }
        });
        
        socket.on('terminal_connected', (data) => {
            if (data.instance_id === this.instanceId) {
                this.isConnected = true;
                this.updateConnectionStatus('connected', '已连接');
                this.terminal.writeln('\\r\\n\\x1b[32m[Web终端已连接到tmux会话]\\x1b[0m\\r\\n');
            }
        });
        
        socket.on('terminal_disconnected', (data) => {
            if (data.instance_id === this.instanceId) {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected', '已断开');
                this.terminal.writeln('\\r\\n\\x1b[31m[tmux会话连接已断开]\\x1b[0m\\r\\n');
            }
        });
        
        socket.on('terminal_error', (data) => {
            if (data.instance_id === this.instanceId) {
                this.terminal.writeln(`\\r\\n\\x1b[31m[错误: ${data.error}]\\x1b[0m\\r\\n`);
            }
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            if (this.fitAddon && this.modal.classList.contains('show')) {
                setTimeout(() => this.fitAddon.fit(), 100);
            }
        });
        
        // 模态框事件
        this.modal.addEventListener('shown.bs.modal', () => {
            setTimeout(() => {
                if (this.fitAddon) {
                    this.fitAddon.fit();
                }
                if (this.terminal) {
                    this.terminal.focus();
                }
            }, 200);
        });
        
        this.modal.addEventListener('hidden.bs.modal', () => {
            this.cleanup();
        });
    }
    
    async connectToTmux() {
        return new Promise((resolve, reject) => {
            // 设置超时
            const timeout = setTimeout(() => {
                reject(new Error('连接tmux会话超时'));
            }, 10000);
            
            // 监听连接成功事件
            const onConnected = (data) => {
                if (data.instance_id === this.instanceId) {
                    clearTimeout(timeout);
                    socket.off('terminal_connected', onConnected);
                    socket.off('terminal_error', onError);
                    resolve();
                }
            };
            
            // 监听连接错误事件
            const onError = (data) => {
                if (data.instance_id === this.instanceId) {
                    clearTimeout(timeout);
                    socket.off('terminal_connected', onConnected);
                    socket.off('terminal_error', onError);
                    reject(new Error(data.error));
                }
            };
            
            socket.on('terminal_connected', onConnected);
            socket.on('terminal_error', onError);
            
            // 发送连接请求
            socket.emit('join_terminal', {
                instance_id: this.instanceId,
                session_name: this.sessionName
            });
        });
    }
    
    updateConnectionStatus(status, text) {
        const statusElement = document.getElementById(`connection-status-${this.instanceId}`);
        if (statusElement) {
            statusElement.className = `badge bg-${status === 'connected' ? 'success' : status === 'disconnected' ? 'danger' : 'warning'}`;
            statusElement.textContent = text;
        }
    }
    
    async detach() {
        if (this.isConnected) {
            this.terminal.writeln('\\r\\n\\x1b[33m[正在分离tmux会话...]\\x1b[0m\\r\\n');
            
            socket.emit('terminal_detach', {
                instance_id: this.instanceId,
                session_name: this.sessionName
            });
            
            setTimeout(() => {
                this.close();
            }, 1000);
        }
    }
    
    async terminate() {
        if (this.isConnected) {
            const confirmed = confirm('确定要终止Web终端连接吗？tmux会话将继续在后台运行。');
            if (confirmed) {
                this.terminal.writeln('\\r\\n\\x1b[31m[正在终止Web终端连接...]\\x1b[0m\\r\\n');
                
                socket.emit('terminal_terminate', {
                    instance_id: this.instanceId,
                    session_name: this.sessionName
                });
                
                setTimeout(() => {
                    this.close();
                }, 1000);
            }
        }
    }
    
    close() {
        this.cleanup();
        
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
    
    cleanup() {
        this.isConnected = false;
        
        // 清理WebSocket监听器
        socket.off('terminal_output');
        socket.off('terminal_connected');
        socket.off('terminal_disconnected');
        socket.off('terminal_error');
        
        // 发送离开事件
        if (this.sessionName) {
            socket.emit('leave_terminal', {
                instance_id: this.instanceId,
                session_name: this.sessionName
            });
        }
        
        // 清理终端
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
        
        // 从全局注册表中移除
        if (window.webTerminals && window.webTerminals[this.instanceId]) {
            delete window.webTerminals[this.instanceId];
        }
    }
}

// 全局终端注册表
window.webTerminals = window.webTerminals || {};

// 全局函数，供按钮调用
async function createWebTerminal(instanceId) {
    try {
        // 如果已经有终端，先关闭
        if (window.webTerminals[instanceId]) {
            window.webTerminals[instanceId].close();
        }
        
        const terminal = new XTermWebTerminal(instanceId);
        window.webTerminals[instanceId] = terminal;
        
        const success = await terminal.create();
        if (!success) {
            delete window.webTerminals[instanceId];
        }
    } catch (error) {
        console.error('创建Web终端失败:', error);
        alert('创建Web终端失败: ' + error.message);
    }
}
