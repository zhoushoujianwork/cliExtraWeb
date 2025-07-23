/**
 * 简化的实例操作功能
 */

// 创建新实例
function createInstance() {
    const name = prompt('请输入实例名称（可选）:');
    const role = prompt('请输入角色（可选，如: frontend, backend, test）:');
    
    const data = {
        name: name || '',
        role: role || '',
        namespace: 'default'
    };
    
    fetch('/api/instances', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('实例创建成功: ' + result.instance_id);
            loadInstances();
        } else {
            alert('创建失败: ' + result.error);
        }
    })
    .catch(error => {
        alert('创建失败: ' + error);
    });
}

// 停止实例
function stopInstance(instanceId) {
    if (confirm('确定要停止实例 ' + instanceId + ' 吗？')) {
        fetch('/api/instances/' + instanceId + '/stop', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                loadInstances();
                if (currentMonitoringInstance === instanceId) {
                    stopMonitoring();
                }
            } else {
                alert('停止失败: ' + result.error);
            }
        });
    }
}

// 清理所有实例
function cleanAllInstances() {
    if (confirm('确定要清理所有实例吗？')) {
        fetch('/api/instances/clean-all', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(result => {
            alert(result.message);
            loadInstances();
            stopMonitoring();
        });
    }
}
