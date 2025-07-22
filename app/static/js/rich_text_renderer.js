/**
 * 富文本渲染模块
 * 支持 Markdown 渲染和代码语法高亮
 */

class RichTextRenderer {
    constructor() {
        this.marked = null;
        this.hljs = null;
        this.isInitialized = false;
        this.init();
    }

    /**
     * 初始化渲染器，加载必要的库
     */
    async init() {
        try {
            // 等待库加载完成
            await this.waitForLibraries();
            
            if (this.marked && this.hljs) {
                // 配置 marked
                this.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && this.hljs.getLanguage(lang)) {
                            try {
                                return this.hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('代码高亮失败:', err);
                            }
                        }
                        return this.hljs.highlightAuto(code).value;
                    },
                    breaks: true,
                    gfm: true,
                    sanitize: false
                });
                
                this.isInitialized = true;
                console.log('✅ 富文本渲染器初始化完成');
            }
        } catch (error) {
            console.error('富文本渲染器初始化失败:', error);
        }
    }

    /**
     * 等待外部库加载完成
     */
    async waitForLibraries() {
        const maxWait = 10000; // 最大等待10秒
        const checkInterval = 100; // 每100ms检查一次
        let waited = 0;

        return new Promise((resolve) => {
            const checkLibraries = () => {
                this.marked = window.marked;
                this.hljs = window.hljs;
                
                if (this.marked && this.hljs) {
                    resolve();
                } else if (waited < maxWait) {
                    waited += checkInterval;
                    setTimeout(checkLibraries, checkInterval);
                } else {
                    console.warn('外部库加载超时');
                    resolve();
                }
            };
            
            checkLibraries();
        });
    }

    /**
     * 渲染富文本内容
     */
    render(content, options = {}) {
        if (!this.isInitialized) {
            console.warn('富文本渲染器未初始化，返回原始内容');
            return this.escapeHtml(content);
        }

        try {
            // 预处理内容
            let processedContent = this.preprocess(content, options);
            
            // 使用 marked 渲染 Markdown
            let html = this.marked.parse(processedContent);
            
            // 后处理
            html = this.postprocess(html, options);
            
            return html;
        } catch (error) {
            console.error('富文本渲染失败:', error);
            return this.escapeHtml(content);
        }
    }

    /**
     * 预处理内容
     */
    preprocess(content, options) {
        let processed = content;

        // 处理图片路径引用
        processed = processed.replace(/\[图片:\s*([^\]]+)\]/g, (match, path) => {
            return `![图片](${path})`;
        });

        // 处理终端输出内容
        processed = this.processTerminalContent(processed);

        // 处理特殊的 Markdown 语法
        processed = this.processSpecialSyntax(processed);

        return processed;
    }

    /**
     * 处理终端内容
     */
    processTerminalContent(content) {
        // 检测可能的终端输出模式
        const terminalPatterns = [
            // 命令行提示符
            /^[\$#]\s+(.+)$/gm,
            // 文件路径
            /^(\/[^\s]+|~\/[^\s]+|\w+\/[^\s]+)$/gm,
            // 错误信息
            /^(Error|ERROR|error):\s*(.+)$/gm,
            // 成功信息
            /^(✅|✓|SUCCESS|success):\s*(.+)$/gm,
            // 警告信息
            /^(⚠️|WARNING|warning):\s*(.+)$/gm
        ];

        let processed = content;

        // 如果内容看起来像终端输出，用代码块包装
        if (this.looksLikeTerminalOutput(content)) {
            // 检查是否已经在代码块中
            if (!content.includes('```')) {
                processed = '```bash\n' + content + '\n```';
            }
        }

        return processed;
    }

    /**
     * 判断内容是否像终端输出
     */
    looksLikeTerminalOutput(content) {
        const terminalIndicators = [
            /^\$\s+/m,           // $ 命令提示符
            /^#\s+/m,            // # root提示符
            /^.*@.*:\s*\$\s+/m,  // user@host:$ 格式
            /^\/[^\s]+/m,        // 绝对路径
            /^~\/[^\s]+/m,       // 家目录路径
            /^(npm|yarn|git|docker|kubectl)\s+/m, // 常见命令
            /^(Error|ERROR|error):/m,  // 错误信息
            /^(✅|❌|⚠️)/m       // 状态图标
        ];

        return terminalIndicators.some(pattern => pattern.test(content));
    }

    /**
     * 处理特殊语法
     */
    processSpecialSyntax(content) {
        let processed = content;

        // 处理状态图标
        processed = processed.replace(/^(✅|❌|⚠️|📋|🔧|🚀|💡)\s*(.+)$/gm, 
            (match, icon, text) => `${icon} **${text}**`);

        // 处理标题标记
        processed = processed.replace(/^###\s*🎯\s*(.+)$/gm, '### 🎯 $1');
        processed = processed.replace(/^###\s*📋\s*(.+)$/gm, '### 📋 $1');
        processed = processed.replace(/^###\s*🔧\s*(.+)$/gm, '### 🔧 $1');

        return processed;
    }

    /**
     * 后处理 HTML
     */
    postprocess(html, options) {
        let processed = html;

        // 为代码块添加复制按钮
        processed = processed.replace(
            /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
            (match, lang, code) => {
                const decodedCode = this.decodeHtml(code);
                return `
                    <div class="code-block-container">
                        <div class="code-block-header">
                            <span class="code-language">${lang}</span>
                            <button class="copy-code-btn" onclick="copyCodeToClipboard(this)" data-code="${this.escapeHtml(decodedCode)}">
                                <i class="fas fa-copy"></i> 复制
                            </button>
                        </div>
                        <pre><code class="language-${lang}">${code}</code></pre>
                    </div>
                `;
            }
        );

        // 为图片添加预览功能
        processed = processed.replace(
            /<img src="([^"]+)" alt="([^"]*)"[^>]*>/g,
            (match, src, alt) => {
                return `
                    <div class="image-container">
                        <img src="${src}" alt="${alt}" class="rendered-image" onclick="previewImage('${src}', '${alt}')">
                        <div class="image-caption">${alt || '图片'}</div>
                    </div>
                `;
            }
        );

        return processed;
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * HTML 解码
     */
    decodeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * 检查是否已初始化
     */
    isReady() {
        return this.isInitialized;
    }
}

// 全局函数：复制代码到剪贴板
function copyCodeToClipboard(button) {
    const code = button.getAttribute('data-code');
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            // 显示复制成功提示
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> 已复制';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyTextToClipboard(code);
        });
    } else {
        fallbackCopyTextToClipboard(code);
    }
}

// 备用复制方法
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        console.log('代码已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
    }
    
    document.body.removeChild(textArea);
}

// 全局函数：预览图片
function previewImage(src, alt) {
    // 创建模态框预览图片
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="image-preview-backdrop" onclick="closeImagePreview()">
            <div class="image-preview-container">
                <img src="${src}" alt="${alt}" class="preview-image">
                <div class="image-preview-caption">${alt || '图片预览'}</div>
                <button class="close-preview-btn" onclick="closeImagePreview()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handlePreviewKeydown);
}

// 关闭图片预览
function closeImagePreview() {
    const modal = document.querySelector('.image-preview-modal');
    if (modal) {
        modal.remove();
        document.removeEventListener('keydown', handlePreviewKeydown);
    }
}

// 处理预览键盘事件
function handlePreviewKeydown(e) {
    if (e.key === 'Escape') {
        closeImagePreview();
    }
}

// 创建全局实例
let richTextRenderer;

// 初始化函数
function initRichTextRenderer() {
    richTextRenderer = new RichTextRenderer();
    console.log('富文本渲染器已创建');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保外部库已加载
    setTimeout(initRichTextRenderer, 1000);
});

// 导出供全局使用
window.RichTextRenderer = RichTextRenderer;
window.richTextRenderer = richTextRenderer;
window.copyCodeToClipboard = copyCodeToClipboard;
window.previewImage = previewImage;
window.closeImagePreview = closeImagePreview;
