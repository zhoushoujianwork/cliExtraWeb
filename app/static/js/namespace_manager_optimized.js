/**
 * Namespace管理功能 - 优化版，利用cliExtra list --json的namespace输出
 */

// 全局变量
let namespaces = [];
let currentNamespace = ''; // 当前选中的namespace
let allInstances = []; // 所有实例数据

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

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从缓存中恢复上次选择的 namespace
    const storedNamespace = getStoredNamespace();
    if (storedNamespace) {
        currentNamespace = storedNamespace;
        console.log('从缓存中恢复 namespace:', currentNamespace);
    }
    
    // 先加载namespace列表，再加载实例数据
    loadNamespaces().then(() => {
        loadInstancesWithNamespace();
    });
    
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
            
            // 合并所有已知的namespace（包括没有实例的）
            const allNamespaceStats = {};
            
            // 首先添加从实例中统计的namespace
            Object.keys(namespaceStats).forEach(ns => {
                allNamespaceStats[ns] = namespaceStats[ns];
            });
            
            // 然后添加从API获取的所有namespace（确保没有遗漏）
            namespaces.forEach(ns => {
                if (!allNamespaceStats.hasOwnProperty(ns.name)) {
                    allNamespaceStats[ns.name] = 0;
                }
            });
            
            // 更新namespace统计显示
            updateNamespaceStatsInSelect(allNamespaceStats);
            
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
            
            // 尝试恢复缓存的 namespace 选择
            const storedNamespace = getStoredNamespace();
            const select = document.getElementById('currentNamespaceSelect');
            
            if (storedNamespace && namespaces.some(ns => ns.name === storedNamespace)) {
                // 缓存的 namespace 仍然存在，恢复选择
                currentNamespace = storedNamespace;
                if (select) {
                    select.value = currentNamespace;
                }
                console.log('恢复缓存的 namespace 选择:', currentNamespace);
            } else if (!currentNamespace && namespaces.length > 0) {
                // 没有缓存或缓存的 namespace 不存在，选择第一个
                currentNamespace = namespaces[0].name;
                if (select) {
                    select.value = currentNamespace;
                }
                console.log('选择默认 namespace:', currentNamespace);
            }
            
            // 触发切换逻辑
            if (currentNamespace) {
                switchNamespace();
            }
            
            console.log('Namespace列表加载完成:', namespaces.map(ns => ns.name));
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
    
    // 如果没有选择namespace，默认使用第一个可用的namespace
    if (!currentNamespace && namespaces.length > 0) {
        currentNamespace = namespaces[0].name;
        select.value = currentNamespace;
    }
    
    // 保存当前选择到缓存
    storeNamespace(currentNamespace);
    
    // 更新标签显示
    if (label) {
        label.textContent = currentNamespace || 'default';
        label.className = 'badge bg-success';
    }
    
    // 更新创建实例表单的默认namespace - 使用统一逻辑
    const cardNamespace = document.getElementById('cardInstanceNamespace');
    if (cardNamespace && currentNamespace) {
        // 如果创建实例表单的namespace选择器存在，且当前有选择的namespace
        // 只有在表单没有选择时才自动设置
        if (!cardNamespace.value || cardNamespace.value === '') {
            cardNamespace.value = currentNamespace;
        }
    }
    
    // 刷新当前namespace的实例列表
    if (typeof refreshInstances === 'function') {
        refreshInstances();
    }
    
    // 刷新@系统的实例列表
    if (typeof window.mentionSystem !== 'undefined' && window.mentionSystem) {
        window.mentionSystem.loadInstances();
    }
    
    // 清空聊天历史
    clearChatHistory();
    
    console.log(`切换到namespace: ${currentNamespace}`);
    addSystemMessage(`已切换到namespace: ${currentNamespace}`);
}

/**
 * 根据当前namespace过滤实例 - 优化版
 */
function filterInstancesByNamespace() {
    // 此函数已废弃，现在直接从API按namespace获取实例
    // 保留函数定义以避免调用错误
    console.log('filterInstancesByNamespace已废弃，现在使用API按namespace获取实例');
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
 * 更新namespace列表显示（模态框中）
 */
function updateNamespacesList() {
    const container = document.getElementById('namespacesList');
    if (!container) return;
    
    if (namespaces.length === 0) {
        container.innerHTML = '<p class="text-muted">暂无namespace</p>';
        return;
    }
    
    let html = '';
    namespaces.forEach(ns => {
        html += `
            <div class="namespace-item mb-2 p-3 border rounded">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${ns.name}</strong>
                        <span class="badge bg-secondary ms-2">${ns.instance_count} 实例</span>
                        ${ns.name === currentNamespace ? '<span class="badge bg-success ms-1">当前</span>' : ''}
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="switchToNamespace('${ns.name}')" title="切换到此namespace">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteNamespace('${ns.name}')" title="删除namespace">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * 更新namespace选择框
 */
function updateNamespaceSelects() {
    const selects = [
        document.getElementById('currentNamespaceSelect'), // 主要的namespace选择器
        document.getElementById('cardInstanceNamespace'),
        document.getElementById('newNamespaceSelect')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        // 保存当前选中值
        const currentValue = select.value;
        
        // 清空选项
        select.innerHTML = '';
        
        // 对于主要的namespace选择器，不添加"全部"选项
        // 对于其他选择器，保留默认选项
        if (select.id !== 'currentNamespaceSelect') {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = select.id === 'cardInstanceNamespace' ? '选择namespace' : '选择namespace';
            select.appendChild(defaultOption);
        }
        
        // 添加namespace选项
        namespaces.forEach(ns => {
            const option = document.createElement('option');
            option.value = ns.name;
            option.textContent = ns.name;
            select.appendChild(option);
        });
        
        // 恢复选中值，如果不存在则选择第一个namespace
        if (currentValue && namespaces.some(ns => ns.name === currentValue)) {
            select.value = currentValue;
        } else if (select.id === 'currentNamespaceSelect' && namespaces.length > 0) {
            // 主要选择器默认选择第一个namespace
            select.value = namespaces[0].name;
            currentNamespace = namespaces[0].name;
        } else if (currentValue) {
            select.value = currentValue;
        }
    });
}

/**
 * 显示namespace管理模态框
 */
function showNamespaceManageModal() {
    loadNamespaces(); // 刷新数据
    const modal = new bootstrap.Modal(document.getElementById('namespaceManageModal'));
    modal.show();
}

/**
 * 切换到指定namespace
 */
function switchToNamespace(namespaceName) {
    const select = document.getElementById('currentNamespaceSelect');
    if (select) {
        select.value = namespaceName;
        switchNamespace();
    }
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('namespaceManageModal'));
    if (modal) {
        modal.hide();
    }
}

/**
 * 删除namespace
 */
async function deleteNamespace(namespaceName) {
    const confirmed = confirm(`确定要删除namespace "${namespaceName}" 吗？`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/namespaces/${namespaceName}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            addSystemMessage(`Namespace "${namespaceName}" 删除成功`);
            
            // 如果删除的是当前选中的namespace，切换到"全部"
            if (namespaceName === currentNamespace) {
                const select = document.getElementById('currentNamespaceSelect');
                if (select) {
                    select.value = '';
                    switchNamespace();
                }
            }
            
            await loadNamespaces();
            await loadInstancesWithNamespace();
        } else {
            // 如果有实例，询问是否强制删除
            if (data.error.includes('实例')) {
                const forceDelete = confirm(`${data.error}\n\n是否强制删除？`);
                if (forceDelete) {
                    await deleteNamespaceForce(namespaceName);
                }
            } else {
                alert('删除namespace失败: ' + data.error);
            }
        }
    } catch (error) {
        console.error('删除namespace异常:', error);
        alert('删除namespace异常: ' + error.message);
    }
}

/**
 * 强制删除namespace
 */
async function deleteNamespaceForce(namespaceName) {
    try {
        const response = await fetch(`/api/namespaces/${namespaceName}?force=true`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            addSystemMessage(`Namespace "${namespaceName}" 强制删除成功`);
            
            // 如果删除的是当前选中的namespace，切换到"全部"
            if (namespaceName === currentNamespace) {
                const select = document.getElementById('currentNamespaceSelect');
                if (select) {
                    select.value = '';
                    switchNamespace();
                }
            }
            
            await loadNamespaces();
            await loadInstancesWithNamespace();
        } else {
            alert('强制删除namespace失败: ' + data.error);
        }
    } catch (error) {
        console.error('强制删除namespace异常:', error);
        alert('强制删除namespace异常: ' + error.message);
    }
}

/**
 * 显示修改namespace模态框
 */
function showChangeNamespaceModal(instanceId) {
    document.getElementById('instanceIdForNamespace').value = instanceId;
    
    // 更新模态框中的namespace选择
    updateNamespaceSelects();
    
    const modal = new bootstrap.Modal(document.getElementById('changeNamespaceModal'));
    modal.show();
}

/**
 * 修改实例的namespace
 */
async function changeInstanceNamespace() {
    const instanceId = document.getElementById('instanceIdForNamespace').value;
    const newNamespace = document.getElementById('newNamespaceSelect').value;
    
    if (!instanceId) {
        alert('实例ID不能为空');
        return;
    }
    
    try {
        const response = await fetch(`/api/instances/${instanceId}/namespace`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ namespace: newNamespace })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addSystemMessage(data.message);
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('changeNamespaceModal'));
            modal.hide();
            
            // 刷新实例列表
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            alert('修改namespace失败: ' + data.error);
        }
    } catch (error) {
        console.error('修改namespace异常:', error);
        alert('修改namespace异常: ' + error.message);
    }
}

/**
 * 调试函数：检查namespace加载状态
 */
function debugNamespaceStatus() {
    console.log('=== Namespace 调试信息 ===');
    console.log('当前namespace变量:', namespaces);
    console.log('当前选中namespace:', currentNamespace);
    console.log('所有实例数据:', allInstances);
    
    const select = document.getElementById('currentNamespaceSelect');
    if (select) {
        console.log('选择器选项数量:', select.options.length);
        console.log('选择器当前值:', select.value);
        for (let i = 0; i < select.options.length; i++) {
            console.log(`选项 ${i}: ${select.options[i].value} - ${select.options[i].textContent}`);
        }
    } else {
        console.log('未找到namespace选择器');
    }
    
    // 测试API调用
    fetch('/api/namespaces')
        .then(response => response.json())
        .then(data => {
            console.log('API返回的namespace数据:', data);
        })
        .catch(error => {
            console.error('API调用失败:', error);
        });
}

// 导出调试函数到全局
window.debugNamespaceStatus = debugNamespaceStatus;

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
window.updateNamespacesList = updateNamespacesList;
window.updateNamespaceSelects = updateNamespaceSelects;
window.showNamespaceManageModal = showNamespaceManageModal;
window.switchToNamespace = switchToNamespace;
window.deleteNamespace = deleteNamespace;
window.showChangeNamespaceModal = showChangeNamespaceModal;
window.changeInstanceNamespace = changeInstanceNamespace;
window.getCurrentNamespace = getCurrentNamespace;
