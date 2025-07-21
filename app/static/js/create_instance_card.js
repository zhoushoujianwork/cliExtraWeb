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
    
    // 聚焦到名称输入框
    const nameInput = document.getElementById('cardInstanceName');
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
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
    clearCreateInstanceForm();
}

/**
 * 更新卡片中的namespace选择器
 */
function updateCardNamespaceSelect() {
    const select = document.getElementById('cardInstanceNamespace');
    if (!select) return;
    
    // 保存当前选中值
    const currentValue = select.value;
    
    // 清空选项
    select.innerHTML = '<option value="">默认命名空间</option>';
    
    // 添加常用namespace选项
    const commonNamespaces = ['frontend', 'backend', 'test', 'devops'];
    commonNamespaces.forEach(ns => {
        const option = document.createElement('option');
        option.value = ns;
        option.textContent = ns;
        select.appendChild(option);
    });
    
    // 恢复选中值
    if (currentValue) {
        select.value = currentValue;
    }
}

/**
 * 从卡片创建实例
 */
async function createInstanceFromCard() {
    try {
        // 安全获取表单数据
        const nameEl = document.getElementById('cardInstanceName');
        const pathEl = document.getElementById('cardInstancePath');
        const namespaceEl = document.getElementById('cardInstanceNamespace');
        const roleEl = document.getElementById('cardInstanceRole');
        const toolsEl = document.getElementById('cardInstanceTools');
        
        const name = nameEl ? nameEl.value.trim() : '';
        const path = pathEl ? pathEl.value.trim() : '';
        const namespace = namespaceEl ? namespaceEl.value : '';
        const role = roleEl ? roleEl.value : '';
        
        // 获取选中的工具
        const tools = toolsEl ? Array.from(toolsEl.selectedOptions).map(option => option.value) : [];
        
        // 验证必要字段
        if (!name && !role) {
            showCreateNotification('请至少填写实例名称或选择角色', 'warning');
            return;
        }
        
        // 显示加载状态
        const createBtn = document.querySelector('#createInstanceCard .btn-success');
        if (!createBtn) {
            console.error('找不到创建按钮');
            return;
        }
        
        const originalText = createBtn.innerHTML;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';
        createBtn.disabled = true;
        
        try {
            // 构建请求数据
            const requestData = {};
            if (name) requestData.instance_id = name;
            if (path) requestData.project_path = path;
            if (namespace) requestData.namespace = namespace;
            if (role) requestData.role = role;
            if (tools.length > 0) requestData.tools = tools;
            
            console.log('创建实例请求数据:', requestData);
            
            // 发送创建请求
            const response = await fetch('/api/create_instance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                const instanceId = result.instance_id || name || '自动生成ID';
                showCreateNotification(`实例 ${instanceId} 创建成功`, 'success');
                
                // 添加到聊天历史
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage(`实例创建成功: ${instanceId}`);
                }
                
                if (typeof addChatMessage === 'function') {
                    addChatMessage('system', `✅ 实例 "${instanceId}" 已创建成功！`);
                }
                
                // 清空表单
                clearCreateInstanceForm();
                
                // 隐藏创建卡片
                hideCreateInstanceCard();
                
                // 刷新实例列表
                if (typeof refreshInstances === 'function') {
                    setTimeout(refreshInstances, 1000);
                } else if (typeof manualRefresh === 'function') {
                    setTimeout(manualRefresh, 1000);
                }
                
            } else {
                showCreateNotification(`创建实例失败: ${result.error}`, 'error');
                
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage(`创建实例失败: ${result.error}`);
                }
            }
            
        } catch (error) {
            console.error('创建实例失败:', error);
            showCreateNotification(`创建实例失败: ${error.message}`, 'error');
            
            if (typeof addSystemMessage === 'function') {
                addSystemMessage(`创建实例失败: ${error.message}`);
            }
        }
        
        // 恢复按钮状态
        createBtn.innerHTML = originalText;
        createBtn.disabled = false;
        
    } catch (error) {
        console.error('创建实例异常:', error);
        showCreateNotification(`创建实例异常: ${error.message}`, 'error');
        
        // 恢复按钮状态
        const createBtn = document.querySelector('#createInstanceCard .btn-success');
        if (createBtn) {
            createBtn.innerHTML = '<i class="fas fa-rocket"></i> 启动实例';
            createBtn.disabled = false;
        }
    }
}

/**
 * 清空创建实例表单
 */
function clearCreateInstanceForm() {
    const elements = [
        'cardInstanceName',
        'cardInstancePath',
        'cardInstanceNamespace',
        'cardInstanceRole'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
        }
    });
    
    // 清空多选工具
    const toolsEl = document.getElementById('cardInstanceTools');
    if (toolsEl) {
        Array.from(toolsEl.options).forEach(option => {
            option.selected = false;
        });
    }
}

/**
 * 选择当前目录
 */
function selectCurrentDirectory() {
    const pathEl = document.getElementById('cardInstancePath');
    if (pathEl) {
        pathEl.value = '/Users/mikas/github/cliExtraWeb';
    }
}

/**
 * 显示创建相关的通知
 */
function showCreateNotification(message, type = 'info') {
    // 尝试使用全局通知函数
    if (typeof showNotification === 'function') {
        return showNotification(message, type);
    }
    
    // 尝试使用系统消息函数
    if (typeof addSystemMessage === 'function') {
        return addSystemMessage(message);
    }
    
    // 降级到alert
    const prefix = type === 'error' ? '错误: ' : 
                  type === 'warning' ? '警告: ' : 
                  type === 'success' ? '成功: ' : '';
    alert(prefix + message);
}

// 确保函数在全局作用域中可用
window.showCreateInstanceCard = showCreateInstanceCard;
window.hideCreateInstanceCard = hideCreateInstanceCard;
window.createInstanceFromCard = createInstanceFromCard;
window.selectCurrentDirectory = selectCurrentDirectory;
