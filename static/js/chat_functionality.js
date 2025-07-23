/**
 * 聊天功能 JavaScript
 * 处理聊天记录的加载、显示和缓存刷新
 */

// 聊天历史数据
let chatHistory = [];
let isLoadingHistory = false;

// 获取当前 namespace（兼容函数）
function getCurrentNamespace() {
    // 尝试从全局变量获取
    if (typeof window.currentNamespace !== 'undefined') {
        return window.currentNamespace;
    }
    
    // 尝试从选择器获取
    const select = document.getElementById('currentNamespaceSelect');
    if (select && select.value) {
        return select.value;
    }
    
    // 默认返回
    return 'q_cli';
}

// 初始化聊天功能
function initChatFunctionality() {
    console.log('初始化聊天功能...');
    loadChatHistory();
    
    // 设置消息输入框的回车事件
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// 加载聊天历史
async function loadChatHistory() {
    if (isLoadingHistory) return;
    
    try {
        isLoadingHistory = true;
        console.log('开始加载聊天历史...');
        
        const namespace = getCurrentNamespace() || 'q_cli';
        console.log('使用 namespace:', namespace);
        
        const response = await fetch(`/api/instances?namespace=${namespace}`);
        const data = await response.json();
        
        console.log('API 响应:', data);
        
        if (data.success) {
            if (data.chat_history && data.chat_history.length > 0) {
                chatHistory = data.chat_history;
                console.log('加载了', chatHistory.length, '条聊天历史');
                renderChatHistory();
            } else {
                console.log('没有聊天历史数据，尝试刷新缓存...');
                // 如果没有聊天历史，尝试刷新缓存
                await refreshChatCacheInternal(namespace);
            }
        } else {
            console.error('获取实例列表失败:', data.error);
            showNotification('加载聊天历史失败: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('加载聊天历史失败:', error);
        showNotification('加载聊天历史失败: ' + error.message, 'error');
    } finally {
        isLoadingHistory = false;
    }
}

// 内部刷新缓存函数（不显示按钮状态）
async function refreshChatCacheInternal(namespace) {
    try {
        console.log('内部刷新缓存，namespace:', namespace);
        
        const response = await fetch('/api/chat/refresh-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                namespace: namespace
            })
        });
        
        const data = await response.json();
        console.log('刷新缓存响应:', data);
        
        if (data.success) {
            chatHistory = data.history || [];
            renderChatHistory();
            console.log('缓存刷新成功，加载了', data.count, '条历史记录');
        } else {
            console.error('刷新聊天缓存失败:', data.error);
        }
    } catch (error) {
        console.error('刷新聊天缓存异常:', error);
    }
}

// 刷新聊天缓存
async function refreshChatCache() {
    try {
        const namespace = getCurrentNamespace() || 'q_cli';
        
        // 显示加载状态
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
        button.disabled = true;
        
        const response = await fetch('/api/chat/refresh-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                namespace: namespace
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            chatHistory = data.history || [];
            renderChatHistory();
            showNotification(`聊天缓存刷新成功，加载了 ${data.count} 条历史记录`, 'success');
        } else {
            showNotification('刷新聊天缓存失败: ' + data.error, 'error');
        }
        
        // 恢复按钮状态
        button.innerHTML = originalContent;
        button.disabled = false;
        
    } catch (error) {
        console.error('刷新聊天缓存失败:', error);
        showNotification('刷新聊天缓存失败: ' + error.message, 'error');
        
        // 恢复按钮状态
        const button = event.target.closest('button');
        button.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新缓存';
        button.disabled = false;
    }
}

// 清空聊天历史显示
function clearChatHistory() {
    if (confirm('确定要清空当前显示的聊天记录吗？这不会影响实际的历史数据。')) {
        chatHistory = [];
        renderChatHistory();
        showNotification('聊天记录已清空', 'info');
    }
}

// 渲染聊天历史
function renderChatHistory() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    if (chatHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-comments fa-3x mb-3"></i>
                <p>暂无聊天记录</p>
                <button class="btn btn-outline-primary btn-sm" onclick="refreshChatCache()">
                    <i class="fas fa-sync-alt"></i> 刷新缓存
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    chatHistory.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const instanceId = msg.instance_id || msg.sender;
        const isSystem = msg.message_type === 'system' || msg.sender === 'system';
        
        html += `
            <div class="chat-message ${isSystem ? 'system-message' : 'user-message'}" data-instance="${instanceId}">
                <div class="message-header">
                    <span class="instance-id">
                        <i class="fas ${isSystem ? 'fa-cog' : 'fa-user'}"></i>
                        ${isSystem ? 'System' : instanceId}
                    </span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-content">
                    ${formatMessage(msg.message)}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 滚动到底部
    container.scrollTop = container.scrollHeight;
}

// 格式化消息内容
function formatMessage(message) {
    // 转义 HTML
    const escaped = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    // 处理换行
    return escaped.replace(/\n/g, '<br>');
}

// 发送消息
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    try {
        // 清空输入框
        input.value = '';
        
        // 添加到聊天历史显示
        const newMessage = {
            sender: 'user',
            message: message,
            timestamp: new Date().toISOString(),
            message_type: 'chat'
        };
        
        chatHistory.push(newMessage);
        renderChatHistory();
        
        // 这里可以添加发送到后端的逻辑
        // 暂时只是本地显示
        
    } catch (error) {
        console.error('发送消息失败:', error);
        showNotification('发送消息失败: ' + error.message, 'error');
    }
}

// 添加 CSS 样式
function addChatStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .chat-message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        
        .chat-message.system-message {
            border-left-color: #6c757d;
            background-color: #f8f9fa;
        }
        
        .chat-message.user-message {
            border-left-color: #28a745;
            background-color: #f8fff9;
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            font-size: 0.9em;
        }
        
        .instance-id {
            font-weight: bold;
            color: #495057;
        }
        
        .timestamp {
            color: #6c757d;
            font-size: 0.8em;
        }
        
        .message-content {
            color: #212529;
            line-height: 1.4;
        }
        
        .chat-messages:empty::before {
            content: "暂无聊天记录";
            display: block;
            text-align: center;
            color: #6c757d;
            padding: 20px;
        }
    `;
    document.head.appendChild(style);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 加载完成，开始初始化聊天功能');
    addChatStyles();
    
    // 延迟初始化，确保其他脚本加载完成
    setTimeout(() => {
        initChatFunctionality();
    }, 1000);
});

// 强制刷新聊天历史（全局函数）
window.forceRefreshChat = function() {
    console.log('强制刷新聊天历史');
    chatHistory = [];
    isLoadingHistory = false;
    loadChatHistory();
};
