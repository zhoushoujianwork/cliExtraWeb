/**
 * 可调整大小的面板功能
 */

class ResizablePanels {
    constructor() {
        this.isResizing = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startWidth = 0;
        this.startNextWidth = 0;
        
        this.init();
    }
    
    init() {
        // 初始化左侧分割线
        const leftResizer = document.getElementById('leftResizer');
        if (leftResizer) {
            leftResizer.addEventListener('mousedown', (e) => this.startResize(e, 'left'));
        }
        
        // 初始化右侧分割线
        const rightResizer = document.getElementById('rightResizer');
        if (rightResizer) {
            rightResizer.addEventListener('mousedown', (e) => this.startResize(e, 'right'));
        }
        
        // 全局鼠标事件
        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.stopResize());
        
        // 防止文本选择
        document.addEventListener('selectstart', (e) => {
            if (this.isResizing) {
                e.preventDefault();
            }
        });
    }
    
    startResize(e, type) {
        this.isResizing = true;
        this.currentResizer = type;
        this.startX = e.clientX;
        
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        
        if (type === 'left') {
            this.startWidth = leftPanel.offsetWidth;
        } else if (type === 'right') {
            this.startWidth = rightPanel.offsetWidth;
        }
        
        // 添加拖拽时的样式
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    }
    
    doResize(e) {
        if (!this.isResizing) return;
        
        const deltaX = e.clientX - this.startX;
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        const container = document.querySelector('.three-column-layout');
        
        if (this.currentResizer === 'left') {
            // 调整左侧面板大小
            const newWidth = this.startWidth + deltaX;
            const minWidth = 200;
            const maxWidth = Math.min(500, container.offsetWidth * 0.4);
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                leftPanel.style.width = newWidth + 'px';
                this.fitTerminal();
            }
        } else if (this.currentResizer === 'right') {
            // 调整右侧面板大小
            const newWidth = this.startWidth - deltaX;
            const minWidth = 200;
            const maxWidth = Math.min(450, container.offsetWidth * 0.4);
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                rightPanel.style.width = newWidth + 'px';
                this.fitTerminal();
            }
        }
    }
    
    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.currentResizer = null;
        
        // 移除拖拽样式
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // 最终调整终端大小
        setTimeout(() => this.fitTerminal(), 100);
    }
    
    fitTerminal() {
        // 调整终端大小以适应新的面板尺寸
        if (window.fitAddon && window.term) {
            try {
                window.fitAddon.fit();
            } catch (error) {
                console.warn('终端大小调整失败:', error);
            }
        }
    }
    
    // 保存面板大小到localStorage
    savePanelSizes() {
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        
        const sizes = {
            leftWidth: leftPanel.offsetWidth,
            rightWidth: rightPanel.offsetWidth
        };
        
        try {
            localStorage.setItem('panelSizes', JSON.stringify(sizes));
        } catch (error) {
            console.warn('保存面板大小失败:', error);
        }
    }
    
    // 从localStorage恢复面板大小
    restorePanelSizes() {
        try {
            const saved = localStorage.getItem('panelSizes');
            if (saved) {
                const sizes = JSON.parse(saved);
                const leftPanel = document.querySelector('.left-panel');
                const rightPanel = document.querySelector('.right-panel');
                
                if (sizes.leftWidth) {
                    leftPanel.style.width = sizes.leftWidth + 'px';
                }
                if (sizes.rightWidth) {
                    rightPanel.style.width = sizes.rightWidth + 'px';
                }
                
                setTimeout(() => this.fitTerminal(), 200);
            }
        } catch (error) {
            console.warn('恢复面板大小失败:', error);
        }
    }
}

// 全局实例
let resizablePanels;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    resizablePanels = new ResizablePanels();
    
    // 恢复保存的面板大小
    setTimeout(() => {
        resizablePanels.restorePanelSizes();
    }, 500);
});

// 页面卸载前保存面板大小
window.addEventListener('beforeunload', function() {
    if (resizablePanels) {
        resizablePanels.savePanelSizes();
    }
});

// 窗口大小变化时调整终端
window.addEventListener('resize', function() {
    if (resizablePanels) {
        setTimeout(() => resizablePanels.fitTerminal(), 100);
    }
});
