/**
 * Tmux 聊天记录模态框管理
 * 整合解析器和渲染器，提供完整的聊天记录查看功能
 */

/**
 * 显示 Tmux 聊天记录模态框
 * @param {string} instanceId - 实例ID
 */
function showTmuxChatModal(instanceId) {
    console.log('🚀 显示实例聊天记录:', instanceId);
    
    const modalHtml = `
        <div class="modal fade" id="tmuxChatModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-comments me-2"></i>
                            实例聊天记录 - ${instanceId}
                        </h5>
                        <div class="modal-header-actions">
                            <button class="btn btn-sm btn-outline-secondary me-2" onclick="toggleDebugMode()" title="调试模式">
                                <i class="fas fa-bug"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="refreshTmuxChat('${instanceId}')" title="刷新">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                    </div>
                    <div class="modal-body p-0">
                        <div id="tmuxChatContainer" class="tmux-chat-container">
                            <div class="loading-state">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">加载中...</span>
                                </div>
                                <p class="mt-3">正在解析聊天记录...</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="chat-stats me-auto">
                            <small class="text-muted" id="chatStatsText">准备就绪</small>
                        </div>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        <button type="button" class="btn btn-primary" onclick="exportChatHistory('${instanceId}')">
                            <i class="fas fa-download"></i> 导出
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的模态框
    const existingModal = document.getElementById('tmuxChatModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加新模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('tmuxChatModal'));
    modal.show();
    
    // 加载聊天记录
    loadTmuxChatHistory(instanceId);
    
    // 模态框关闭后清理
    document.getElementById('tmuxChatModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * 加载 Tmux 聊天历史记录
 * @param {string} instanceId - 实例ID
 */
async function loadTmuxChatHistory(instanceId) {
    const container = document.getElementById('tmuxChatContainer');
    const statsText = document.getElementById('chatStatsText');
    
    if (!container) {
        console.error('❌ 容器未找到');
        return;
    }
    
    try {
        console.log('📡 开始加载实例日志:', instanceId);
        statsText.textContent = '正在获取日志...';
        
        // 获取实例信息和日志内容
        const [logResponse, instanceResponse] = await Promise.all([
            fetch(`/api/instance/${instanceId}/log`),
            fetch(`/api/instances`)
        ]);
        
        const logData = await logResponse.json();
        const instanceData = await instanceResponse.json();
        
        if (!logData.success) {
            throw new Error(logData.error || '获取日志失败');
        }
        
        if (!logData.log_content) {
            throw new Error('日志内容为空');
        }
        
        // 查找实例角色信息
        let instanceRole = 'default';
        if (instanceData.success && instanceData.instances) {
            const instance = instanceData.instances.find(inst => inst.id === instanceId);
            if (instance && instance.role) {
                instanceRole = instance.role;
                console.log('🎭 检测到实例角色:', instanceRole);
            }
        }
        
        console.log('📄 日志获取成功，长度:', logData.log_content.length);
        statsText.textContent = '正在解析对话...';
        
        // 使用 Tmux 聊天解析器解析内容
        const conversations = window.tmuxChatParser.parseLogContent(logData.log_content);
        
        console.log('🎯 解析完成，对话数量:', conversations.length);
        statsText.textContent = `共 ${conversations.length} 条对话`;
        
        // 使用微信风格渲染器渲染聊天记录，传递角色信息
        container.innerHTML = '<div id="tmuxChatMessages" class="tmux-chat-messages"></div>';
        window.weChatChatRenderer.renderChatMessages(conversations, 'tmuxChatMessages', instanceRole);
        
        // 存储对话数据供导出使用
        window.currentChatData = {
            instanceId: instanceId,
            instanceRole: instanceRole,
            conversations: conversations,
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ 聊天记录加载完成');
        
    } catch (error) {
        console.error('❌ 加载聊天记录失败:', error);
        statsText.textContent = '加载失败';
        
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-title">加载失败</div>
                <div class="error-message">${error.message}</div>
                <button class="btn btn-primary mt-3" onclick="loadTmuxChatHistory('${instanceId}')">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
    }
}

/**
 * 刷新聊天记录
 * @param {string} instanceId - 实例ID
 */
function refreshTmuxChat(instanceId) {
    console.log('🔄 刷新聊天记录:', instanceId);
    
    const container = document.getElementById('tmuxChatContainer');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">刷新中...</span>
                </div>
                <p class="mt-3">正在刷新聊天记录...</p>
            </div>
        `;
    }
    
    loadTmuxChatHistory(instanceId);
}

/**
 * 切换调试模式
 */
function toggleDebugMode() {
    if (window.tmuxChatParser.debugMode) {
        window.tmuxChatParser.disableDebug();
        console.log('🐛 调试模式已关闭');
    } else {
        window.tmuxChatParser.enableDebug();
        console.log('🐛 调试模式已开启');
    }
}

/**
 * 导出聊天历史记录
 * @param {string} instanceId - 实例ID
 */
function exportChatHistory(instanceId) {
    if (!window.currentChatData) {
        alert('没有可导出的聊天记录');
        return;
    }
    
    const data = window.currentChatData;
    const exportData = {
        instanceId: data.instanceId,
        exportTime: new Date().toLocaleString('zh-CN'),
        totalMessages: data.conversations.length,
        conversations: data.conversations.map(conv => ({
            type: conv.type,
            content: conv.content,
            timestamp: conv.timestamp
        }))
    };
    
    // 创建下载链接
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history_${instanceId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 聊天记录已导出');
}

// 立即导出到全局作用域
window.showTmuxChatModal = showTmuxChatModal;
window.loadTmuxChatHistory = loadTmuxChatHistory;
window.refreshTmuxChat = refreshTmuxChat;
window.toggleDebugMode = toggleDebugMode;
window.exportChatHistory = exportChatHistory;

console.log('📱 TmuxChatModal 已加载完成');
