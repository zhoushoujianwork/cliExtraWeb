/**
 * 图片粘贴功能 - 简化版
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

        console.log('ImagePasteHandler: 初始化完成');

        // 监听粘贴事件
        this.inputElement.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });
        
        // 监听拖拽事件
        this.inputElement.addEventListener('dragover', (e) => {
            this.handleDragOver(e);
        });
        
        this.inputElement.addEventListener('drop', (e) => {
            this.handleDrop(e);
        });
    }

    /**
     * 处理粘贴事件
     */
    async handlePaste(event) {
        console.log('处理粘贴事件');
        
        const items = event.clipboardData?.items;
        if (!items) return;

        // 遍历所有项目，查找图片
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.type.startsWith('image/')) {
                console.log('发现图片:', item.type);
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
                break;
            }
        }
    }

    /**
     * 处理图片文件
     */
    async processImage(file) {
        console.log('处理图片文件:', file.name);
        
        try {
            // 显示上传状态
            this.showUploadStatus('正在上传图片...');

            // 生成文件名
            const timestamp = Date.now();
            const extension = this.getFileExtension(file.name) || 'png';
            const fileName = `image_${timestamp}_${++this.tempImageCounter}.${extension}`;

            // 获取当前namespace
            const namespace = this.getCurrentNamespace() || 'default';

            // 创建 FormData 上传图片
            const formData = new FormData();
            formData.append('image', file);
            formData.append('filename', fileName);
            formData.append('namespace', namespace);

            // 上传图片
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                console.log('图片上传成功:', result.path);
                
                // 在输入框中插入图片标记，优先使用path，fallback到url
                const imageUrl = result.path || result.url;
                if (imageUrl) {
                    const currentValue = this.inputElement.value;
                    const newValue = currentValue + (currentValue ? '\n' : '') + `![图片](${imageUrl})`;
                    this.inputElement.value = newValue;
                    
                    // 触发input事件
                    this.inputElement.dispatchEvent(new Event('input'));
                    
                    this.showUploadStatus('图片上传成功!', 'success');
                } else {
                    console.error('服务器响应中缺少图片路径信息:', result);
                    this.showUploadStatus('图片上传成功，但路径信息缺失', 'warning');
                }
                
                // 聚焦到输入框
                this.inputElement.focus();
            } else {
                console.error('图片上传失败:', result.error);
                this.showUploadStatus('图片上传失败: ' + result.error, 'error');
            }

        } catch (error) {
            console.error('处理图片时出错:', error);
            this.showUploadStatus('处理图片时出错: ' + error.message, 'error');
        }
    }

    /**
     * 获取当前namespace
     */
    getCurrentNamespace() {
        // 尝试从全局函数获取
        if (typeof getCurrentNamespace === 'function') {
            return getCurrentNamespace();
        }
        
        // 尝试从select元素获取
        const namespaceSelect = document.getElementById('currentNamespaceSelect');
        if (namespaceSelect) {
            return namespaceSelect.value;
        }
        
        return 'default';
    }

    /**
     * 显示上传状态
     */
    showUploadStatus(message, type = 'info') {
        // 创建状态提示元素
        let statusElement = document.getElementById('imageUploadStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'imageUploadStatus';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 4px;
                z-index: 9999;
                font-size: 14px;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(statusElement);
        }

        // 设置样式和内容
        statusElement.textContent = message;
        
        switch (type) {
            case 'success':
                statusElement.style.backgroundColor = '#d4edda';
                statusElement.style.color = '#155724';
                statusElement.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                statusElement.style.backgroundColor = '#f8d7da';
                statusElement.style.color = '#721c24';
                statusElement.style.border = '1px solid #f5c6cb';
                break;
            default:
                statusElement.style.backgroundColor = '#d1ecf1';
                statusElement.style.color = '#0c5460';
                statusElement.style.border = '1px solid #bee5eb';
        }

        // 自动隐藏
        setTimeout(() => {
            if (statusElement && statusElement.parentNode) {
                statusElement.parentNode.removeChild(statusElement);
            }
        }, type === 'error' ? 5000 : 3000);
    }

    /**
     * 获取文件扩展名
     */
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : null;
    }
}

// 全局初始化函数
function initImagePaste() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        new ImagePasteHandler(messageInput);
        console.log('图片粘贴功能已初始化');
    } else {
        console.warn('未找到消息输入框，图片粘贴功能未初始化');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保其他脚本已加载
    setTimeout(initImagePaste, 100);
});

// 添加拖拽样式
const style = document.createElement('style');
style.textContent = `
    .drag-over {
        border: 2px dashed #007bff !important;
        background-color: rgba(0, 123, 255, 0.1) !important;
    }
`;
document.head.appendChild(style);
