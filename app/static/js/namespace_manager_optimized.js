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
        document.getElementById('cardInstanceNamespace'),
        document.getElementById('newNamespaceSelect')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        // 保存当前选中值
        const currentValue = select.value;
        
        // 保留默认选项
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        }
        
        // 添加namespace选项
        namespaces.forEach(ns => {
            const option = document.createElement('option');
            option.value = ns.name;
            option.textContent = ns.name;
            select.appendChild(option);
        });
        
        // 恢复选中值
        if (currentValue) {
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
