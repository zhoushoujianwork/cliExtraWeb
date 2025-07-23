/**
 * 终端实例选择记忆功能
 * 记住用户上次选择的实例，刷新后自动恢复
 */

class TerminalMemory {
    constructor() {
        this.storageKey = 'cliExtra_lastSelectedInstance';
        this.namespaceKey = 'cliExtra_lastSelectedNamespace';
    }
    
    /**
     * 保存最后选择的实例
     * @param {string} instanceId - 实例ID
     * @param {string} namespace - 命名空间
     */
    saveLastSelectedInstance(instanceId, namespace = 'default') {
        try {
            const data = {
                instanceId: instanceId,
                namespace: namespace,
                timestamp: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('💾 已保存最后选择的实例:', instanceId, 'namespace:', namespace);
        } catch (error) {
            console.warn('保存实例选择失败:', error);
        }
    }
    
    /**
     * 获取最后选择的实例
     * @returns {Object|null} 实例信息
     */
    getLastSelectedInstance() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                // 检查数据是否过期（7天）
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
                if (Date.now() - parsed.timestamp < maxAge) {
                    console.log('📖 恢复最后选择的实例:', parsed.instanceId, 'namespace:', parsed.namespace);
                    return parsed;
                } else {
                    console.log('🗑️ 实例选择记录已过期，清理');
                    this.clearLastSelectedInstance();
                }
            }
        } catch (error) {
            console.warn('读取实例选择失败:', error);
        }
        return null;
    }
    
    /**
     * 清除最后选择的实例
     */
    clearLastSelectedInstance() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ 已清除实例选择记录');
        } catch (error) {
            console.warn('清除实例选择失败:', error);
        }
    }
    
    /**
     * 保存最后选择的命名空间
     * @param {string} namespace - 命名空间
     */
    saveLastSelectedNamespace(namespace) {
        try {
            localStorage.setItem(this.namespaceKey, namespace);
            console.log('💾 已保存最后选择的命名空间:', namespace);
        } catch (error) {
            console.warn('保存命名空间选择失败:', error);
        }
    }
    
    /**
     * 获取最后选择的命名空间
     * @returns {string|null} 命名空间
     */
    getLastSelectedNamespace() {
        try {
            const namespace = localStorage.getItem(this.namespaceKey);
            if (namespace) {
                console.log('📖 恢复最后选择的命名空间:', namespace);
                return namespace;
            }
        } catch (error) {
            console.warn('读取命名空间选择失败:', error);
        }
        return null;
    }
    
    /**
     * 检查实例是否仍然存在
     * @param {string} instanceId - 实例ID
     * @param {Array} availableInstances - 可用实例列表
     * @returns {boolean} 实例是否存在
     */
    isInstanceAvailable(instanceId, availableInstances) {
        return availableInstances.some(instance => instance.id === instanceId);
    }
    
    /**
     * 自动恢复终端选择
     * @param {Array} availableInstances - 可用实例列表
     * @param {Function} selectCallback - 选择回调函数
     */
    autoRestoreTerminalSelection(availableInstances, selectCallback) {
        const lastSelected = this.getLastSelectedInstance();
        
        if (lastSelected && availableInstances.length > 0) {
            // 检查实例是否仍然存在
            if (this.isInstanceAvailable(lastSelected.instanceId, availableInstances)) {
                console.log('🔄 自动恢复终端选择:', lastSelected.instanceId);
                
                // 延迟执行，确保页面完全加载
                setTimeout(() => {
                    if (typeof selectCallback === 'function') {
                        selectCallback(lastSelected.instanceId);
                    }
                }, 500);
                
                return true;
            } else {
                console.log('⚠️ 上次选择的实例不存在，清理记录');
                this.clearLastSelectedInstance();
            }
        }
        
        return false;
    }
}

// 创建全局实例
window.terminalMemory = new TerminalMemory();

// 导出类
window.TerminalMemory = TerminalMemory;

console.log('💾 终端记忆功能已加载完成');
