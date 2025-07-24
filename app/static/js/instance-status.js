/**
 * 实例状态管理 JavaScript 模块 - 简化版
 * 只显示 idle/busy 状态，无筛选功能
 */

class InstanceStatusManager {
    constructor() {
        this.statusUpdateInterval = null;
        this.statusCache = {};
        this.init();
    }

    init() {
        this.setupStatusColors();
        this.startStatusUpdates();
    }

    /**
     * 设置状态颜色映射 - 简化版
     */
    setupStatusColors() {
        this.statusColors = {
            'idle': { color: '#28a745', text: '空闲' },
            'busy': { color: '#ff8c00', text: '忙碌' }
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
            }
        } catch (error) {
            console.error('更新实例状态失败:', error);
        }
    }

    /**
     * 更新状态显示
     */
    updateStatusDisplay() {
        document.querySelectorAll('.instance-item').forEach(row => {
            const instanceId = row.dataset.instanceId;
            const statusInfo = this.statusCache[instanceId];
            
            if (statusInfo) {
                this.updateInstanceStatusDisplay(row, statusInfo);
            }
        });
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
            const nameElement = row.querySelector('strong');
            if (nameElement) {
                nameElement.parentNode.insertBefore(statusIndicator, nameElement.nextSibling);
            }
        }

        const statusConfig = this.statusColors[statusInfo.status] || this.statusColors['idle'];
        statusIndicator.style.backgroundColor = statusConfig.color;
        
        // 构建工具提示信息
        let tooltipText = `${statusConfig.text}`;
        if (statusInfo.task) {
            tooltipText += ` - ${statusInfo.task}`;
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
            statusIndicator.parentNode.insertBefore(statusText, statusIndicator.nextSibling);
        }
        
        statusText.textContent = statusConfig.text;
        statusText.style.color = statusConfig.color;
        statusText.style.fontSize = '0.8em';
        statusText.style.fontWeight = '500';
        
        // 添加状态变化动画
        if (row.dataset.lastStatus !== statusInfo.status) {
            this.animateStatusChange(statusIndicator);
            row.dataset.lastStatus = statusInfo.status;
        }
    }

    /**
     * 创建状态指示器
     */
    createStatusIndicator() {
        const indicator = document.createElement('span');
        indicator.className = 'status-indicator';
        indicator.style.cssText = `
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 8px;
            transition: all 0.3s ease;
        `;
        
        return indicator;
    }

    /**
     * 状态变化动画
     */
    animateStatusChange(indicator) {
        indicator.style.transform = 'scale(1.3)';
        indicator.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)';
        
        setTimeout(() => {
            indicator.style.transform = 'scale(1)';
            indicator.style.boxShadow = 'none';
        }, 300);
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.stopStatusUpdates();
        
        // 移除状态指示器
        document.querySelectorAll('.status-indicator').forEach(indicator => {
            indicator.remove();
        });
        
        // 移除状态文本
        document.querySelectorAll('.status-text').forEach(text => {
            text.remove();
        });
    }
}

// 全局实例状态管理器
let instanceStatusManager = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在实例管理页面
    if (document.querySelector('#instancesList')) {
        instanceStatusManager = new InstanceStatusManager();
        
        // 等待实例列表加载后再初始化状态显示
        const checkInstancesLoaded = setInterval(() => {
            const instanceItems = document.querySelectorAll('#instancesList .instance-item');
            if (instanceItems.length > 0) {
                clearInterval(checkInstancesLoaded);
                instanceStatusManager.updateAllInstancesStatus();
            }
        }, 1000);
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    if (instanceStatusManager) {
        instanceStatusManager.destroy();
    }
});
