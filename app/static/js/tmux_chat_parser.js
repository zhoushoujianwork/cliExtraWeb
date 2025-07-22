/**
 * Tmux 终端日志聊天解析器
 * 专门用于解析 tmux 终端日志，提取对话内容，实现微信风格显示
 */

class TmuxChatParser {
    constructor() {
        this.conversations = [];
        this.debugMode = false;
    }
    
    /**
     * 解析 tmux 日志内容
     * @param {string} logContent - 原始日志内容
     * @returns {Array} 解析后的对话数组
     */
    parseLogContent(logContent) {
        if (!logContent || typeof logContent !== 'string') {
            console.warn('无效的日志内容');
            return [];
        }
        
        this.log('🔍 开始解析日志内容，长度:', logContent.length);
        
        // 预处理：过滤多余的 Thinking 行
        const preprocessedContent = this.preprocessLogContent(logContent);
        
        const lines = preprocessedContent.split('\n');
        const conversations = [];
        let currentMessage = {
            type: null,
            content: '',
            timestamp: null,
            rawLines: []
        };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const cleanLine = this.cleanAnsiCodes(line);
            
            if (!cleanLine.trim()) continue;
            
            // 检测消息类型
            const messageInfo = this.detectMessageType(cleanLine);
            
            if (messageInfo) {
                // 保存之前的消息
                if (currentMessage.type && currentMessage.content.trim()) {
                    conversations.push(this.createConversationItem(currentMessage));
                }
                
                // 开始新消息
                currentMessage = {
                    type: messageInfo.type,
                    content: messageInfo.content,
                    timestamp: messageInfo.timestamp || this.extractTimestamp(line),
                    rawLines: [line]
                };
                
                this.log(`📝 检测到${messageInfo.type}消息:`, messageInfo.content.substring(0, 50));
                
            } else if (currentMessage.type && this.isMessageContinuation(cleanLine)) {
                // 继续当前消息
                currentMessage.content += '\n' + cleanLine;
                currentMessage.rawLines.push(line);
            } else if (currentMessage.type) {
                // 消息结束，保存当前消息
                if (currentMessage.content.trim()) {
                    conversations.push(this.createConversationItem(currentMessage));
                }
                currentMessage = { type: null, content: '', timestamp: null, rawLines: [] };
            }
        }
        
        // 保存最后一条消息
        if (currentMessage.type && currentMessage.content.trim()) {
            conversations.push(this.createConversationItem(currentMessage));
        }
        
        const filtered = this.filterConversations(conversations);
        this.log('✅ 解析完成，共', filtered.length, '条有效对话');
        
        return filtered;
    }
    
    /**
     * 预处理日志内容，过滤多余的 Thinking 行
     * @param {string} logContent - 原始日志内容
     * @returns {string} 预处理后的内容
     */
    preprocessLogContent(logContent) {
        const lines = logContent.split('\n');
        const processedLines = [];
        let hasSeenThinking = false;
        
        for (const line of lines) {
            const cleanLine = this.cleanAnsiCodes(line).trim();
            
            // 检查是否是 Thinking 行
            if (this.isThinkingLine(cleanLine)) {
                if (!hasSeenThinking) {
                    // 保留第一个 Thinking 行
                    processedLines.push(line);
                    hasSeenThinking = true;
                    this.log('📝 保留第一个 Thinking 行');
                } else {
                    // 过滤掉后续的 Thinking 行
                    this.log('🗑️ 过滤多余的 Thinking 行:', cleanLine.substring(0, 50));
                    continue;
                }
            } else {
                processedLines.push(line);
            }
        }
        
        this.log('🔧 预处理完成，从', lines.length, '行减少到', processedLines.length, '行');
        return processedLines.join('\n');
    }
    
    /**
     * 判断是否是 Thinking 行
     * @param {string} line - 清理后的行内容
     * @returns {boolean}
     */
    isThinkingLine(line) {
        const thinkingPatterns = [
            /^Thinking\.{3,}$/i,                // Thinking...
            /^Thinking\.{1,}$/i,                // Thinking.
            /^正在思考\.{3,}$/,                 // 正在思考...
            /^思考中\.{3,}$/,                   // 思考中...
            /^Processing\.{3,}$/i,              // Processing...
            /^Analyzing\.{3,}$/i,               // Analyzing...
        ];
        
        return thinkingPatterns.some(pattern => pattern.test(line));
    }
    
    /**
     * 检测消息类型
     * @param {string} line - 清理后的行内容
     * @returns {Object|null} 消息信息
     */
    detectMessageType(line) {
        // 用户输入模式：!> 开头
        const userPatterns = [
            /^!>\s*(.*)$/,                      // !> 用户输入
            /^User:\s*(.+)$/i,                  // User: 格式
            /^你:\s*(.+)$/,                     // 中文用户标识
            /^Question:\s*(.+)$/i,              // Question: 格式
        ];
        
        // AI 输出模式：> 开头（但不是用户输入）
        const aiPatterns = [
            /^>\s*(.*)$/,                       // > AI输出
            /^>\[0m\s*(.*)$/,                   // >[0m AI响应
            /^Assistant:\s*(.+)$/i,             // Assistant: 格式
            /^AI:\s*(.+)$/i,                    // AI: 格式
            /^回答:\s*(.+)$/,                   // 中文回答标识
        ];
        
        // 系统消息模式
        const systemPatterns = [
            /^System:\s*(.+)$/i,                // System: 格式
            /^系统:\s*(.+)$/,                   // 中文系统标识
            /^\[系统\]\s*(.+)$/,                // [系统] 格式
            /^\[INFO\]\s*(.+)$/i,               // [INFO] 格式
            /^\[ERROR\]\s*(.+)$/i,              // [ERROR] 格式
        ];
        
        // 检测用户输入
        for (const pattern of userPatterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    type: 'user',
                    content: match[1] ? match[1].trim() : '',
                    timestamp: this.extractTimestamp(line)
                };
            }
        }
        
        // 检测AI输出
        for (const pattern of aiPatterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    type: 'assistant',
                    content: match[1] ? match[1].trim() : '',
                    timestamp: this.extractTimestamp(line)
                };
            }
        }
        
        // 检测系统消息
        for (const pattern of systemPatterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    type: 'system',
                    content: match[1] ? match[1].trim() : '',
                    timestamp: this.extractTimestamp(line)
                };
            }
        }
        
        return null;
    }
    
    /**
     * 判断是否为消息继续行
     * @param {string} line - 清理后的行内容
     * @returns {boolean}
     */
    isMessageContinuation(line) {
        // 排除明显的分隔符和系统信息
        const excludePatterns = [
            /^=+$/,                             // 等号分隔符
            /^-+$/,                             // 减号分隔符
            /^\[.*\]$/,                         // 方括号包围的信息
            /^Thinking\.\.\./,                  // Thinking...
            /^Loading\.\.\./,                   // Loading...
            /^\d{4}-\d{2}-\d{2}/,              // 日期格式
            /^\d{2}:\d{2}:\d{2}/,              // 时间格式
            /^[!>]\s*/,                         // 新的发言者标识
            /^(User|Assistant|AI|System|你|回答|系统):\s*/i  // 角色标识
        ];
        
        for (const pattern of excludePatterns) {
            if (pattern.test(line)) {
                return false;
            }
        }
        
        return line.trim().length > 0;
    }
    
    /**
     * 创建对话项
     * @param {Object} messageData - 消息数据
     * @returns {Object} 对话项
     */
    createConversationItem(messageData) {
        const content = this.cleanMessageContent(messageData.content);
        
        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: messageData.type,
            content: content,
            timestamp: messageData.timestamp || this.getCurrentTime(),
            rawContent: messageData.rawLines.join('\n'),
            needsRichText: this.needsRichTextRendering(content)
        };
    }
    
    /**
     * 清理消息内容
     * @param {string} content - 原始内容
     * @returns {string} 清理后的内容
     */
    cleanMessageContent(content) {
        // 移除多余的空行
        content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');
        
        // 移除行首的提示符残留
        const lines = content.split('\n');
        const cleanedLines = lines.map(line => {
            // 移除行首的 > 或 !> 残留
            return line.replace(/^[>!]+\s*/, '');
        });
        
        return cleanedLines.join('\n').trim();
    }
    
    /**
     * 过滤对话
     * @param {Array} conversations - 原始对话数组
     * @returns {Array} 过滤后的对话数组
     */
    filterConversations(conversations) {
        const filtered = [];
        let hasSeenThinking = false;
        
        for (const conv of conversations) {
            // 过滤掉太短的消息
            if (conv.content.length < 2) continue;
            
            // 检查是否是 Thinking 消息
            if (this.isThinkingMessage(conv.content)) {
                if (!hasSeenThinking) {
                    // 保留第一个 Thinking 消息
                    filtered.push(conv);
                    hasSeenThinking = true;
                    this.log('📝 保留第一个 Thinking 消息');
                } else {
                    // 过滤掉后续的 Thinking 消息
                    this.log('🗑️ 过滤多余的 Thinking 消息:', conv.content.substring(0, 30));
                    continue;
                }
            } else {
                // 过滤掉纯系统噪音
                const systemNoise = [
                    'Loading...',
                    'Please wait...',
                    '请稍等...',
                    'hi',
                    '...',
                    'OK',
                    'ok'
                ];
                
                if (systemNoise.some(noise => conv.content.trim() === noise)) {
                    continue;
                }
                
                filtered.push(conv);
            }
        }
        
        return filtered;
    }
    
    /**
     * 判断是否是 Thinking 消息
     * @param {string} content - 消息内容
     * @returns {boolean}
     */
    isThinkingMessage(content) {
        const thinkingPatterns = [
            /^Thinking\.{3,}$/i,                // Thinking...
            /^Thinking\.{1,}$/i,                // Thinking.
            /^正在思考\.{3,}$/,                 // 正在思考...
            /^思考中\.{3,}$/,                   // 思考中...
            /^Processing\.{3,}$/i,              // Processing...
            /^Analyzing\.{3,}$/i,               // Analyzing...
        ];
        
        const trimmedContent = content.trim();
        return thinkingPatterns.some(pattern => pattern.test(trimmedContent));
    }
    
    /**
     * 清理 ANSI 转义序列
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    cleanAnsiCodes(text) {
        return text
            .replace(/\x1b\[[0-9;]*m/g, '')     // ANSI颜色代码
            .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // 其他ANSI序列
            .replace(/\r/g, '')                  // 回车符
            .replace(/\u0007/g, '')              // 响铃符
            .trim();
    }
    
    /**
     * 提取时间戳
     * @param {string} line - 原始行内容
     * @returns {string} 时间戳
     */
    extractTimestamp(line) {
        const timePatterns = [
            /(\d{2}:\d{2}:\d{2})/,              // HH:MM:SS
            /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/, // YYYY-MM-DD HH:MM:SS
            /\[(\d{2}:\d{2}:\d{2})\]/           // [HH:MM:SS]
        ];
        
        for (const pattern of timePatterns) {
            const match = line.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return this.getCurrentTime();
    }
    
    /**
     * 获取当前时间
     * @returns {string} 当前时间字符串
     */
    getCurrentTime() {
        return new Date().toLocaleTimeString('zh-CN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    /**
     * 判断是否需要富文本渲染
     * @param {string} content - 内容
     * @returns {boolean}
     */
    needsRichTextRendering(content) {
        const richTextIndicators = [
            '```',              // 代码块
            '![',               // 图片
            '**',               // 粗体
            '*',                // 斜体
            '#',                // 标题
            '- ',               // 列表
            '1. ',              // 编号列表
            '✅', '❌', '⚠️',   // 状态图标
            'http://',          // 链接
            'https://',         // 链接
            '$',                // 命令提示符
            'function',         // 代码关键字
            'def ',             // Python函数
            'class ',           // 类定义
        ];
        
        return richTextIndicators.some(indicator => content.includes(indicator));
    }
    
    /**
     * 调试日志
     * @param {...any} args - 日志参数
     */
    log(...args) {
        if (this.debugMode) {
            console.log('[TmuxChatParser]', ...args);
        }
    }
    
    /**
     * 启用调试模式
     */
    enableDebug() {
        this.debugMode = true;
        console.log('🐛 TmuxChatParser 调试模式已启用');
    }
    
    /**
     * 禁用调试模式
     */
    disableDebug() {
        this.debugMode = false;
    }
}

// 创建全局实例
window.tmuxChatParser = new TmuxChatParser();

// 导出类和实例
window.TmuxChatParser = TmuxChatParser;

console.log('📄 TmuxChatParser 已加载完成');
