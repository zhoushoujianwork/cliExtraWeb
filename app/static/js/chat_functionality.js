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
    
    // 解析消息发送目标
    const { target, content, type } = parseMessageTarget(message);
    
    console.log('发送消息:', { message, target, content, type });
    
    // 显示用户消息
    const timestamp = new Date().toLocaleTimeString();
    addUserMessage(message, timestamp);
    
    // 清空输入框并重置高度
    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.style.height = '40px';
    
    // 更新工具栏按钮状态
    updateToolbarButtonStates();
    
    // 根据解析结果发送消息
    switch (type) {
        case 'broadcast':
            console.log('广播消息到当前namespace');
            broadcastToCurrentNamespace(content);
            break;
        case 'specific':
            console.log('发送给指定实例:', target);
            sendToSpecificInstance(target, content);
            break;
        case 'system':
        default:
            console.log('发送给system实例:', target);
            sendToSystemInstance(target, content);
            break;
    }
}

// 解析消息发送目标 - 新逻辑
function parseMessageTarget(message) {
    // 检查是否以@all开头 - 广播
    if (message.startsWith('@all')) {
        const content = message.substring(4).trim(); // 移除@all
        return {
            target: 'all',
            content: content || message, // 如果没有内容，使用原消息
            type: 'broadcast'
        };
    }
    
    // 检查是否以@开头 - 指定实例
    const atMatch = message.match(/^@([^\s]+)\s*(.*)/);
    if (atMatch) {
        const instanceId = atMatch[1];
        const content = atMatch[2].trim() || message; // 如果没有内容，使用原消息
        return {
            target: instanceId,
            content: content,
            type: 'specific'
        };
    }
    
    // 没有@前缀 - 发送给system实例
    const currentNamespace = getCurrentNamespace() || 'q_cli';
    const systemTarget = `${currentNamespace}_system`;
    return {
        target: systemTarget,
        content: message,
        type: 'system'
    };
}

// 广播到当前namespace
async function broadcastToCurrentNamespace(message) {
    const currentNamespace = getCurrentNamespace() || 'q_cli';
    
    try {
        // 安全处理消息内容
        const safeMessage = sanitizeMessage(message);
        
        const response = await fetch('/api/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                message: safeMessage,
                namespace: currentNamespace
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('广播消息成功:', result);
            showNotification(`消息已广播到 ${currentNamespace} namespace`, 'success');
        } else {
            console.error('广播消息失败:', result.error);
            showNotification(`广播失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('广播消息异常:', error);
        showNotification('广播消息失败', 'error');
    }
}

// 发送给指定实例
async function sendToSpecificInstance(instanceId, message) {
    try {
        // 安全处理消息内容
        const safeMessage = sanitizeMessage(message);
        const safeInstanceId = sanitizeInstanceId(instanceId);
        
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                target_instance: safeInstanceId,
                message: safeMessage
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('发送消息成功:', result);
            showNotification(`消息已发送给 ${safeInstanceId}`, 'success');
        } else {
            console.error('发送消息失败:', result.error);
            showNotification(`发送失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('发送消息异常:', error);
        showNotification('发送消息失败', 'error');
    }
}

// 发送给system实例
async function sendToSystemInstance(systemTarget, message) {
    try {
        // 安全处理消息内容
        const safeMessage = sanitizeMessage(message);
        const safeTarget = sanitizeInstanceId(systemTarget);
        
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                target_instance: safeTarget,
                message: safeMessage
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('发送给system实例成功:', result);
            showNotification(`消息已发送给 ${safeTarget}`, 'success');
        } else {
            console.error('发送给system实例失败:', result.error);
            showNotification(`发送失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('发送给system实例异常:', error);
        showNotification('发送消息失败', 'error');
    }
}
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
                    <img src="/static/images/user-avatar.svg" alt="用户" class="avatar-svg">
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
    
    // 根据实例状态获取头像
    const avatarSrc = getInstanceAvatarSvg(instanceId);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'wechat-message-item';
    messageDiv.innerHTML = `
        <div class="message-layout assistant-layout">
            <div class="message-avatar assistant-avatar">
                <div class="avatar-container">
                    <img src="${avatarSrc}" alt="${escapeHtml(instanceId)}" class="avatar-svg">
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

// @功能的自动完成 - 优化版
function setupAtCompletion() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    let currentSelectedIndex = -1; // 当前选中的选项索引
    let suggestionItems = []; // 当前显示的建议项
    
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
    
    // 键盘导航支持
    messageInput.addEventListener('keydown', function(e) {
        const suggestionBox = document.getElementById('instanceSuggestions');
        if (!suggestionBox || suggestionBox.style.display === 'none') return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                navigateSuggestions(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                navigateSuggestions(-1);
                break;
            case 'Enter':
                e.preventDefault();
                if (window.currentSelectedIndex >= 0 && window.suggestionItems[window.currentSelectedIndex]) {
                    selectSuggestion(window.suggestionItems[window.currentSelectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                hideInstanceSuggestions();
                break;
        }
    });
    
    // 导航建议选项
    function navigateSuggestions(direction) {
        if (!window.suggestionItems || window.suggestionItems.length === 0) return;
        
        // 移除当前高亮
        if (window.currentSelectedIndex >= 0) {
            window.suggestionItems[window.currentSelectedIndex].classList.remove('selected');
        }
        
        // 计算新索引（支持循环）
        window.currentSelectedIndex += direction;
        if (window.currentSelectedIndex >= window.suggestionItems.length) {
            window.currentSelectedIndex = 0;
        } else if (window.currentSelectedIndex < 0) {
            window.currentSelectedIndex = window.suggestionItems.length - 1;
        }
        
        // 高亮新选项
        window.suggestionItems[window.currentSelectedIndex].classList.add('selected');
        
        // 滚动到可见区域
        window.suggestionItems[window.currentSelectedIndex].scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
        });
    }
}

// 显示实例建议 - 优化版
function showInstanceSuggestions(query, atPosition) {
    // 获取当前namespace的实例
    const currentNamespace = getCurrentNamespace() || 'q_cli';
    
    // 构建建议列表：all选项 + 匹配的实例
    let suggestions = [];
    
    // 添加all选项（如果查询匹配）
    if ('all'.includes(query)) {
        suggestions.push({
            id: 'all',
            type: 'broadcast',
            status: '广播',
            namespace: currentNamespace,
            isSpecial: true
        });
    }
    
    // 添加匹配的实例，按状态排序
    const matchingInstances = availableInstances
        .filter(instance => instance.id.toLowerCase().includes(query))
        .sort((a, b) => {
            // idle状态优先
            if (a.status === 'idle' && b.status !== 'idle') return -1;
            if (b.status === 'idle' && a.status !== 'idle') return 1;
            return a.id.localeCompare(b.id);
        });
    
    suggestions = suggestions.concat(matchingInstances);
    
    if (suggestions.length === 0) {
        hideInstanceSuggestions();
        return;
    }
    
    // 创建或更新建议列表
    let suggestionBox = document.getElementById('instanceSuggestions');
    if (!suggestionBox) {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'instanceSuggestions';
        suggestionBox.className = 'instance-suggestions position-absolute bg-white border rounded shadow-sm';
        suggestionBox.style.cssText = `
            z-index: 1000;
            max-height: 250px;
            overflow-y: auto;
            min-width: 250px;
            display: block;
        `;
        document.body.appendChild(suggestionBox);
    }
    
    // 生成建议项HTML
    suggestionBox.innerHTML = suggestions.map((item, index) => {
        const isSpecial = item.isSpecial;
        const statusIcon = getStatusIcon(item.status);
        const statusColor = getStatusColor(item.status);
        
        return `
            <div class="suggestion-item p-2 border-bottom cursor-pointer d-flex align-items-center" 
                 data-instance-id="${item.id}" 
                 data-index="${index}"
                 style="transition: background-color 0.2s;">
                ${isSpecial ? 
                    `<i class="fas fa-broadcast-tower text-primary me-2"></i>` : 
                    `<span class="status-dot me-2" style="background-color: ${statusColor};"></span>`
                }
                <div class="flex-grow-1">
                    <strong class="${isSpecial ? 'text-primary' : ''}">${item.id}</strong>
                    <small class="text-muted ms-2">${item.status}</small>
                    ${item.namespace ? `<small class="text-muted ms-1">(${item.namespace})</small>` : ''}
                </div>
                ${isSpecial ? '<span class="badge bg-primary">广播</span>' : ''}
            </div>
        `;
    }).join('');
    
    // 绑定点击事件
    const suggestionItems = suggestionBox.querySelectorAll('.suggestion-item');
    suggestionItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            selectSuggestion(item);
        });
        
        // 鼠标悬停高亮
        item.addEventListener('mouseenter', () => {
            // 移除其他高亮
            suggestionItems.forEach(si => si.classList.remove('selected'));
            // 添加当前高亮
            item.classList.add('selected');
            currentSelectedIndex = index;
        });
    });
    
    // 更新全局变量
    window.suggestionItems = Array.from(suggestionItems);
    window.currentSelectedIndex = -1;
    
    // 定位建议框
    positionSuggestionBox(suggestionBox);
    
    // 显示建议框
    suggestionBox.style.display = 'block';
}

// 获取状态图标
function getStatusIcon(status) {
    const icons = {
        'idle': '🟢',
        'busy': '🟠', 
        'waiting': '🔵',
        'error': '🔴',
        'stopped': '⚫',
        '广播': '📢'
    };
    return icons[status] || '⚪';
}

// 获取状态颜色
function getStatusColor(status) {
    const colors = {
        'idle': '#28a745',
        'busy': '#ff8c00',
        'waiting': '#007bff', 
        'error': '#dc3545',
        'stopped': '#6c757d',
        '广播': '#007bff'
    };
    return colors[status] || '#6c757d';
}

// 定位建议框
function positionSuggestionBox(suggestionBox) {
    const messageInput = document.getElementById('messageInput');
    const rect = messageInput.getBoundingClientRect();
    
    // 计算位置
    const left = rect.left;
    const top = rect.bottom + 5; // 输入框下方5px
    
    suggestionBox.style.left = left + 'px';
    suggestionBox.style.top = top + 'px';
    
    // 确保不超出视窗
    const boxRect = suggestionBox.getBoundingClientRect();
    if (boxRect.right > window.innerWidth) {
        suggestionBox.style.left = (window.innerWidth - boxRect.width - 10) + 'px';
    }
    if (boxRect.bottom > window.innerHeight) {
        suggestionBox.style.top = (rect.top - boxRect.height - 5) + 'px';
    }
}

// 选择建议项
function selectSuggestion(item) {
    const instanceId = item.dataset.instanceId;
    insertAtMention(instanceId);
    hideInstanceSuggestions();
}

// 插入@提及到输入框
function insertAtMention(instanceId) {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const value = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    
    // 找到@符号的位置
    const beforeCursor = value.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
        const atStart = cursorPos - atMatch[0].length;
        const beforeAt = value.substring(0, atStart);
        const afterCursor = value.substring(cursorPos);
        
        // 构建新的值
        const newValue = beforeAt + '@' + instanceId + ' ' + afterCursor;
        messageInput.value = newValue;
        
        // 设置光标位置到@mention后面
        const newCursorPos = atStart + instanceId.length + 2; // @instanceId + space
        messageInput.setSelectionRange(newCursorPos, newCursorPos);
        
        // 聚焦输入框
        messageInput.focus();
        
        // 触发input事件以更新其他功能
        messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// 隐藏建议列表
function hideInstanceSuggestions() {
    const suggestionBox = document.getElementById('instanceSuggestions');
    if (suggestionBox) {
        suggestionBox.style.display = 'none';
    }
    window.currentSelectedIndex = -1;
    window.suggestionItems = [];
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
    // 确保全局可访问
    window.availableInstances = availableInstances;
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

// 获取实例状态
function getInstanceStatus(instanceId) {
    // 从全局实例列表中获取状态
    if (window.availableInstances && Array.isArray(window.availableInstances)) {
        const instance = window.availableInstances.find(inst => inst.id === instanceId);
        if (instance) {
            return instance.status;
        }
    }
    
    // 如果找不到实例信息，默认为离线状态
    return 'Detached';
}

// 根据实例状态获取SVG头像
function getInstanceAvatarSvg(instanceId) {
    const status = getInstanceStatus(instanceId);
    
    // 根据状态返回不同的头像
    if (status === 'Attached') {
        return '/static/images/ai-avatar-online.svg';
    } else {
        return '/static/images/ai-avatar-offline.svg';
    }
}

// 根据实例ID生成头像 (保留原有函数以兼容)
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

// 撤销上一条消息
function undoLastMessage() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        showNotification('找不到聊天消息容器', 'error');
        return;
    }
    
    // 查找最后一条用户消息
    const messages = chatMessages.querySelectorAll('.message');
    let lastUserMessage = null;
    
    // 从后往前查找最后一条用户消息
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.classList.contains('user-message') || 
            message.querySelector('.message-header')?.textContent?.includes('用户')) {
            lastUserMessage = message;
            break;
        }
    }
    
    if (lastUserMessage) {
        // 获取消息内容，准备恢复到输入框
        const messageContent = extractMessageContent(lastUserMessage);
        
        // 显示确认对话框
        if (confirm('确定要撤销这条消息吗？消息内容将恢复到输入框中。')) {
            // 删除消息
            lastUserMessage.remove();
            
            // 将消息内容恢复到输入框
            const messageInput = document.getElementById('messageInput');
            if (messageInput && messageContent) {
                messageInput.value = messageContent;
                autoResizeTextarea(messageInput);
                messageInput.focus();
                
                // 将光标移到末尾
                messageInput.setSelectionRange(messageContent.length, messageContent.length);
            }
            
            showNotification('消息已撤销并恢复到输入框', 'success');
        }
    } else {
        showNotification('没有找到可撤销的用户消息', 'warning');
    }
}

// 提取消息内容的辅助函数
function extractMessageContent(messageElement) {
    // 尝试多种方式提取消息内容
    let content = '';
    
    // 方式1: 查找消息内容区域
    const contentArea = messageElement.querySelector('.message-content, .wechat-message-content');
    if (contentArea) {
        content = contentArea.textContent || contentArea.innerText;
    }
    
    // 方式2: 如果没找到，尝试直接从消息元素提取
    if (!content) {
        const textContent = messageElement.textContent || messageElement.innerText;
        // 移除时间戳和用户标识
        content = textContent.replace(/^\d{1,2}:\d{2}:\d{2}\s*/, '') // 移除时间戳
                            .replace(/^用户[：:]\s*/, '') // 移除"用户:"
                            .replace(/^[^:：]*[：:]\s*/, '') // 移除其他标识
                            .trim();
    }
    
    return content;
}

// ==================== 工具栏管理函数 ====================

// 更新工具栏按钮状态
function updateToolbarButtonStates() {
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    
    // 更新发送按钮状态
    const sendButtons = document.querySelectorAll('.toolbar-btn[onclick*="sendMessage"], .send-btn');
    const hasMessage = messageInput && messageInput.value.trim().length > 0;
    
    sendButtons.forEach(btn => {
        if (hasMessage) {
            btn.removeAttribute('disabled');
            btn.style.opacity = '1';
        } else {
            btn.setAttribute('disabled', 'true');
            btn.style.opacity = '0.5';
        }
    });
    
    // 更新撤销按钮状态
    const undoButton = document.querySelector('.toolbar-btn[onclick*="undoLastMessage"]');
    if (undoButton) {
        const userMessages = chatMessages ? chatMessages.querySelectorAll('.user-message, .message') : [];
        let hasUserMessages = false;
        
        // 检查是否有用户消息
        for (let msg of userMessages) {
            const header = msg.querySelector('.message-header');
            if (header && header.textContent.includes('用户')) {
                hasUserMessages = true;
                break;
            }
            if (msg.classList.contains('user-message')) {
                hasUserMessages = true;
                break;
            }
        }
        
        if (hasUserMessages) {
            undoButton.removeAttribute('disabled');
            undoButton.style.opacity = '1';
        } else {
            undoButton.setAttribute('disabled', 'true');
            undoButton.style.opacity = '0.5';
        }
    }
    
    // 更新历史按钮状态
    const historyButton = document.querySelector('.toolbar-btn[onclick*="recallLastMessage"]');
    if (historyButton) {
        const hasHistory = messageHistory && messageHistory.length > 0;
        const inputEmpty = !messageInput || messageInput.value.trim() === '';
        
        if (hasHistory && inputEmpty) {
            historyButton.removeAttribute('disabled');
            historyButton.style.opacity = '1';
        } else {
            historyButton.setAttribute('disabled', 'true');
            historyButton.style.opacity = '0.5';
        }
    }
    
    // 更新清空按钮状态
    const clearButton = document.querySelector('.toolbar-btn[onclick*="clearMessageInput"]');
    if (clearButton) {
        if (hasMessage) {
            clearButton.removeAttribute('disabled');
            clearButton.style.opacity = '1';
        } else {
            clearButton.setAttribute('disabled', 'true');
            clearButton.style.opacity = '0.5';
        }
    }
}

// 初始化工具栏
function initToolbar() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        // 监听输入变化，更新按钮状态
        messageInput.addEventListener('input', updateToolbarButtonStates);
        messageInput.addEventListener('keyup', updateToolbarButtonStates);
        
        // 初始更新状态
        updateToolbarButtonStates();
        
        // 定期更新状态（处理动态内容变化）
        setInterval(updateToolbarButtonStates, 2000);
    }
    
    // 初始化@功能自动补全
    setupAtCompletion();
}

// ==================== 快捷键功能函数 ====================

// 清空消息输入框 (ESC键)
function clearMessageInput() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.style.height = '40px'; // 更新为新的最小高度
        messageInput.focus();
        
        // 更新工具栏按钮状态
        updateToolbarButtonStates();
        
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

// 更新输入框提示
function updateInputPlaceholder() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const currentNamespace = getCurrentNamespace() || 'q_cli';
    const systemTarget = `${currentNamespace}_system`;
    
    messageInput.placeholder = `输入消息 (默认发送给 ${systemTarget}，@all 广播，@实例名 指定发送)`;
}

// 初始化输入框提示功能
function initInputPlaceholder() {
    updateInputPlaceholder();
    
    // 监听namespace变化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                updateInputPlaceholder();
            }
        });
    });
    
    // 观察namespace显示元素的变化
    const namespaceElement = document.querySelector('.current-namespace, #currentNamespace');
    if (namespaceElement) {
        observer.observe(namespaceElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
}

// 消息内容安全处理
function sanitizeMessage(message) {
    if (!message || typeof message !== 'string') {
        return '';
    }
    
    try {
        // 移除控制字符，保留可打印字符和常用Unicode字符
        let cleaned = message.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
        
        // 限制消息长度
        if (cleaned.length > 1000) {
            cleaned = cleaned.substring(0, 1000) + '...';
        }
        
        return cleaned;
    } catch (error) {
        console.error('消息清理失败:', error);
        return message.toString();
    }
}

// 实例ID安全处理
function sanitizeInstanceId(instanceId) {
    if (!instanceId || typeof instanceId !== 'string') {
        return '';
    }
    
    try {
        // 只保留字母、数字、下划线、连字符
        let cleaned = instanceId.replace(/[^a-zA-Z0-9_-]/g, '');
        
        // 限制长度
        if (cleaned.length > 100) {
            cleaned = cleaned.substring(0, 100);
        }
        
        return cleaned;
    } catch (error) {
        console.error('实例ID清理失败:', error);
        return instanceId.toString();
    }
}
