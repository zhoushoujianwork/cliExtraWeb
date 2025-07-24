/**
 * JavaScript调试和错误处理工具
 */

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('JavaScript错误:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // 显示用户友好的错误提示
    if (typeof showNotification === 'function') {
        showNotification('页面功能可能受到影响，请刷新页面', 'warning', 5000);
    }
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝:', event.reason);
    
    if (typeof showNotification === 'function') {
        showNotification('网络请求可能失败，请检查连接', 'error', 3000);
    }
});

// 函数存在性检查工具
function checkFunction(funcName, context = window) {
    const exists = typeof context[funcName] === 'function';
    console.log(`函数检查: ${funcName} - ${exists ? '✅ 存在' : '❌ 不存在'}`);
    return exists;
}

// 批量检查关键函数
function checkCriticalFunctions() {
    const criticalFunctions = [
        'initSocket',
        'initTerminal', 
        'initAutoResizeTextarea',
        'initToolbar',
        'initInputPlaceholder',
        'sendMessage',
        'updateToolbarButtonStates',
        'showNotification'
    ];
    
    console.group('🔍 关键函数检查');
    const results = {};
    
    criticalFunctions.forEach(funcName => {
        results[funcName] = checkFunction(funcName);
    });
    
    console.groupEnd();
    
    // 统计
    const total = criticalFunctions.length;
    const existing = Object.values(results).filter(Boolean).length;
    console.log(`📊 函数检查结果: ${existing}/${total} 个函数可用`);
    
    return results;
}

// 安全函数调用包装器
function safeCall(funcName, ...args) {
    if (typeof window[funcName] === 'function') {
        try {
            return window[funcName](...args);
        } catch (error) {
            console.error(`调用 ${funcName} 时出错:`, error);
            return null;
        }
    } else {
        console.warn(`函数 ${funcName} 不存在`);
        return null;
    }
}

// 延迟安全调用（用于处理加载顺序问题）
function delayedSafeCall(funcName, delay = 1000, maxRetries = 3, ...args) {
    let retries = 0;
    
    const tryCall = () => {
        if (typeof window[funcName] === 'function') {
            try {
                window[funcName](...args);
                console.log(`✅ 延迟调用 ${funcName} 成功`);
            } catch (error) {
                console.error(`延迟调用 ${funcName} 时出错:`, error);
            }
        } else if (retries < maxRetries) {
            retries++;
            console.log(`⏳ 函数 ${funcName} 不存在，${delay}ms后重试 (${retries}/${maxRetries})`);
            setTimeout(tryCall, delay);
        } else {
            console.error(`❌ 函数 ${funcName} 在 ${maxRetries} 次重试后仍不存在`);
        }
    };
    
    tryCall();
}

// 页面加载完成后进行检查
document.addEventListener('DOMContentLoaded', function() {
    // 延迟检查，确保所有脚本都已加载
    setTimeout(() => {
        console.log('🚀 开始JavaScript调试检查');
        checkCriticalFunctions();
    }, 500);
});

// 导出工具函数到全局
window.debugHelper = {
    checkFunction,
    checkCriticalFunctions,
    safeCall,
    delayedSafeCall
};
