// Q Chat Manager JavaScript
console.log('🚀 chat_manager.js 开始加载');

let availableInstances = [];
let currentAtPosition = -1;
const socket = io();
console.log('🔗 WebSocket对象创建:', socket);

// WebSocket事件处理
socket.on('connect', function() {
    console.log('WebSocket连接成功');
    addSystemMessage('WebSocket连接成功 🔗');
});

socket.on('disconnect', function() {
    console.log('WebSocket连接断开');
    addSystemMessage('WebSocket连接断开 ❌');
});

socket.on('instance_output', function(data) {
    console.log('收到实例输出:', data);
    // 旧的分段输出，暂时忽略
});

// WebSocket连接事件
socket.on('connect', function() {
    console.log('✅ WebSocket连接成功');
    addSystemMessage('WebSocket连接成功');
});

socket.on('disconnect', function() {
    console.log('❌ WebSocket连接断开');
    addSystemMessage('WebSocket连接断开');
});

socket.on('error', function(error) {
    console.error('❌ WebSocket错误:', error);
    addSystemMessage('WebSocket错误: ' + error);
});

// 监控相关事件
socket.on('monitoring_started', function(data) {
    console.log('🚀 监控已启动:', data);
    addSystemMessage(`实例${data.instance_id}监控已启动`);
});

socket.on('monitoring_stopped', function(data) {
    console.log('🛑 监控已停止:', data);
    addSystemMessage(`实例${data.instance_id}监控已停止`);
});

// 处理流式输出
socket.on('instance_streaming_response', function(data) {
    console.log('📥 收到流式输出:', data.instance_id, '内容长度:', data.accumulated_content.length);
    
    // 使用优化器处理流式消息
    if (window.streamingOptimizer) {
        window.streamingOptimizer.updateStreamingMessage(data.instance_id, data.accumulated_content, data.timestamp);
    } else {
        // 降级到原有方法
        updateStreamingMessage(data.instance_id, data.accumulated_content, data.timestamp);
    }
});

socket.on('instance_complete_response', function(data) {
    console.log('✅ 收到完整回复:', data);
    if (data.is_complete) {
        // 使用优化器完成流式消息
        if (window.streamingOptimizer) {
            window.streamingOptimizer.finalizeStreamingMessage(data.instance_id, data.content, data.timestamp);
        } else {
            // 降级到原有方法
            finalizeStreamingMessage(data.instance_id, data.content, data.timestamp, data.raw_content);
        }
    } else {
        addInstanceCompleteMessage(data.instance_id, data.content, data.timestamp);
    }
});

// 存储流式消息的引用
const streamingMessages = {};

// 更新流式消息
function updateStreamingMessage(instanceId, accumulatedContent, timestamp) {
    let messageDiv = streamingMessages[instanceId];
    
    if (!messageDiv) {
        // 创建新的流式消息容器
        const container = document.getElementById('chatHistory');
        messageDiv = document.createElement('div');
        messageDiv.className = 'message mb-3 p-3 border rounded streaming-message ai-message';
        messageDiv.innerHTML = `
            <div class="message-header d-flex justify-content-between align-items-center mb-2">
                <strong class="text-info">
                    <i class="fas fa-robot me-1"></i>实例${instanceId}
                    <span class="streaming-indicator">
                        <i class="fas fa-circle-notch fa-spin text-primary"></i> 正在生成...
                    </span>
                </strong>
                <small class="text-muted">${timestamp}</small>
            </div>
            <div class="message-content">
                <div class="streaming-content"></div>
                <div class="typing-cursor">|</div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        streamingMessages[instanceId] = messageDiv;
        
        // 添加打字机光标动画
        const cursor = messageDiv.querySelector('.typing-cursor');
        cursor.style.animation = 'blink 1s infinite';
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }
    
    // 更新流式内容 - 使用打字机效果
    const contentDiv = messageDiv.querySelector('.streaming-content');
    if (contentDiv && accumulatedContent) {
        // 如果内容有变化，使用打字机效果更新
        const currentContent = contentDiv.textContent || '';
        const newContent = accumulatedContent;
        
        if (newContent.length > currentContent.length) {
            // 内容增加了，使用打字机效果
            typewriterEffect(contentDiv, currentContent, newContent);
        }
    }
    
    // 滚动到底部
    const container = document.getElementById('chatHistory');
    container.scrollTop = container.scrollHeight;
    if (contentDiv) {
        // 使用marked渲染Markdown（如果可用）
        if (typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(accumulatedContent);
        } else {
            contentDiv.innerHTML = accumulatedContent.replace(/\n/g, '<br>');
        }
        
        // 滚动到底部
        const container = document.getElementById('chatHistory');
        container.scrollTop = container.scrollHeight;
    }
}

// 打字机效果函数
function typewriterEffect(element, currentText, targetText) {
    // 如果目标文本比当前文本短，直接设置
    if (targetText.length <= currentText.length) {
        element.textContent = targetText;
        return;
    }
    
    // 计算需要添加的文本
    const newChars = targetText.slice(currentText.length);
    let charIndex = 0;
    
    // 清除之前的定时器
    if (element.typewriterTimer) {
        clearInterval(element.typewriterTimer);
    }
    
    // 打字机效果
    element.typewriterTimer = setInterval(() => {
        if (charIndex < newChars.length) {
            element.textContent = currentText + newChars.slice(0, charIndex + 1);
            charIndex++;
        } else {
            clearInterval(element.typewriterTimer);
            element.typewriterTimer = null;
        }
    }, 20); // 每20ms添加一个字符，可以调整速度
}

// 完成流式消息
function finalizeStreamingMessage(instanceId, cleanedContent, timestamp, rawContent) {
    const messageDiv = streamingMessages[instanceId];
    
    if (messageDiv) {
        // 清除打字机定时器
        const contentDiv = messageDiv.querySelector('.streaming-content');
        if (contentDiv && contentDiv.typewriterTimer) {
            clearInterval(contentDiv.typewriterTimer);
        }
        
        // 移除流式指示器和光标
        const indicator = messageDiv.querySelector('.streaming-indicator');
        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-check text-success"></i> 完成';
        }
        
        const cursor = messageDiv.querySelector('.typing-cursor');
        if (cursor) {
            cursor.remove();
        }
        
        // 更新最终内容 - 使用清理后的内容并应用Markdown渲染
        if (contentDiv) {
            // 渲染Markdown内容
            if (typeof marked !== 'undefined' && cleanedContent.trim()) {
                contentDiv.innerHTML = marked.parse(cleanedContent);
                // 重新高亮代码块
                setTimeout(() => {
                    contentDiv.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }, 100);
            } else {
                // fallback: 简单的换行处理
                contentDiv.innerHTML = cleanedContent.replace(/\n/g, '<br>');
            }
        }
        
        // 添加原始内容查看按钮（调试用）
        if (rawContent && rawContent !== cleanedContent) {
            const debugBtn = document.createElement('button');
            debugBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
            debugBtn.innerHTML = '<i class="fas fa-code"></i> 查看原始内容';
            debugBtn.onclick = () => toggleRawContent(messageDiv, rawContent);
            messageDiv.appendChild(debugBtn);
        }
        
        // 移除流式消息引用
        delete streamingMessages[instanceId];
        
        // 移除流式样式，添加完成样式
        messageDiv.classList.remove('streaming-message');
        messageDiv.classList.add('completed-message');
        
        console.log('✅ 流式消息已完成:', instanceId);
    } else {
        // 如果没有流式消息，直接添加完整消息
        addInstanceCompleteMessage(instanceId, cleanedContent, timestamp);
    }
}

// 添加完整实例回复
function addInstanceCompleteMessage(instanceId, content, timestamp) {
    const container = document.getElementById('chatHistory');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mb-3 p-3 border rounded ai-message';
    
    // 创建消息头部
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header d-flex justify-content-between align-items-center mb-2';
    headerDiv.innerHTML = `
        <strong class="text-success">
            <i class="fas fa-robot me-1"></i>实例${instanceId}
        </strong>
        <small class="text-muted">${timestamp}</small>
    `;
    
    // 创建内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 渲染Markdown内容
    if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(content);
        // 高亮代码块
        setTimeout(() => {
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }, 100);
    } else {
        // fallback处理
        contentDiv.innerHTML = formatMarkdownForWeb(content);
    }
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 切换原始内容显示
function toggleRawContent(messageDiv, rawContent) {
    let rawDiv = messageDiv.querySelector('.raw-content');
    
    if (rawDiv) {
        // 隐藏原始内容
        rawDiv.remove();
        const btn = messageDiv.querySelector('button');
        if (btn) btn.innerHTML = '<i class="fas fa-code"></i> 查看原始内容';
    } else {
        // 显示原始内容
        rawDiv = document.createElement('div');
        rawDiv.className = 'raw-content mt-3 p-3 bg-light border rounded';
        rawDiv.innerHTML = `
            <h6 class="text-muted mb-2">
                <i class="fas fa-file-code"></i> 原始内容 (调试用)
            </h6>
            <pre class="mb-0" style="font-size: 0.8em; max-height: 300px; overflow-y: auto;"><code>${escapeHtml(rawContent)}</code></pre>
        `;
        messageDiv.appendChild(rawDiv);
        
        const btn = messageDiv.querySelector('button');
        if (btn) btn.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏原始内容';
    }
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 改进的用户消息添加函数
function addUserMessage(message, timestamp) {
    const container = document.getElementById('chatHistory');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mb-3 p-3 border rounded user-message';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header d-flex justify-content-between align-items-center mb-2';
    headerDiv.innerHTML = `
        <strong>
            <i class="fas fa-user me-1"></i>用户
        </strong>
        <small style="opacity: 0.8;">${timestamp}</small>
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message;
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 将markdown格式化为HTML
function formatMarkdownForWeb(content) {
    let formatted = content;
    
    // 转义HTML
    formatted = formatted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 处理代码块
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, function(match, lang, code) {
        return `<div class="code-block mt-2 mb-2">
            <div class="code-header bg-dark text-white px-2 py-1 small">${lang || 'code'}</div>
            <pre class="bg-light p-2 mb-0"><code>${code}</code></pre>
        </div>`;
    });
    
    // 处理行内代码
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-light px-1">$1</code>');
    
    // 处理标题
    formatted = formatted.replace(/^### (.*?)$/gm, '<h5 class="text-warning mt-3 mb-2">$1</h5>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h4 class="text-success mt-3 mb-2">$1</h4>');
    formatted = formatted.replace(/^# (.*?)$/gm, '<h3 class="text-primary mt-3 mb-2">$1</h3>');
    
    // 处理粗体
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 处理列表
    formatted = formatted.replace(/^- (.*?)$/gm, '<li class="ms-3">$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.*?)$/gm, '<li class="ms-3">$2</li>');
    
    // 处理链接
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-decoration-none">$1 <i class="fas fa-external-link-alt small"></i></a>');
    
    // 处理换行
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成');
    setupAtMentionFeature();
    
    // 立即刷新实例列表
    refreshInstances();
    
    // 启动自动刷新
    startAutoRefresh();
    
    // 绑定回车发送消息
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// @功能设置
function setupAtMentionFeature() {
    const messageInput = document.getElementById('messageInput');
    const suggestions = document.getElementById('instanceSuggestions');
    
    messageInput.addEventListener('input', function(e) {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        if (value[cursorPos - 1] === '@') {
            currentAtPosition = cursorPos - 1;
            showAllInstanceSuggestions();
        } else {
            const beforeCursor = value.substring(0, cursorPos);
            const atMatch = beforeCursor.match(/@([^@\s]*)$/);
            
            if (atMatch) {
                currentAtPosition = atMatch.index;
                const query = atMatch[1].toLowerCase();
                showFilteredInstanceSuggestions(query);
            } else {
                hideSuggestions();
                currentAtPosition = -1;
            }
        }
    });
}

function showAllInstanceSuggestions() {
    const suggestions = document.getElementById('instanceSuggestions');
    
    if (availableInstances.length > 0) {
        suggestions.innerHTML = availableInstances.map((instance, index) => `
            <div class="suggestion-item p-2 cursor-pointer ${index === 0 ? 'active' : ''}" 
                 data-instance-id="${instance.id}" 
                 onclick="selectInstanceFromSuggestion('${instance.id}')">
                <div class="d-flex align-items-center">
                    <i class="fas fa-server me-2 text-success"></i>
                    <div>
                        <strong>实例 ${instance.id}</strong>
                        <small class="text-muted d-block">${instance.details || '无描述'}</small>
                    </div>
                </div>
            </div>
        `).join('');
        suggestions.style.display = 'block';
    } else {
        suggestions.innerHTML = '<div class="p-2 text-muted">暂无可用实例</div>';
        suggestions.style.display = 'block';
    }
}

function selectInstanceFromSuggestion(instanceId) {
    const messageInput = document.getElementById('messageInput');
    const value = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    
    if (currentAtPosition >= 0) {
        const beforeAt = value.substring(0, currentAtPosition);
        const afterCursor = value.substring(cursorPos);
        const newValue = beforeAt + `@实例${instanceId} ` + afterCursor;
        messageInput.value = newValue;
        
        const newCursorPos = currentAtPosition + `@实例${instanceId} `.length;
        messageInput.focus();
        messageInput.setSelectionRange(newCursorPos, newCursorPos);
    }
    
    hideSuggestions();
}

function hideSuggestions() {
    document.getElementById('instanceSuggestions').style.display = 'none';
    currentAtPosition = -1;
}

// 发送消息
function sendMessage() {
    const message = document.getElementById('messageInput').value.trim();
    
    if (!message) {
        alert('请输入消息');
        return;
    }
    
    const { instances, cleanMessage } = parseMessage(message);
    
    if (instances.length === 0) {
        alert('请使用@符号选择要发送消息的实例');
        return;
    }
    
    // 显示用户消息（使用新的样式）
    const timestamp = new Date().toLocaleTimeString();
    addUserMessage(message, timestamp);
    document.getElementById('messageInput').value = '';
    
    // 发送到各个实例
    instances.forEach(instanceId => {
        fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instance_id: instanceId, message: cleanMessage })
        })
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                addSystemMessage(`向实例${instanceId}发送失败: ${data.error}`);
            }
        });
    });
}

// 解析@提及
function parseMessage(message) {
    const atMatches = message.match(/@实例(\w+)/g);
    if (!atMatches) {
        return { instances: [], cleanMessage: message };
    }
    
    const instances = atMatches.map(match => match.replace('@实例', ''));
    const cleanMessage = message.replace(/@实例\w+\s*/g, '').trim();
    
    return { instances, cleanMessage };
}

// 添加消息到聊天
function addMessageToChat(sender, message) {
    const container = document.getElementById('chatHistory');
    const now = new Date().toLocaleString();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mb-2';
    messageDiv.innerHTML = `
        <small class="text-muted">${now}</small>
        <div class="d-flex">
            <strong class="me-2 ${sender === 'user' ? 'text-primary' : 'text-success'}">${sender}:</strong>
            <span style="white-space: pre-wrap;">${message}</span>
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 添加实例消息
function addInstanceMessage(instanceId, content, timestamp) {
    const container = document.getElementById('chatHistory');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mb-2';
    messageDiv.innerHTML = `
        <small class="text-muted">${timestamp}</small>
        <div class="d-flex">
            <strong class="me-2 text-success">实例${instanceId}:</strong>
            <span style="white-space: pre-wrap;">${content}</span>
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 添加系统消息
function addSystemMessage(message) {
    const container = document.getElementById('systemLogs');
    const now = new Date().toLocaleString();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message mb-2 p-2 border-start border-info border-3';
    messageDiv.innerHTML = `
        <small class="text-muted d-block">${now}</small>
        <div class="text-info">
            <i class="fas fa-info-circle me-1"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 实例管理函数
function startInstance() {
    // 保留旧函数以兼容性，但推荐使用新函数
    const instanceId = document.getElementById('newInstanceId')?.value.trim();
    if (!instanceId) {
        alert('请输入实例ID');
        return;
    }
    
    fetch(`/api/start/${instanceId}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                document.getElementById('newInstanceId').value = '';
                refreshInstances();
                socket.emit('join_monitoring', { instance_id: instanceId });
            } else {
                alert('启动失败: ' + data.error);
            }
        });
}

function startInstanceWithConfig() {
    const name = document.getElementById('newInstanceName').value.trim();
    const path = document.getElementById('newInstancePath').value.trim();
    const role = document.getElementById('newInstanceRole').value;
    
    // 构建请求数据
    const requestData = {};
    if (name) requestData.name = name;
    if (path) requestData.path = path;
    if (role) requestData.role = role;
    
    // 发送请求
    fetch('/api/start-with-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // 清空表单
            document.getElementById('newInstanceName').value = '';
            document.getElementById('newInstancePath').value = '';
            document.getElementById('newInstanceRole').value = '';
            
            // 刷新实例列表
            refreshInstances();
            
            // 加入监控
            if (data.instance_id) {
                socket.emit('join_monitoring', { instance_id: data.instance_id });
            }
            
            // 显示成功消息
            addSystemMessage(data.message || `实例启动成功: ${data.instance_id || name || '未知'}`);
        } else {
            alert('启动失败: ' + data.error);
            addSystemMessage(`实例启动失败: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('启动实例失败:', error);
        alert('启动失败: 网络错误');
        addSystemMessage(`实例启动失败: 网络错误`);
    });
}

function stopInstance(id) {
    fetch(`/api/stop/${id}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                refreshInstances();
            } else {
                alert('停止失败: ' + data.error);
            }
        });
}

// 移除旧的接管函数，现在使用Web终端
// function attachInstance(id) - 已移除，使用createWebTerminal替代

// 移除旧的showAttachModal函数，现在使用Web终端

// 移除旧的copyToClipboard函数，不再需要

function cleanAll() {
    if (confirm('确定清理所有实例？')) {
        fetch('/api/clean', { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                refreshInstances();
            });
    }
}

function refreshInstances() {
    fetch('/api/instances')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                availableInstances = data.instances;
                updateInstancesList(data.instances);
            }
        });
}

function updateInstancesList(instances) {
    const container = document.getElementById('instancesList');
    container.innerHTML = instances.map(instance => `
        <div class="instance-item mb-2 p-2 border rounded">
            <div class="d-flex justify-content-between align-items-center">
                <span><strong>tmux实例 ${instance.id}</strong></span>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-info" onclick="createWebTerminal('${instance.id}')" title="Web终端接管">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="btn btn-danger" onclick="stopInstance('${instance.id}')" title="停止实例">
                        <i class="fas fa-stop"></i>
                    </button>
                </div>
            </div>
            <small class="text-muted">${instance.details}</small>
        </div>
    `).join('');
}

function clearSystemLogs() {
    document.getElementById('systemLogs').innerHTML = '';
    addSystemMessage('系统日志已清空');
}

// 自动刷新
let refreshInterval;
let autoRefreshEnabled = true;

function startAutoRefresh() {
    refreshInterval = setInterval(refreshInstances, 5000);
}

function toggleAutoRefresh() {
    const btn = document.getElementById('refreshBtn');
    if (autoRefreshEnabled) {
        clearInterval(refreshInterval);
        autoRefreshEnabled = false;
        btn.innerHTML = '<i class="fas fa-pause"></i> 自动刷新: 关闭';
        btn.className = 'btn btn-sm btn-warning';
    } else {
        startAutoRefresh();
        autoRefreshEnabled = true;
        btn.innerHTML = '<i class="fas fa-sync"></i> 自动刷新: 开启';
        btn.className = 'btn btn-sm btn-success';
    }
}

function manualRefresh() {
    refreshInstances();
    
    // 刷新namespace数据
    if (typeof loadNamespaces === 'function') {
        loadNamespaces();
    }
    
    // 重新应用namespace过滤
    setTimeout(() => {
        if (typeof filterInstancesByNamespace === 'function') {
            filterInstancesByNamespace();
        }
    }, 500);
    
    addSystemMessage('已刷新实例状态和namespace数据');
}
