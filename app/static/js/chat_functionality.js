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
        alert('请输入消息');
        return;
    }
    
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
    messageDiv.className = 'message mb-2 user-message';
    messageDiv.innerHTML = `
        <div class="d-flex justify-content-end">
            <div class="message-bubble bg-primary text-white p-2 rounded">
                <div class="message-content">${escapeHtml(message)}</div>
                <small class="message-time opacity-75">${timestamp}</small>
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
    messageDiv.className = 'message mb-2 system-message';
    messageDiv.innerHTML = `
        <div class="text-center">
            <small class="text-muted bg-light px-2 py-1 rounded">${escapeHtml(message)}</small>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加实例回复消息
function addInstanceMessage(instanceId, message, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mb-2 instance-message';
    messageDiv.innerHTML = `
        <div class="d-flex">
            <div class="message-bubble bg-light border p-2 rounded">
                <div class="message-header">
                    <strong class="text-primary">${escapeHtml(instanceId)}</strong>
                    <small class="text-muted ms-2">${timestamp}</small>
                </div>
                <div class="message-content mt-1">${escapeHtml(message)}</div>
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
        const currentNs = getCurrentNamespace() || 'q_cli';
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
        const currentNs = getCurrentNamespace() || 'q_cli';
        console.log('初始化加载聊天历史，namespace:', currentNs);
        
        // 调用获取聊天历史API
        const response = await fetch(`/api/chat/history?limit=50&namespace=${currentNs}`);
        const result = await response.json();
        
        if (result.success && result.history && result.history.length > 0) {
            console.log('初始化加载历史记录成功，数量:', result.history.length);
            loadHistoryToChat(result.history);
        } else {
            console.log('初始化时无历史记录或加载失败');
            addSystemMessage('欢迎使用聊天功能！');
        }
    } catch (error) {
        console.error('初始化加载聊天历史失败:', error);
        addSystemMessage('欢迎使用聊天功能！');
    }
}
