/**
 * 修复版本：真正连接tmux会话的Web终端
 */

// 全局 Socket.IO 连接
let globalSocket = null;

// 初始化全局 Socket.IO 连接
function initGlobalSocket() {
    if (!globalSocket) {
        globalSocket = io();
        console.log('Socket.IO 连接已初始化');
        
        globalSocket.on('connect', () => {
            console.log('Socket.IO 连接成功');
        });
        
        globalSocket.on('disconnect', () => {
            console.log('Socket.IO 连接断开');
        });
        
        globalSocket.on('error', (error) => {
            console.error('Socket.IO 错误:', error);
        });
    }
    return globalSocket;
}

class XTermWebTerminal {
    constructor(instanceId) {
        this.instanceId = instanceId;
        this.terminal = null;
        this.fitAddon = null;
        this.isConnected = false;
        this.modal = null;
        this.sessionName = null;
        this.socket = initGlobalSocket(); // 使用全局 socket 连接
    }
    
    async create() {
        try {
            // 1. 获取tmux会话信息
            const sessionInfo = await this.getSessionInfo();
            
            this.sessionName = sessionInfo.session;
            console.log('获取到会话信息:', sessionInfo);
            
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
                if (response.status === 404) {
                    throw new Error('实例的 tmux 会话不存在，请重新启动实例');
                } else if (response.status === 400) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '实例状态不正确，无法创建 Web 终端');
                } else {
                    throw new Error(`HTTP ${response.status}: 获取会话信息失败`);
                }
            }
            
            const data = await response.json();
            
            // 检查API响应的success字段
            if (!data.success) {
                throw new Error(data.error || '获取会话信息失败');
            }
            
            // 检查必要的字段
            if (!data.session) {
                throw new Error('会话信息中缺少session字段');
            }
            
            return data;
        } catch (error) {
            console.error('获取会话信息失败:', error);
            throw error; // 重新抛出错误，让上层处理
        }
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal fade web-terminal-modal';
        this.modal.innerHTML = `
            <div class="modal-dialog modal-fullscreen-lg-down modal-xl">
                <div class="modal-content bg-dark" style="height: 90vh;">
                    <div class="modal-header bg-secondary text-light border-0 flex-shrink-0">
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
                    <div class="modal-body p-0 flex-grow-1 d-flex flex-column">
                        <div id="xterm-container-${this.instanceId}" class="flex-grow-1" style="background: #1e1e1e; min-height: 400px;"></div>
                    </div>
                    <div class="modal-footer bg-secondary border-0 py-2 flex-shrink-0">
                        <small class="text-light">
                            <i class="fas fa-info-circle me-1"></i>
                            使用 Ctrl+B, D 分离会话 | ESC 退出全屏 | 终端会自动适配窗口大小
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
        
        // 初始大小调整
        this.resizeTerminal();
    }
    
    setupEventListeners() {
        // 终端输入处理
        this.terminal.onData((data) => {
            if (this.isConnected) {
                // 发送输入到后端
                this.socket.emit('terminal_input', {
                    instance_id: this.instanceId,
                    session_name: this.sessionName,
                    input: data
                });
            }
        });
        
        // WebSocket事件监听
        this.socket.on('terminal_output', (data) => {
            if (data.instance_id === this.instanceId && this.terminal) {
                this.terminal.write(data.output);
            }
        });
        
        this.socket.on('terminal_connected', (data) => {
            if (data.instance_id === this.instanceId) {
                this.isConnected = true;
                this.updateConnectionStatus('connected', '已连接');
                this.terminal.writeln('\\r\\n\\x1b[32m[Web终端已连接到tmux会话]\\x1b[0m\\r\\n');
            }
        });
        
        this.socket.on('terminal_disconnected', (data) => {
            if (data.instance_id === this.instanceId) {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected', '已断开');
                this.terminal.writeln('\\r\\n\\x1b[31m[tmux会话连接已断开]\\x1b[0m\\r\\n');
            }
        });
        
        this.socket.on('terminal_error', (data) => {
            if (data.instance_id === this.instanceId) {
                this.terminal.writeln(`\\r\\n\\x1b[31m[错误: ${data.error}]\\x1b[0m\\r\\n`);
            }
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            if (this.fitAddon && this.modal && this.modal.classList.contains('show')) {
                this.resizeTerminal();
            }
        });
        
        // 模态框事件
        this.modal.addEventListener('shown.bs.modal', () => {
            this.resizeTerminal();
            if (this.terminal) {
                this.terminal.focus();
            }
        });
        
        // 模态框大小变化时调整（如果支持ResizeObserver）
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                if (this.modal && this.modal.classList.contains('show')) {
                    this.resizeTerminal();
                }
            });
            resizeObserver.observe(this.modal.querySelector('.modal-content'));
        }
        
        this.modal.addEventListener('hidden.bs.modal', () => {
            this.cleanup();
        });
    }
    
    resizeTerminal() {
        if (!this.fitAddon || !this.terminal) return;
        
        // 延迟调整，确保DOM已更新
        setTimeout(() => {
            try {
                this.fitAddon.fit();
                
                // 获取调整后的尺寸
                const dimensions = this.fitAddon.proposeDimensions();
                if (dimensions && this.isConnected) {
                    // 通知后端调整tmux会话大小
                    this.socket.emit('terminal_resize', {
                        instance_id: this.instanceId,
                        rows: dimensions.rows,
                        cols: dimensions.cols
                    });
                    
                    console.log(`终端大小已调整: ${dimensions.cols}x${dimensions.rows}`);
                }
            } catch (error) {
                console.error('调整终端大小失败:', error);
            }
        }, 100);
    }
    
    async connectToTmux() {
        console.log(`开始连接tmux会话: ${this.sessionName}`);
        
        return new Promise((resolve, reject) => {
            // 设置超时
            const timeout = setTimeout(() => {
                console.error('连接tmux会话超时');
                reject(new Error('连接tmux会话超时'));
            }, 10000);
            
            // 监听连接成功事件
            const onConnected = (data) => {
                console.log('收到terminal_connected事件:', data);
                if (data.instance_id === this.instanceId) {
                    clearTimeout(timeout);
                    this.socket.off('terminal_connected', onConnected);
                    this.socket.off('terminal_error', onError);
                    console.log('tmux会话连接成功');
                    resolve();
                }
            };
            
            // 监听连接错误事件
            const onError = (data) => {
                console.error('收到terminal_error事件:', data);
                if (data.instance_id === this.instanceId) {
                    clearTimeout(timeout);
                    this.socket.off('terminal_connected', onConnected);
                    this.socket.off('terminal_error', onError);
                    reject(new Error(data.error));
                }
            };
            
            this.socket.on('terminal_connected', onConnected);
            this.socket.on('terminal_error', onError);
            
            // 发送连接请求
            console.log('发送join_terminal请求:', {
                instance_id: this.instanceId,
                session_name: this.sessionName
            });
            
            this.socket.emit('join_terminal', {
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
            
            this.socket.emit('terminal_detach', {
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
                
                this.socket.emit('terminal_terminate', {
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
        this.socket.off('terminal_output');
        this.socket.off('terminal_connected');
        this.socket.off('terminal_disconnected');
        this.socket.off('terminal_error');
        
        // 发送离开事件
        if (this.sessionName) {
            this.socket.emit('leave_terminal', {
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
