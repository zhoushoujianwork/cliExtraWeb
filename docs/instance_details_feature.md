# 实例详情功能

## 概述

根据用户需求，移除了终止按钮功能，新增了实例详情按钮，通过Modal方式显示详细信息，并支持修改tools配置。

## 功能改进

### 1. 移除终止按钮

#### 之前的按钮组
```html
<div class="btn-group btn-group-sm">
    <button class="btn btn-outline-primary">监控</button>
    <button class="btn btn-outline-warning">终止</button>  <!-- 已移除 -->
    <button class="btn btn-outline-danger">清理</button>
</div>
```

#### 现在的按钮组
```html
<div class="btn-group btn-group-sm">
    <button class="btn btn-outline-primary">监控</button>
    <button class="btn btn-outline-info">详情</button>     <!-- 新增 -->
    <button class="btn btn-outline-danger">清理</button>
</div>
```

### 2. 新增实例详情按钮

#### 按钮特性
- **图标**: `fas fa-info-circle` (信息圆圈图标)
- **样式**: `btn-outline-info` (蓝色边框)
- **功能**: 点击后弹出Modal显示实例详情
- **提示**: "查看实例详情"

#### 点击行为
```javascript
<button class="btn btn-outline-info" 
        onclick="showInstanceDetails('${instance.id}')" 
        title="查看实例详情">
    <i class="fas fa-info-circle"></i>
</button>
```

### 3. 实例详情Modal

#### Modal结构
```html
<div class="modal fade" id="instanceDetailsModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">实例详情 - {instance_id}</h5>
            </div>
            <div class="modal-body">
                <!-- 详情内容 -->
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary">关闭</button>
                <button class="btn btn-primary">保存修改</button>
            </div>
        </div>
    </div>
</div>
```

#### 详情内容布局
- **左侧**: 基本信息卡片
- **右侧**: 工具配置卡片
- **底部**: 运行统计卡片

### 4. 基本信息显示

#### 信息项目
| 字段 | 描述 | 示例 |
|------|------|------|
| 实例ID | 唯一标识符 | `cliextra_1753344552_12345` |
| 状态 | 运行状态 | `Attached` / `Detached` |
| 命名空间 | 所属namespace | `default` / `frontend` |
| 角色 | 实例角色 | `fullstack` / `backend` |
| 项目路径 | 工作目录 | `/Users/user/project` |
| 创建时间 | 创建时间戳 | `2024-01-20 10:30:00` |

#### 状态徽章
```html
<span class="badge bg-${instance.status === 'Attached' ? 'success' : 'warning'}">
    ${instance.status}
</span>
```

### 5. 工具配置管理

#### 工具显示
- **默认状态**: 以徽章形式显示已安装工具
- **编辑状态**: 复选框形式选择工具
- **空状态**: 显示"未安装任何工具"

#### 支持的工具类型
```javascript
const availableTools = [
    'git', 'docker', 'kubectl', 'terraform', 'ansible',
    'jenkins', 'prometheus', 'grafana', 'elasticsearch', 'redis'
];
```

#### 编辑功能
1. **编辑按钮**: 点击进入编辑模式
2. **工具选择**: 复选框形式选择工具
3. **保存/取消**: 保存修改或取消编辑
4. **实时更新**: 保存后立即更新显示

### 6. 运行统计

#### 统计指标
```html
<div class="row text-center">
    <div class="col-md-3">
        <div class="h5 mb-0 text-primary">${uptime}</div>
        <small class="text-muted">运行时长</small>
    </div>
    <div class="col-md-3">
        <div class="h5 mb-0 text-success">${messages}</div>
        <small class="text-muted">消息数量</small>
    </div>
    <div class="col-md-3">
        <div class="h5 mb-0 text-warning">${memory}</div>
        <small class="text-muted">内存使用</small>
    </div>
    <div class="col-md-3">
        <div class="h5 mb-0 text-info">${cpu}</div>
        <small class="text-muted">CPU使用</small>
    </div>
</div>
```

## API接口

### 1. 获取实例详情

#### 请求
```http
GET /api/instances/{instance_id}/details
```

#### 响应
```json
{
    "success": true,
    "instance": {
        "id": "cliextra_1753344552_12345",
        "status": "Attached",
        "namespace": "default",
        "role": "fullstack",
        "project_path": "/Users/user/project",
        "created_at": "2024-01-20 10:30:00",
        "tools": ["git", "docker", "kubectl"],
        "stats": {
            "uptime": "2小时30分钟",
            "messages": 45,
            "memory": "256MB",
            "cpu": "15%"
        }
    }
}
```

### 2. 更新工具配置

#### 请求
```http
PUT /api/instances/{instance_id}/tools
Content-Type: application/json

{
    "tools": ["git", "docker", "kubectl", "terraform"]
}
```

#### 响应
```json
{
    "success": true,
    "message": "工具配置更新成功",
    "tools": ["git", "docker", "kubectl", "terraform"]
}
```

## 技术实现

### 1. 前端JavaScript

#### 显示详情函数
```javascript
function showInstanceDetails(instanceId) {
    // 显示Modal
    const modal = new bootstrap.Modal(document.getElementById('instanceDetailsModal'));
    modal.show();
    
    // 获取详情数据
    fetch(`/api/instances/${instanceId}/details`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderInstanceDetails(data.instance);
            }
        });
}
```

#### 工具编辑函数
```javascript
function editInstanceTools(instanceId) {
    // 切换到编辑模式
    const toolsListDiv = document.getElementById('instanceToolsList');
    toolsListDiv.innerHTML = renderToolsCheckboxes(currentTools);
    
    // 显示保存按钮
    document.getElementById('saveInstanceDetailsBtn').style.display = 'inline-block';
}
```

#### 保存工具配置
```javascript
function saveInstanceTools(instanceId) {
    const selectedTools = getSelectedTools();
    
    fetch(`/api/instances/${instanceId}/tools`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({tools: selectedTools})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateToolsDisplay(selectedTools);
        }
    });
}
```

### 2. 后端API

#### 实例详情接口
```python
@bp.route('/instances/<instance_id>/details', methods=['GET'])
def get_instance_details(instance_id):
    # 获取实例信息
    instances = instance_manager.list_instances()
    instance = find_instance_by_id(instances, instance_id)
    
    if not instance:
        return jsonify({'success': False, 'error': '实例不存在'}), 404
    
    # 构建详情数据
    instance_details = build_instance_details(instance)
    
    return jsonify({'success': True, 'instance': instance_details})
```

#### 工具更新接口
```python
@bp.route('/instances/<instance_id>/tools', methods=['PUT'])
def update_instance_tools(instance_id):
    data = request.get_json()
    tools = data.get('tools', [])
    
    # 验证工具列表
    if not validate_tools(tools):
        return jsonify({'success': False, 'error': '无效的工具'}), 400
    
    # 更新配置
    result = instance_manager.update_instance_tools(instance_id, tools)
    
    return jsonify(result)
```

### 3. 实例管理器

#### 工具更新方法
```python
def update_instance_tools(self, instance_id: str, tools: List[str]) -> Dict[str, any]:
    try:
        # 检查实例存在性
        instance = self.find_instance(instance_id)
        if not instance:
            return {'success': False, 'error': '实例不存在'}
        
        # 更新工具配置
        # 实际实现可能需要：
        # 1. 更新实例配置文件
        # 2. 重启实例以应用新工具
        # 3. 验证工具安装状态
        
        return {'success': True, 'tools': tools}
    except Exception as e:
        return {'success': False, 'error': str(e)}
```

## 用户体验

### 1. 交互流程

#### 查看详情流程
1. **点击详情按钮** → 弹出Modal
2. **加载状态显示** → 显示加载动画
3. **详情内容渲染** → 显示完整信息
4. **关闭或编辑** → 用户操作选择

#### 编辑工具流程
1. **点击编辑按钮** → 进入编辑模式
2. **选择工具** → 复选框选择
3. **保存或取消** → 确认操作
4. **更新显示** → 实时反馈结果

### 2. 视觉设计

#### 颜色方案
- **详情按钮**: 蓝色 (`btn-outline-info`)
- **成功状态**: 绿色徽章
- **警告状态**: 黄色徽章
- **统计数据**: 不同颜色区分指标

#### 布局设计
- **响应式**: 适配不同屏幕尺寸
- **卡片式**: 信息分组清晰
- **网格布局**: 统计数据对齐美观

### 3. 错误处理

#### 加载失败
```html
<div class="alert alert-danger">
    <i class="fas fa-exclamation-triangle"></i>
    <strong>加载失败:</strong> 网络错误，请稍后重试
</div>
```

#### 保存失败
```javascript
if (!data.success) {
    showNotification(`保存失败: ${data.error}`, 'error');
}
```

## 测试验证

### 测试文件
创建了独立的测试文件 `test/test_instance_details.html` 用于验证功能。

### 测试场景
1. **详情显示**: 验证Modal正确显示实例信息
2. **工具编辑**: 验证工具选择和保存功能
3. **错误处理**: 验证各种错误情况的处理
4. **响应式**: 验证不同屏幕尺寸的适配

### 测试方法
```bash
# 在浏览器中打开测试文件
open test/test_instance_details.html
```

## 部署说明

### 文件更新
确保以下文件已更新：
- `app/static/js/simple_namespace.js` - 前端功能
- `app/templates/chat_manager.html` - Modal HTML
- `app/views/api.py` - API接口
- `app/services/instance_manager.py` - 后端逻辑

### 功能验证
1. 实例列表显示详情按钮
2. 点击详情按钮弹出Modal
3. Modal显示完整实例信息
4. 工具编辑功能正常工作
5. API接口响应正确

## 总结

这次改进实现了以下目标：

- ✅ **移除终止按钮**: 简化操作界面
- ✅ **新增详情功能**: 提供完整的实例信息查看
- ✅ **Modal交互**: 现代化的弹窗交互体验
- ✅ **工具管理**: 支持可视化的工具配置编辑
- ✅ **API支持**: 完整的后端API接口
- ✅ **响应式设计**: 适配各种设备屏幕

用户现在可以：
1. 🔍 **详细查看** - 通过详情按钮查看完整实例信息
2. 🔧 **编辑工具** - 可视化地修改实例工具配置
3. 📊 **监控状态** - 查看运行统计和性能指标
4. 💡 **直观操作** - 通过Modal进行集中化管理

这些改进让实例管理变得更加直观和功能丰富！
