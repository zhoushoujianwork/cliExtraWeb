/**
 * 实例操作相关的JavaScript函数
 */

/**
 * 清理实例数据
 * @param {string} instanceId - 实例ID
 */
async function cleanInstance(instanceId) {
    // 确认对话框
    const confirmed = confirm(`确定要清理实例 "${instanceId}" 的所有数据吗？\n\n此操作将删除：\n- 实例配置文件\n- 日志文件\n- 对话历史记录\n\n此操作不可撤销！`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        // 显示加载状态
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        const response = await fetch(`/api/clean/${instanceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 显示成功消息
            showNotification(`实例 ${instanceId} 已成功清理`, 'success');
            
            // 从页面中移除实例卡片
            const instanceElement = document.querySelector(`[data-instance-id="${instanceId}"]`) || 
                                  button.closest('.instance-item');
            if (instanceElement) {
                instanceElement.style.transition = 'all 0.3s ease';
                instanceElement.style.opacity = '0';
                instanceElement.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    instanceElement.remove();
                    // 检查是否还有实例，如果没有则显示空状态
                    checkEmptyInstancesList();
                }, 300);
            }
            
            // 刷新实例列表
            setTimeout(() => {
                if (typeof refreshInstances === 'function') {
                    refreshInstances();
                }
            }, 500);
            
        } else {
            showNotification(`清理实例失败: ${result.error}`, 'error');
            
            // 恢复按钮状态
            button.innerHTML = originalContent;
            button.disabled = false;
        }
        
    } catch (error) {
        console.error('清理实例失败:', error);
        showNotification(`清理实例失败: ${error.message}`, 'error');
        
        // 恢复按钮状态
        const button = event.target.closest('button');
        button.innerHTML = '<i class="fas fa-trash"></i>';
        button.disabled = false;
    }
}

/**
 * 重新启动实例
 * @param {string} instanceId - 实例ID
 */
async function restartInstance(instanceId) {
    // 确认对话框
    const confirmed = confirm(`确定要重新启动实例 "${instanceId}" 吗？`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        // 显示加载状态
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        const response = await fetch(`/api/restart/${instanceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`实例 ${instanceId} 已重新启动`, 'success');
            
            // 更新实例状态显示
            updateInstanceStatus(instanceId, 'Detached');
            
            // 刷新实例列表
            setTimeout(() => {
                if (typeof refreshInstances === 'function') {
                    refreshInstances();
                }
            }, 1000);
            
        } else {
            showNotification(`重启实例失败: ${result.error}`, 'error');
        }
        
        // 恢复按钮状态
        button.innerHTML = originalContent;
        button.disabled = false;
        
    } catch (error) {
        console.error('重启实例失败:', error);
        showNotification(`重启实例失败: ${error.message}`, 'error');
        
        // 恢复按钮状态
        const button = event.target.closest('button');
        button.innerHTML = '<i class="fas fa-play"></i>';
        button.disabled = false;
    }
}

/**
 * 更新实例状态显示
 * @param {string} instanceId - 实例ID
 * @param {string} status - 新状态
 */
function updateInstanceStatus(instanceId, status) {
    const instanceElement = document.querySelector(`[data-instance-id="${instanceId}"]`) || 
                           document.querySelector(`.instance-item:has([onclick*="${instanceId}"])`);
    
    if (instanceElement) {
        // 更新状态徽章
        const statusBadge = instanceElement.querySelector('.badge');
        if (statusBadge) {
            statusBadge.className = `badge ms-1 bg-${status === 'Attached' ? 'success' : status === 'Detached' ? 'warning' : 'danger'}`;
            statusBadge.textContent = status;
        }
        
        // 移除停止状态的样式
        instanceElement.classList.remove('instance-stopped');
        
        // 更新按钮组
        const buttonGroup = instanceElement.querySelector('.btn-group');
        if (buttonGroup && status !== 'Not Running') {
            buttonGroup.innerHTML = `
                <button class="btn btn-info" onclick="createWebTerminal('${instanceId}')" title="Web终端">
                    <i class="fas fa-desktop"></i>
                </button>
                <button class="btn btn-warning" onclick="conversationHistory.showInstanceHistory('${instanceId}', 'default')" title="对话历史">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn btn-danger" onclick="stopInstance('${instanceId}')" title="停止实例">
                    <i class="fas fa-stop"></i>
                </button>
            `;
        }
    }
}

/**
 * 检查实例列表是否为空
 */
function checkEmptyInstancesList() {
    const instancesList = document.getElementById('instancesList');
    if (instancesList && instancesList.children.length === 0) {
        instancesList.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-server fa-3x mb-3"></i>
                <p>暂无活跃的实例</p>
                <button class="btn btn-primary" onclick="showCreateInstanceCard()">
                    <i class="fas fa-plus"></i> 创建新实例
                </button>
            </div>
        `;
    }
}

/**
 * 显示通知消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 150);
        }
    }, 5000);
}

/**
 * 批量清理所有已停止的实例
 */
async function cleanAllStoppedInstances() {
    const stoppedInstances = document.querySelectorAll('.instance-item.instance-stopped');
    
    if (stoppedInstances.length === 0) {
        showNotification('没有需要清理的已停止实例', 'info');
        return;
    }
    
    const confirmed = confirm(`确定要清理所有 ${stoppedInstances.length} 个已停止的实例吗？\n\n此操作不可撤销！`);
    
    if (!confirmed) {
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const instanceElement of stoppedInstances) {
        const instanceId = instanceElement.querySelector('strong').textContent.trim();
        
        try {
            const response = await fetch(`/api/clean/${instanceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                successCount++;
                instanceElement.remove();
            } else {
                failCount++;
                console.error(`清理实例 ${instanceId} 失败:`, result.error);
            }
            
        } catch (error) {
            failCount++;
            console.error(`清理实例 ${instanceId} 失败:`, error);
        }
    }
    
    if (successCount > 0) {
        showNotification(`成功清理 ${successCount} 个实例`, 'success');
    }
    
    if (failCount > 0) {
        showNotification(`${failCount} 个实例清理失败`, 'error');
    }
    
    // 刷新实例列表
    if (typeof refreshInstances === 'function') {
        refreshInstances();
    }
}

/**
 * 恢复（重新启动）实例
 * @param {string} instanceId - 实例ID
 */
async function resumeInstance(instanceId) {
    const confirmed = confirm(`确定要恢复实例 "${instanceId}" 吗？`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        const response = await fetch(`/api/restart/${instanceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`实例 ${instanceId} 已恢复`, 'success');
            updateInstanceStatus(instanceId, 'Detached');
            
            setTimeout(() => {
                if (typeof refreshInstances === 'function') {
                    refreshInstances();
                }
            }, 1000);
        } else {
            showNotification(`恢复实例失败: ${result.error}`, 'error');
        }
        
        button.innerHTML = originalContent;
        button.disabled = false;
        
    } catch (error) {
        console.error('恢复实例失败:', error);
        showNotification(`恢复实例失败: ${error.message}`, 'error');
        
        const button = event.target.closest('button');
        button.innerHTML = '<i class="fas fa-play"></i>';
        button.disabled = false;
    }
}

/**
 * 显示实例详情
 * @param {string} instanceId - 实例ID
 */
async function showInstanceDetails(instanceId) {
    try {
        // 获取实例详细信息
        const response = await fetch(`/api/instances/${instanceId}/details`);
        const result = await response.json();
        
        if (result.success) {
            const instance = result.instance;
            
            // 创建详情模态框
            const modal = createInstanceDetailsModal(instance);
            document.body.appendChild(modal);
            
            // 显示模态框
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // 模态框关闭时移除DOM元素
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
            
        } else {
            showNotification(`获取实例详情失败: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('获取实例详情失败:', error);
        showNotification(`获取实例详情失败: ${error.message}`, 'error');
    }
}

/**
 * 创建实例详情模态框
 * @param {Object} instance - 实例信息
 * @returns {HTMLElement} 模态框元素
 */
function createInstanceDetailsModal(instance) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-info-circle me-2"></i>
                        实例详情: ${instance.id}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6><i class="fas fa-tag me-2"></i>基本信息</h6>
                            <table class="table table-sm table-borderless">
                                <tr>
                                    <td class="fw-bold" style="width: 30%;">实例ID:</td>
                                    <td style="word-break: break-all;">${instance.id}</td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">状态:</td>
                                    <td>
                                        <span class="badge bg-${instance.status === 'Attached' ? 'success' : instance.status === 'Detached' ? 'warning' : 'danger'}">
                                            ${instance.status}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">命名空间:</td>
                                    <td>${instance.namespace || 'default'}</td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">角色:</td>
                                    <td>${instance.role || '未设置'}</td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">会话名称:</td>
                                    <td><code style="font-size: 0.8em; word-break: break-all;">${instance.session || 'N/A'}</code></td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6><i class="fas fa-folder me-2"></i>路径信息</h6>
                            <table class="table table-sm table-borderless">
                                <tr>
                                    <td class="fw-bold" style="width: 30%;">项目目录:</td>
                                    <td>
                                        <div class="text-break" style="font-size: 0.8em; max-width: 200px; word-wrap: break-word;">
                                            <code>${instance.project_path || 'N/A'}</code>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">实例目录:</td>
                                    <td>
                                        <div class="text-break" style="font-size: 0.8em; max-width: 200px; word-wrap: break-word;">
                                            <code>${instance.instance_dir || 'N/A'}</code>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">日志文件:</td>
                                    <td>
                                        <div class="text-break" style="font-size: 0.8em; max-width: 200px; word-wrap: break-word;">
                                            <code>${instance.log_file || 'N/A'}</code>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">日志大小:</td>
                                    <td>${instance.log_size ? formatFileSize(instance.log_size) : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">最后修改:</td>
                                    <td style="font-size: 0.9em;">${instance.log_modified || 'N/A'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    ${instance.status !== 'Not Running' ? `
                    <div class="mt-3">
                        <h6><i class="fas fa-terminal me-2"></i>连接信息</h6>
                        <div class="alert alert-info">
                            <strong>接管命令:</strong><br>
                            <code class="text-break" style="font-size: 0.9em; word-wrap: break-word;">${instance.attach_command || 'N/A'}</code>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="mt-3">
                        <h6><i class="fas fa-cogs me-2"></i>操作</h6>
                        <div class="btn-group" role="group">
                            ${instance.status === 'Not Running' ? `
                                <button class="btn btn-success btn-sm" onclick="resumeInstance('${instance.id}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                                    <i class="fas fa-play me-1"></i>恢复实例
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="cleanInstance('${instance.id}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                                    <i class="fas fa-trash me-1"></i>清理实例
                                </button>
                            ` : `
                                <button class="btn btn-info btn-sm" onclick="createWebTerminal('${instance.id}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                                    <i class="fas fa-desktop me-1"></i>Web终端
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="conversationHistory.showInstanceHistory('${instance.id}', '${instance.namespace || 'default'}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                                    <i class="fas fa-history me-1"></i>对话历史
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="stopInstance('${instance.id}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                                    <i class="fas fa-stop me-1"></i>停止实例
                                </button>
                            `}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
