/**
 * 会话历史管理功能
 * 支持实例级别和namespace级别的对话记录查看和回放
 */

class ConversationHistoryManager {
    constructor() {
        this.currentInstanceId = null;
        this.currentNamespace = null;
        this.conversations = [];
    }

    /**
     * 显示实例的对话历史
     */
    async showInstanceHistory(instanceId, namespace = null) {
        try {
            this.currentInstanceId = instanceId;
            this.currentNamespace = namespace;

            const response = await fetch(`/api/instances/${instanceId}/conversations?namespace=${namespace || ''}`);
            const data = await response.json();

            if (data.success) {
                this.conversations = data.conversations;
                this.renderHistoryModal('instance', instanceId);
            } else {
                alert('获取对话历史失败: ' + data.error);
            }
        } catch (error) {
            console.error('获取实例对话历史失败:', error);
            alert('获取对话历史失败: ' + error.message);
        }
    }

    /**
     * 显示namespace的对话历史
     */
    async showNamespaceHistory(namespace, limit = 100) {
        try {
            this.currentNamespace = namespace;
            this.currentInstanceId = null;

            const response = await fetch(`/api/namespaces/${namespace}/conversations?limit=${limit}`);
            const data = await response.json();

            if (data.success) {
                this.conversations = data.conversations;
                this.renderHistoryModal('namespace', namespace);
            } else {
                alert('获取namespace对话历史失败: ' + data.error);
            }
        } catch (error) {
            console.error('获取namespace对话历史失败:', error);
            alert('获取对话历史失败: ' + error.message);
        }
    }

    /**
     * 回放对话记录
     */
    async replayConversations(targetType, targetName, options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit);
            if (options.since) params.append('since', options.since);

            const response = await fetch(`/api/replay/${targetType}/${targetName}?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderReplayModal(targetType, targetName, data.data);
            } else {
                alert('回放对话记录失败: ' + data.error);
            }
        } catch (error) {
            console.error('回放对话记录失败:', error);
            alert('回放失败: ' + error.message);
        }
    }

    /**
     * 渲染历史记录模态框
     */
    renderHistoryModal(type, name) {
        const modalId = 'conversationHistoryModal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = this.createHistoryModal(modalId);
            document.body.appendChild(modal);
        }

        // 更新模态框标题
        const title = modal.querySelector('.modal-title');
        title.textContent = `${type === 'instance' ? '实例' : 'Namespace'} "${name}" 的对话历史`;

        // 渲染对话内容
        const content = modal.querySelector('.conversation-content');
        content.innerHTML = this.renderConversations();

        // 显示模态框
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * 渲染回放模态框
     */
    renderReplayModal(type, name, data) {
        const modalId = 'conversationReplayModal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = this.createReplayModal(modalId);
            document.body.appendChild(modal);
        }

        // 更新模态框标题
        const title = modal.querySelector('.modal-title');
        title.textContent = `回放 ${type === 'instance' ? '实例' : 'Namespace'} "${name}" 的对话记录`;

        // 渲染回放内容
        const content = modal.querySelector('.replay-content');
        content.innerHTML = this.renderReplayData(data);

        // 显示模态框
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * 创建历史记录模态框
     */
    createHistoryModal(modalId) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">对话历史</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="conversationHistory.exportHistory()">
                                    <i class="fas fa-download"></i> 导出
                                </button>
                                <button class="btn btn-outline-info" onclick="conversationHistory.refreshHistory()">
                                    <i class="fas fa-refresh"></i> 刷新
                                </button>
                            </div>
                            <small class="text-muted">共 ${this.conversations.length} 条记录</small>
                        </div>
                        <div class="conversation-content" style="height: 500px; overflow-y: auto;">
                            <!-- 对话内容 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * 创建回放模态框
     */
    createReplayModal(modalId) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">对话回放</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="replay-controls mb-3">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-success" onclick="conversationHistory.startReplay()">
                                    <i class="fas fa-play"></i> 开始回放
                                </button>
                                <button class="btn btn-outline-warning" onclick="conversationHistory.pauseReplay()">
                                    <i class="fas fa-pause"></i> 暂停
                                </button>
                                <button class="btn btn-outline-danger" onclick="conversationHistory.stopReplay()">
                                    <i class="fas fa-stop"></i> 停止
                                </button>
                            </div>
                            <div class="ms-3 d-inline-block">
                                <label class="form-label me-2">回放速度:</label>
                                <select class="form-select form-select-sm d-inline-block" style="width: auto;" onchange="conversationHistory.setReplaySpeed(this.value)">
                                    <option value="0.5">0.5x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="2">2x</option>
                                    <option value="5">5x</option>
                                </select>
                            </div>
                        </div>
                        <div class="replay-content" style="height: 500px; overflow-y: auto;">
                            <!-- 回放内容 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * 渲染对话内容
     */
    renderConversations() {
        if (!this.conversations || this.conversations.length === 0) {
            return '<div class="text-center text-muted p-4">暂无对话记录</div>';
        }

        let html = '';
        this.conversations.forEach(conv => {
            const time = new Date(conv.timestamp).toLocaleString();
            const senderClass = conv.sender === 'user' ? 'text-primary' : 
                               conv.sender === 'system' ? 'text-warning' : 'text-success';
            
            html += `
                <div class="conversation-item mb-3 p-3 border rounded">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="fw-bold ${senderClass}">${conv.sender}</span>
                        <small class="text-muted">${time}</small>
                    </div>
                    <div class="message-content">
                        ${this.formatMessage(conv.message)}
                    </div>
                    ${conv.instance_id ? `<small class="text-muted">实例: ${conv.instance_id}</small>` : ''}
                </div>
            `;
        });

        return html;
    }

    /**
     * 渲染回放数据
     */
    renderReplayData(data) {
        if (data.text) {
            // 纯文本格式
            return `<pre class="bg-light p-3 rounded">${data.text}</pre>`;
        } else if (data.conversations) {
            // JSON格式的对话数据
            return this.renderConversations();
        } else {
            return '<div class="text-center text-muted p-4">无回放数据</div>';
        }
    }

    /**
     * 格式化消息内容
     */
    formatMessage(message) {
        // 简单的Markdown渲染
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * 导出历史记录
     */
    exportHistory() {
        if (!this.conversations || this.conversations.length === 0) {
            alert('没有可导出的对话记录');
            return;
        }

        const data = {
            export_time: new Date().toISOString(),
            instance_id: this.currentInstanceId,
            namespace: this.currentNamespace,
            conversations: this.conversations
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_history_${this.currentInstanceId || this.currentNamespace}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 刷新历史记录
     */
    async refreshHistory() {
        if (this.currentInstanceId) {
            await this.showInstanceHistory(this.currentInstanceId, this.currentNamespace);
        } else if (this.currentNamespace) {
            await this.showNamespaceHistory(this.currentNamespace);
        }
    }

    // 回放控制方法（占位符，可以根据需要实现）
    startReplay() {
        console.log('开始回放');
    }

    pauseReplay() {
        console.log('暂停回放');
    }

    stopReplay() {
        console.log('停止回放');
    }

    setReplaySpeed(speed) {
        console.log('设置回放速度:', speed);
    }
}

// 全局实例
const conversationHistory = new ConversationHistoryManager();

// 导出到全局
window.conversationHistory = conversationHistory;
window.ConversationHistoryManager = ConversationHistoryManager;
