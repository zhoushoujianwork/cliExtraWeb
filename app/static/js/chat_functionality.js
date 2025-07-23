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
    messageInput.value = '';
    
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
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
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

// 更新可用实例列表
function updateAvailableInstances(instances) {
    availableInstances = instances || [];
    console.log('更新可用实例列表:', availableInstances);
}

// 初始化聊天功能
document.addEventListener('DOMContentLoaded', function() {
    setupAtCompletion();
    
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
