/**
 * 创建实例交互卡片功能
 */

/**
 * 显示创建实例卡片
 */
function showCreateInstanceCard() {
    const card = document.getElementById('createInstanceCard');
    if (!card) return;
    
    // 显示卡片
    card.style.display = 'block';
    
    // 更新namespace选择器
    updateCardNamespaceSelect();
    
    // 设置默认namespace为当前选中的
    const currentNs = getCurrentNamespace ? getCurrentNamespace() : '';
    const namespaceSelect = document.getElementById('cardInstanceNamespace');
    if (namespaceSelect && currentNs) {
        namespaceSelect.value = currentNs;
    }
    
    // 聚焦到实例名称输入框
    const nameInput = document.getElementById('cardInstanceName');
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
    
    // 调整聊天历史高度
    adjustChatHistoryHeight();
}

/**
 * 隐藏创建实例卡片
 */
function hideCreateInstanceCard() {
    const card = document.getElementById('createInstanceCard');
    if (!card) return;
    
    // 隐藏卡片
    card.style.display = 'none';
    
    // 清空表单
    clearCardForm();
    
    // 恢复聊天历史高度
    adjustChatHistoryHeight();
}

/**
 * 更新卡片中的namespace选择器
 */
function updateCardNamespaceSelect() {
    const select = document.getElementById('cardInstanceNamespace');
    if (!select) return;
    
    // 保存当前选中值
    const currentValue = select.value;
    
    // 清空并重新填充
    select.innerHTML = '<option value="">默认namespace</option>';
    
    // 添加namespace选项
    if (window.namespaces && Array.isArray(window.namespaces)) {
        window.namespaces.forEach(ns => {
            const option = document.createElement('option');
            option.value = ns.name;
            option.textContent = ns.name;
            select.appendChild(option);
        });
    }
    
    // 恢复选中值
    if (currentValue) {
        select.value = currentValue;
    }
}

/**
 * 从卡片创建实例
 */
async function createInstanceFromCard() {
    const name = document.getElementById('cardInstanceName').value.trim();
    const path = document.getElementById('cardInstancePath').value.trim();
    const namespace = document.getElementById('cardInstanceNamespace').value;
    const role = document.getElementById('cardInstanceRole').value;
    
    // 构建请求数据
    const data = {};
    if (name) data.name = name;
    if (path) data.path = path;
    if (role) data.role = role;
    if (namespace) data.namespace = namespace;
    
    // 显示创建中状态
    const createBtn = document.querySelector('#createInstanceCard .btn-success');
    const originalText = createBtn.innerHTML;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';
    createBtn.disabled = true;
    
    try {
        const response = await fetch('/api/instances', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const instanceId = result.instance_id || name || '自动生成ID';
            
            // 显示成功消息
            addSystemMessage(`实例创建成功: ${instanceId}`);
            
            // 添加到聊天历史
            addChatMessage('system', `✅ 实例 "${instanceId}" 已创建成功！`);
            
            // 隐藏卡片
            hideCreateInstanceCard();
            
            // 刷新实例列表
            setTimeout(() => {
                if (typeof manualRefresh === 'function') {
                    manualRefresh();
                }
            }, 1000);
            
        } else {
            throw new Error(result.error || '创建失败');
        }
        
    } catch (error) {
        console.error('创建实例异常:', error);
        addSystemMessage(`创建实例失败: ${error.message}`);
        addChatMessage('system', `❌ 创建实例失败: ${error.message}`);
        
    } finally {
        // 恢复按钮状态
        createBtn.innerHTML = originalText;
        createBtn.disabled = false;
    }
}

/**
 * 清空卡片表单
 */
function clearCardForm() {
    const inputs = [
        'cardInstanceName',
        'cardInstancePath'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    
    const selects = [
        'cardInstanceNamespace',
        'cardInstanceRole'
    ];
    
    selects.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
}

/**
 * 调整聊天历史高度
 */
function adjustChatHistoryHeight() {
    const card = document.getElementById('createInstanceCard');
    const chatHistory = document.getElementById('chatHistory');
    
    if (!chatHistory) return;
    
    if (card && card.style.display !== 'none') {
        // 卡片显示时，减少聊天历史高度
        chatHistory.style.maxHeight = 'calc(500px - 140px)';
    } else {
        // 卡片隐藏时，恢复原始高度
        chatHistory.style.maxHeight = '500px';
    }
}

/**
 * 添加聊天消息到界面
 */
function addChatMessage(sender, message) {
    const chatHistory = document.getElementById('chatHistory');
    if (!chatHistory) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mb-2';
    
    const timestamp = new Date().toLocaleTimeString();
    const senderClass = sender === 'user' ? 'text-primary' : 'text-success';
    
    messageDiv.innerHTML = `
        <small class="text-muted">${timestamp}</small>
        <div class="d-flex">
            <strong class="me-2 ${senderClass}">${sender}:</strong>
            <span style="white-space: pre-wrap;">${message}</span>
        </div>
    `;
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * 键盘事件处理
 */
document.addEventListener('DOMContentLoaded', function() {
    // ESC键隐藏卡片
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const card = document.getElementById('createInstanceCard');
            if (card && card.style.display !== 'none') {
                hideCreateInstanceCard();
            }
        }
    });
    
    // Enter键创建实例
    const cardInputs = ['cardInstanceName', 'cardInstancePath'];
    cardInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    createInstanceFromCard();
                }
            });
        }
    });
});

// 导出函数供全局使用
window.showCreateInstanceCard = showCreateInstanceCard;
window.hideCreateInstanceCard = hideCreateInstanceCard;
window.createInstanceFromCard = createInstanceFromCard;
window.updateCardNamespaceSelect = updateCardNamespaceSelect;
