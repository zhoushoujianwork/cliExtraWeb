/**
 * Namespace管理功能 - 支持右上角选择器和实例过滤
 */

// 全局变量
let namespaces = [];
let currentNamespace = ''; // 当前选中的namespace
let allInstances = []; // 所有实例数据

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadNamespaces();
    
    // 监听namespace选择变化
    const namespaceSelect = document.getElementById('currentNamespaceSelect');
    if (namespaceSelect) {
        namespaceSelect.addEventListener('change', switchNamespace);
    }
});

/**
 * 加载所有namespace
 */
async function loadNamespaces() {
    try {
        const response = await fetch('/api/namespaces');
        const data = await response.json();
        
        if (data.success) {
            namespaces = data.namespaces;
            updateCurrentNamespaceSelect();
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
 * 更新右上角的namespace选择器
 */
function updateCurrentNamespaceSelect() {
    const select = document.getElementById('currentNamespaceSelect');
    if (!select) return;
    
    // 保存当前选中值
    const currentValue = select.value;
    
    // 清空并重新填充
    select.innerHTML = '<option value="">全部</option>';
    
    namespaces.forEach(ns => {
        const option = document.createElement('option');
        option.value = ns.name;
        option.textContent = `${ns.name} (${ns.instance_count})`;
        select.appendChild(option);
    });
    
    // 恢复选中值
    if (currentValue && namespaces.find(ns => ns.name === currentValue)) {
        select.value = currentValue;
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
        label.textContent = currentNamespace || '全部';
        label.className = currentNamespace ? 'badge bg-success' : 'badge bg-primary';
    }
    
    // 过滤实例列表
    filterInstancesByNamespace();
    
    // 清空聊天历史
    clearChatHistory();
    
    // 更新创建实例表单的默认namespace
    const newInstanceNamespace = document.getElementById('newInstanceNamespace');
    if (newInstanceNamespace && currentNamespace) {
        newInstanceNamespace.value = currentNamespace;
    }
    
    addSystemMessage(`已切换到namespace: ${currentNamespace || '全部'}`);
}

/**
 * 根据当前namespace过滤实例
 */
function filterInstancesByNamespace() {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    const instanceItems = instancesList.querySelectorAll('.instance-item');
    
    instanceItems.forEach(item => {
        const instanceNamespace = item.dataset.namespace || '';
        
        if (!currentNamespace || instanceNamespace === currentNamespace) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
    
    // 更新实例计数
    const visibleItems = instancesList.querySelectorAll('.instance-item[style="display: block;"], .instance-item:not([style])');
    const visibleCount = Array.from(visibleItems).filter(item => 
        !currentNamespace || (item.dataset.namespace || '') === currentNamespace
    ).length;
    
    // 可以在这里更新实例计数显示
    console.log(`当前namespace "${currentNamespace || '全部'}" 下有 ${visibleCount} 个实例`);
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
 * 显示namespace管理模态框
 */
function showNamespaceManageModal() {
    loadNamespaces(); // 刷新数据
    const modal = new bootstrap.Modal(document.getElementById('namespaceManageModal'));
    modal.show();
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
 * 更新namespace选择框
 */
function updateNamespaceSelects() {
    const selects = [
        document.getElementById('newInstanceNamespace'),
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
            await loadNamespaces(); // 重新加载列表
        } else {
            alert('创建namespace失败: ' + data.error);
        }
    } catch (error) {
        console.error('创建namespace异常:', error);
        alert('创建namespace异常: ' + error.message);
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
            
            await loadNamespaces(); // 重新加载列表
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
            
            await loadNamespaces(); // 重新加载列表
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
 * 更新实例创建函数以支持namespace
 */
function startInstanceWithConfig() {
    const name = document.getElementById('newInstanceName').value.trim();
    const path = document.getElementById('newInstancePath').value.trim();
    const role = document.getElementById('newInstanceRole').value;
    const namespace = document.getElementById('newInstanceNamespace').value || currentNamespace;
    
    // 构建请求数据
    const data = {};
    if (name) data.name = name;
    if (path) data.path = path;
    if (role) data.role = role;
    if (namespace) data.namespace = namespace;
    
    // 发送创建请求
    fetch('/api/instances', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addSystemMessage(`实例创建成功: ${data.instance_id || '自动生成ID'}`);
            
            // 清空表单
            document.getElementById('newInstanceName').value = '';
            document.getElementById('newInstancePath').value = '';
            document.getElementById('newInstanceRole').value = '';
            document.getElementById('newInstanceNamespace').value = currentNamespace || '';
            
            // 刷新页面
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            alert('创建实例失败: ' + data.error);
        }
    })
    .catch(error => {
        console.error('创建实例异常:', error);
        alert('创建实例异常: ' + error.message);
    });
}

/**
 * 获取当前选中的namespace
 */
function getCurrentNamespace() {
    return currentNamespace;
}

// 导出函数供全局使用
window.loadNamespaces = loadNamespaces;
window.switchNamespace = switchNamespace;
window.showNamespaceManageModal = showNamespaceManageModal;
window.createNamespace = createNamespace;
window.deleteNamespace = deleteNamespace;
window.showChangeNamespaceModal = showChangeNamespaceModal;
window.changeInstanceNamespace = changeInstanceNamespace;
window.startInstanceWithConfig = startInstanceWithConfig;
window.getCurrentNamespace = getCurrentNamespace;
