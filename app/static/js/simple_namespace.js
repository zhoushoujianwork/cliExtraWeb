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
    
    // 如果没有namespace，显示提示
    if (namespaces.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '没有可用的namespace';
        option.disabled = true;
        select.appendChild(option);
        return;
    }
    
    // 添加实际的namespace选项
    namespaces.forEach(ns => {
        const option = document.createElement('option');
        option.value = ns.name;
        
        // 使用display_name和instance_count
        const displayName = ns.display_name || ns.name || 'unknown';
        const instanceCount = ns.instance_count || 0;
        option.textContent = `${displayName} (${instanceCount})`;
        
        select.appendChild(option);
    });
    
    // 设置默认选择的namespace
    setDefaultNamespace(namespaces);
}

/**
 * 设置默认选择的namespace
 */
function setDefaultNamespace(namespaces) {
    const select = document.getElementById('currentNamespaceSelect');
    if (!select || namespaces.length === 0) return;
    
    // 优先级：存储的namespace > default > 第一个有实例的namespace > 第一个namespace
    let targetNamespace = null;
    
    // 1. 检查存储的namespace是否仍然存在
    const storedNamespace = getStoredNamespace();
    if (storedNamespace) {
        const found = namespaces.find(ns => ns.name === storedNamespace);
        if (found) {
            targetNamespace = storedNamespace;
        }
    }
    
    // 2. 如果没有存储的或存储的不存在，尝试选择default
    if (!targetNamespace) {
        const defaultNs = namespaces.find(ns => ns.name === 'default');
        if (defaultNs) {
            targetNamespace = 'default';
        }
    }
    
    // 3. 如果没有default，选择第一个有实例的namespace
    if (!targetNamespace) {
        const activeNs = namespaces.find(ns => ns.instance_count > 0);
        if (activeNs) {
            targetNamespace = activeNs.name;
        }
    }
    
    // 4. 最后选择第一个namespace
    if (!targetNamespace && namespaces.length > 0) {
        targetNamespace = namespaces[0].name;
    }
    
    // 应用选择
    if (targetNamespace !== null) {
        currentNamespace = targetNamespace;
        window.currentNamespace = currentNamespace;
        storeNamespace(currentNamespace);
        
        // 更新选择器
        select.value = targetNamespace;
        
        console.log(`设置默认namespace: ${targetNamespace}`);
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
        
        // 在刷新完成后，尝试自动恢复新namespace的实例选择
        setTimeout(() => {
            autoRestoreNamespaceInstance(currentNamespace);
        }, 1000);
    }
}

/**
 * 显示namespace切换通知
 */
function showNamespaceSwitchNotification(oldNs, newNs) {
    const oldName = oldNs || '(未选择)';
    const newName = newNs || '(未选择)';
    
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

    // 5. 输出终端的监控实例对象
    if (typeof window.terminalMemory === 'object') {
        console.log('终端的监控实例对象:', window.terminalMemory);
    }
    
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
        const nsName = currentNamespace || '(未选择)';
        statusElement.textContent = `当前namespace: ${nsName}`;
    }
}

/**
 * 更新页面标题
 */
function updatePageTitle() {
    const nsName = currentNamespace || '(未选择)';
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
    
    // 移除自动刷新，改为手动刷新
    // 用户可以通过刷新按钮手动更新实例列表
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
            } else {
                // 如果currentNamespace为空，可能是初始化状态，显示所有实例
                // 但由于我们移除了"全部"选项，这种情况应该很少发生
                console.warn('当前namespace为空，显示所有实例');
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
    console.log('🔄 [DEBUG] updateInstancesList 开始');
    console.log('🔍 [DEBUG] instances数量:', instances.length);
    console.log('🔍 [DEBUG] 当前namespace:', currentNamespace);
    
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    instancesList.innerHTML = '';
    
    if (instances.length === 0) {
        instancesList.innerHTML = '<div class="text-muted text-center p-3">当前namespace没有实例</div>';
        return;
    }
    
    instances.forEach((instance, index) => {
        const instanceDiv = document.createElement('div');
        
        // 检查是否是当前监控的实例
        const isCurrentlyMonitoring = (typeof currentMonitoringInstance !== 'undefined' && 
                                     currentMonitoringInstance === instance.id);
        
        // 基础样式类
        let instanceClasses = 'instance-item mb-2 p-2 border rounded';
        
        // 如果是当前监控的实例，添加选中状态样式
        if (isCurrentlyMonitoring) {
            instanceClasses += ' instance-selected';
        }
        
        instanceDiv.className = instanceClasses;
        instanceDiv.setAttribute('data-instance-id', instance.id);
        instanceDiv.setAttribute('data-index', index); // 添加索引属性
        instanceDiv.setAttribute('tabindex', '0'); // 使元素可聚焦
        
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
                    ${isCurrentlyMonitoring ? '<span class="badge bg-info ms-1"><i class="fas fa-eye"></i> 监控中</span>' : ''}
                    ${instance.namespace ? '<br><small class="text-muted">ns: ' + instance.namespace + '</small>' : ''}
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn ${isCurrentlyMonitoring ? 'btn-primary' : 'btn-outline-primary'}" 
                            onclick="startMonitoringWithMemory('${instance.id}')" 
                            title="监控输出"
                            ${isCurrentlyMonitoring ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-info" 
                            onclick="showInstanceDetails('${instance.id}')" 
                            title="查看实例详情">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-outline-danger" 
                            onclick="stopInstance('${instance.id}', this)" 
                            title="停止实例">
                        <i class="fas fa-stop"></i>
                    </button>
                </div>
            </div>
        `;
        
        // 添加键盘事件监听器
        instanceDiv.addEventListener('keydown', handleInstanceKeydown);
        
        // 添加点击事件监听器
        instanceDiv.addEventListener('click', function(e) {
            // 如果点击的不是按钮，则选中该实例
            if (!e.target.closest('button')) {
                selectInstanceItem(instanceDiv);
            }
        });
        
        // 添加聚焦事件监听器
        instanceDiv.addEventListener('focus', function() {
            selectInstanceItem(instanceDiv);
        });
        
        instancesList.appendChild(instanceDiv);
    });
    
    // 初始化键盘导航
    initInstanceListKeyboardNavigation();
    
    console.log('✅ [DEBUG] updateInstancesList 完成');
}

// 全局变量用于跟踪当前选中的实例
let currentSelectedInstanceIndex = -1;

/**
 * 初始化实例列表键盘导航
 */
function initInstanceListKeyboardNavigation() {
    const instancesList = document.getElementById('instancesList');
    if (!instancesList) return;
    
    // 移除之前的事件监听器（如果存在）
    instancesList.removeEventListener('keydown', handleInstanceListKeydown);
    
    // 添加键盘事件监听器到容器
    instancesList.addEventListener('keydown', handleInstanceListKeydown);
    
    // 设置容器为可聚焦
    instancesList.setAttribute('tabindex', '0');
    
    console.log('✅ 实例列表键盘导航已初始化');
}

/**
 * 处理实例列表的键盘事件
 */
function handleInstanceListKeydown(e) {
    const instanceItems = document.querySelectorAll('#instancesList .instance-item');
    if (instanceItems.length === 0) return;
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            navigateInstanceList(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateInstanceList(-1);
            break;
        case 'Enter':
            e.preventDefault();
            activateSelectedInstance();
            break;
        case 'Escape':
            e.preventDefault();
            clearInstanceSelection();
            break;
        case ' ': // 空格键
            e.preventDefault();
            activateSelectedInstance();
            break;
    }
}

/**
 * 处理单个实例项的键盘事件
 */
function handleInstanceKeydown(e) {
    switch(e.key) {
        case 'Enter':
        case ' ':
            e.preventDefault();
            const instanceId = e.currentTarget.getAttribute('data-instance-id');
            if (instanceId) {
                startMonitoringWithMemory(instanceId);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateInstanceList(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateInstanceList(-1);
            break;
    }
}

/**
 * 导航实例列表
 */
function navigateInstanceList(direction) {
    const instanceItems = Array.from(document.querySelectorAll('#instancesList .instance-item'));
    if (instanceItems.length === 0) return;
    
    // 计算新的选中索引
    let newIndex = currentSelectedInstanceIndex + direction;
    
    // 处理边界情况（循环导航）
    if (newIndex >= instanceItems.length) {
        newIndex = 0;
    } else if (newIndex < 0) {
        newIndex = instanceItems.length - 1;
    }
    
    // 更新选中状态
    selectInstanceByIndex(newIndex);
    
    console.log(`🔍 导航到实例 ${newIndex}: ${instanceItems[newIndex]?.getAttribute('data-instance-id')}`);
}

/**
 * 根据索引选中实例
 */
function selectInstanceByIndex(index) {
    const instanceItems = Array.from(document.querySelectorAll('#instancesList .instance-item'));
    if (index < 0 || index >= instanceItems.length) return;
    
    // 清除之前的选中状态
    instanceItems.forEach(item => {
        item.classList.remove('keyboard-selected');
        item.style.outline = '';
    });
    
    // 设置新的选中状态
    const selectedItem = instanceItems[index];
    selectedItem.classList.add('keyboard-selected');
    selectedItem.style.outline = '2px solid #007bff';
    selectedItem.style.outlineOffset = '2px';
    
    // 滚动到可见区域
    selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
    });
    
    // 更新全局索引
    currentSelectedInstanceIndex = index;
    
    // 聚焦到选中的项
    selectedItem.focus();
}

/**
 * 选中实例项（通过元素）
 */
function selectInstanceItem(instanceElement) {
    const instanceItems = Array.from(document.querySelectorAll('#instancesList .instance-item'));
    const index = instanceItems.indexOf(instanceElement);
    
    if (index >= 0) {
        selectInstanceByIndex(index);
    }
}

/**
 * 激活当前选中的实例
 */
function activateSelectedInstance() {
    const instanceItems = Array.from(document.querySelectorAll('#instancesList .instance-item'));
    if (currentSelectedInstanceIndex >= 0 && currentSelectedInstanceIndex < instanceItems.length) {
        const selectedItem = instanceItems[currentSelectedInstanceIndex];
        const instanceId = selectedItem.getAttribute('data-instance-id');
        
        if (instanceId) {
            console.log(`🚀 激活实例: ${instanceId}`);
            startMonitoringWithMemory(instanceId);
        }
    }
}

/**
 * 清除实例选择
 */
function clearInstanceSelection() {
    const instanceItems = document.querySelectorAll('#instancesList .instance-item');
    instanceItems.forEach(item => {
        item.classList.remove('keyboard-selected');
        item.style.outline = '';
    });
    
    currentSelectedInstanceIndex = -1;
    
    // 聚焦回实例列表容器
    const instancesList = document.getElementById('instancesList');
    if (instancesList) {
        instancesList.focus();
    }
}
                        <i class="fas fa-info-circle"></i>
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
    
    // 尝试自动恢复当前namespace的上次选择的实例
    console.log('🔄 [DEBUG] 准备自动恢复实例选择');
    console.log('🔍 [DEBUG] window.terminalMemory存在:', !!window.terminalMemory);
    console.log('🔍 [DEBUG] currentNamespace:', currentNamespace);
    
    if (window.terminalMemory && currentNamespace) {
        const result = window.terminalMemory.autoRestoreTerminalSelection(
            instances,
            (instanceId) => {
                console.log('🔄 自动恢复终端监控回调执行:', instanceId, 'namespace:', currentNamespace);
                // 只有在监控函数存在时才调用
                if (typeof startMonitoring === 'function') {
                    console.log('✅ [DEBUG] 调用startMonitoring:', instanceId);
                    startMonitoring(instanceId);
                } else {
                    console.log('⚠️ startMonitoring 函数不可用，跳过自动恢复');
                }
            },
            currentNamespace // 传入当前namespace
        );
        console.log('🔍 [DEBUG] updateInstancesList中的autoRestore返回:', result);
    } else {
        console.log('❌ [DEBUG] 自动恢复条件不满足');
    }
}

/**
 * 更新实例列表中的选中状态
 * @param {string} selectedInstanceId - 当前选中的实例ID，null表示没有选中
 */
function updateInstanceSelection(selectedInstanceId) {
    console.log('🔄 [DEBUG] 更新实例选中状态:', selectedInstanceId);
    
    // 移除所有实例的选中状态
    const allInstanceItems = document.querySelectorAll('.instance-item');
    allInstanceItems.forEach(item => {
        item.classList.remove('instance-selected');
        
        // 更新监控按钮状态
        const monitorBtn = item.querySelector('button[title="监控输出"]');
        if (monitorBtn) {
            monitorBtn.classList.remove('btn-primary');
            monitorBtn.classList.add('btn-outline-primary');
            monitorBtn.disabled = false;
        }
        
        // 移除监控中标签
        const monitoringBadge = item.querySelector('.badge.bg-info');
        if (monitoringBadge) {
            monitoringBadge.remove();
        }
    });
    
    // 如果有选中的实例，添加选中状态
    if (selectedInstanceId) {
        const selectedItem = document.querySelector(`[data-instance-id="${selectedInstanceId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('instance-selected');
            
            // 更新监控按钮状态
            const monitorBtn = selectedItem.querySelector('button[title="监控输出"]');
            if (monitorBtn) {
                monitorBtn.classList.remove('btn-outline-primary');
                monitorBtn.classList.add('btn-primary');
                monitorBtn.disabled = true;
            }
            
            // 添加监控中标签
            const badgeContainer = selectedItem.querySelector('div > div:first-child');
            if (badgeContainer && !badgeContainer.querySelector('.badge.bg-info')) {
                const monitoringBadge = document.createElement('span');
                monitoringBadge.className = 'badge bg-info ms-1';
                monitoringBadge.innerHTML = '<i class="fas fa-eye"></i> 监控中';
                
                // 插入到状态标签后面
                const statusBadge = badgeContainer.querySelector('.badge');
                if (statusBadge) {
                    statusBadge.insertAdjacentElement('afterend', monitoringBadge);
                }
            }
        }
    }
}

/**
 * 带记忆功能的开始监控
 * @param {string} instanceId - 实例ID
 */
function startMonitoringWithMemory(instanceId) {
    console.log('🔄 [DEBUG] startMonitoringWithMemory 调用');
    console.log('🔍 [DEBUG] 参数 instanceId:', instanceId);
    console.log('🔍 [DEBUG] 当前namespace:', currentNamespace);
    
    // 保存用户选择
    if (window.terminalMemory) {
        window.terminalMemory.saveLastSelectedInstance(instanceId, currentNamespace || 'default');
        console.log('✅ [DEBUG] 已保存实例选择到memory');
    } else {
        console.log('❌ [DEBUG] window.terminalMemory 不存在');
    }
    
    // 开始监控（只有在监控函数存在时才调用）
    if (typeof startMonitoring === 'function') {
        console.log('✅ [DEBUG] 调用startMonitoring');
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

/**
 * 自动恢复指定namespace的实例选择
 * @param {string} namespace - 要恢复的namespace
 */
function autoRestoreNamespaceInstance(namespace) {
    console.log('🔄 [DEBUG] autoRestoreNamespaceInstance 开始');
    console.log('🔍 [DEBUG] 参数 namespace:', namespace);
    console.log('🔍 [DEBUG] window.terminalMemory存在:', !!window.terminalMemory);
    
    if (!window.terminalMemory || !namespace) {
        console.log('❌ [DEBUG] 条件不满足，退出恢复');
        return;
    }
    
    console.log('🔄 尝试自动恢复namespace实例选择:', namespace);
    console.log('🔍 [DEBUG] allInstances数量:', allInstances.length);
    console.log('🔍 [DEBUG] allInstances:', allInstances.map(i => `${i.id}(${i.namespace})`));
    
    // 获取当前namespace的实例列表
    const filteredInstances = allInstances.filter(instance => 
        instance.namespace === namespace
    );
    
    console.log('🔍 [DEBUG] filteredInstances数量:', filteredInstances.length);
    console.log('🔍 [DEBUG] filteredInstances:', filteredInstances.map(i => i.id));
    
    if (filteredInstances.length > 0) {
        // 使用新的带namespace参数的恢复方法
        const result = window.terminalMemory.autoRestoreTerminalSelection(
            filteredInstances,
            (instanceId) => {
                console.log('🔄 自动恢复namespace终端监控回调执行:', instanceId, 'namespace:', namespace);
                // 只有在监控函数存在时才调用
                if (typeof startMonitoring === 'function') {
                    console.log('✅ [DEBUG] 调用startMonitoring:', instanceId);
                    startMonitoring(instanceId);
                } else {
                    console.log('⚠️ startMonitoring 函数不可用，跳过自动恢复');
                }
            },
            namespace // 传入namespace参数
        );
        console.log('🔍 [DEBUG] autoRestoreTerminalSelection 返回:', result);
    } else {
        console.log('⚠️ 当前namespace没有可用实例:', namespace);
    }
}

/**
 * 显示实例详情
 */
function showInstanceDetails(instanceId) {
    console.log('🔍 显示实例详情:', instanceId);
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('instanceDetailsModal'));
    modal.show();
    
    // 重置内容为加载状态
    const contentDiv = document.getElementById('instanceDetailsContent');
    contentDiv.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mt-2">正在加载实例详情...</p>
        </div>
    `;
    
    // 隐藏保存按钮
    document.getElementById('saveInstanceDetailsBtn').style.display = 'none';
    
    // 获取实例详情
    fetch(`/api/instances/${instanceId}/details`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderInstanceDetails(data.instance);
            } else {
                showInstanceDetailsError(data.error || '获取实例详情失败');
            }
        })
        .catch(error => {
            console.error('获取实例详情失败:', error);
            showInstanceDetailsError('网络错误，请稍后重试');
        });
}

/**
 * 渲染实例详情内容
 */
function renderInstanceDetails(instance) {
    const contentDiv = document.getElementById('instanceDetailsContent');
    
    // 更新模态框标题
    document.getElementById('instanceDetailsModalLabel').innerHTML = `
        <i class="fas fa-info-circle"></i> 实例详情 - ${instance.id}
    `;
    
    // 渲染详情内容
    contentDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-server"></i> 基本信息</h6>
                    </div>
                    <div class="card-body">
                        <table class="table table-sm table-borderless">
                            <tr>
                                <td><strong>实例ID:</strong></td>
                                <td>${instance.id}</td>
                            </tr>
                            <tr>
                                <td><strong>状态:</strong></td>
                                <td>
                                    <span class="badge bg-${instance.status === 'Attached' ? 'success' : 'warning'}">
                                        ${instance.status}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>命名空间:</strong></td>
                                <td>${instance.namespace || 'default'}</td>
                            </tr>
                            <tr>
                                <td><strong>角色:</strong></td>
                                <td>${instance.role || '未设置'}</td>
                            </tr>
                            <tr>
                                <td><strong>项目路径:</strong></td>
                                <td><small class="text-muted">${instance.project_path || '未设置'}</small></td>
                            </tr>
                            <tr>
                                <td><strong>创建时间:</strong></td>
                                <td><small class="text-muted">${instance.created_at || '未知'}</small></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0"><i class="fas fa-tools"></i> 工具配置</h6>
                        <button class="btn btn-sm btn-outline-primary" onclick="editInstanceTools('${instance.id}')">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="instanceToolsList">
                            ${renderToolsList(instance.tools || [])}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="fas fa-chart-line"></i> 运行统计</h6>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-md-3">
                                <div class="border rounded p-2">
                                    <div class="h5 mb-0 text-primary">${instance.stats?.uptime || '0'}</div>
                                    <small class="text-muted">运行时长</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="border rounded p-2">
                                    <div class="h5 mb-0 text-success">${instance.stats?.messages || '0'}</div>
                                    <small class="text-muted">消息数量</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="border rounded p-2">
                                    <div class="h5 mb-0 text-warning">${instance.stats?.memory || '0MB'}</div>
                                    <small class="text-muted">内存使用</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="border rounded p-2">
                                    <div class="h5 mb-0 text-info">${instance.stats?.cpu || '0%'}</div>
                                    <small class="text-muted">CPU使用</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染工具列表
 */
function renderToolsList(tools) {
    if (!tools || tools.length === 0) {
        return '<p class="text-muted mb-0">未安装任何工具</p>';
    }
    
    return tools.map(tool => `
        <span class="badge bg-secondary me-1 mb-1">${tool}</span>
    `).join('');
}

/**
 * 显示实例详情错误
 */
function showInstanceDetailsError(error) {
    const contentDiv = document.getElementById('instanceDetailsContent');
    contentDiv.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>加载失败:</strong> ${error}
        </div>
        <div class="text-center">
            <button class="btn btn-outline-primary" onclick="location.reload()">
                <i class="fas fa-refresh"></i> 刷新页面
            </button>
        </div>
    `;
}

/**
 * 编辑实例工具
 */
function editInstanceTools(instanceId) {
    console.log('🔧 编辑实例工具:', instanceId);
    
    // 获取当前工具列表
    const currentInstance = allInstances.find(inst => inst.id === instanceId);
    const currentTools = currentInstance?.tools || [];
    
    // 显示工具编辑界面
    const toolsListDiv = document.getElementById('instanceToolsList');
    toolsListDiv.innerHTML = `
        <div class="mb-3">
            <label class="form-label">选择工具:</label>
            <div id="toolsCheckboxes">
                ${renderToolsCheckboxes(currentTools)}
            </div>
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-success btn-sm" onclick="saveInstanceTools('${instanceId}')">
                <i class="fas fa-save"></i> 保存
            </button>
            <button class="btn btn-secondary btn-sm" onclick="cancelEditTools('${instanceId}')">
                <i class="fas fa-times"></i> 取消
            </button>
        </div>
    `;
    
    // 显示保存按钮
    document.getElementById('saveInstanceDetailsBtn').style.display = 'inline-block';
}

/**
 * 渲染工具复选框
 */
function renderToolsCheckboxes(currentTools) {
    const availableTools = [
        'git', 'docker', 'kubectl', 'terraform', 'ansible', 
        'jenkins', 'prometheus', 'grafana', 'elasticsearch', 'redis'
    ];
    
    return availableTools.map(tool => `
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="tool_${tool}" value="${tool}" 
                   ${currentTools.includes(tool) ? 'checked' : ''}>
            <label class="form-check-label" for="tool_${tool}">${tool}</label>
        </div>
    `).join('');
}

/**
 * 保存实例工具配置
 */
function saveInstanceTools(instanceId) {
    console.log('💾 保存实例工具配置:', instanceId);
    
    // 获取选中的工具
    const selectedTools = [];
    document.querySelectorAll('#toolsCheckboxes input[type="checkbox"]:checked').forEach(checkbox => {
        selectedTools.push(checkbox.value);
    });
    
    // 发送保存请求
    fetch(`/api/instances/${instanceId}/tools`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tools: selectedTools
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新显示
            const toolsListDiv = document.getElementById('instanceToolsList');
            toolsListDiv.innerHTML = renderToolsList(selectedTools);
            
            // 更新本地缓存
            const instance = allInstances.find(inst => inst.id === instanceId);
            if (instance) {
                instance.tools = selectedTools;
            }
            
            // 显示成功消息
            if (typeof showNotification === 'function') {
                showNotification('工具配置已保存', 'success');
            }
            
            // 隐藏保存按钮
            document.getElementById('saveInstanceDetailsBtn').style.display = 'none';
        } else {
            if (typeof showNotification === 'function') {
                showNotification(`保存失败: ${data.error}`, 'error');
            }
        }
    })
    .catch(error => {
        console.error('保存工具配置失败:', error);
        if (typeof showNotification === 'function') {
            showNotification('保存失败，请稍后重试', 'error');
        }
    });
}

/**
 * 取消编辑工具
 */
function cancelEditTools(instanceId) {
    const currentInstance = allInstances.find(inst => inst.id === instanceId);
    const currentTools = currentInstance?.tools || [];
    
    // 恢复显示
    const toolsListDiv = document.getElementById('instanceToolsList');
    toolsListDiv.innerHTML = renderToolsList(currentTools);
    
    // 隐藏保存按钮
    document.getElementById('saveInstanceDetailsBtn').style.display = 'none';
}

/**
 * 保存实例详情（从模态框底部按钮调用）
 */
function saveInstanceDetails() {
    // 这个函数可以用于保存其他可能的修改
    console.log('💾 保存实例详情');
    
    // 隐藏保存按钮
    document.getElementById('saveInstanceDetailsBtn').style.display = 'none';
    
    if (typeof showNotification === 'function') {
        showNotification('修改已保存', 'success');
    }
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
