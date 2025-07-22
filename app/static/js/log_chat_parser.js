/**
 * 日志解析和聊天显示功能
 * 解析cliExtra实例日志，提取对话内容，以微信风格显示
 */

class LogChatParser {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
    }
    
    /**
     * 解析日志内容
     */
    parseLogContent(logContent) {
        const lines = logContent.split('\n');
        const conversations = [];
        let currentUserMessage = '';
        let currentAgentMessage = '';
        let isCollectingAgentResponse = false;
        let isCollectingUserInput = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 清理ANSI转义序列
            const cleanLine = this.cleanAnsiCodes(line);
            
            // 检测用户输入 (以 "> " 开头的行)
            if (cleanLine.includes('> ') && !cleanLine.includes('Thinking...')) {
                // 保存之前的agent消息
                if (currentAgentMessage.trim()) {
                    conversations.push({
                        type: 'agent',
                        content: currentAgentMessage.trim(),
                        timestamp: new Date().toLocaleTimeString()
                    });
                    currentAgentMessage = '';
                }
                
                // 提取用户输入
                const userInput = cleanLine.split('> ').pop();
                if (userInput && userInput.trim() && userInput !== 'hi') {
                    currentUserMessage = userInput.trim();
                    isCollectingUserInput = true;
                }
            }
            
            // 检测agent响应开始 (绿色箭头 >)
            else if (cleanLine.includes('>[0m ') || cleanLine.includes('> ')) {
                // 保存用户消息
                if (currentUserMessage.trim()) {
                    conversations.push({
                        type: 'user',
                        content: currentUserMessage.trim(),
                        timestamp: new Date().toLocaleTimeString()
                    });
                    currentUserMessage = '';
                }
                
                // 开始收集agent响应
                const agentStart = cleanLine.split('>[0m ').pop() || cleanLine.split('> ').pop();
                if (agentStart && agentStart.trim()) {
                    currentAgentMessage = agentStart.trim();
                    isCollectingAgentResponse = true;
                }
            }
            
            // 继续收集agent响应
            else if (isCollectingAgentResponse && cleanLine.trim()) {
                // 跳过思考动画和系统信息
                if (!cleanLine.includes('Thinking...') && 
                    !cleanLine.includes('?25h') && 
                    !cleanLine.includes('?2004h') &&
                    !cleanLine.includes('[0m[0m') &&
                    cleanLine.trim() !== '') {
                    currentAgentMessage += '\n' + cleanLine.trim();
                }
            }
            
            // 检测对话结束
            else if (cleanLine.includes('?25h') && cleanLine.includes('?2004h')) {
                isCollectingAgentResponse = false;
            }
        }
        
        // 保存最后的消息
        if (currentUserMessage.trim()) {
            conversations.push({
                type: 'user',
                content: currentUserMessage.trim(),
                timestamp: new Date().toLocaleTimeString()
            });
        }
        
        if (currentAgentMessage.trim()) {
            conversations.push({
                type: 'agent',
                content: currentAgentMessage.trim(),
                timestamp: new Date().toLocaleTimeString()
            });
        }
        
        return conversations;
    }
    
    /**
     * 清理ANSI转义序列
     */
    cleanAnsiCodes(text) {
        return text.replace(/\x1b\[[0-9;]*[mGKH]|\x1b\[[\?]?[0-9]*[hlc]/g, '')
                  .replace(/\[0m/g, '')
                  .replace(/\[39m/g, '')
                  .replace(/\[96m/g, '')
                  .replace(/\[92m/g, '')
                  .replace(/\[90m/g, '')
                  .replace(/\[38;5;[0-9]+m/g, '')
                  .replace(/\[2K/g, '')
                  .replace(/\[1G/g, '')
                  .replace(/\?25[hl]/g, '')
                  .replace(/\?2004[hl]/g, '');
    }
    
    /**
     * 渲染聊天界面
     */
    renderChatMessages(conversations, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        conversations.forEach(msg => {
            const messageDiv = this.createMessageElement(msg);
            container.appendChild(messageDiv);
        });
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * 创建消息元素
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.type}-message mb-3`;
        
        if (message.type === 'user') {
            // 用户消息 - 右侧，蓝色
            messageDiv.innerHTML = `
                <div class="d-flex justify-content-end">
                    <div class="message-bubble user-bubble">
                        <div class="message-content">${this.formatMessageContent(message.content)}</div>
                        <div class="message-time">${message.timestamp}</div>
                    </div>
                    <div class="message-avatar user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
            `;
        } else {
            // Agent消息 - 左侧，灰色
            messageDiv.innerHTML = `
                <div class="d-flex justify-content-start">
                    <div class="message-avatar agent-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-bubble agent-bubble">
                        <div class="message-content">${this.formatMessageContent(message.content)}</div>
                        <div class="message-time">${message.timestamp}</div>
                    </div>
                </div>
            `;
        }
        
        return messageDiv;
    }
    
    /**
     * 格式化消息内容
     */
    formatMessageContent(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/•/g, '•')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
}

// 全局实例
window.logChatParser = new LogChatParser();

/**
 * 从实例日志加载聊天记录
 */
async function loadChatFromInstanceLog(instanceId) {
    try {
        const response = await fetch(`/api/instance/${instanceId}/log`);
        const data = await response.json();
        
        if (data.success && data.log_content) {
            const conversations = window.logChatParser.parseLogContent(data.log_content);
            
            // 显示在聊天界面
            window.logChatParser.renderChatMessages(conversations, 'chatMessages');
            
            // 添加系统消息
            addSystemMessage(`已加载实例 ${instanceId} 的聊天记录，共 ${conversations.length} 条消息`);
            
            return conversations;
        } else {
            throw new Error(data.error || '无法读取日志文件');
        }
    } catch (error) {
        console.error('加载聊天记录失败:', error);
        addSystemMessage(`加载聊天记录失败: ${error.message}`, 'error');
        return [];
    }
}

/**
 * 显示日志聊天记录模态框
 */
function showLogChatModal(instanceId) {
    const modalHtml = `
        <div class="modal fade" id="logChatModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-comments me-2"></i>
                            实例聊天记录 - ${instanceId}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="logChatContainer" class="chat-container">
                            <div class="text-center p-4">
                                <i class="fas fa-spinner fa-spin me-2"></i>
                                正在加载聊天记录...
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        <button type="button" class="btn btn-primary" onclick="loadChatFromInstanceLog('${instanceId}')">
                            <i class="fas fa-sync me-1"></i>刷新
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的模态框
    const existingModal = document.getElementById('logChatModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加新模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('logChatModal'));
    modal.show();
    
    // 加载聊天记录
    setTimeout(() => {
        loadLogChatFromInstance(instanceId);
    }, 500);
}

/**
 * 从实例加载日志聊天记录
 */
async function loadLogChatFromInstance(instanceId) {
    const container = document.getElementById('logChatContainer');
    if (!container) return;
    
    try {
        const response = await fetch(`/api/instance/${instanceId}/log`);
        const data = await response.json();
        
        if (data.success && data.log_content) {
            const conversations = window.logChatParser.parseLogContent(data.log_content);
            
            if (conversations.length > 0) {
                container.innerHTML = '<div id="logChatMessages" class="chat-messages"></div>';
                window.logChatParser.renderChatMessages(conversations, 'logChatMessages');
            } else {
                container.innerHTML = `
                    <div class="text-center p-4 text-muted">
                        <i class="fas fa-comment-slash fa-2x mb-3"></i>
                        <p>暂无聊天记录</p>
                    </div>
                `;
            }
        } else {
            throw new Error(data.error || '无法读取日志文件');
        }
    } catch (error) {
        console.error('加载聊天记录失败:', error);
        container.innerHTML = `
            <div class="text-center p-4 text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <p>加载失败: ${error.message}</p>
            </div>
        `;
    }
}
