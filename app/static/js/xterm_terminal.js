
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
        this.terminal.writeln('\r\n[Web终端已连接]\r\n');
    }
    
    detach() {
        if (this.isConnected) {
            socket.emit('terminal_detach', { instance_id: this.instanceId });
            this.terminal.writeln('\r\n[tmux会话已分离，继续在后台运行]\r\n');
            this.close();
        }
    }
    
    terminate() {
        if (this.isConnected) {
            socket.emit('terminal_terminate', { instance_id: this.instanceId });
            this.terminal.writeln('\r\n[Web终端连接已终止]\r\n');
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
