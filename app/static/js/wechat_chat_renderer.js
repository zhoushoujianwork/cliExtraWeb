/**
 * 微信风格聊天记录渲染器
 * 完全仿照微信的聊天界面设计
 */

class WeChatChatRenderer {
    constructor() {
        this.roleAvatars = {
            'frontend-engineer': {
                emoji: '🎨',
                name: '前端工程师',
                color: '#007bff'
            },
            'backend-engineer': {
                emoji: '⚙️',
                name: '后端工程师',
                color: '#28a745'
            },
            'fullstack': {
                emoji: '🚀',
                name: '全栈工程师',
                color: '#6f42c1'
            },
            'golang': {
                emoji: '🐹',
                name: 'Go专家',
                color: '#00add8'
            },
            'python': {
                emoji: '🐍',
                name: 'Python专家',
                color: '#3776ab'
            },
            'vue': {
                emoji: '💚',
                name: 'Vue专家',
                color: '#4fc08d'
            },
            'devops-engineer': {
                emoji: '🔧',
                name: '运维工程师',
                color: '#fd7e14'
            },
            'default': {
                emoji: '🤖',
                name: 'AI助手',
                color: '#17a2b8'
            }
        };
    }
    
    /**
     * 渲染聊天记录到指定容器
     * @param {Array} conversations - 对话数组
     * @param {string} containerId - 容器ID
     * @param {string} instanceRole - 实例角色
     */
    renderChatMessages(conversations, containerId, instanceRole = 'default') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ 容器未找到:', containerId);
            return;
        }
        
        if (!conversations || conversations.length === 0) {
            this.renderEmptyState(container);
            return;
        }
        
        console.log('🎨 开始渲染', conversations.length, '条聊天消息');
        
        // 清空容器并添加微信聊天样式类
        container.innerHTML = '';
        container.className = 'wechat-chat-container';
        
        // 渲染每条消息
        conversations.forEach((conv, index) => {
            const messageElement = this.createWeChatMessage(conv, index, instanceRole);
            container.appendChild(messageElement);
        });
        
        // 初始化代码高亮
        this.initializeCodeHighlight(container);
        
        // 滚动到底部
        this.scrollToBottom(container);
        
        console.log('✅ 微信风格聊天消息渲染完成');
    }
    
    /**
     * 创建微信风格消息元素
     * @param {Object} conversation - 对话对象
     * @param {number} index - 消息索引
     * @param {string} instanceRole - 实例角色
     * @returns {HTMLElement} 消息元素
     */
    createWeChatMessage(conversation, index, instanceRole) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'wechat-message-item';
        messageDiv.setAttribute('data-message-id', conversation.id);
        
        if (conversation.type === 'system') {
            // 系统消息 - 居中显示
            messageDiv.innerHTML = this.createSystemMessage(conversation);
        } else {
            // 用户或AI消息
            const isUser = conversation.type === 'user';
            const roleInfo = isUser ? 
                { emoji: '👤', name: '用户', color: '#007bff' } : 
                (this.roleAvatars[instanceRole] || this.roleAvatars['default']);
            
            messageDiv.innerHTML = this.createChatMessage(conversation, isUser, roleInfo);
        }
        
        return messageDiv;
    }
    
    /**
     * 创建聊天消息（用户或AI）
     * @param {Object} conversation - 对话对象
     * @param {boolean} isUser - 是否为用户消息
     * @param {Object} roleInfo - 角色信息
     * @returns {string} HTML字符串
     */
    createChatMessage(conversation, isUser, roleInfo) {
        const renderedContent = this.renderMessageContent(conversation);
        
        return `
            <div class="wechat-message ${isUser ? 'user-message' : 'assistant-message'}">
                <div class="message-layout ${isUser ? 'user-layout' : 'assistant-layout'}">
                    <div class="message-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}">
                        <div class="avatar-container" style="background-color: ${roleInfo.color}">
                            <span class="avatar-emoji">${roleInfo.emoji}</span>
                        </div>
                    </div>
                    <div class="message-content-area">
                        <div class="message-info">
                            <span class="sender-name">${roleInfo.name}</span>
                            <span class="message-time">${conversation.timestamp}</span>
                        </div>
                        <div class="message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}">
                            <div class="bubble-content">
                                ${renderedContent}
                            </div>
                            <div class="bubble-tail ${isUser ? 'user-tail' : 'assistant-tail'}"></div>
                        </div>
                        <div class="message-actions">
                            <button class="action-copy" onclick="copyWeChatMessage('${conversation.id}')" title="复制">
                                复制
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 创建系统消息
     * @param {Object} conversation - 对话对象
     * @returns {string} HTML字符串
     */
    createSystemMessage(conversation) {
        return `
            <div class="wechat-system-message">
                <div class="system-message-content">
                    <span class="system-time">${conversation.timestamp}</span>
                    <span class="system-text">${conversation.content}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 渲染消息内容
     * @param {Object} conversation - 对话对象
     * @returns {string} 渲染后的内容
     */
    renderMessageContent(conversation) {
        let content = conversation.content;
        
        // 如果需要富文本渲染且渲染器可用
        if (conversation.needsRichText && window.richTextRenderer && window.richTextRenderer.isReady()) {
            try {
                return window.richTextRenderer.render(content);
            } catch (error) {
                console.warn('富文本渲染失败，使用原始内容:', error);
            }
        }
        
        // 基本的HTML转义和格式化
        content = this.escapeHtml(content);
        
        // 保持换行
        content = content.replace(/\n/g, '<br>');
        
        // 简单的链接识别
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        return content;
    }
    
    /**
     * 渲染空状态
     * @param {HTMLElement} container - 容器元素
     */
    renderEmptyState(container) {
        container.innerHTML = `
            <div class="wechat-empty-state">
                <div class="empty-icon">💬</div>
                <div class="empty-text">暂无聊天记录</div>
                <div class="empty-subtext">该实例还没有生成对话记录</div>
            </div>
        `;
    }
    
    /**
     * 初始化代码高亮
     * @param {HTMLElement} container - 容器元素
     */
    initializeCodeHighlight(container) {
        if (window.hljs) {
            container.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightElement(block);
            });
        }
    }
    
    /**
     * 滚动到底部
     * @param {HTMLElement} container - 容器元素
     */
    scrollToBottom(container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
    
    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局函数：复制微信消息内容
function copyWeChatMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"] .bubble-content`);
    if (!messageElement) {
        console.warn('未找到消息元素:', messageId);
        return;
    }
    
    const textContent = messageElement.textContent || messageElement.innerText;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textContent).then(() => {
            console.log('✅ 消息内容已复制');
            showWeChatCopySuccess();
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyText(textContent);
        });
    } else {
        fallbackCopyText(textContent);
    }
}

// 显示复制成功提示（微信风格）
function showWeChatCopySuccess() {
    const toast = document.createElement('div');
    toast.className = 'wechat-copy-toast';
    toast.textContent = '已复制';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 1500);
}

// 备用复制方法
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        console.log('✅ 使用备用方法复制成功');
        showWeChatCopySuccess();
    } catch (err) {
        console.error('备用复制方法也失败:', err);
    }
    
    document.body.removeChild(textArea);
}

// 创建全局实例
window.weChatChatRenderer = new WeChatChatRenderer();

// 导出类
window.WeChatChatRenderer = WeChatChatRenderer;

console.log('🎨 微信风格聊天渲染器已加载完成');
    
    /**
     * 渲染聊天记录到指定容器
     * @param {Array} conversations - 对话数组
     * @param {string} containerId - 容器ID
     */
    renderChatMessages(conversations, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ 容器未找到:', containerId);
            return;
        }
        
        if (!conversations || conversations.length === 0) {
            this.renderEmptyState(container);
            return;
        }
        
        console.log('🎨 开始渲染', conversations.length, '条聊天消息');
        
        // 清空容器并添加聊天样式类
        container.innerHTML = '';
        container.className = 'wechat-chat-container';
        
        // 渲染每条消息
        conversations.forEach((conv, index) => {
            const messageElement = this.createMessageElement(conv, index);
            container.appendChild(messageElement);
        });
        
        // 初始化代码高亮
        this.initializeCodeHighlight(container);
        
        // 滚动到底部
        this.scrollToBottom(container);
        
        console.log('✅ 聊天消息渲染完成');
    }
    
    /**
     * 创建消息元素
     * @param {Object} conversation - 对话对象
     * @param {number} index - 消息索引
     * @returns {HTMLElement} 消息元素
     */
    createMessageElement(conversation, index) {
        const config = this.messageConfigs[conversation.type] || this.messageConfigs['assistant'];
        const messageDiv = document.createElement('div');
        
        messageDiv.className = `wechat-message ${conversation.type}-message`;
        messageDiv.setAttribute('data-message-id', conversation.id);
        messageDiv.setAttribute('data-message-index', index);
        
        // 处理消息内容
        const renderedContent = this.renderMessageContent(conversation);
        
        // 根据消息类型创建不同的布局
        if (conversation.type === 'system') {
            messageDiv.innerHTML = this.createSystemMessage(conversation, config, renderedContent);
        } else {
            messageDiv.innerHTML = this.createUserOrAssistantMessage(conversation, config, renderedContent);
        }
        
        return messageDiv;
    }
    
    /**
     * 创建用户或AI消息
     * @param {Object} conversation - 对话对象
     * @param {Object} config - 配置对象
     * @param {string} renderedContent - 渲染后的内容
     * @returns {string} HTML字符串
     */
    createUserOrAssistantMessage(conversation, config, renderedContent) {
        const isUser = conversation.type === 'user';
        const flexDirection = isUser ? 'row-reverse' : 'row';
        const marginClass = isUser ? 'ms-3' : 'me-3';
        
        return `
            <div class="message-wrapper d-flex ${flexDirection} mb-3">
                <div class="message-avatar ${marginClass}">
                    <div class="avatar-circle" style="background-color: ${config.avatarBg}">
                        <i class="${config.icon}"></i>
                    </div>
                </div>
                <div class="message-content-wrapper" style="max-width: 70%;">
                    <div class="message-header ${isUser ? 'text-end' : 'text-start'} mb-1">
                        <span class="message-sender">${config.label}</span>
                        <span class="message-time">${conversation.timestamp}</span>
                    </div>
                    <div class="message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}" 
                         style="background-color: ${config.bubbleColor}; color: ${config.textColor};">
                        <div class="message-content">
                            ${renderedContent}
                        </div>
                        <div class="message-actions">
                            <button class="action-btn copy-btn" onclick="copyMessageContent('${conversation.id}')" title="复制">
                                <i class="fas fa-copy"></i>
                            </button>
                            ${conversation.needsRichText ? `
                                <button class="action-btn raw-btn" onclick="toggleRawContent('${conversation.id}')" title="查看原始内容">
                                    <i class="fas fa-code"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 创建系统消息
     * @param {Object} conversation - 对话对象
     * @param {Object} config - 配置对象
     * @param {string} renderedContent - 渲染后的内容
     * @returns {string} HTML字符串
     */
    createSystemMessage(conversation, config, renderedContent) {
        return `
            <div class="system-message-wrapper text-center mb-3">
                <div class="system-message-bubble">
                    <i class="${config.icon}" style="color: ${config.avatarBg}"></i>
                    <span class="system-time">${conversation.timestamp}</span>
                    <div class="system-content">${renderedContent}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 渲染消息内容
     * @param {Object} conversation - 对话对象
     * @returns {string} 渲染后的内容
     */
    renderMessageContent(conversation) {
        let content = conversation.content;
        
        // 如果需要富文本渲染且渲染器可用
        if (conversation.needsRichText && window.richTextRenderer && window.richTextRenderer.isReady()) {
            try {
                return window.richTextRenderer.render(content);
            } catch (error) {
                console.warn('富文本渲染失败，使用原始内容:', error);
            }
        }
        
        // 基本的HTML转义和格式化
        content = this.escapeHtml(content);
        
        // 保持换行
        content = content.replace(/\n/g, '<br>');
        
        // 简单的链接识别
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        return content;
    }
    
    /**
     * 渲染空状态
     * @param {HTMLElement} container - 容器元素
     */
    renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-chat-state">
                <div class="empty-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <div class="empty-title">暂无聊天记录</div>
                <div class="empty-subtitle">该实例还没有生成对话记录</div>
            </div>
        `;
    }
    
    /**
     * 初始化代码高亮
     * @param {HTMLElement} container - 容器元素
     */
    initializeCodeHighlight(container) {
        if (window.hljs) {
            container.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightElement(block);
            });
        }
    }
    
    /**
     * 滚动到底部
     * @param {HTMLElement} container - 容器元素
     */
    scrollToBottom(container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
    
    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局函数：复制消息内容
function copyMessageContent(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"] .message-content`);
    if (!messageElement) {
        console.warn('未找到消息元素:', messageId);
        return;
    }
    
    const textContent = messageElement.textContent || messageElement.innerText;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textContent).then(() => {
            console.log('✅ 消息内容已复制');
            showCopySuccess();
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopy(textContent);
        });
    } else {
        fallbackCopy(textContent);
    }
}

// 全局函数：切换原始内容显示
function toggleRawContent(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"] .message-content`);
    if (!messageElement) return;
    
    const isRaw = messageElement.classList.contains('raw-content');
    
    if (isRaw) {
        // 切换回渲染内容
        messageElement.classList.remove('raw-content');
        // 这里需要重新渲染内容，暂时简化处理
        console.log('切换到渲染内容');
    } else {
        // 切换到原始内容
        messageElement.classList.add('raw-content');
        console.log('切换到原始内容');
    }
}

// 显示复制成功提示
function showCopySuccess() {
    // 创建临时提示
    const toast = document.createElement('div');
    toast.className = 'copy-success-toast';
    toast.innerHTML = '<i class="fas fa-check"></i> 已复制';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 备用复制方法
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        console.log('✅ 使用备用方法复制成功');
        showCopySuccess();
    } catch (err) {
        console.error('备用复制方法也失败:', err);
    }
    
    document.body.removeChild(textArea);
}

// 创建全局实例
window.weChatChatRenderer = new WeChatChatRenderer();

// 导出类
window.WeChatChatRenderer = WeChatChatRenderer;

console.log('🎨 WeChatChatRenderer 已加载完成');
