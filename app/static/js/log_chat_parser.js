/**
 * 增强的日志解析和聊天显示功能
 * 解析cliExtra实例日志，提取对话内容，支持富文本渲染
 */

class LogChatParser {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.messagePatterns = {
            userInput: [
                /^>\s+(.+)$/,                    // > 用户输入
                /^User:\s*(.+)$/i,               // User: 格式
                /^你:\s*(.+)$/,                  // 中文用户标识
                /^Question:\s*(.+)$/i            // Question: 格式
            ],
            agentResponse: [
                /^>\[0m\s+(.+)$/,               // >[0m agent响应
                /^Assistant:\s*(.+)$/i,         // Assistant: 格式
                /^AI:\s*(.+)$/i,                // AI: 格式
                /^回答:\s*(.+)$/,               // 中文回答标识
                /^Answer:\s*(.+)$/i             // Answer: 格式
            ],
            systemMessage: [
                /^System:\s*(.+)$/i,            // System: 格式
                /^系统:\s*(.+)$/,               // 中文系统标识
                /^\[系统\]\s*(.+)$/,            // [系统] 格式
                /^\[INFO\]\s*(.+)$/i,           // [INFO] 格式
                /^\[ERROR\]\s*(.+)$/i           // [ERROR] 格式
            ]
        };
    }
    
    /**
     * 解析日志内容 - 增强版
     */
    parseLogContent(logContent) {
        const lines = logContent.split('\n');
        const conversations = [];
        let currentMessage = {
            type: null,
            content: '',
            timestamp: null,
            isMultiline: false
        };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const cleanLine = this.cleanAnsiCodes(line);
            
            if (!cleanLine.trim()) continue;
            
            // 检测消息类型
            const messageType = this.detectMessageType(cleanLine);
            
            if (messageType) {
                // 保存之前的消息
                if (currentMessage.type && currentMessage.content.trim()) {
                    conversations.push({
                        type: currentMessage.type,
                        content: this.processMessageContent(currentMessage.content.trim()),
                        timestamp: currentMessage.timestamp || new Date().toLocaleTimeString(),
                        raw: currentMessage.content.trim()
                    });
                }
                
                // 开始新消息
                currentMessage = {
                    type: messageType.type,
                    content: messageType.content,
                    timestamp: this.extractTimestamp(line) || new Date().toLocaleTimeString(),
                    isMultiline: true
                };
            } else if (currentMessage.type && this.isMessageContinuation(cleanLine)) {
                // 继续当前消息
                currentMessage.content += '\n' + cleanLine;
            } else if (currentMessage.type) {
                // 消息结束，保存当前消息
                if (currentMessage.content.trim()) {
                    conversations.push({
                        type: currentMessage.type,
                        content: this.processMessageContent(currentMessage.content.trim()),
                        timestamp: currentMessage.timestamp,
                        raw: currentMessage.content.trim()
                    });
                }
                currentMessage = { type: null, content: '', timestamp: null, isMultiline: false };
            }
        }
        
        // 保存最后一条消息
        if (currentMessage.type && currentMessage.content.trim()) {
            conversations.push({
                type: currentMessage.type,
                content: this.processMessageContent(currentMessage.content.trim()),
                timestamp: currentMessage.timestamp || new Date().toLocaleTimeString(),
                raw: currentMessage.content.trim()
            });
        }
        
        return this.filterAndCleanConversations(conversations);
    }
    
    /**
     * 检测消息类型
     */
    detectMessageType(line) {
        // 检测用户输入
        for (const pattern of this.messagePatterns.userInput) {
            const match = line.match(pattern);
            if (match) {
                return {
                    type: 'user',
                    content: match[1].trim()
                };
            }
        }
        
        // 检测AI响应
        for (const pattern of this.messagePatterns.agentResponse) {
            const match = line.match(pattern);
            if (match) {
                return {
                    type: 'agent',
                    content: match[1].trim()
                };
            }
        }
        
        // 检测系统消息
        for (const pattern of this.messagePatterns.systemMessage) {
            const match = line.match(pattern);
            if (match) {
                return {
                    type: 'system',
                    content: match[1].trim()
                };
            }
        }
        
        return null;
    }
    
    /**
     * 判断是否为消息继续行
     */
    isMessageContinuation(line) {
        // 排除明显的分隔符和系统信息
        const excludePatterns = [
            /^=+$/,                             // 等号分隔符
            /^-+$/,                             // 减号分隔符
            /^\[.*\]$/,                         // 方括号包围的系统信息
            /^Thinking\.\.\./,                  // Thinking...
            /^Loading\.\.\./,                   // Loading...
            /^\d{4}-\d{2}-\d{2}/,              // 日期格式
            /^\d{2}:\d{2}:\d{2}/               // 时间格式
        ];
        
        for (const pattern of excludePatterns) {
            if (pattern.test(line)) {
                return false;
            }
        }
        
        return line.trim().length > 0;
    }
    
    /**
     * 处理消息内容
     */
    processMessageContent(content) {
        // 清理多余的空行
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // 处理图片路径引用
        content = content.replace(/\[图片:\s*([^\]]+)\]/g, (match, path) => {
            return `![图片](${path})`;
        });
        
        // 检测并处理代码块
        content = this.detectAndWrapCodeBlocks(content);
        
        // 处理特殊格式
        content = this.processSpecialFormats(content);
        
        return content;
    }
    
    /**
     * 检测并包装代码块
     */
    detectAndWrapCodeBlocks(content) {
        // 检测命令行输出
        const commandPatterns = [
            /^[\$#]\s+.+$/gm,                   // $ 或 # 开头的命令
            /^.*@.*:\s*[\$#]\s+.+$/gm,         // user@host:$ 格式
            /^(npm|yarn|git|docker|kubectl|pip|python|node)\s+.+$/gm  // 常见命令
        ];
        
        let hasCommand = false;
        for (const pattern of commandPatterns) {
            if (pattern.test(content)) {
                hasCommand = true;
                break;
            }
        }
        
        // 如果包含命令且没有代码块标记，自动添加
        if (hasCommand && !content.includes('```')) {
            return '```bash\n' + content + '\n```';
        }
        
        // 检测JSON格式
        if (this.looksLikeJSON(content)) {
            return '```json\n' + content + '\n```';
        }
        
        // 检测Python代码
        if (this.looksLikePython(content)) {
            return '```python\n' + content + '\n```';
        }
        
        return content;
    }
    
    /**
     * 判断是否像JSON
     */
    looksLikeJSON(content) {
        const trimmed = content.trim();
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
               (trimmed.startsWith('[') && trimmed.endsWith(']'));
    }
    
    /**
     * 判断是否像Python代码
     */
    looksLikePython(content) {
        const pythonKeywords = ['def ', 'class ', 'import ', 'from ', 'if __name__', 'print('];
        return pythonKeywords.some(keyword => content.includes(keyword));
    }
    
    /**
     * 处理特殊格式
     */
    processSpecialFormats(content) {
        // 处理状态图标
        content = content.replace(/^(✅|❌|⚠️|📋|🔧|🚀|💡|🎯|📊)\s*(.+)$/gm, 
            (match, icon, text) => `${icon} **${text}**`);
        
        // 处理列表项
        content = content.replace(/^[-*]\s+(.+)$/gm, '- $1');
        
        // 处理编号列表
        content = content.replace(/^\d+\.\s+(.+)$/gm, (match, text, offset, string) => {
            const lineNumber = (string.substring(0, offset).match(/^\d+\./gm) || []).length + 1;
            return `${lineNumber}. ${text}`;
        });
        
        return content;
    }
    
    /**
     * 提取时间戳
     */
    extractTimestamp(line) {
        const timePattern = /(\d{2}:\d{2}:\d{2})/;
        const match = line.match(timePattern);
        return match ? match[1] : null;
    }
    
    /**
     * 过滤和清理对话
     */
    filterAndCleanConversations(conversations) {
        return conversations.filter(conv => {
            // 过滤掉太短的消息
            if (conv.content.length < 3) return false;
            
            // 过滤掉纯系统信息
            const systemNoise = [
                'Thinking...',
                'Loading...',
                'Please wait...',
                '请稍等...',
                'hi'
            ];
            
            if (systemNoise.some(noise => conv.content.includes(noise))) {
                return false;
            }
            
            return true;
        }).map(conv => ({
            ...conv,
            // 为每条消息添加唯一ID
            id: Date.now() + Math.random(),
            // 添加渲染标记
            needsRichText: this.needsRichTextRendering(conv.content)
        }));
    }
    
    /**
     * 判断是否需要富文本渲染
     */
    needsRichTextRendering(content) {
        const richTextIndicators = [
            '```',              // 代码块
            '![',               // 图片
            '**',               // 粗体
            '*',                // 斜体
            '#',                // 标题
            '- ',               // 列表
            '1. ',              // 编号列表
            '✅', '❌', '⚠️'    // 状态图标
        ];
        
        return richTextIndicators.some(indicator => content.includes(indicator));
    }
    
    /**
     * 清理ANSI转义序列 - 增强版
     */
    cleanAnsiCodes(text) {
        return text
            .replace(/\x1b\[[0-9;]*m/g, '')     // ANSI颜色代码
            .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // 其他ANSI序列
            .replace(/\r/g, '')                  // 回车符
            .replace(/\u0007/g, '')              // 响铃符
            .trim();
    }
    
    /**
     * 渲染对话到HTML - 支持富文本
     */
    renderConversations(conversations, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '';
        
        conversations.forEach(conv => {
            const messageClass = conv.type === 'user' ? 'user-message' : 
                                conv.type === 'agent' ? 'agent-message' : 'system-message';
            
            const icon = conv.type === 'user' ? 'fas fa-user' : 
                        conv.type === 'agent' ? 'fas fa-robot' : 'fas fa-cog';
            
            const bgColor = conv.type === 'user' ? 'bg-primary' : 
                           conv.type === 'agent' ? 'bg-success' : 'bg-info';
            
            // 使用富文本渲染器处理内容
            let renderedContent = conv.content;
            if (conv.needsRichText && window.richTextRenderer && window.richTextRenderer.isReady()) {
                try {
                    renderedContent = window.richTextRenderer.render(conv.content);
                } catch (error) {
                    console.warn('富文本渲染失败:', error);
                    renderedContent = this.escapeHtml(conv.content);
                }
            } else {
                renderedContent = `<pre style="white-space: pre-wrap; margin: 0;">${this.escapeHtml(conv.content)}</pre>`;
            }
            
            html += `
                <div class="message-item mb-3 ${messageClass}">
                    <div class="d-flex align-items-start">
                        <div class="message-avatar ${bgColor} text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                            <i class="${icon}"></i>
                        </div>
                        <div class="message-content flex-grow-1">
                            <div class="message-header d-flex justify-content-between align-items-center mb-1">
                                <strong class="message-sender">${conv.type === 'user' ? '用户' : conv.type === 'agent' ? 'AI助手' : '系统'}</strong>
                                <small class="text-muted">${conv.timestamp}</small>
                            </div>
                            <div class="message-body rendered-content">
                                ${renderedContent}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (html === '') {
            html = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-comments fa-2x mb-2"></i>
                    <p>暂无对话记录</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // 如果有代码块，初始化语法高亮
        if (window.hljs) {
            container.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightElement(block);
            });
        }
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局实例
window.logChatParser = new LogChatParser();

// 导出供其他模块使用
window.LogChatParser = LogChatParser;
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
