/**
 * @实例选择系统 - 仿微信样式
 */

class MentionSystem {
    constructor() {
        this.messageInput = null;
        this.mentionPanel = null;
        this.availableInstances = [];
        this.isShowingMentions = false;
        
        this.init();
    }
    
    init() {
        this.messageInput = document.getElementById('messageInput');
        if (!this.messageInput) return;
        
        this.createMentionPanel();
        this.bindEvents();
        this.loadInstances();
    }
    
    createMentionPanel() {
        this.mentionPanel = document.createElement('div');
        this.mentionPanel.className = 'mention-panel';
        this.mentionPanel.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-height: 200px;
            overflow-y: auto;
            display: none;
            z-index: 1000;
        `;
        
        const inputGroup = this.messageInput.closest('.input-group');
        inputGroup.style.position = 'relative';
        inputGroup.appendChild(this.mentionPanel);
    }
    
    bindEvents() {
        this.messageInput.addEventListener('input', (e) => {
            this.handleInput(e);
        });
        
        this.messageInput.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // 添加回车发送支持
        // this.messageInput.addEventListener('keypress', (e) => {
        //     if (e.key === 'Enter' && !e.shiftKey && !this.isShowingMentions) {
        //         e.preventDefault();
        //         if (typeof sendMessage === 'function') {
        //             sendMessage();
        //         }
        //     }
        // });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mention-panel') && e.target !== this.messageInput) {
                this.hideMentionPanel();
            }
        });
    }
    
    handleInput(e) {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);
        const atMatch = beforeCursor.match(/@([^@\s]*)$/);
        
        if (atMatch) {
            const query = atMatch[1];
            this.showMentionPanel(query);
        } else {
            this.hideMentionPanel();
        }
    }
    
    handleKeydown(e) {
        if (!this.isShowingMentions) return;
        
        const items = this.mentionPanel.querySelectorAll('.mention-item');
        const activeItem = this.mentionPanel.querySelector('.mention-item.active');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNextItem(items, activeItem);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevItem(items, activeItem);
                break;
            case 'Enter':
                e.preventDefault();
                if (activeItem) {
                    this.selectInstance(activeItem.dataset.instanceId);
                }
                break;
            case 'Escape':
                this.hideMentionPanel();
                break;
        }
    }
    
    async loadInstances() {
        try {
            // 获取当前namespace
            let currentNamespace = 'default';
            
            try {
                if (typeof getCurrentNamespace === 'function') {
                    currentNamespace = getCurrentNamespace() || 'default';
                } else if (typeof window.getCurrentNamespace === 'function') {
                    currentNamespace = window.getCurrentNamespace() || 'default';
                } else {
                    // 直接从DOM获取
                    const select = document.getElementById('currentNamespaceSelect');
                    if (select && select.value) {
                        currentNamespace = select.value;
                    }
                }
            } catch (error) {
                console.warn('获取当前namespace失败，使用默认值:', error);
                currentNamespace = 'default';
            }
            
            // 使用namespace参数获取实例
            const response = await fetch(`/api/instances?namespace=${encodeURIComponent(currentNamespace)}`);
            const data = await response.json();
            
            if (data.success) {
                this.availableInstances = data.instances.filter(inst => 
                    inst.status !== 'Not Running' && inst.status !== 'Stopped' && inst.status !== 'Terminated'
                );
                console.log(`@系统加载了namespace "${currentNamespace}" 的 ${this.availableInstances.length} 个实例`);
            }
        } catch (error) {
            console.error('加载实例列表失败:', error);
        }
    }
    
    showMentionPanel(query = '') {
        const filteredInstances = this.availableInstances.filter(instance =>
            instance.id.toLowerCase().includes(query.toLowerCase())
        );
        
        if (filteredInstances.length === 0) {
            this.hideMentionPanel();
            return;
        }
        
        this.renderMentionPanel(filteredInstances);
        this.mentionPanel.style.display = 'block';
        this.isShowingMentions = true;
    }
    
    renderMentionPanel(instances) {
        this.mentionPanel.innerHTML = `
            <div class="mention-header p-2 border-bottom bg-light">
                <small class="text-muted">选择要@的实例</small>
            </div>
            ${instances.map((instance, index) => `
                <div class="mention-item p-2 d-flex align-items-center ${index === 0 ? 'active' : ''}" 
                     data-instance-id="${instance.id}">
                    <div class="me-2">
                        <i class="fas fa-server text-primary"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${instance.id}</div>
                        <small class="text-muted">${instance.status}</small>
                    </div>
                    <div>
                        <span class="badge bg-${instance.status === 'Attached' ? 'success' : 'warning'}">${instance.status}</span>
                    </div>
                </div>
            `).join('')}
        `;
        
        this.mentionPanel.querySelectorAll('.mention-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectInstance(item.dataset.instanceId);
            });
            
            item.addEventListener('mouseenter', () => {
                this.mentionPanel.querySelectorAll('.mention-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
    
    selectInstance(instanceId) {
        const value = this.messageInput.value;
        const cursorPos = this.messageInput.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);
        const atMatch = beforeCursor.match(/@([^@\s]*)$/);
        
        if (atMatch) {
            const atPos = beforeCursor.lastIndexOf('@');
            const newValue = value.substring(0, atPos) + `@${instanceId} ` + value.substring(cursorPos);
            
            this.messageInput.value = newValue;
            this.messageInput.setSelectionRange(atPos + instanceId.length + 2, atPos + instanceId.length + 2);
        }
        
        this.hideMentionPanel();
        this.messageInput.focus();
    }
    
    selectNextItem(items, activeItem) {
        if (!activeItem) {
            items[0]?.classList.add('active');
            return;
        }
        
        const currentIndex = Array.from(items).indexOf(activeItem);
        activeItem.classList.remove('active');
        
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].classList.add('active');
    }
    
    selectPrevItem(items, activeItem) {
        if (!activeItem) {
            items[items.length - 1]?.classList.add('active');
            return;
        }
        
        const currentIndex = Array.from(items).indexOf(activeItem);
        activeItem.classList.remove('active');
        
        const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex].classList.add('active');
    }
    
    hideMentionPanel() {
        this.mentionPanel.style.display = 'none';
        this.isShowingMentions = false;
    }
    
    parseMessage(message) {
        const mentions = [];
        const mentionRegex = /@([^\s@]+)/g;
        let match;
        
        while ((match = mentionRegex.exec(message)) !== null) {
            mentions.push(match[1]);
        }
        
        const cleanMessage = message.replace(mentionRegex, '').trim();
        
        return {
            mentions: [...new Set(mentions)],
            cleanMessage: cleanMessage
        };
    }
}

// 样式
const mentionStyles = `
    .mention-item {
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
    }
    .mention-item:hover {
        background-color: #f8f9fa;
    }
    .mention-item.active {
        background-color: #e3f2fd;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = mentionStyles;
document.head.appendChild(styleSheet);

// 确保MentionSystem类全局可访问
window.MentionSystem = MentionSystem;

// 初始化函数
function initMentionSystem() {
    if (!window.mentionSystem) {
        window.mentionSystem = new MentionSystem();
        console.log('MentionSystem 已初始化');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMentionSystem);
} else {
    initMentionSystem();
}
