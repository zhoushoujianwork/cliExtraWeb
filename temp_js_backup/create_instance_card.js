/**
 * 创建实例交互卡片功能
 */

/**
 * 统一获取当前namespace的函数
 * 优先级：表单选择 > 全局当前namespace > 默认值
 */
function getCurrentNamespaceForInstance() {
    // 1. 优先从创建实例表单获取
    const namespaceSelect = document.getElementById('cardInstanceNamespace');
    if (namespaceSelect && namespaceSelect.value) {
        return namespaceSelect.value;
    }
    
    // 2. 从全局getCurrentNamespace函数获取
    try {
        if (typeof getCurrentNamespace === 'function') {
            const globalNs = getCurrentNamespace();
            if (globalNs) {
                return globalNs;
            }
        } else if (typeof window.getCurrentNamespace === 'function') {
            const globalNs = window.getCurrentNamespace();
            if (globalNs) {
                return globalNs;
            }
        }
    } catch (error) {
        console.warn('获取全局namespace失败:', error);
    }
    
    // 3. 从主要的namespace选择器获取
    try {
        const mainSelect = document.getElementById('currentNamespaceSelect');
        if (mainSelect && mainSelect.value) {
            return mainSelect.value;
        }
    } catch (error) {
        console.warn('从主选择器获取namespace失败:', error);
    }
    
    // 4. 默认值
    return 'default';
}

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
    
    // 加载工具列表
    loadToolsList();
    
    // 设置默认namespace为当前选中的 - 使用统一函数
    const currentNs = getCurrentNamespaceForInstance();
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
async function updateCardNamespaceSelect() {
    const select = document.getElementById('cardInstanceNamespace');
    if (!select) return;
    
    // 保存当前选中值
    const currentValue = select.value;
    
    try {
        // 从API获取namespace列表
        const response = await fetch('/api/namespaces');
        const data = await response.json();
        
        if (data.success && data.namespaces) {
            // 清空选项
            select.innerHTML = '<option value="">选择namespace</option>';
            
            // 添加实际的namespace选项
            data.namespaces.forEach(ns => {
                const option = document.createElement('option');
                option.value = ns.name;
                option.textContent = ns.name;
                select.appendChild(option);
            });
            
            // 设置默认值：优先使用当前值，否则使用统一函数获取
            if (currentValue && data.namespaces.some(ns => ns.name === currentValue)) {
                select.value = currentValue;
            } else {
                const defaultNs = getCurrentNamespaceForInstance();
                if (defaultNs && data.namespaces.some(ns => ns.name === defaultNs)) {
                    select.value = defaultNs;
                }
            }
        } else {
            // API失败时使用默认选项
            select.innerHTML = '<option value="">选择namespace</option>';
            console.warn('获取namespace列表失败，使用默认选项');
        }
    } catch (error) {
        // 网络错误时使用默认选项
        select.innerHTML = '<option value="">选择namespace</option>';
        console.error('获取namespace列表异常:', error);
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
        const namespace = getCurrentNamespaceForInstance(); // 使用统一函数获取namespace
        const role = roleEl ? roleEl.value : '';
        
        // 获取选中的工具 - 添加更安全的处理
        let tools = [];
        try {
            const toolsValue = toolsEl ? toolsEl.value : '';
            if (toolsValue && typeof toolsValue === 'string') {
                tools = toolsValue.split(',').filter(tool => tool && tool.trim()).map(tool => tool.trim());
            }
        } catch (error) {
            console.warn('解析工具列表失败:', error);
            tools = [];
        }
        
        console.log('表单数据:', { name, path, namespace, role, tools });
        
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
            // 构建请求数据 - 确保所有数据都是正确的类型
            const requestData = {};
            if (name) requestData.instance_id = name;
            if (path) requestData.project_path = path;
            if (namespace) requestData.namespace = namespace;
            if (role) requestData.role = role;
            if (Array.isArray(tools) && tools.length > 0) {
                requestData.tools = tools;
            }
            
            console.log('创建实例请求数据:', requestData);
            
            // 发送创建请求
            const response = await fetch('/api/create_instance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('创建实例响应:', result);
            
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
    // 清空工具选择
    const toolsEl = document.getElementById('cardInstanceTools');
    if (toolsEl) {
        toolsEl.value = '';
    }
    
    // 清空工具下拉菜单中的选中状态
    const toolsMenu = document.getElementById('toolsDropdownMenu');
    if (toolsMenu) {
        const checkboxes = toolsMenu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
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

/**
 * 加载工具列表
 */
async function loadToolsList() {
    try {
        const response = await fetch('/api/tools');
        const result = await response.json();
        
        if (result.success) {
            const toolsMenu = document.getElementById('toolsDropdownMenu');
            if (toolsMenu) {
                toolsMenu.innerHTML = '';
                
                // 添加全选/取消全选选项
                const selectAllItem = document.createElement('li');
                selectAllItem.innerHTML = `
                    <div class="dropdown-item-text border-bottom pb-2 mb-2">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="selectAllTools" onchange="toggleAllTools(this)">
                            <label class="form-check-label fw-bold" for="selectAllTools">
                                全选/取消全选
                            </label>
                        </div>
                    </div>
                `;
                toolsMenu.appendChild(selectAllItem);
                
                // 添加工具选项
                result.tools.forEach(tool => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <div class="dropdown-item-text">
                            <div class="form-check">
                                <input class="form-check-input tool-checkbox" type="checkbox" value="${tool.name}" id="tool_${tool.name}" onchange="updateSelectedTools()">
                                <label class="form-check-label" for="tool_${tool.name}">
                                    <strong>${tool.name}</strong>
                                    ${tool.description ? `<br><small class="text-muted">${tool.description}</small>` : ''}
                                </label>
                            </div>
                        </div>
                    `;
                    toolsMenu.appendChild(listItem);
                });
                
                // 初始化选中状态显示
                updateSelectedTools();
            }
        }
    } catch (error) {
        console.error('加载工具列表失败:', error);
        const toolsMenu = document.getElementById('toolsDropdownMenu');
        if (toolsMenu) {
            toolsMenu.innerHTML = '<li><div class="dropdown-item-text text-danger">加载失败</div></li>';
        }
    }
}

/**
 * 显示目录浏览器
 */
function showDirectoryBrowser() {
    const modal = new bootstrap.Modal(document.getElementById('directoryBrowserModal'));
    modal.show();
    
    // 从当前路径开始浏览
    const currentPath = document.getElementById('cardInstancePath').value || '/Users/mikas/github/cliExtraWeb';
    browseDirectory(currentPath);
}

/**
 * 浏览目录
 */
async function browseDirectory(path) {
    try {
        const response = await fetch('/api/browse_directory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('currentPath').textContent = result.current_path;
            
            const directoryList = document.getElementById('directoryList');
            directoryList.innerHTML = '';
            
            result.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'p-2 border-bottom directory-item';
                itemDiv.style.cursor = item.type === 'directory' ? 'pointer' : 'default';
                
                // 根据类型选择图标
                let icon = 'fas fa-folder';
                let iconColor = 'text-primary';
                
                if (item.is_parent) {
                    icon = 'fas fa-level-up-alt';
                    iconColor = 'text-secondary';
                } else if (item.type === 'file') {
                    icon = 'fas fa-file';
                    iconColor = 'text-muted';
                    
                    // 根据文件类型选择特定图标
                    const fileName = item.name.toLowerCase();
                    if (fileName.endsWith('.json')) {
                        icon = 'fas fa-file-code';
                        iconColor = 'text-warning';
                    } else if (fileName.endsWith('.md')) {
                        icon = 'fab fa-markdown';
                        iconColor = 'text-info';
                    } else if (fileName.endsWith('.py')) {
                        icon = 'fab fa-python';
                        iconColor = 'text-success';
                    } else if (fileName.endsWith('.js')) {
                        icon = 'fab fa-js-square';
                        iconColor = 'text-warning';
                    } else if (fileName.endsWith('.html')) {
                        icon = 'fab fa-html5';
                        iconColor = 'text-danger';
                    } else if (fileName.endsWith('.css')) {
                        icon = 'fab fa-css3-alt';
                        iconColor = 'text-primary';
                    }
                }
                
                itemDiv.innerHTML = `
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <i class="${icon} me-2 ${iconColor}"></i>
                            <span>${item.name}</span>
                            ${item.is_parent ? '<small class="text-muted ms-2">(上级目录)</small>' : ''}
                        </div>
                        <div>
                            <span class="badge bg-light text-dark">${item.type === 'directory' ? '目录' : '文件'}</span>
                        </div>
                    </div>
                `;
                
                // 只有目录可以点击进入
                if (item.type === 'directory') {
                    itemDiv.addEventListener('click', () => {
                        browseDirectory(item.path);
                    });
                    
                    itemDiv.addEventListener('mouseenter', () => {
                        itemDiv.style.backgroundColor = '#f8f9fa';
                    });
                    
                    itemDiv.addEventListener('mouseleave', () => {
                        itemDiv.style.backgroundColor = '';
                    });
                } else {
                    // 文件显示为不可点击状态
                    itemDiv.style.opacity = '0.7';
                }
                
                directoryList.appendChild(itemDiv);
            });
            
            if (result.items.length === 0) {
                directoryList.innerHTML = '<div class="p-3 text-muted text-center">此目录为空</div>';
            }
        } else {
            document.getElementById('directoryList').innerHTML = `
                <div class="p-3 text-danger text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${result.error}
                </div>
            `;
        }
    } catch (error) {
        console.error('浏览目录失败:', error);
        document.getElementById('directoryList').innerHTML = `
            <div class="p-3 text-danger text-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                浏览目录失败: ${error.message}
            </div>
        `;
    }
}

/**
 * 选择当前浏览的路径
 */
function selectCurrentBrowsePath() {
    const currentPath = document.getElementById('currentPath').textContent;
    document.getElementById('cardInstancePath').value = currentPath;
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('directoryBrowserModal'));
    if (modal) {
        modal.hide();
    }
}

// 确保函数在全局作用域中可用
window.showCreateInstanceCard = showCreateInstanceCard;
window.hideCreateInstanceCard = hideCreateInstanceCard;
window.createInstanceFromCard = createInstanceFromCard;
window.selectCurrentDirectory = selectCurrentDirectory;
window.showDirectoryBrowser = showDirectoryBrowser;
window.selectCurrentBrowsePath = selectCurrentBrowsePath;
window.updateSelectedTools = updateSelectedTools;
window.toggleAllTools = toggleAllTools;
window.getCurrentNamespaceForInstance = getCurrentNamespaceForInstance;

/**
 * 更新选中的工具显示
 */
function updateSelectedTools() {
    const checkboxes = document.querySelectorAll('.tool-checkbox:checked');
    const selectedTools = Array.from(checkboxes).map(cb => cb.value);
    
    // 更新显示文本
    const selectedToolsText = document.getElementById('selectedToolsText');
    if (selectedToolsText) {
        if (selectedTools.length === 0) {
            selectedToolsText.textContent = '选择工具...';
            selectedToolsText.className = 'text-muted';
        } else if (selectedTools.length === 1) {
            selectedToolsText.textContent = selectedTools[0];
            selectedToolsText.className = '';
        } else {
            selectedToolsText.textContent = `已选择 ${selectedTools.length} 个工具`;
            selectedToolsText.className = '';
        }
    }
    
    // 更新隐藏字段的值
    const hiddenInput = document.getElementById('cardInstanceTools');
    if (hiddenInput) {
        hiddenInput.value = selectedTools.join(',');
    }
    
    // 更新全选复选框状态
    const selectAllCheckbox = document.getElementById('selectAllTools');
    const allCheckboxes = document.querySelectorAll('.tool-checkbox');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        const checkedCount = document.querySelectorAll('.tool-checkbox:checked').length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
    }
}

/**
 * 切换全选状态
 */
function toggleAllTools(selectAllCheckbox) {
    const toolCheckboxes = document.querySelectorAll('.tool-checkbox');
    const shouldCheck = selectAllCheckbox.checked;
    
    toolCheckboxes.forEach(checkbox => {
        checkbox.checked = shouldCheck;
    });
    
    updateSelectedTools();
}

/**
 * 更新角色选择器，支持新增的专业角色
 */
function updateRoleSelector() {
    const roleSelect = document.getElementById('cardInstanceRole');
    if (!roleSelect) return;

    // 清空现有选项
    roleSelect.innerHTML = '<option value="">选择角色（可选）</option>';

    // 检查角色定义是否已加载
    if (typeof getRolesByCategory !== 'function') {
        console.warn('角色定义未加载，使用默认选项');
        return;
    }

    // 获取所有角色并按类别分组
    const rolesByCategory = getRolesByCategory();
    
    // 添加分组选项
    Object.entries(rolesByCategory).forEach(([category, roles]) => {
        const categoryNames = {
            'backend': '🖥️ 后端开发',
            'frontend': '🎨 前端开发', 
            'fullstack': '🚀 全栈开发'
        };
        
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoryNames[category] || category;
        
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.key;
            option.textContent = `${role.name}`;
            option.setAttribute('data-tags', role.tags.join(','));
            optgroup.appendChild(option);
        });
        
        roleSelect.appendChild(optgroup);
    });

    console.log('✅ 角色选择器已更新，支持新增专业角色');
}

// 初始化角色选择器
setTimeout(() => {
    if (typeof getRolesByCategory === 'function') {
        updateRoleSelector();
    }
}, 1500);

// 导出函数
window.updateRoleSelector = updateRoleSelector;
