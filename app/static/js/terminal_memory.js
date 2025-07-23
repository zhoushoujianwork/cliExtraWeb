/**
 * 终端实例选择记忆功能
 * 记住用户上次选择的实例，刷新后自动恢复
 * 支持按namespace分别保存实例选择
 */

class TerminalMemory {
    constructor() {
        this.storageKey = 'cliExtra_namespaceInstances'; // 改为支持多namespace的存储键
        this.namespaceKey = 'cliExtra_lastSelectedNamespace';
    }
    
    /**
     * 保存最后选择的实例（按namespace分别保存）
     * @param {string} instanceId - 实例ID
     * @param {string} namespace - 命名空间
     */
    saveLastSelectedInstance(instanceId, namespace = 'default') {
        try {
            // 获取现有的namespace实例记录
            let namespaceInstances = this.getAllNamespaceInstances();
            
            console.log('🔍 [DEBUG] 保存实例选择前的所有记录:', JSON.stringify(namespaceInstances, null, 2));
            
            // 更新指定namespace的实例选择
            namespaceInstances[namespace] = {
                instanceId: instanceId,
                timestamp: Date.now()
            };
            
            // 保存回localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(namespaceInstances));
            console.log('💾 已保存实例选择:', instanceId, 'namespace:', namespace);
            console.log('🔍 [DEBUG] 保存后的所有记录:', JSON.stringify(namespaceInstances, null, 2));
        } catch (error) {
            console.warn('保存实例选择失败:', error);
        }
    }
    
    /**
     * 获取指定namespace的最后选择实例
     * @param {string} namespace - 命名空间
     * @returns {Object|null} 实例信息
     */
    getLastSelectedInstance(namespace = 'default') {
        try {
            const namespaceInstances = this.getAllNamespaceInstances();
            console.log('🔍 [DEBUG] 查询namespace:', namespace, '所有记录:', JSON.stringify(namespaceInstances, null, 2));
            
            const instanceData = namespaceInstances[namespace];
            console.log('🔍 [DEBUG] namespace', namespace, '的记录:', instanceData);
            
            if (instanceData) {
                // 检查数据是否过期（7天）
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
                const age = Date.now() - instanceData.timestamp;
                console.log('🔍 [DEBUG] 记录年龄:', age, 'ms, 最大年龄:', maxAge, 'ms');
                
                if (age < maxAge) {
                    console.log('📖 恢复namespace实例选择:', instanceData.instanceId, 'namespace:', namespace);
                    return {
                        instanceId: instanceData.instanceId,
                        namespace: namespace,
                        timestamp: instanceData.timestamp
                    };
                } else {
                    console.log('🗑️ namespace实例选择记录已过期，清理:', namespace);
                    this.clearLastSelectedInstance(namespace);
                }
            } else {
                console.log('🔍 [DEBUG] namespace', namespace, '没有保存的实例记录');
            }
        } catch (error) {
            console.warn('读取实例选择失败:', error);
        }
        return null;
    }
    
    /**
     * 获取所有namespace的实例记录
     * @returns {Object} namespace实例记录对象
     */
    getAllNamespaceInstances() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                console.log('🔍 [DEBUG] 从localStorage读取的原始数据:', data);
                console.log('🔍 [DEBUG] 解析后的数据:', parsed);
                return parsed;
            } else {
                console.log('🔍 [DEBUG] localStorage中没有namespace实例记录');
            }
        } catch (error) {
            console.warn('读取namespace实例记录失败:', error);
        }
        return {};
    }
    
    /**
     * 清除指定namespace的最后选择实例
     * @param {string} namespace - 要清除的命名空间，如果不指定则清除所有
     */
    clearLastSelectedInstance(namespace = null) {
        try {
            if (namespace === null) {
                // 清除所有记录
                localStorage.removeItem(this.storageKey);
                console.log('🗑️ 已清除所有实例选择记录');
            } else {
                // 清除指定namespace的记录
                let namespaceInstances = this.getAllNamespaceInstances();
                delete namespaceInstances[namespace];
                localStorage.setItem(this.storageKey, JSON.stringify(namespaceInstances));
                console.log('🗑️ 已清除namespace实例选择记录:', namespace);
            }
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
        const available = availableInstances.some(instance => instance.id === instanceId);
        console.log('🔍 [DEBUG] 检查实例', instanceId, '是否可用:', available);
        console.log('🔍 [DEBUG] 可用实例列表:', availableInstances.map(i => i.id));
        return available;
    }
    
    /**
     * 自动恢复终端选择（支持指定namespace）
     * @param {Array} availableInstances - 可用实例列表
     * @param {Function} selectCallback - 选择回调函数
     * @param {string} namespace - 命名空间
     */
    autoRestoreTerminalSelection(availableInstances, selectCallback, namespace = 'default') {
        console.log('🔄 [DEBUG] 开始自动恢复终端选择');
        console.log('🔍 [DEBUG] 参数 - namespace:', namespace);
        console.log('🔍 [DEBUG] 参数 - availableInstances数量:', availableInstances.length);
        console.log('🔍 [DEBUG] 参数 - availableInstances:', availableInstances.map(i => `${i.id}(${i.namespace})`));
        console.log('🔍 [DEBUG] 参数 - selectCallback类型:', typeof selectCallback);
        
        const lastSelected = this.getLastSelectedInstance(namespace);
        console.log('🔍 [DEBUG] 获取到的上次选择:', lastSelected);
        
        if (lastSelected && availableInstances.length > 0) {
            // 检查实例是否仍然存在
            if (this.isInstanceAvailable(lastSelected.instanceId, availableInstances)) {
                console.log('🔄 自动恢复namespace终端选择:', lastSelected.instanceId, 'namespace:', namespace);
                
                // 延迟执行，确保页面完全加载
                setTimeout(() => {
                    console.log('🔄 [DEBUG] 执行延迟回调，实例ID:', lastSelected.instanceId);
                    if (typeof selectCallback === 'function') {
                        selectCallback(lastSelected.instanceId);
                        console.log('✅ [DEBUG] 已调用selectCallback');
                    } else {
                        console.log('❌ [DEBUG] selectCallback不是函数:', typeof selectCallback);
                    }
                }, 500);
                
                return true;
            } else {
                console.log('⚠️ namespace上次选择的实例不存在，清理记录:', namespace);
                this.clearLastSelectedInstance(namespace);
            }
        } else {
            if (!lastSelected) {
                console.log('🔍 [DEBUG] 没有找到上次选择的实例记录');
            }
            if (availableInstances.length === 0) {
                console.log('🔍 [DEBUG] 没有可用的实例');
            }
        }
        
        console.log('❌ [DEBUG] 自动恢复失败');
        return false;
    }
    
    /**
     * 获取所有namespace的实例选择统计
     * @returns {Object} 统计信息
     */
    getNamespaceStats() {
        const namespaceInstances = this.getAllNamespaceInstances();
        const stats = {
            totalNamespaces: Object.keys(namespaceInstances).length,
            namespaces: {}
        };
        
        for (const [namespace, data] of Object.entries(namespaceInstances)) {
            stats.namespaces[namespace] = {
                instanceId: data.instanceId,
                lastSelected: new Date(data.timestamp).toLocaleString()
            };
        }
        
        return stats;
    }
}

// 创建全局实例
window.terminalMemory = new TerminalMemory();

// 导出类
window.TerminalMemory = TerminalMemory;

console.log('💾 终端记忆功能已加载完成 (支持多namespace)');
