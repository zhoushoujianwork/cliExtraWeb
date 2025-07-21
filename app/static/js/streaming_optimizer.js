/**
 * 流式消息显示优化器
 * 支持bash格式、thinking状态优化、ANSI颜色等
 */

class StreamingOptimizer {
    constructor() {
        this.streamingMessages = {};
        this.thinkingMessages = {};
        this.ansiColors = {
            // 标准ANSI颜色映射
            '30': 'color: #000000',  // 黑色
            '31': 'color: #ff0000',  // 红色
            '32': 'color: #00ff00',  // 绿色
            '33': 'color: #ffff00',  // 黄色
            '34': 'color: #0000ff',  // 蓝色
            '35': 'color: #ff00ff',  // 紫色
            '36': 'color: #00ffff',  // 青色
            '37': 'color: #ffffff',  // 白色
            '90': 'color: #808080',  // 亮黑色（灰色）
            '91': 'color: #ff6b6b',  // 亮红色
            '92': 'color: #51cf66',  // 亮绿色
            '93': 'color: #ffd43b',  // 亮黄色
            '94': 'color: #74c0fc',  // 亮蓝色
            '95': 'color: #d0bfff',  // 亮紫色
            '96': 'color: #3bc9db',  // 亮青色
            '97': 'color: #f8f9fa',  // 亮白色
            // 背景色
            '40': 'background-color: #000000',
            '41': 'background-color: #ff0000',
            '42': 'background-color: #00ff00',
            '43': 'background-color: #ffff00',
            '44': 'background-color: #0000ff',
            '45': 'background-color: #ff00ff',
            '46': 'background-color: #00ffff',
            '47': 'background-color: #ffffff',
            // 样式
            '1': 'font-weight: bold',
            '2': 'opacity: 0.7',
            '3': 'font-style: italic',
            '4': 'text-decoration: underline'
        };
    }

    /**
     * 处理ANSI转义序列，转换为HTML样式
     */
    processAnsiColors(text) {
        if (!text) return '';
        
        // 处理ANSI转义序列
        return text.replace(/\x1b\[([0-9;]+)m/g, (match, codes) => {
            const codeList = codes.split(';');
            const styles = [];
            
            for (const code of codeList) {
                if (code === '0' || code === '') {
                    // 重置所有样式
                    return '</span><span>';
                } else if (this.ansiColors[code]) {
                    styles.push(this.ansiColors[code]);
                }
            }
            
            if (styles.length > 0) {
                return `</span><span style="${styles.join('; ')}">`;
            }
            return '';
        });
    }

    /**
     * 检测并优化thinking状态显示
     */
    optimizeThinkingDisplay(instanceId, content) {
        const thinkingPatterns = [
            /Thinking\.{3}/g,
            /正在思考\.{3}/g,
            /Processing\.{3}/g,
            /🤔.*思考中/g
        ];

        let hasThinking = false;
        for (const pattern of thinkingPatterns) {
            if (pattern.test(content)) {
                hasThinking = true;
                break;
            }
        }

        if (hasThinking) {
            // 如果是thinking状态，使用特殊的显示方式
            return this.createThinkingDisplay(instanceId, content);
        }

        return null;
    }

    /**
     * 创建thinking状态的特殊显示
     */
    createThinkingDisplay(instanceId, content) {
        let thinkingDiv = this.thinkingMessages[instanceId];
        
        if (!thinkingDiv) {
            const container = document.getElementById('chatHistory');
            thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'message mb-2 p-3 border rounded thinking-message';
            thinkingDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="thinking-spinner me-2">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    <div class="thinking-content">
                        <strong class="text-primary">实例${instanceId}</strong>
                        <span class="thinking-text ms-2">正在思考...</span>
                    </div>
                </div>
            `;
            
            container.appendChild(thinkingDiv);
            this.thinkingMessages[instanceId] = thinkingDiv;
            
            // 滚动到底部
            container.scrollTop = container.scrollHeight;
        }

        // 更新thinking文本（在同一行）
        const thinkingText = thinkingDiv.querySelector('.thinking-text');
        if (thinkingText) {
            // 提取thinking相关的文本
            const thinkingMatch = content.match(/(Thinking\.{3}|正在思考\.{3}|Processing\.{3}|🤔.*思考中)/);
            if (thinkingMatch) {
                thinkingText.textContent = thinkingMatch[1];
            }
        }

        return thinkingDiv;
    }

    /**
     * 移除thinking显示，转换为正常消息
     */
    finalizeThinkingDisplay(instanceId, finalContent) {
        const thinkingDiv = this.thinkingMessages[instanceId];
        if (thinkingDiv) {
            thinkingDiv.remove();
            delete this.thinkingMessages[instanceId];
        }
        
        // 创建最终的消息显示
        return this.createFinalMessage(instanceId, finalContent);
    }

    /**
     * 检测内容类型并应用相应的格式化
     */
    detectContentType(content) {
        // 检测bash命令
        if (content.includes('$') || content.includes('#!/bin/bash') || 
            content.match(/^[a-zA-Z_][a-zA-Z0-9_]*=/m)) {
            return 'bash';
        }
        
        // 检测代码块
        if (content.includes('```')) {
            return 'code';
        }
        
        // 检测JSON
        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
            return 'json';
        }
        
        return 'text';
    }

    /**
     * 格式化bash内容
     */
    formatBashContent(content) {
        // 处理ANSI颜色
        let formattedContent = this.processAnsiColors(content);
        
        // 包装在代码块中
        return `<pre class="bash-output"><code class="language-bash">${formattedContent}</code></pre>`;
    }

    /**
     * 创建最终消息显示
     */
    createFinalMessage(instanceId, content) {
        const container = document.getElementById('chatHistory');
        const timestamp = new Date().toLocaleString();
        
        // 检测内容类型
        const contentType = this.detectContentType(content);
        let formattedContent = content;
        
        if (contentType === 'bash') {
            formattedContent = this.formatBashContent(content);
        } else if (contentType === 'code' && typeof marked !== 'undefined') {
            formattedContent = marked.parse(content);
        } else {
            // 处理ANSI颜色并保持换行
            formattedContent = `<span>${this.processAnsiColors(content)}</span>`.replace(/\n/g, '<br>');
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message mb-3 p-3 border rounded ai-message';
        messageDiv.innerHTML = `
            <div class="message-header d-flex justify-content-between align-items-center mb-2">
                <strong class="text-success">
                    <i class="fas fa-robot me-1"></i>实例${instanceId}
                    <span class="badge bg-success ms-2">完成</span>
                </strong>
                <small class="text-muted">${timestamp}</small>
            </div>
            <div class="message-content">
                ${formattedContent}
            </div>
        `;
        
        container.appendChild(messageDiv);
        
        // 如果是代码内容，应用语法高亮
        if (contentType === 'bash' || contentType === 'code') {
            setTimeout(() => {
                messageDiv.querySelectorAll('pre code').forEach((block) => {
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }, 100);
        }
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
        
        return messageDiv;
    }

    /**
     * 处理流式消息更新
     */
    updateStreamingMessage(instanceId, accumulatedContent, timestamp) {
        // 首先检查是否是thinking状态
        const thinkingDisplay = this.optimizeThinkingDisplay(instanceId, accumulatedContent);
        if (thinkingDisplay) {
            return; // thinking状态特殊处理，不创建常规流式消息
        }

        // 如果之前有thinking显示，先移除
        if (this.thinkingMessages[instanceId]) {
            this.finalizeThinkingDisplay(instanceId, '');
        }

        // 常规流式消息处理
        let messageDiv = this.streamingMessages[instanceId];
        
        if (!messageDiv) {
            const container = document.getElementById('chatHistory');
            messageDiv = document.createElement('div');
            messageDiv.className = 'message mb-3 p-3 border rounded streaming-message ai-message';
            
            const contentType = this.detectContentType(accumulatedContent);
            const isCodeContent = contentType === 'bash' || contentType === 'code';
            
            messageDiv.innerHTML = `
                <div class="message-header d-flex justify-content-between align-items-center mb-2">
                    <strong class="text-info">
                        <i class="fas fa-robot me-1"></i>实例${instanceId}
                        <span class="streaming-indicator">
                            <i class="fas fa-circle-notch fa-spin text-primary"></i> 正在生成...
                        </span>
                    </strong>
                    <small class="text-muted">${timestamp}</small>
                </div>
                <div class="message-content">
                    ${isCodeContent ? 
                        '<pre class="streaming-content bash-output"><code class="language-bash"></code></pre>' :
                        '<div class="streaming-content"></div>'
                    }
                    <div class="typing-cursor">|</div>
                </div>
            `;
            
            container.appendChild(messageDiv);
            this.streamingMessages[instanceId] = messageDiv;
            
            // 添加打字机光标动画
            const cursor = messageDiv.querySelector('.typing-cursor');
            if (cursor) {
                cursor.style.animation = 'blink 1s infinite';
            }
            
            container.scrollTop = container.scrollHeight;
        }
        
        // 更新内容
        this.updateContent(messageDiv, accumulatedContent);
        
        // 滚动到底部
        const container = document.getElementById('chatHistory');
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 更新消息内容
     */
    updateContent(messageDiv, content) {
        const contentDiv = messageDiv.querySelector('.streaming-content');
        const codeElement = messageDiv.querySelector('.streaming-content code');
        
        if (codeElement) {
            // 代码内容更新
            const processedContent = this.processAnsiColors(content);
            codeElement.innerHTML = processedContent;
            
            // 应用语法高亮
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(codeElement);
            }
        } else if (contentDiv) {
            // 普通内容更新
            const processedContent = `<span>${this.processAnsiColors(content)}</span>`.replace(/\n/g, '<br>');
            contentDiv.innerHTML = processedContent;
        }
    }

    /**
     * 完成流式消息
     */
    finalizeStreamingMessage(instanceId, cleanedContent, timestamp) {
        // 移除thinking显示（如果有）
        if (this.thinkingMessages[instanceId]) {
            this.finalizeThinkingDisplay(instanceId, '');
        }

        const messageDiv = this.streamingMessages[instanceId];
        
        if (messageDiv) {
            // 移除流式指示器和光标
            const indicator = messageDiv.querySelector('.streaming-indicator');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-check text-success"></i> 完成';
            }
            
            const cursor = messageDiv.querySelector('.typing-cursor');
            if (cursor) {
                cursor.remove();
            }
            
            // 更新最终内容
            this.updateContent(messageDiv, cleanedContent);
            
            // 清理引用
            delete this.streamingMessages[instanceId];
        } else {
            // 如果没有流式消息，直接创建最终消息
            this.createFinalMessage(instanceId, cleanedContent);
        }
    }
}

// 创建全局实例
window.streamingOptimizer = new StreamingOptimizer();

// 添加必要的CSS样式
const style = document.createElement('style');
style.textContent = `
    .thinking-message {
        background-color: #f8f9fa;
        border-left: 4px solid #007bff;
    }
    
    .bash-output {
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 15px;
        border-radius: 5px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.4;
        overflow-x: auto;
    }
    
    .bash-output code {
        background: none;
        color: inherit;
        padding: 0;
    }
    
    .typing-cursor {
        display: inline-block;
        animation: blink 1s infinite;
        color: #007bff;
        font-weight: bold;
    }
    
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
    
    .streaming-message {
        border-left: 4px solid #17a2b8;
    }
    
    .ai-message {
        background-color: #f8f9fa;
        border-left: 4px solid #28a745;
    }
`;
document.head.appendChild(style);
