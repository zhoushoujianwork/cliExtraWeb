/**
 * 实例状态管理 JavaScript 模块
 * 提供状态显示、实时更新、筛选等功能
 */

class InstanceStatusManager {
    constructor() {
        this.statusUpdateInterval = null;
        this.statusCache = {};
        this.filterStatus = 'all';
        this.init();
    }

    init() {
        this.setupStatusColors();
        this.startStatusUpdates();
        this.setupStatusFilter();
        this.setupStatusModal();
    }

    /**
     * 设置状态颜色映射
     */
    setupStatusColors() {
        this.statusColors = {
            'idle': { color: '#28a745', bg: '#d4edda', text: '空闲' },
            'busy': { color: '#ffc107', bg: '#fff3cd', text: '忙碌' },
            'waiting': { color: '#007bff', bg: '#d1ecf1', text: '等待' },
            'error': { color: '#dc3545', bg: '#f8d7da', text: '错误' },
            'stopped': { color: '#6c757d', bg: '#e2e3e5', text: '已停止' }
        };
    }

    /**
     * 开始状态更新
     */
    startStatusUpdates() {
        // 立即更新一次
        this.updateAllInstancesStatus();
        
        // 每30秒更新一次状态
        this.statusUpdateInterval = setInterval(() => {
            this.updateAllInstancesStatus();
        }, 30000);
    }

    /**
     * 停止状态更新
     */
    stopStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
    }

    /**
     * 更新所有实例状态
     */
    async updateAllInstancesStatus() {
        try {
            const response = await fetch('/api/instances/status');
            const data = await response.json();
            
            if (data.success) {
                this.statusCache = data.instances_status;
                this.updateStatusDisplay();
                this.updateStatusStats();
            }
        } catch (error) {
            console.error('更新实例状态失败:', error);
        }
    }

    /**
     * 更新状态显示
     */
    updateStatusDisplay() {
        document.querySelectorAll('.instance-row').forEach(row => {
            const instanceName = row.dataset.instanceName;
            const statusInfo = this.statusCache[instanceName];
            
            if (statusInfo) {
                this.updateInstanceStatusDisplay(row, statusInfo);
            }
        });
        
        // 应用筛选
        this.applyStatusFilter();
    }

    /**
     * 更新单个实例状态显示
     */
    updateInstanceStatusDisplay(row, statusInfo) {
        // 更新状态指示器
        let statusIndicator = row.querySelector('.status-indicator');
        if (!statusIndicator) {
            statusIndicator = this.createStatusIndicator();
            // 插入到实例名称后面
            const nameCell = row.querySelector('.instance-name');
            if (nameCell) {
                nameCell.appendChild(statusIndicator);
            }
        }

        const statusConfig = this.statusColors[statusInfo.status] || this.statusColors['error'];
        statusIndicator.style.backgroundColor = statusConfig.color;
        
        // 构建工具提示信息
        let tooltipText = `${statusConfig.text} - ${statusInfo.description}`;
        if (statusInfo.task && statusInfo.task !== statusInfo.description) {
            tooltipText += `\n任务: ${statusInfo.task}`;
        }
        if (statusInfo.last_activity) {
            tooltipText += `\n最后活动: ${statusInfo.last_activity}`;
        }
        statusIndicator.title = tooltipText;
        
        // 更新状态文本
        let statusText = row.querySelector('.status-text');
        if (!statusText) {
            statusText = document.createElement('span');
            statusText.className = 'status-text ms-2';
            statusIndicator.parentNode.appendChild(statusText);
        }
        
        statusText.textContent = statusConfig.text;
        statusText.style.color = statusConfig.color;
        
        // 如果有任务信息，显示任务描述
        if (statusInfo.task && statusInfo.task !== statusConfig.text) {
            statusText.textContent = `${statusConfig.text} - ${statusInfo.task.substring(0, 20)}${statusInfo.task.length > 20 ? '...' : ''}`;
        }
        
        // 添加状态变化动画
        if (row.dataset.lastStatus !== statusInfo.status) {
            this.animateStatusChange(statusIndicator);
            row.dataset.lastStatus = statusInfo.status;
            
            // 显示状态变化通知
            if (row.dataset.lastStatus) {
                this.showStatusChangeNotification(row.dataset.instanceName, statusInfo.status, statusConfig.text);
            }
        }
        
        // 更新实例行的状态属性
        row.setAttribute('data-status', statusInfo.status);
        
        // 存储状态信息用于详情显示
        row.dataset.statusInfo = JSON.stringify(statusInfo);
    }

    /**
     * 创建状态指示器
     */
    createStatusIndicator() {
        const indicator = document.createElement('span');
        indicator.className = 'status-indicator';
        indicator.style.cssText = `
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-left: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        // 点击显示详情
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = e.target.closest('.instance-row');
            if (row) {
                this.showStatusDetails(row.dataset.instanceName);
            }
        });
        
        return indicator;
    }

    /**
     * 状态变化动画
     */
    animateStatusChange(indicator) {
        indicator.style.transform = 'scale(1.3)';
        indicator.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        
        setTimeout(() => {
            indicator.style.transform = 'scale(1)';
            indicator.style.boxShadow = 'none';
        }, 300);
    }

    /**
     * 设置状态筛选
     */
    setupStatusFilter() {
        // 创建筛选控件
        const filterContainer = document.createElement('div');
        filterContainer.className = 'status-filter-container mb-3';
        filterContainer.innerHTML = `
            <div class="d-flex align-items-center">
                <label class="me-2">状态筛选:</label>
                <select class="form-select form-select-sm" id="statusFilter" style="width: auto;">
                    <option value="all">全部</option>
                    <option value="idle">空闲</option>
                    <option value="busy">忙碌</option>
                    <option value="waiting">等待</option>
                    <option value="error">错误</option>
                    <option value="stopped">已停止</option>
                </select>
                <div class="ms-3" id="statusStats"></div>
            </div>
        `;
        
        // 插入到实例列表前面
        const instancesContainer = document.querySelector('.instances-container');
        if (instancesContainer) {
            instancesContainer.insertBefore(filterContainer, instancesContainer.firstChild);
        }
        
        // 绑定筛选事件
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.applyStatusFilter();
        });
    }

    /**
     * 应用状态筛选
     */
    applyStatusFilter() {
        document.querySelectorAll('.instance-row').forEach(row => {
            const statusInfo = JSON.parse(row.dataset.statusInfo || '{}');
            const shouldShow = this.filterStatus === 'all' || statusInfo.status === this.filterStatus;
            
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    /**
     * 更新状态统计
     */
    updateStatusStats() {
        const stats = {};
        Object.values(this.statusCache).forEach(status => {
            stats[status.status] = (stats[status.status] || 0) + 1;
        });
        
        const statsContainer = document.getElementById('statusStats');
        if (statsContainer) {
            const statsHtml = Object.entries(stats).map(([status, count]) => {
                const config = this.statusColors[status];
                return `<span class="badge me-1" style="background-color: ${config.color};">${config.text}: ${count}</span>`;
            }).join('');
            
            statsContainer.innerHTML = statsHtml;
        }
    }

    /**
     * 设置状态详情模态框
     */
    setupStatusModal() {
        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade" id="statusModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">实例状态详情</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="statusModalBody">
                            <!-- 状态详情内容 -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-primary" id="refreshStatusBtn">刷新状态</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 绑定刷新按钮
        document.getElementById('refreshStatusBtn').addEventListener('click', () => {
            const instanceName = document.getElementById('statusModal').dataset.instanceName;
            if (instanceName) {
                this.showStatusDetails(instanceName);
            }
        });
    }

    /**
     * 显示状态详情
     */
    async showStatusDetails(instanceName) {
        try {
            const response = await fetch(`/api/instances/${instanceName}/status`);
            const data = await response.json();
            
            if (data.success) {
                this.renderStatusDetails(data.status);
                
                // 设置模态框实例名称
                const modal = document.getElementById('statusModal');
                modal.dataset.instanceName = instanceName;
                
                // 显示模态框
                const bsModal = new bootstrap.Modal(modal);
                bsModal.show();
            } else {
                alert('获取状态详情失败: ' + data.error);
            }
        } catch (error) {
            console.error('获取状态详情失败:', error);
            alert('获取状态详情失败');
        }
    }

    /**
     * 渲染状态详情
     */
    renderStatusDetails(statusData) {
        const modalBody = document.getElementById('statusModalBody');
        const statusConfig = this.statusColors[statusData.status] || this.statusColors['error'];
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>基本信息</h6>
                    <table class="table table-sm">
                        <tr>
                            <td>实例名称:</td>
                            <td>${statusData.instance_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>当前状态:</td>
                            <td>
                                <span class="badge" style="background-color: ${statusConfig.color};">
                                    ${statusConfig.text}
                                </span>
                                ${statusData.description}
                            </td>
                        </tr>
                        <tr>
                            <td>命名空间:</td>
                            <td>${statusData.namespace || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>角色:</td>
                            <td>${statusData.role || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>进程PID:</td>
                            <td>${statusData.pid || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>运行时间:</td>
                            <td>${statusData.uptime || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>最后活动:</td>
                            <td>${statusData.last_activity || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>会话信息</h6>
                    <table class="table table-sm">
                        <tr>
                            <td>会话名称:</td>
                            <td>${statusData.session_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>创建时间:</td>
                            <td>${statusData.created_at || 'N/A'}</td>
                        </tr>
                    </table>
                    
                    ${statusData.recent_output ? `
                        <h6>最近输出</h6>
                        <pre class="bg-dark text-light p-2 rounded" style="max-height: 200px; overflow-y: auto; font-size: 12px;">${statusData.recent_output}</pre>
                    ` : ''}
                </div>
            </div>
            
            ${statusData.error ? `
                <div class="alert alert-danger mt-3">
                    <strong>错误信息:</strong> ${statusData.error}
                </div>
            ` : ''}
        `;
    }

    /**
     * 显示状态变化通知
     */
    showStatusChangeNotification(instanceName, newStatus, statusText) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'status-change-notification';
        notification.innerHTML = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <i class="fas fa-info-circle"></i>
                实例 <strong>${instanceName}</strong> 状态变更为: <span class="badge bg-primary">${statusText}</span>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 添加到页面顶部
        document.body.insertBefore(notification, document.body.firstChild);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.stopStatusUpdates();
        
        // 移除事件监听器
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.removeEventListener('change', this.applyStatusFilter);
        }
        
        // 移除状态指示器
        document.querySelectorAll('.status-indicator').forEach(indicator => {
            indicator.remove();
        });
        
        // 移除筛选控件
        const filterContainer = document.querySelector('.status-filter-container');
        if (filterContainer) {
            filterContainer.remove();
        }
        
        // 移除通知
        document.querySelectorAll('.status-change-notification').forEach(notification => {
            notification.remove();
        });
    }
}

// 全局实例状态管理器
let instanceStatusManager = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在实例管理页面
    if (document.querySelector('.instances-container')) {
        instanceStatusManager = new InstanceStatusManager();
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    if (instanceStatusManager) {
        instanceStatusManager.destroy();
    }
});
