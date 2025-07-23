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
    return fetch('/api/instances')
        .then(response => response.json())
        .then(data => {
            allInstances = data.instances || [];
            
            // 提取所有唯一的namespace
            const namespaceSet = new Set();
            namespaceSet.add(''); // 添加"全部"选项
            
            allInstances.forEach(instance => {
                if (instance.namespace) {
                    namespaceSet.add(instance.namespace);
                }
            });
            
            const namespaces = Array.from(namespaceSet).sort();
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
        option.value = ns;
        option.textContent = ns || '全部';
        if (ns === currentNamespace) {
            option.selected = true;
        }
        select.appendChild(option);
    });
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
        
        // 重新加载实例列表
        loadInstancesWithNamespace();
        
        // 重新加载聊天记录
        reloadChatHistoryForNamespace(currentNamespace);
        
        // 停止当前监控
        if (typeof stopMonitoring === 'function') {
            stopMonitoring();
        }
    }
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
                filteredInstances = allInstances.filter(instance => 
                    instance.namespace === currentNamespace
                );
            }
            
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
            startMonitoring(instanceId);
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
    
    // 开始监控
    if (typeof startMonitoring === 'function') {
        startMonitoring(instanceId);
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
