/**
 * 简化的Namespace管理功能
 */

// 全局变量
let currentNamespace = '';
let allInstances = [];

// 暴露到全局作用域供其他模块使用
window.currentNamespace = currentNamespace;

// 缓存键名
const NAMESPACE_CACHE_KEY = 'cliExtraWeb_selectedNamespace';

/**
 * 从缓存中获取上次选择的 namespace
 */
function getStoredNamespace() {
    try {
        return localStorage.getItem(NAMESPACE_CACHE_KEY) || '';
    } catch (error) {
        console.warn('无法读取 namespace 缓存:', error);
        return '';
    }
}

/**
 * 将当前选择的 namespace 保存到缓存
 */
function storeNamespace(namespace) {
    try {
        localStorage.setItem(NAMESPACE_CACHE_KEY, namespace || '');
    } catch (error) {
        console.warn('无法保存 namespace 缓存:', error);
    }
}

/**
 * 获取当前选择的namespace
 */
function getCurrentNamespace() {
    return currentNamespace;
}

/**
 * 加载namespace列表
 */
function loadNamespaces() {
    return fetch('/api/namespaces')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('获取namespace失败:', data.error);
                return [];
            }
            
            const namespaces = data.namespaces || [];
            updateNamespaceSelect(namespaces);
            
            return namespaces;
        })
        .catch(error => {
            console.error('加载namespace失败:', error);
            return [];
        });
}

/**
 * 更新namespace选择器
 */
function updateNamespaceSelect(namespaces) {
    const select = document.getElementById('currentNamespaceSelect');
    if (!select) return;
    
    select.innerHTML = '';
    
    namespaces.forEach(ns => {
        const option = document.createElement('option');
        option.value = ns.name;
        
        // 使用display_name和instance_count
        const displayName = ns.display_name || ns.name || '全部';
        const instanceCount = ns.instance_count || 0;
        option.textContent = `${displayName} (${instanceCount})`;
        
        if (ns.name === currentNamespace) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // 如果当前选择的namespace不存在，重置为空（全部）
    const namespaceNames = namespaces.map(ns => ns.name);
    if (currentNamespace && !namespaceNames.includes(currentNamespace)) {
        console.log(`当前namespace "${currentNamespace}" 不存在，重置为全部`);
        currentNamespace = '';
        window.currentNamespace = '';
        storeNamespace('');
        
        // 更新选择器
        const allOption = select.querySelector('option[value=""]');
        if (allOption) {
            allOption.selected = true;
        }
    }
}

/**
 * 切换namespace
 */
function switchNamespace() {
    const select = document.getElementById('currentNamespaceSelect');
    if (!select) return;
    
    const newNamespace = select.value;
    if (newNamespace !== currentNamespace) {
        const oldNamespace = currentNamespace;
        currentNamespace = newNamespace;
        window.currentNamespace = currentNamespace; // 同步到全局作用域
        storeNamespace(currentNamespace);
        
        console.log('切换namespace:', oldNamespace, '->', currentNamespace || '全部');
        
        // 显示切换提示
        showNamespaceSwitchNotification(oldNamespace, currentNamespace);
        
        // 执行全面的页面刷新
        refreshAllPageComponents();
    }
}

/**
 * 显示namespace切换通知
 */
function showNamespaceSwitchNotification(oldNs, newNs) {
    const oldName = oldNs || '全部';
    const newName = newNs || '全部';
    
    if (typeof showNotification === 'function') {
        showNotification(`已切换到 ${newName} namespace`, 'info');
    } else {
        console.log(`Namespace切换: ${oldName} -> ${newName}`);
    }
}

/**
 * 刷新所有页面组件
 */
function refreshAllPageComponents() {
    console.log('开始刷新所有页面组件...');
    
    // 1. 停止当前的监控和活动
    stopCurrentActivities();
    
    // 2. 刷新实例列表
    refreshInstancesList();
    
    // 3. 刷新聊天相关组件
    refreshChatComponents();
    
    // 4. 刷新其他UI组件
    refreshOtherComponents();
    
    console.log('页面组件刷新完成');
}

/**
 * 停止当前活动
 */
function stopCurrentActivities() {
    // 停止实例监控
    if (typeof stopMonitoring === 'function') {
        stopMonitoring();
    }
    
    // 停止任何正在进行的轮询
    if (window.instanceRefreshInterval) {
        clearInterval(window.instanceRefreshInterval);
    }
    
    // 清除选中的实例
    if (typeof clearSelectedInstance === 'function') {
        clearSelectedInstance();
    }
}

/**
 * 刷新实例列表
 */
function refreshInstancesList() {
    console.log('刷新实例列表...');
    
    // 重新加载实例列表
    loadInstancesWithNamespace();
    
    // 清空实例选择器
    const instanceSelect = document.getElementById('instanceSelect');
    if (instanceSelect) {
        instanceSelect.innerHTML = '<option value="">选择实例...</option>';
    }
    
    // 清空聊天实例选择器
    const chatInstanceSelect = document.getElementById('chatInstanceSelect');
    if (chatInstanceSelect) {
        chatInstanceSelect.innerHTML = '<option value="">选择实例...</option>';
    }
}

/**
 * 刷新聊天相关组件
 */
function refreshChatComponents() {
    console.log('刷新聊天组件...');
    
    // 重新加载聊天记录
    reloadChatHistoryForNamespace(currentNamespace);
    
    // 清空当前聊天显示
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // 重置聊天输入
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
    }
    
    // 更新聊天状态显示
    updateChatStatus();
}

/**
 * 刷新其他UI组件
 */
function refreshOtherComponents() {
    console.log('刷新其他组件...');
    
    // 更新页面标题或状态栏
    updatePageTitle();
    
    // 刷新任何namespace相关的统计信息
    if (typeof refreshNamespaceStats === 'function') {
        refreshNamespaceStats();
    }
    
    // 重新启动定期刷新
    restartPeriodicRefresh();
}

/**
 * 更新聊天状态
 */
function updateChatStatus() {
    const statusElement = document.getElementById('chatStatus');
    if (statusElement) {
        const nsName = currentNamespace || '全部';
        statusElement.textContent = `当前namespace: ${nsName}`;
    }
}

/**
 * 更新页面标题
 */
function updatePageTitle() {
    const nsName = currentNamespace || '全部';
    const titleElement = document.querySelector('title');
    if (titleElement) {
        const baseTitle = 'Q Chat Manager';
        titleElement.textContent = `${baseTitle} - ${nsName}`;
    }
}

/**
 * 重新启动定期刷新
 */
function restartPeriodicRefresh() {
    // 重新启动实例列表的定期刷新
    if (window.instanceRefreshInterval) {
        clearInterval(window.instanceRefreshInterval);
    }
    
    window.instanceRefreshInterval = setInterval(() => {
        if (typeof loadInstancesWithNamespace === 'function') {
            loadInstancesWithNamespace();
        }
    }, 5000);
}

/**
 * 为指定namespace重新加载聊天记录
 */
async function reloadChatHistoryForNamespace(namespace) {
    try {
        console.log('重新加载聊天记录，namespace:', namespace);
        
        // 清空当前聊天区域
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // 显示加载提示
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(`正在加载 ${namespace || 'default'} 的聊天记录...`);
        }
        
        // 调用获取聊天历史API
        const response = await fetch(`/api/chat/history?limit=50&namespace=${namespace || 'default'}`);
        const result = await response.json();
        
        if (result.success && result.history && result.history.length > 0) {
            console.log('加载聊天记录成功，数量:', result.history.length);
            
            // 清空加载提示
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // 加载历史记录到聊天界面
            if (typeof loadHistoryToChat === 'function') {
                loadHistoryToChat(result.history);
            }
            
            if (typeof addSystemMessage === 'function') {
                addSystemMessage(`已加载 ${result.history.length} 条历史消息`);
            }
        } else {
            console.log('无聊天记录或加载失败');
            
            // 清空加载提示
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            if (typeof addSystemMessage === 'function') {
                addSystemMessage(`欢迎使用 ${namespace || 'default'} 聊天功能！`);
            }
        }
    } catch (error) {
        console.error('重新加载聊天记录失败:', error);
        
        // 清空加载提示
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(`加载聊天记录失败: ${error.message}`);
        }
    }
}

/**
 * 根据namespace过滤并加载实例
 */
function loadInstancesWithNamespace() {
    fetch('/api/instances')
        .then(response => response.json())
        .then(data => {
            allInstances = data.instances || [];
            
            // 根据当前namespace过滤实例
            let filteredInstances = allInstances;
            if (currentNamespace) {
                // 选择了特定namespace，只显示该namespace的实例
                filteredInstances = allInstances.filter(instance => 
                    instance.namespace === currentNamespace
                );
            }
            // 如果currentNamespace为空，显示所有实例（包括没有namespace的）
            
            updateInstancesList(filteredInstances);
        })
        .catch(error => {
            console.error('加载实例失败:', error);
        });
}

/**
 * 更新实例列表显示
 */
function updateInstancesList(instances) {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    instancesList.innerHTML = '';
    
    if (instances.length === 0) {
        instancesList.innerHTML = '<div class="text-muted text-center p-3">当前namespace没有实例</div>';
        return;
    }
    
    instances.forEach(instance => {
        const instanceDiv = document.createElement('div');
        instanceDiv.className = 'instance-item mb-2 p-2 border rounded';
        
        // 根据状态设置不同的样式
        const statusClass = instance.status === 'Attached' ? 'success' : 
                           instance.status === 'Detached' ? 'warning' : 'secondary';
        
        instanceDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${instance.id}</strong>
                    <span class="badge bg-${statusClass} ms-2">
                        ${instance.status}
                    </span>
                    ${instance.namespace ? '<br><small class="text-muted">ns: ' + instance.namespace + '</small>' : ''}
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="startMonitoringWithMemory('${instance.id}')" title="监控输出">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="stopInstance('${instance.id}')" title="停止实例" ${instance.status === 'Detached' ? 'disabled' : ''}>
                        <i class="fas fa-stop"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="cleanInstance('${instance.id}')" title="清理实例数据">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        instancesList.appendChild(instanceDiv);
    });
    
    // 更新聊天功能的可用实例列表
    if (typeof updateAvailableInstances === 'function') {
        updateAvailableInstances(instances);
    }
    
    // 尝试自动恢复上次选择的实例
    if (window.terminalMemory) {
        window.terminalMemory.autoRestoreTerminalSelection(instances, (instanceId) => {
            console.log('🔄 自动恢复终端监控:', instanceId);
            // 只有在监控函数存在时才调用
            if (typeof startMonitoring === 'function') {
                startMonitoring(instanceId);
            } else {
                console.log('⚠️ startMonitoring 函数不可用，跳过自动恢复');
            }
        });
    }
}

/**
 * 带记忆功能的开始监控
 * @param {string} instanceId - 实例ID
 */
function startMonitoringWithMemory(instanceId) {
    // 保存用户选择
    if (window.terminalMemory) {
        window.terminalMemory.saveLastSelectedInstance(instanceId, currentNamespace || 'default');
    }
    
    // 开始监控（只有在监控函数存在时才调用）
    if (typeof startMonitoring === 'function') {
        startMonitoring(instanceId);
    } else {
        console.log('⚠️ startMonitoring 函数不可用，仅保存选择记录');
        // 如果没有监控函数，可以考虑跳转到聊天管理页面
        if (confirm('监控功能需要在聊天管理页面使用，是否跳转？')) {
            window.location.href = '/';
        }
    }
}

/**
 * 显示namespace管理模态框
 */
function showNamespaceManageModal() {
    // 简化版：显示当前namespace信息
    const message = `当前Namespace: ${currentNamespace || '全部'}\n\n可用的Namespace:\n${
        Array.from(new Set(allInstances.map(i => i.namespace || '默认'))).join('\n')
    }`;
    
    alert(message);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从缓存中恢复上次选择的 namespace
    const storedNamespace = getStoredNamespace();
    if (storedNamespace) {
        currentNamespace = storedNamespace;
        window.currentNamespace = currentNamespace; // 同步到全局作用域
        console.log('从缓存中恢复 namespace:', currentNamespace);
    }
    
    // 加载namespace和实例数据
    loadNamespaces().then(() => {
        loadInstancesWithNamespace();
    });
});
