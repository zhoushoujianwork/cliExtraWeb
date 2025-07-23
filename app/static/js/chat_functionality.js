/**
 * 聊天功能 - 支持@实例和消息发送
 */

// 全局变量
let availableInstances = [];
let currentAtPosition = -1;

// 发送消息
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
        console.error('找不到消息输入框');
        return;
    }
    
    const message = messageInput.value.trim();
    
    if (!message) {
        showNotification('请输入消息', 'warning');
        return;
    }
    
    // 保存消息到历史记录
    saveMessageToHistory(message);
    
    // 解析@提及
    const { mentions, cleanMessage } = parseMessage(message);
    
    console.log('发送消息:', { message, mentions, cleanMessage });
    
    // 显示用户消息
    const timestamp = new Date().toLocaleTimeString();
    addUserMessage(message, timestamp);
    
    // 清空输入框并重置高度
    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.style.height = '38px'; // 重置为最小高度
    
    // 根据是否有@来决定发送方式
    if (mentions.length > 0) {
        // 有@实例，发送给指定实例
        console.log('发送给指定实例:', mentions);
        sendToSpecificInstances(mentions, cleanMessage || '');
    } else {
        // 没有@，广播给所有实例
        console.log('广播消息');
        broadcastToAllInstances(message);
    }
}

// 解析消息中的@提及
function parseMessage(message) {
    const mentions = [];
    const atPattern = /@(\w+)/g;
    let match;
    
    while ((match = atPattern.exec(message)) !== null) {
        const instanceId = match[1];
        if (!mentions.includes(instanceId)) {
            mentions.push(instanceId);
        }
    }
    
    // 移除@提及，得到纯消息内容
    const cleanMessage = message.replace(/@\w+/g, '').trim();
    
    return { mentions, cleanMessage };
}

// 发送给指定实例
async function sendToSpecificInstances(instanceIds, message) {
    console.log('开始发送给指定实例:', instanceIds, message);
    
    for (const instanceId of instanceIds) {
        try {
            console.log(`发送消息给实例 ${instanceId}:`, message);
            
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instance_id: instanceId,
                    message: message,
                    namespace: getCurrentNamespace() || 'default'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ 消息发送成功给实例 ${instanceId}`);
                addSystemMessage(`消息已发送给实例 ${instanceId}`);
            } else {
                console.error(`❌ 发送失败给实例 ${instanceId}:`, result.error);
                addSystemMessage(`发送失败给实例 ${instanceId}: ${result.error}`);
            }
        } catch (error) {
            console.error(`❌ 发送错误给实例 ${instanceId}:`, error);
            addSystemMessage(`发送错误给实例 ${instanceId}: ${error.message}`);
        }
    }
}

// 广播给所有实例
async function broadcastToAllInstances(message) {
    try {
        console.log('广播消息:', message);
        
        const response = await fetch('/api/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                namespace: getCurrentNamespace() || 'default'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 广播消息发送成功');
            addSystemMessage(`消息已广播给 ${result.sent_count} 个实例`);
        } else {
            console.error('❌ 广播发送失败:', result.error);
            addSystemMessage(`广播发送失败: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ 广播发送错误:', error);
        addSystemMessage(`广播发送错误: ${error.message}`);
    }
}

// 添加用户消息到聊天区域
function addUserMessage(message, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'wechat-message-item';
    messageDiv.innerHTML = `
        <div class="message-layout user-layout">
            <div class="message-avatar user-avatar">
                <div class="avatar-container">
                    <span class="avatar-emoji">👤</span>
                </div>
            </div>
            <div class="message-content-area">
                <div class="message-info">
                    <span class="sender-name">我</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-bubble user-bubble">
                    <div class="bubble-content">${escapeHtml(message)}</div>
                    <div class="bubble-tail user-tail"></div>
                </div>
                <div class="message-actions">
                    <button class="action-copy" onclick="copyMessage(this, '${escapeHtml(message).replace(/'/g, "\\'")}')">
                        复制
                    </button>
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加系统消息到聊天区域
function addSystemMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'wechat-system-message';
    messageDiv.innerHTML = `
        <div class="system-message-content">
            <span class="system-time">${new Date().toLocaleTimeString()}</span>
            <span class="system-content">${escapeHtml(message)}</span>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加实例回复消息
function addInstanceMessage(instanceId, message, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // 根据实例ID生成不同的头像
    const avatarEmoji = getInstanceAvatar(instanceId);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'wechat-message-item';
    messageDiv.innerHTML = `
        <div class="message-layout assistant-layout">
            <div class="message-avatar assistant-avatar">
                <div class="avatar-container">
                    <span class="avatar-emoji">${avatarEmoji}</span>
                </div>
            </div>
            <div class="message-content-area">
                <div class="message-info">
                    <span class="sender-name">${escapeHtml(instanceId)}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-bubble assistant-bubble">
                    <div class="bubble-content">${formatMessage(message)}</div>
                    <div class="bubble-tail assistant-tail"></div>
                </div>
                <div class="message-actions">
                    <button class="action-copy" onclick="copyMessage(this, '${escapeHtml(message).replace(/'/g, "\\'")}')">
                        复制
                    </button>
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// @功能的自动完成
function setupAtCompletion() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    messageInput.addEventListener('input', function(e) {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        // 检查是否在输入@
        const beforeCursor = value.substring(0, cursorPos);
        const atMatch = beforeCursor.match(/@(\w*)$/);
        
        if (atMatch) {
            const query = atMatch[1].toLowerCase();
            showInstanceSuggestions(query, cursorPos - atMatch[0].length);
        } else {
            hideInstanceSuggestions();
        }
    });
    
    // 移除重复的键盘事件监听器，由 initAutoResizeTextarea 统一处理
}

// 显示实例建议
function showInstanceSuggestions(query, atPosition) {
    // 获取匹配的实例
    const matches = availableInstances.filter(instance => 
        instance.id.toLowerCase().includes(query)
    );
    
    if (matches.length === 0) {
        hideInstanceSuggestions();
        return;
    }
    
    // 创建建议列表
    let suggestionBox = document.getElementById('instanceSuggestions');
    if (!suggestionBox) {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'instanceSuggestions';
        suggestionBox.className = 'instance-suggestions position-absolute bg-white border rounded shadow-sm';
        suggestionBox.style.cssText = `
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
            min-width: 200px;
        `;
        document.body.appendChild(suggestionBox);
    }
    
    suggestionBox.innerHTML = matches.map(instance => `
        <div class="suggestion-item p-2 border-bottom cursor-pointer" data-instance-id="${instance.id}">
            <strong>${instance.id}</strong>
            <small class="text-muted ms-2">${instance.status}</small>
        </div>
    `).join('');
    
    // 定位建议框
    const messageInput = document.getElementById('messageInput');
    const rect = messageInput.getBoundingClientRect();
    suggestionBox.style.left = rect.left + 'px';
    suggestionBox.style.top = (rect.top - suggestionBox.offsetHeight - 5) + 'px';
    
    // 添加点击事件
    suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const instanceId = this.dataset.instanceId;
            insertInstanceMention(instanceId, atPosition);
            hideInstanceSuggestions();
        });
    });
    
    currentAtPosition = atPosition;
}

// 隐藏实例建议
function hideInstanceSuggestions() {
    const suggestionBox = document.getElementById('instanceSuggestions');
    if (suggestionBox) {
        suggestionBox.remove();
    }
    currentAtPosition = -1;
}

// 插入实例提及
function insertInstanceMention(instanceId, atPosition) {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const value = messageInput.value;
    const beforeAt = value.substring(0, atPosition);
    const afterCursor = value.substring(messageInput.selectionStart);
    
    const newValue = beforeAt + '@' + instanceId + ' ' + afterCursor;
    messageInput.value = newValue;
    
    // 设置光标位置
    const newCursorPos = atPosition + instanceId.length + 2;
    messageInput.setSelectionRange(newCursorPos, newCursorPos);
    messageInput.focus();
}

// 更新可用实例列表（只包含当前 namespace 的实例）
function updateAvailableInstances(instances) {
    // 根据当前 namespace 过滤实例
    const currentNs = getCurrentNamespace();
    let filteredInstances = instances || [];
    
    if (currentNs) {
        filteredInstances = instances.filter(instance => 
            instance.namespace === currentNs
        );
    }
    
    availableInstances = filteredInstances;
    console.log('更新可用实例列表 (当前namespace:', currentNs, '):', availableInstances);
}

// 获取当前命名空间
function getCurrentNamespace() {
    // 从 simple_namespace.js 获取当前命名空间
    const namespace = window.currentNamespace || null;
    console.log('getCurrentNamespace 调用，返回:', namespace);
    return namespace;
}

// 刷新聊天缓存
async function refreshChatCache() {
    console.log('刷新聊天缓存');
    
    // 显示刷新提示
    addSystemMessage('正在刷新聊天记录缓存...');
    
    try {
        const currentNs = getCurrentNamespace() || 'default';
        console.log('当前namespace:', currentNs);
        
        // 调用刷新缓存API
        const response = await fetch('/api/chat/refresh-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                namespace: currentNs
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('缓存刷新成功，历史记录数量:', result.count);
            
            // 清空当前聊天区域
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // 加载历史记录到聊天界面
            if (result.history && result.history.length > 0) {
                loadHistoryToChat(result.history);
                addSystemMessage(`聊天记录缓存已刷新，加载了 ${result.history.length} 条历史消息`);
            } else {
                addSystemMessage('聊天记录缓存已刷新，暂无历史消息');
            }
        } else {
            console.error('缓存刷新失败:', result.error);
            addSystemMessage(`刷新缓存失败: ${result.error}`);
        }
    } catch (error) {
        console.error('刷新缓存错误:', error);
        addSystemMessage(`刷新缓存错误: ${error.message}`);
    }
}

// 加载历史记录到聊天界面
function loadHistoryToChat(history) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    console.log('加载历史记录到聊天界面，数量:', history.length);
    
    // 按时间排序
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    history.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        
        if (msg.message_type === 'system') {
            // 系统消息
            addSystemMessage(msg.message);
        } else if (msg.sender === 'user') {
            // 用户消息
            addUserMessage(msg.message, timestamp);
        } else {
            // 实例回复消息
            addInstanceMessage(msg.sender, msg.message, timestamp);
        }
    });
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 清空聊天历史
function clearChatHistory() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        console.error('找不到聊天消息容器');
        return;
    }
    
    // 确认清空操作
    if (confirm('确定要清空当前显示的聊天记录吗？')) {
        chatMessages.innerHTML = '';
        console.log('聊天历史已清空');
        
        // 显示清空提示
        addSystemMessage('聊天记录已清空');
    }
}

// 初始化聊天功能
document.addEventListener('DOMContentLoaded', function() {
    setupAtCompletion();
    
    // 页面加载时自动加载聊天历史
    loadChatHistoryOnInit();
    
    // 监听实例列表更新
    if (typeof loadInstancesWithNamespace === 'function') {
        const originalLoad = loadInstancesWithNamespace;
        loadInstancesWithNamespace = function() {
            originalLoad();
            // 更新可用实例列表
            fetch('/api/instances')
                .then(response => response.json())
                .then(data => {
                    updateAvailableInstances(data.instances);
                })
                .catch(error => {
                    console.error('获取实例列表失败:', error);
                });
        };
    }
});

// 页面加载时自动加载聊天历史
async function loadChatHistoryOnInit() {
    try {
        // 等待namespace初始化完成
        await waitForNamespaceInit();
        
        const currentNs = getCurrentNamespace() || 'default';
        console.log('初始化加载聊天历史，namespace:', currentNs);
        
        // 调用获取聊天历史API
        const response = await fetch(`/api/chat/history?limit=50&namespace=${currentNs}`);
        const result = await response.json();
        
        if (result.success && result.history && result.history.length > 0) {
            console.log('初始化加载历史记录成功，数量:', result.history.length);
            loadHistoryToChat(result.history);
        } else {
            console.log('初始化时无历史记录或加载失败');
            addSystemMessage(`欢迎使用 ${currentNs} 聊天功能！`);
        }
    } catch (error) {
        console.error('初始化加载聊天历史失败:', error);
        const currentNs = getCurrentNamespace() || 'default';
        addSystemMessage(`欢迎使用 ${currentNs} 聊天功能！`);
    }
}

// 等待namespace初始化完成
function waitForNamespaceInit() {
    return new Promise((resolve) => {
        // 如果namespace已经初始化，直接返回
        if (typeof getCurrentNamespace === 'function' && getCurrentNamespace()) {
            resolve();
            return;
        }
        
        // 等待namespace初始化
        let attempts = 0;
        const maxAttempts = 20; // 最多等待2秒
        
        const checkNamespace = () => {
            attempts++;
            
            if (typeof getCurrentNamespace === 'function' && getCurrentNamespace()) {
                resolve();
            } else if (attempts < maxAttempts) {
                setTimeout(checkNamespace, 100);
            } else {
                console.warn('Namespace初始化超时，使用默认值');
                resolve();
            }
        };
        
        setTimeout(checkNamespace, 100);
    });
}

// 根据实例ID生成头像
function getInstanceAvatar(instanceId) {
    const avatars = ['🤖', '🎯', '💡', '⚡', '🔥', '🌟', '🎨', '🔧', '📊', '🚀'];
    const hash = instanceId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
}

// 格式化消息内容，支持代码块、链接和图片
function formatMessage(message) {
    let formatted = escapeHtml(message);
    
    // 处理图片 - 支持Markdown格式 ![alt](url)
    formatted = formatted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
        return `<div class="message-image-container">
            <img src="${url}" alt="${alt}" class="message-image" onclick="showImageModal('${url}', '${alt}')" loading="lazy">
        </div>`;
    });
    
    // 处理旧格式的图片标记 [图片: path]
    formatted = formatted.replace(/\[图片:\s*([^\]]+)\]/g, (match, path) => {
        // 转换绝对路径为相对URL
        let url = path;
        if (path.includes('namespaces/')) {
            url = '/static/data/' + path.substring(path.indexOf('namespaces/'));
        } else if (path.includes('conversations/images/')) {
            const namespace = getCurrentNamespace() || 'default';
            url = `/api/image/${namespace}/${path.split('/').pop()}`;
        }
        
        return `<div class="message-image-container">
            <img src="${url}" alt="图片" class="message-image" onclick="showImageModal('${url}', '图片')" loading="lazy">
        </div>`;
    });
    
    // 处理代码块
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // 处理行内代码
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 处理链接
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // 处理换行
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// 复制消息内容
function copyMessage(button, message) {
    navigator.clipboard.writeText(message).then(() => {
        // 显示复制成功提示
        showCopyToast();
        
        // 临时改变按钮文本
        const originalText = button.textContent;
        button.textContent = '已复制';
        button.style.color = '#34c759';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.color = '';
        }, 1000);
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案：选择文本
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyToast();
    });
}

// 显示复制成功提示
function showCopyToast() {
    const toast = document.createElement('div');
    toast.className = 'wechat-copy-toast';
    toast.textContent = '已复制到剪贴板';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 2000);
}

// 显示图片模态框
function showImageModal(imageUrl, altText) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-backdrop" onclick="closeImageModal()"></div>
        <div class="image-modal-content">
            <div class="image-modal-header">
                <span class="image-modal-title">${escapeHtml(altText || '图片')}</span>
                <button class="image-modal-close" onclick="closeImageModal()">&times;</button>
            </div>
            <div class="image-modal-body">
                <img src="${imageUrl}" alt="${escapeHtml(altText || '图片')}" class="modal-image">
            </div>
            <div class="image-modal-footer">
                <button class="btn btn-sm btn-primary" onclick="downloadImage('${imageUrl}', '${altText || 'image'}')">
                    <i class="fas fa-download"></i> 下载
                </button>
                <button class="btn btn-sm btn-secondary" onclick="copyImageUrl('${imageUrl}')">
                    <i class="fas fa-copy"></i> 复制链接
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleModalKeydown);
}

// 关闭图片模态框
function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleModalKeydown);
    }
}

// 处理模态框键盘事件
function handleModalKeydown(event) {
    if (event.key === 'Escape') {
        closeImageModal();
    }
}

// 下载图片
function downloadImage(imageUrl, filename) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename + '_' + Date.now();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 复制图片链接
function copyImageUrl(imageUrl) {
    navigator.clipboard.writeText(imageUrl).then(() => {
        showCopyToast();
    }).catch(err => {
        console.error('复制失败:', err);
    });
}

// ==================== 快捷键功能函数 ====================

// 清空消息输入框 (ESC键)
function clearMessageInput() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.style.height = '38px'; // 重置为最小高度
        messageInput.focus();
        
        // 显示提示
        showNotification('输入框已清空', 'info', 1000);
    }
}

// 清空聊天记录 (Ctrl+L)
function clearChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        // 显示确认对话框
        if (confirm('确定要清空所有聊天记录吗？此操作不可撤销。')) {
            chatMessages.innerHTML = '';
            
            // 添加系统消息提示
            addSystemMessage('聊天记录已清空');
            
            // 显示通知
            showNotification('聊天记录已清空', 'success');
        }
    }
}

// 消息历史记录管理
let messageHistory = [];
let historyIndex = -1;

// 保存消息到历史记录
function saveMessageToHistory(message) {
    if (message && message.trim()) {
        // 避免重复保存相同的消息
        if (messageHistory.length === 0 || messageHistory[messageHistory.length - 1] !== message) {
            messageHistory.push(message);
            // 限制历史记录数量
            if (messageHistory.length > 50) {
                messageHistory.shift();
            }
        }
        historyIndex = messageHistory.length;
    }
}

// 重新编辑上一条消息 (上箭头键)
function recallLastMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || messageHistory.length === 0) {
        return;
    }
    
    if (historyIndex > 0) {
        historyIndex--;
        messageInput.value = messageHistory[historyIndex];
        
        // 自动调整输入框高度
        autoResizeTextarea(messageInput);
        
        // 将光标移到末尾
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
        
        // 显示提示
        showNotification(`历史消息 ${historyIndex + 1}/${messageHistory.length}`, 'info', 1000);
    }
}

// 下一条历史消息 (下箭头键)
function recallNextMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || messageHistory.length === 0) {
        return;
    }
    
    if (historyIndex < messageHistory.length - 1) {
        historyIndex++;
        messageInput.value = messageHistory[historyIndex];
        
        // 自动调整输入框高度
        autoResizeTextarea(messageInput);
        
        // 将光标移到末尾
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
        
        // 显示提示
        showNotification(`历史消息 ${historyIndex + 1}/${messageHistory.length}`, 'info', 1000);
    } else if (historyIndex === messageHistory.length - 1) {
        // 到达最新消息，清空输入框
        historyIndex = messageHistory.length;
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.style.height = '38px';
        
        showNotification('回到当前输入', 'info', 1000);
    }
}

// 自动调整文本框高度
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 150; // 最大高度
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    
    // 如果内容超过最大高度，显示滚动条
    if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }
}

// 快速插入常用文本 (Ctrl+数字键)
function insertQuickText(textType) {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const quickTexts = {
        1: '请帮我',
        2: '谢谢',
        3: '好的',
        4: '请稍等',
        5: '完成了',
        6: '有问题',
        7: '需要帮助',
        8: '正在处理',
        9: '已解决'
    };
    
    const text = quickTexts[textType];
    if (text) {
        const currentValue = messageInput.value;
        const cursorPos = messageInput.selectionStart;
        
        // 在光标位置插入文本
        const newValue = currentValue.slice(0, cursorPos) + text + currentValue.slice(cursorPos);
        messageInput.value = newValue;
        
        // 设置光标位置到插入文本之后
        const newCursorPos = cursorPos + text.length;
        messageInput.setSelectionRange(newCursorPos, newCursorPos);
        
        // 自动调整高度
        autoResizeTextarea(messageInput);
        
        // 聚焦输入框
        messageInput.focus();
        
        showNotification(`已插入: ${text}`, 'info', 1000);
    }
}

// 显示快捷键帮助 (F1或Ctrl+?)
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Enter', desc: '发送消息' },
        { key: 'Shift + Enter', desc: '换行' },
        { key: 'Esc', desc: '清空输入框' },
        { key: 'Ctrl + L', desc: '清空聊天记录' },
        { key: 'Ctrl + K', desc: '聚焦到输入框' },
        { key: '↑ (输入框为空时)', desc: '上一条历史消息' },
        { key: '↓', desc: '下一条历史消息' },
        { key: 'Ctrl + 1-9', desc: '插入快速文本' },
        { key: 'F1 或 Ctrl + ?', desc: '显示快捷键帮助' }
    ];
    
    let helpHtml = `
        <div class="keyboard-shortcuts-modal">
            <div class="modal-backdrop" onclick="closeKeyboardShortcuts()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h5><i class="fas fa-keyboard"></i> 键盘快捷键</h5>
                    <button onclick="closeKeyboardShortcuts()">&times;</button>
                </div>
                <div class="modal-body">
                    <table class="shortcuts-table">
                        <thead>
                            <tr>
                                <th>快捷键</th>
                                <th>功能</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    shortcuts.forEach(shortcut => {
        helpHtml += `
            <tr>
                <td><kbd>${shortcut.key}</kbd></td>
                <td>${shortcut.desc}</td>
            </tr>
        `;
    });
    
    helpHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeKeyboardShortcuts()">关闭</button>
                </div>
            </div>
        </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .keyboard-shortcuts-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .keyboard-shortcuts-modal .modal-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .keyboard-shortcuts-modal .modal-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow: auto;
            position: relative;
            z-index: 1;
        }
        
        .keyboard-shortcuts-modal .modal-header {
            padding: 15px 20px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .keyboard-shortcuts-modal .modal-header h5 {
            margin: 0;
            color: #333;
        }
        
        .keyboard-shortcuts-modal .modal-header button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        }
        
        .keyboard-shortcuts-modal .modal-body {
            padding: 20px;
        }
        
        .shortcuts-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .shortcuts-table th,
        .shortcuts-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .shortcuts-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .shortcuts-table kbd {
            background: #f1f3f4;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 12px;
        }
        
        .keyboard-shortcuts-modal .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #dee2e6;
            text-align: right;
        }
    `;
    
    document.head.appendChild(style);
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.innerHTML = helpHtml;
    modal.id = 'keyboardShortcutsModal';
    document.body.appendChild(modal);
    
    // 添加ESC键关闭
    document.addEventListener('keydown', handleShortcutsModalKeydown);
}

// 关闭快捷键帮助
function closeKeyboardShortcuts() {
    const modal = document.getElementById('keyboardShortcutsModal');
    if (modal) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleShortcutsModalKeydown);
    }
}

// 处理快捷键帮助模态框的键盘事件
function handleShortcutsModalKeydown(event) {
    if (event.key === 'Escape') {
        closeKeyboardShortcuts();
    }
}

// 显示通知消息
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    const style = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    notification.style.cssText = style;
    
    // 根据类型设置背景色
    const colors = {
        info: '#17a2b8',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, duration);
}
