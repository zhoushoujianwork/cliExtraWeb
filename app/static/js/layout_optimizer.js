/**
 * 界面布局优化器
 * 动态调整布局，充分利用屏幕空间，特别是右下角区域
 */

class LayoutOptimizer {
    constructor() {
        this.isInitialized = false;
        this.resizeObserver = null;
        this.quickActionsVisible = false;
        this.layoutPresets = {
            compact: { left: 250, right: 350 },
            balanced: { left: 280, right: 400 },
            expanded: { left: 320, right: 500 },
            wide: { left: 350, right: 600 }
        };
        this.currentPreset = 'balanced';
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupLayout());
        } else {
            this.setupLayout();
        }
        
        this.isInitialized = true;
    }
    
    setupLayout() {
        // 检测屏幕尺寸并应用最佳布局
        this.detectAndApplyOptimalLayout();
        
        // 设置窗口大小监听
        this.setupResizeListener();
        
        // 增强分割线功能
        this.enhanceResizeHandles();
        
        // 创建快捷功能面板
        this.createQuickActionsPanel();
        
        // 优化聊天区域
        this.optimizeChatArea();
        
        // 添加布局控制按钮
        this.addLayoutControls();
        
        console.log('✅ 布局优化器初始化完成');
    }
    
    detectAndApplyOptimalLayout() {
        const screenWidth = window.innerWidth;
        let optimalPreset = 'balanced';
        
        if (screenWidth >= 1600) {
            optimalPreset = 'wide';
        } else if (screenWidth >= 1400) {
            optimalPreset = 'expanded';
        } else if (screenWidth >= 1200) {
            optimalPreset = 'balanced';
        } else {
            optimalPreset = 'compact';
        }
        
        this.applyLayoutPreset(optimalPreset);
        console.log(`📐 应用布局预设: ${optimalPreset} (屏幕宽度: ${screenWidth}px)`);
    }
    
    applyLayoutPreset(presetName) {
        const preset = this.layoutPresets[presetName];
        if (!preset) return;
        
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        
        if (leftPanel) {
            leftPanel.style.width = `${preset.left}px`;
        }
        
        if (rightPanel) {
            rightPanel.style.width = `${preset.right}px`;
        }
        
        this.currentPreset = presetName;
        
        // 保存用户偏好
        localStorage.setItem('layout_preset', presetName);
        
        // 触发布局更新事件
        this.dispatchLayoutChangeEvent();
    }
    
    setupResizeListener() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 250);
        });
    }
    
    handleWindowResize() {
        // 在窗口大小变化时重新检测最佳布局
        this.detectAndApplyOptimalLayout();
        
        // 调整聊天消息显示
        this.adjustChatMessages();
        
        // 更新快捷面板位置
        this.updateQuickActionsPanelPosition();
    }
    
    enhanceResizeHandles() {
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        resizeHandles.forEach((handle, index) => {
            this.makeResizable(handle, index === 0 ? 'left' : 'right');
        });
    }
    
    makeResizable(handle, side) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        const panel = side === 'left' 
            ? document.querySelector('.left-panel')
            : document.querySelector('.right-panel');
            
        if (!panel) return;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(window.getComputedStyle(panel).width, 10);
            
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = side === 'left' ? e.clientX - startX : startX - e.clientX;
            const newWidth = startWidth + deltaX;
            
            const minWidth = parseInt(panel.style.minWidth) || 200;
            const maxWidth = parseInt(panel.style.maxWidth) || 800;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                panel.style.width = `${newWidth}px`;
                this.adjustChatMessages();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // 保存用户自定义宽度
                this.saveCustomWidth(side, panel.style.width);
            }
        });
    }
    
    createQuickActionsPanel() {
        // 检查是否已存在
        if (document.getElementById('quickActionsPanel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'quickActionsPanel';
        panel.className = 'quick-actions-panel';
        
        panel.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="text-muted fw-bold">快捷操作</small>
                <button class="btn-close btn-close-sm" onclick="layoutOptimizer.hideQuickActions()"></button>
            </div>
            <button class="quick-action-btn" onclick="layoutOptimizer.toggleLayoutPreset()">
                <i class="fas fa-expand-arrows-alt me-2"></i>切换布局
            </button>
            <button class="quick-action-btn" onclick="layoutOptimizer.resetLayout()">
                <i class="fas fa-undo me-2"></i>重置布局
            </button>
            <button class="quick-action-btn" onclick="layoutOptimizer.toggleFullscreen()">
                <i class="fas fa-expand me-2"></i>全屏模式
            </button>
            <button class="quick-action-btn" onclick="manualRefresh()">
                <i class="fas fa-sync-alt me-2"></i>刷新实例
            </button>
            <button class="quick-action-btn" onclick="clearChatHistory()">
                <i class="fas fa-trash me-2"></i>清空聊天
            </button>
        `;
        
        document.body.appendChild(panel);
        
        // 添加显示/隐藏快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                this.toggleQuickActions();
            }
        });
    }
    
    optimizeChatArea() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // 添加空状态提示
        this.addEmptyStateToChat();
        
        // 优化消息显示
        this.adjustChatMessages();
        
        // 添加消息统计
        this.addMessageStats();
    }
    
    addEmptyStateToChat() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages || chatMessages.children.length > 0) return;
        
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.id = 'chatEmptyState';
        emptyState.innerHTML = `
            <i class="fas fa-comments"></i>
            <h6>暂无聊天记录</h6>
            <p>选择一个实例开始对话</p>
        `;
        
        chatMessages.appendChild(emptyState);
    }
    
    adjustChatMessages() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // 根据面板宽度调整消息气泡最大宽度
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            const panelWidth = rightPanel.offsetWidth;
            const maxBubbleWidth = Math.min(panelWidth * 0.85, 500);
            
            const style = document.createElement('style');
            style.textContent = `
                .message-bubble {
                    max-width: ${maxBubbleWidth}px !important;
                }
            `;
            
            // 移除旧样式
            const oldStyle = document.getElementById('dynamic-chat-style');
            if (oldStyle) oldStyle.remove();
            
            style.id = 'dynamic-chat-style';
            document.head.appendChild(style);
        }
    }
    
    addMessageStats() {
        const chatHeader = document.querySelector('.right-panel .card-header h5');
        if (!chatHeader || document.getElementById('messageStats')) return;
        
        const stats = document.createElement('small');
        stats.id = 'messageStats';
        stats.className = 'text-muted ms-2';
        stats.textContent = '(0 条消息)';
        
        chatHeader.appendChild(stats);
        
        // 定期更新统计
        this.updateMessageStats();
    }
    
    updateMessageStats() {
        const stats = document.getElementById('messageStats');
        const messages = document.querySelectorAll('.message-bubble');
        
        if (stats) {
            stats.textContent = `(${messages.length} 条消息)`;
        }
    }
    
    addLayoutControls() {
        const rightPanelHeader = document.querySelector('.right-panel .card-header .btn-group');
        if (!rightPanelHeader) return;
        
        // 添加布局控制按钮
        const layoutBtn = document.createElement('button');
        layoutBtn.className = 'btn btn-outline-info btn-sm';
        layoutBtn.title = '布局设置 (Ctrl+`)';
        layoutBtn.innerHTML = '<i class="fas fa-cog"></i>';
        layoutBtn.onclick = () => this.toggleQuickActions();
        
        rightPanelHeader.appendChild(layoutBtn);
    }
    
    toggleQuickActions() {
        const panel = document.getElementById('quickActionsPanel');
        if (!panel) return;
        
        if (this.quickActionsVisible) {
            this.hideQuickActions();
        } else {
            this.showQuickActions();
        }
    }
    
    showQuickActions() {
        const panel = document.getElementById('quickActionsPanel');
        if (!panel) return;
        
        panel.classList.add('show');
        this.quickActionsVisible = true;
        
        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick.bind(this));
        }, 100);
    }
    
    hideQuickActions() {
        const panel = document.getElementById('quickActionsPanel');
        if (!panel) return;
        
        panel.classList.remove('show');
        this.quickActionsVisible = false;
        
        document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }
    
    handleOutsideClick(e) {
        const panel = document.getElementById('quickActionsPanel');
        if (panel && !panel.contains(e.target)) {
            this.hideQuickActions();
        }
    }
    
    toggleLayoutPreset() {
        const presets = Object.keys(this.layoutPresets);
        const currentIndex = presets.indexOf(this.currentPreset);
        const nextIndex = (currentIndex + 1) % presets.length;
        const nextPreset = presets[nextIndex];
        
        this.applyLayoutPreset(nextPreset);
        
        // 显示提示
        this.showToast(`布局已切换到: ${this.getPresetDisplayName(nextPreset)}`);
    }
    
    resetLayout() {
        this.applyLayoutPreset('balanced');
        this.showToast('布局已重置');
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.showToast('已进入全屏模式');
        } else {
            document.exitFullscreen();
            this.showToast('已退出全屏模式');
        }
    }
    
    getPresetDisplayName(preset) {
        const names = {
            compact: '紧凑',
            balanced: '平衡',
            expanded: '扩展',
            wide: '宽屏'
        };
        return names[preset] || preset;
    }
    
    saveCustomWidth(side, width) {
        const key = `custom_${side}_width`;
        localStorage.setItem(key, width);
    }
    
    loadCustomWidths() {
        const leftWidth = localStorage.getItem('custom_left_width');
        const rightWidth = localStorage.getItem('custom_right_width');
        
        if (leftWidth) {
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) leftPanel.style.width = leftWidth;
        }
        
        if (rightWidth) {
            const rightPanel = document.querySelector('.right-panel');
            if (rightPanel) rightPanel.style.width = rightWidth;
        }
    }
    
    updateQuickActionsPanelPosition() {
        const panel = document.getElementById('quickActionsPanel');
        if (!panel) return;
        
        // 确保面板始终在可视区域内
        const rect = panel.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (rect.right > viewportWidth) {
            panel.style.right = '20px';
            panel.style.left = 'auto';
        }
        
        if (rect.bottom > viewportHeight) {
            panel.style.bottom = '20px';
            panel.style.top = 'auto';
        }
    }
    
    dispatchLayoutChangeEvent() {
        const event = new CustomEvent('layoutChanged', {
            detail: {
                preset: this.currentPreset,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }
    
    showToast(message, type = 'info') {
        // 创建简单的toast提示
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed`;
        toast.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 250px;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // 公共API方法
    getCurrentPreset() {
        return this.currentPreset;
    }
    
    getAvailablePresets() {
        return Object.keys(this.layoutPresets);
    }
    
    setPreset(presetName) {
        if (this.layoutPresets[presetName]) {
            this.applyLayoutPreset(presetName);
            return true;
        }
        return false;
    }
}

// 全局实例
let layoutOptimizer = null;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    layoutOptimizer = new LayoutOptimizer();
    
    // 监听聊天消息变化，更新统计
    const observer = new MutationObserver(() => {
        if (layoutOptimizer) {
            layoutOptimizer.updateMessageStats();
        }
    });
    
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        observer.observe(chatMessages, { childList: true, subtree: true });
    }
});

// 导出给其他脚本使用
window.LayoutOptimizer = LayoutOptimizer;
