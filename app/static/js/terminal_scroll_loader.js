/**
 * 终端滚动加载功能
 * 支持用户滚动查看完整的历史记录
 */

class TerminalScrollLoader {
    constructor(terminalContainer, instanceId) {
        this.container = terminalContainer;
        this.instanceId = instanceId;
        this.currentPage = 1;
        this.pageSize = 100;
        this.totalLines = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.hasPrevious = false;
        this.allLines = []; // 存储所有已加载的行
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            // 获取历史记录信息
            const historyInfo = await this.getHistoryInfo();
            if (historyInfo.success) {
                this.totalLines = historyInfo.total_lines;
                this.pageSize = historyInfo.recommended_page_size || 100;
                console.log(`📊 终端历史记录: ${this.totalLines} 行, 推荐页大小: ${this.pageSize}`);
            }
            
            // 加载最新的内容
            await this.loadLatestContent();
            
            // 设置滚动监听
            this.setupScrollListener();
            
            this.isInitialized = true;
            console.log('✅ 终端滚动加载器初始化完成');
            
        } catch (error) {
            console.error('❌ 终端滚动加载器初始化失败:', error);
        }
    }
    
    async getHistoryInfo() {
        try {
            const response = await fetch(`/api/terminal/history/${this.instanceId}`);
            return await response.json();
        } catch (error) {
            console.error('获取历史信息失败:', error);
            return { success: false };
        }
    }
    
    async loadLatestContent() {
        try {
            this.isLoading = true;
            this.showLoadingIndicator('正在加载最新内容...');
            
            // 从最后开始加载
            const response = await fetch(
                `/api/terminal/output/${this.instanceId}?page=1&page_size=${this.pageSize}&direction=backward&from_line=${this.totalLines}`
            );
            const data = await response.json();
            
            if (data.success) {
                this.allLines = data.lines;
                this.hasMore = data.has_more;
                this.hasPrevious = data.has_previous;
                this.renderLines();
                
                // 滚动到底部
                this.scrollToBottom();
            }
            
        } catch (error) {
            console.error('加载最新内容失败:', error);
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }
    
    async loadMoreHistory() {
        if (this.isLoading || !this.hasPrevious) return;
        
        try {
            this.isLoading = true;
            this.showLoadingIndicator('正在加载历史记录...');
            
            // 获取当前最早的行号
            const earliestLine = this.allLines.length > 0 ? this.allLines[0].line_number - 1 : this.totalLines;
            
            const response = await fetch(
                `/api/terminal/output/${this.instanceId}?page=1&page_size=${this.pageSize}&direction=backward&from_line=${earliestLine}`
            );
            const data = await response.json();
            
            if (data.success && data.lines.length > 0) {
                // 保存当前滚动位置
                const scrollHeight = this.container.scrollHeight;
                const scrollTop = this.container.scrollTop;
                
                // 将新行添加到开头
                this.allLines = [...data.lines, ...this.allLines];
                this.hasPrevious = data.has_previous;
                
                // 重新渲染
                this.renderLines();
                
                // 恢复滚动位置（补偿新增内容的高度）
                const newScrollHeight = this.container.scrollHeight;
                const heightDiff = newScrollHeight - scrollHeight;
                this.container.scrollTop = scrollTop + heightDiff;
                
                console.log(`📜 加载了 ${data.lines.length} 行历史记录`);
            }
            
        } catch (error) {
            console.error('加载历史记录失败:', error);
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }
    
    setupScrollListener() {
        let scrollTimeout;
        
        this.container.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                // 检查是否滚动到顶部
                if (this.container.scrollTop <= 100 && this.hasPrevious && !this.isLoading) {
                    this.loadMoreHistory();
                }
            }, 150);
        });
    }
    
    renderLines() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 添加历史记录指示器
        if (this.hasPrevious) {
            const loadMoreBtn = this.createLoadMoreButton();
            this.container.appendChild(loadMoreBtn);
        }
        
        // 渲染所有行
        this.allLines.forEach(line => {
            const lineElement = this.createLineElement(line);
            this.container.appendChild(lineElement);
        });
        
        // 添加底部状态
        const statusElement = this.createStatusElement();
        this.container.appendChild(statusElement);
    }
    
    createLineElement(line) {
        const div = document.createElement('div');
        div.className = 'terminal-line';
        div.innerHTML = `
            <span class="line-number">${line.line_number}</span>
            <span class="line-content">${this.escapeHtml(line.content)}</span>
        `;
        return div;
    }
    
    createLoadMoreButton() {
        const div = document.createElement('div');
        div.className = 'load-more-history';
        div.innerHTML = `
            <button class="btn btn-sm btn-outline-secondary" onclick="terminalScrollLoader.loadMoreHistory()">
                📜 加载更多历史记录
            </button>
        `;
        return div;
    }
    
    createStatusElement() {
        const div = document.createElement('div');
        div.className = 'terminal-status';
        div.innerHTML = `
            <small class="text-muted">
                显示 ${this.allLines.length} / ${this.totalLines} 行
                ${this.hasPrevious ? '• 向上滚动加载更多' : '• 已显示全部历史'}
            </small>
        `;
        return div;
    }
    
    showLoadingIndicator(message = '加载中...') {
        let indicator = document.getElementById('terminal-loading');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'terminal-loading';
            indicator.className = 'terminal-loading';
            this.container.parentNode.insertBefore(indicator, this.container);
        }
        
        indicator.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>${message}</span>
            </div>
        `;
        indicator.style.display = 'block';
    }
    
    hideLoadingIndicator() {
        const indicator = document.getElementById('terminal-loading');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }
    
    scrollToTop() {
        this.container.scrollTop = 0;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 搜索功能
    async searchContent(query) {
        if (!query.trim()) return;
        
        try {
            this.showLoadingIndicator('搜索中...');
            
            const response = await fetch(
                `/api/terminal/search/${this.instanceId}?q=${encodeURIComponent(query)}&max_results=50`
            );
            const data = await response.json();
            
            if (data.success) {
                this.showSearchResults(data);
            } else {
                console.error('搜索失败:', data.error);
            }
            
        } catch (error) {
            console.error('搜索请求失败:', error);
        } finally {
            this.hideLoadingIndicator();
        }
    }
    
    showSearchResults(data) {
        // 创建搜索结果面板
        let resultsPanel = document.getElementById('search-results-panel');
        if (!resultsPanel) {
            resultsPanel = document.createElement('div');
            resultsPanel.id = 'search-results-panel';
            resultsPanel.className = 'search-results-panel';
            this.container.parentNode.insertBefore(resultsPanel, this.container);
        }
        
        resultsPanel.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between">
                    <span>搜索结果: "${data.query}" (${data.total_matches} 个匹配)</span>
                    <button class="btn-close" onclick="this.parentNode.parentNode.parentNode.style.display='none'"></button>
                </div>
                <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                    ${data.results.map(result => `
                        <div class="search-result-item" onclick="terminalScrollLoader.jumpToLine(${result.line_number})">
                            <small class="text-muted">行 ${result.line_number}:</small>
                            <div class="result-content">${this.highlightMatches(result.content, data.query)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        resultsPanel.style.display = 'block';
    }
    
    highlightMatches(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }
    
    jumpToLine(lineNumber) {
        // 查找对应的行元素并滚动到该位置
        const lineElements = this.container.querySelectorAll('.terminal-line');
        for (let element of lineElements) {
            const lineNum = parseInt(element.querySelector('.line-number').textContent);
            if (lineNum === lineNumber) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-line');
                setTimeout(() => element.classList.remove('highlight-line'), 3000);
                break;
            }
        }
    }
}

// 全局实例
let terminalScrollLoader = null;

// 初始化函数
function initTerminalScrollLoader(containerId, instanceId) {
    const container = document.getElementById(containerId);
    if (container && instanceId) {
        terminalScrollLoader = new TerminalScrollLoader(container, instanceId);
        return terminalScrollLoader;
    }
    return null;
}
