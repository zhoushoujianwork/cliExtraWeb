/**
 * Namespace管理功能 - 优化版，利用cliExtra list --json的namespace输出
 */

// 全局变量
let namespaces = [];
let currentNamespace = ''; // 当前选中的namespace
let allInstances = []; // 所有实例数据

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadNamespaces();
    loadInstancesWithNamespace();
    
    // 监听namespace选择变化
    const namespaceSelect = document.getElementById('currentNamespaceSelect');
    if (namespaceSelect) {
        namespaceSelect.addEventListener('change', switchNamespace);
    }
});

/**
 * 加载实例数据并提取namespace信息
 */
async function loadInstancesWithNamespace() {
    try {
        const response = await fetch('/api/instances');
        const data = await response.json();
        
        if (data.success) {
            allInstances = data.instances || [];
            
            // 从实例数据中提取namespace统计
            const namespaceStats = {};
            allInstances.forEach(instance => {
                const ns = instance.namespace || 'default';
                namespaceStats[ns] = (namespaceStats[ns] || 0) + 1;
            });
            
            // 更新namespace统计显示
            updateNamespaceStatsInSelect(namespaceStats);
            
            // 应用当前namespace过滤
            filterInstancesByNamespace();
        }
    } catch (error) {
        console.error('加载实例数据异常:', error);
    }
}

/**
 * 更新namespace选择器中的统计信息
 */
function updateNamespaceStatsInSelect(namespaceStats) {
    const select = document.getElementById('currentNamespaceSelect');
    if (!select) return;
    
    // 保存当前选中值
    const currentValue = select.value;
    
    // 重新构建选项
    select.innerHTML = '';
    
    // 添加"全部"选项
    const totalCount = Object.values(namespaceStats).reduce((sum, count) => sum + count, 0);
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = `全部 (${totalCount})`;
    select.appendChild(allOption);
    
    // 添加各个namespace选项
    Object.keys(namespaceStats).sort().forEach(ns => {
        const option = document.createElement('option');
        option.value = ns;
        option.textContent = `${ns} (${namespaceStats[ns]})`;
        select.appendChild(option);
    });
    
    // 恢复选中值
    if (currentValue !== undefined) {
        select.value = currentValue;
    }
}

/**
 * 加载所有namespace（从API）
 */
async function loadNamespaces() {
    try {
        const response = await fetch('/api/namespaces');
        const data = await response.json();
        
        if (data.success) {
            namespaces = data.namespaces;
            updateNamespacesList();
            updateNamespaceSelects();
        } else {
            console.error('加载namespace失败:', data.error);
            addSystemMessage('加载namespace失败: ' + data.error);
        }
    } catch (error) {
        console.error('加载namespace异常:', error);
        addSystemMessage('加载namespace异常: ' + error.message);
    }
}

/**
 * 切换namespace
 */
function switchNamespace() {
    const select = document.getElementById('currentNamespaceSelect');
    const label = document.getElementById('currentNamespaceLabel');
    
    if (!select) return;
    
    currentNamespace = select.value;
    
    // 更新标签显示
    if (label) {
        const displayName = currentNamespace || '全部';
        label.textContent = displayName;
        label.className = currentNamespace ? 'badge bg-success' : 'badge bg-primary';
    }
    
    // 过滤实例列表
    filterInstancesByNamespace();
    
    // 清空聊天历史
    clearChatHistory();
    
    // 更新创建实例表单的默认namespace
    const cardNamespace = document.getElementById('cardInstanceNamespace');
    if (cardNamespace && currentNamespace) {
        cardNamespace.value = currentNamespace;
    }
    
    addSystemMessage(`已切换到namespace: ${currentNamespace || '全部'}`);
}

/**
 * 根据当前namespace过滤实例 - 优化版
 */
function filterInstancesByNamespace() {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    const instanceItems = instancesList.querySelectorAll('.instance-item');
    let visibleCount = 0;
    
    instanceItems.forEach(item => {
        const instanceNamespace = item.dataset.namespace || 'default';
        
        // 标准化namespace比较
        const normalizedInstanceNs = instanceNamespace === '' ? 'default' : instanceNamespace;
        const normalizedCurrentNs = currentNamespace === '' ? '' : currentNamespace;
        
        if (!normalizedCurrentNs || normalizedInstanceNs === normalizedCurrentNs) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // 更新实例计数显示
    console.log(`当前namespace "${currentNamespace || '全部'}" 下有 ${visibleCount} 个实例`);
    
    // 如果没有实例，显示提示
    if (visibleCount === 0 && instanceItems.length > 0) {
        showNoInstancesMessage();
    } else {
        hideNoInstancesMessage();
    }
}

/**
 * 显示无实例提示
 */
function showNoInstancesMessage() {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    let noInstancesMsg = instancesList.querySelector('.no-instances-message');
    if (!noInstancesMsg) {
        noInstancesMsg = document.createElement('div');
        noInstancesMsg.className = 'no-instances-message text-center text-muted p-3';
        noInstancesMsg.innerHTML = `
            <i class="fas fa-inbox fa-2x mb-2"></i>
            <p class="mb-0">当前namespace下暂无实例</p>
            <small>点击右上角"新增实例"创建</small>
        `;
        instancesList.appendChild(noInstancesMsg);
    }
    noInstancesMsg.style.display = 'block';
}

/**
 * 隐藏无实例提示
 */
function hideNoInstancesMessage() {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    const noInstancesMsg = instancesList.querySelector('.no-instances-message');
    if (noInstancesMsg) {
        noInstancesMsg.style.display = 'none';
    }
}

/**
 * 清空聊天历史
 */
function clearChatHistory() {
    const chatHistory = document.getElementById('chatHistory');
    if (chatHistory) {
        chatHistory.innerHTML = '<div class="text-muted text-center p-3">已切换namespace，聊天记录已清空</div>';
    }
}

/**
 * 创建新namespace
 */
async function createNamespace() {
    const nameInput = document.getElementById('newNamespaceName');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('请输入namespace名称');
        return;
    }
    
    try {
        const response = await fetch('/api/namespaces', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addSystemMessage(`Namespace "${name}" 创建成功`);
            nameInput.value = '';
            await loadNamespaces();
            await loadInstancesWithNamespace();
        } else {
            alert('创建namespace失败: ' + data.error);
        }
    } catch (error) {
        console.error('创建namespace异常:', error);
        alert('创建namespace异常: ' + error.message);
    }
}

/**
 * 获取当前选中的namespace
 */
function getCurrentNamespace() {
    return currentNamespace;
}

// 导出函数供全局使用
window.loadNamespaces = loadNamespaces;
window.loadInstancesWithNamespace = loadInstancesWithNamespace;
window.switchNamespace = switchNamespace;
window.createNamespace = createNamespace;
window.getCurrentNamespace = getCurrentNamespace;
