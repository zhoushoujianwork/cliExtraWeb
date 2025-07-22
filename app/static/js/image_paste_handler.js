/**
 * 图片粘贴处理模块
 * 支持在聊天输入框中粘贴图片，自动保存到临时目录并发送路径
 */

class ImagePasteHandler {
    constructor(inputElement) {
        this.inputElement = inputElement;
        this.tempImageCounter = 0;
        this.init();
    }

    init() {
        if (!this.inputElement) {
            console.error('ImagePasteHandler: 输入元素未找到');
            return;
        }

        console.log('ImagePasteHandler: 开始初始化', this.inputElement);
        console.log('ImagePasteHandler: 输入元素ID:', this.inputElement.id);
        console.log('ImagePasteHandler: 输入元素类型:', this.inputElement.tagName);

        // 监听粘贴事件
        this.inputElement.addEventListener('paste', (e) => {
            console.log('🎯 粘贴事件触发!', e);
            this.handlePaste(e);
        });
        
        // 监听拖拽事件
        this.inputElement.addEventListener('dragover', (e) => {
            console.log('🎯 拖拽悬停事件触发!', e);
            this.handleDragOver(e);
        });
        
        this.inputElement.addEventListener('drop', (e) => {
            console.log('🎯 拖拽放置事件触发!', e);
            this.handleDrop(e);
        });
        
        // 测试事件监听是否正常
        this.inputElement.addEventListener('focus', () => {
            console.log('✅ 输入框获得焦点 - 事件监听正常');
        });
        
        this.inputElement.addEventListener('input', () => {
            console.log('✅ 输入框内容变化 - 事件监听正常');
        });
        
        console.log('✅ ImagePasteHandler 初始化完成，事件监听器已添加');
    }

    /**
     * 处理粘贴事件
     */
    async handlePaste(event) {
        console.log('🔍 handlePaste 被调用', event);
        console.log('🔍 event.clipboardData:', event.clipboardData);
        
        const items = event.clipboardData?.items;
        console.log('🔍 clipboardData.items:', items);
        
        if (!items) {
            console.log('❌ 没有 clipboardData.items');
            return;
        }

        console.log('🔍 items 数量:', items.length);
        
        // 遍历所有项目
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(`🔍 Item ${i}:`, {
                kind: item.kind,
                type: item.type,
                isImage: item.type.startsWith('image/')
            });
            
            if (item.type.startsWith('image/')) {
                console.log('✅ 发现图片项目!', item.type);
                event.preventDefault();
                const file = item.getAsFile();
                console.log('🔍 获取的文件:', file);
                
                if (file) {
                    console.log('✅ 文件获取成功，开始处理图片');
                    await this.processImage(file);
                } else {
                    console.log('❌ 文件获取失败');
                }
                break;
            }
        }
        
        console.log('🔍 handlePaste 处理完成');
    }

    /**
     * 处理拖拽悬停
     */
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        
        // 添加视觉反馈
        this.inputElement.classList.add('drag-over');
    }

    /**
     * 处理文件拖拽放置
     */
    async handleDrop(event) {
        event.preventDefault();
        this.inputElement.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                await this.processImage(file);
                break; // 只处理第一个图片文件
            }
        }
    }

    /**
     * 处理图片文件
     */
    async processImage(file) {
        console.log('🖼️ processImage 开始处理:', file);
        console.log('🖼️ 文件信息:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });
        
        try {
            // 显示上传状态
            console.log('📤 显示上传状态');
            this.showUploadStatus('正在处理图片...');

            // 生成临时文件名
            const timestamp = Date.now();
            const extension = this.getFileExtension(file.name) || 'png';
            const tempFileName = `temp_image_${timestamp}_${++this.tempImageCounter}.${extension}`;
            
            console.log('📝 生成文件名:', tempFileName);

            // 创建 FormData 上传图片
            const formData = new FormData();
            formData.append('image', file);
            formData.append('filename', tempFileName);
            
            console.log('📦 FormData 创建完成');

            // 上传到服务器临时目录
            console.log('🚀 开始上传到服务器...');
            const response = await fetch('/api/upload-temp-image', {
                method: 'POST',
                body: formData
            });

            console.log('📡 服务器响应:', response);
            console.log('📡 响应状态:', response.status);

            const result = await response.json();
            console.log('📋 响应结果:', result);

            if (result.success) {
                // 上传成功，将图片路径添加到输入框
                const imagePath = result.path;
                const currentValue = this.inputElement.value;
                const imageMessage = `[图片: ${imagePath}]`;
                
                console.log('✅ 上传成功!');
                console.log('📁 图片路径:', imagePath);
                console.log('💬 图片消息:', imageMessage);
                
                // 如果输入框有内容，在新行添加图片路径
                const newValue = currentValue ? 
                    `${currentValue}\n${imageMessage}` : 
                    imageMessage;
                
                console.log('📝 更新输入框内容:', newValue);
                this.inputElement.value = newValue;
                
                // 显示成功状态
                this.showUploadStatus(`图片已添加: ${file.name}`, 'success');
                
                // 触发输入事件，更新界面
                this.inputElement.dispatchEvent(new Event('input'));
                
                // 聚焦到输入框末尾
                this.inputElement.focus();
                this.inputElement.setSelectionRange(newValue.length, newValue.length);
                
                console.log('🎉 图片处理完成!');
                
            } else {
                throw new Error(result.error || '上传失败');
            }

        } catch (error) {
            console.error('❌ 图片处理失败:', error);
            this.showUploadStatus(`图片处理失败: ${error.message}`, 'error');
        }
    }

    /**
     * 获取文件扩展名
     */
    getFileExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : null;
    }

    /**
     * 显示上传状态
     */
    showUploadStatus(message, type = 'info') {
        // 创建状态提示元素
        const statusElement = document.createElement('div');
        statusElement.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
        statusElement.style.cssText = 'top: 20px; right: 20px; z-index: 1050; max-width: 300px;';
        statusElement.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(statusElement);

        // 3秒后自动移除
        setTimeout(() => {
            if (statusElement.parentNode) {
                statusElement.remove();
            }
        }, 3000);
    }

    /**
     * 检查是否支持图片粘贴
     */
    static isSupported() {
        return !!(navigator.clipboard && window.ClipboardEvent);
    }
}

// 全局初始化函数
function initImagePasteHandler() {
    console.log('🚀 initImagePasteHandler 被调用');
    
    const chatInput = document.getElementById('messageInput'); // 修正 ID
    console.log('🔍 查找 messageInput 元素:', chatInput);
    
    if (!chatInput) {
        console.error('❌ 未找到 messageInput 元素');
        // 尝试查找其他可能的输入框
        const allInputs = document.querySelectorAll('input, textarea');
        console.log('🔍 页面中所有输入元素:', allInputs);
        return;
    }
    
    console.log('✅ 找到 messageInput 元素:', {
        id: chatInput.id,
        tagName: chatInput.tagName,
        className: chatInput.className
    });
    
    if (ImagePasteHandler.isSupported()) {
        console.log('✅ 浏览器支持图片粘贴功能');
        window.imagePasteHandler = new ImagePasteHandler(chatInput);
        console.log('✅ ImagePasteHandler 实例已创建');
        
        // 添加提示信息
        const helpText = document.createElement('small');
        helpText.className = 'text-muted input-help-text';
        helpText.innerHTML = '<i class="fas fa-image"></i> 支持粘贴或拖拽图片';
        
        // 找到输入框的父容器并添加提示
        const inputContainer = chatInput.closest('.input-group') || chatInput.parentNode;
        if (inputContainer && inputContainer.parentNode) {
            inputContainer.parentNode.appendChild(helpText);
            console.log('✅ 添加了提示文本');
        }
        
        console.log('🎉 图片粘贴功能已启用');
    } else {
        console.warn('❌ 浏览器不支持图片粘贴功能');
        console.log('🔍 检查支持情况:', {
            clipboard: !!navigator.clipboard,
            ClipboardEvent: !!window.ClipboardEvent
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOMContentLoaded 事件触发');
    console.log('📄 开始初始化图片粘贴功能');
    initImagePasteHandler();
});

// 如果页面已经加载完成，立即初始化
if (document.readyState === 'loading') {
    console.log('📄 页面正在加载，等待 DOMContentLoaded');
} else {
    console.log('📄 页面已加载完成，立即初始化');
    initImagePasteHandler();
}

// 导出供全局使用
window.ImagePasteHandler = ImagePasteHandler;
window.initImagePasteHandler = initImagePasteHandler;
