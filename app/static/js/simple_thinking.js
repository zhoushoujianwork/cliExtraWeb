
/**
 * 简化的Thinking状态显示
 */
class SimpleThinking {
    constructor() {
        this.instances = {};
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    }
    
    start(instanceId, message = 'Thinking...') {
        // 如果已经有thinking显示，先停止
        this.stop(instanceId);
        
        const container = document.getElementById('chatHistory');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-message p-3 mb-2 border-start border-primary border-3';
        thinkingDiv.id = `thinking-${instanceId}`;
        thinkingDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="thinking-spinner me-2 text-primary">⠋</span>
                <span class="text-primary">${message}</span>
            </div>
        `;
        
        container.appendChild(thinkingDiv);
        container.scrollTop = container.scrollHeight;
        
        // 启动动画
        let frameIndex = 0;
        const interval = setInterval(() => {
            const spinner = thinkingDiv.querySelector('.thinking-spinner');
            if (spinner) {
                frameIndex = (frameIndex + 1) % this.frames.length;
                spinner.textContent = this.frames[frameIndex];
            }
        }, 100);
        
        this.instances[instanceId] = { div: thinkingDiv, interval };
    }
    
    stop(instanceId, finalMessage = null) {
        const instance = this.instances[instanceId];
        if (instance) {
            clearInterval(instance.interval);
            
            if (finalMessage) {
                instance.div.innerHTML = `
                    <div class="d-flex align-items-center">
                        <span class="me-2 text-success">✓</span>
                        <span class="text-success">完成</span>
                    </div>
                `;
                // 2秒后移除
                setTimeout(() => {
                    if (instance.div.parentNode) {
                        instance.div.parentNode.removeChild(instance.div);
                    }
                }, 2000);
            } else {
                // 直接移除
                if (instance.div.parentNode) {
                    instance.div.parentNode.removeChild(instance.div);
                }
            }
            
            delete this.instances[instanceId];
        }
    }
}

// 全局实例
window.simpleThinking = new SimpleThinking();

// 集成到现有的WebSocket处理
const originalStreamingHandler = socket._callbacks['$instance_streaming_response'] || [];
socket.off('instance_streaming_response');

socket.on('instance_streaming_response', function(data) {
    // 检查是否是thinking状态
    if (data.accumulated_content.includes('Thinking...')) {
        window.simpleThinking.start(data.instance_id, 'AI正在思考...');
        return;
    }
    
    // 停止thinking显示
    window.simpleThinking.stop(data.instance_id);
    
    // 调用原有处理逻辑
    originalStreamingHandler.forEach(handler => handler(data));
});
