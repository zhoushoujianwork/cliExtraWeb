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

        // 监听粘贴事件
        this.inputElement.addEventListener('paste', (e) => this.handlePaste(e));
        
        // 监听拖拽事件
        this.inputElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.inputElement.addEventListener('drop', (e) => this.handleDrop(e));
        
        console.log('ImagePasteHandler 初始化完成');
    }

    /**
     * 处理粘贴事件
     */
    async handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await this.processImage(file);
                }
                break;
            }
        }
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
        try {
            // 显示上传状态
            this.showUploadStatus('正在处理图片...');

            // 生成临时文件名
            const timestamp = Date.now();
            const extension = this.getFileExtension(file.name) || 'png';
            const tempFileName = `temp_image_${timestamp}_${++this.tempImageCounter}.${extension}`;

            // 创建 FormData 上传图片
            const formData = new FormData();
            formData.append('image', file);
            formData.append('filename', tempFileName);

            // 上传到服务器临时目录
            const response = await fetch('/api/upload-temp-image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // 上传成功，将图片路径添加到输入框
                const imagePath = result.path;
                const currentValue = this.inputElement.value;
                const imageMessage = `[图片: ${imagePath}]`;
                
                // 如果输入框有内容，在新行添加图片路径
                const newValue = currentValue ? 
                    `${currentValue}\n${imageMessage}` : 
                    imageMessage;
                
                this.inputElement.value = newValue;
                
                // 显示成功状态
                this.showUploadStatus(`图片已添加: ${file.name}`, 'success');
                
                // 触发输入事件，更新界面
                this.inputElement.dispatchEvent(new Event('input'));
                
                // 聚焦到输入框末尾
                this.inputElement.focus();
                this.inputElement.setSelectionRange(newValue.length, newValue.length);
                
            } else {
                throw new Error(result.error || '上传失败');
            }

        } catch (error) {
            console.error('图片处理失败:', error);
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
    const chatInput = document.getElementById('chatInput');
    if (chatInput && ImagePasteHandler.isSupported()) {
        window.imagePasteHandler = new ImagePasteHandler(chatInput);
        console.log('图片粘贴功能已启用');
        
        // 添加提示信息
        const helpText = document.createElement('small');
        helpText.className = 'text-muted';
        helpText.innerHTML = '<i class="fas fa-image"></i> 支持粘贴或拖拽图片';
        
        // 找到输入框的父容器并添加提示
        const inputContainer = chatInput.closest('.input-group') || chatInput.parentNode;
        if (inputContainer) {
            inputContainer.appendChild(helpText);
        }
    } else {
        console.warn('图片粘贴功能不支持或输入框未找到');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initImagePasteHandler);

// 导出供全局使用
window.ImagePasteHandler = ImagePasteHandler;
window.initImagePasteHandler = initImagePasteHandler;
