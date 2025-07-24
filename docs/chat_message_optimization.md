# 💬 聊天输入框消息发送逻辑优化

## 功能概述

优化聊天输入框的消息发送逻辑，使消息发送更加直观和可控，支持三种发送模式。

## 核心改动

### 1. 消息发送逻辑
- **默认发送目标**: 没有@时发送给 `namespace_system`（如 `q_cli_system`）
- **广播功能**: 使用 `@all` 实现广播，移除默认广播行为
- **@ 功能**: `@instance_id` 发送给指定实例，`@all` 广播给当前namespace

### 2. 消息解析规则

#### 广播消息 (@all)
```
输入: @all 大家好
解析: { target: 'all', content: '大家好', type: 'broadcast' }
API: POST /api/broadcast { message: '大家好', namespace: 'q_cli' }
```

#### 指定实例 (@instance_id)
```
输入: @cliextra_123 你好
解析: { target: 'cliextra_123', content: '你好', type: 'specific' }
API: POST /api/send-message { target_instance: 'cliextra_123', message: '你好' }
```

#### 默认发送 (无@)
```
输入: Hello world
解析: { target: 'q_cli_system', content: 'Hello world', type: 'system' }
API: POST /api/send-message { target_instance: 'q_cli_system', message: 'Hello world' }
```

## 技术实现

### 前端解析函数
```javascript
function parseMessageTarget(message) {
    // @all 广播
    if (message.startsWith('@all')) {
        const content = message.substring(4).trim();
        return {
            target: 'all',
            content: content || message,
            type: 'broadcast'
        };
    }
    
    // @instance_id 指定实例
    const atMatch = message.match(/^@([^\s]+)\s*(.*)/);
    if (atMatch) {
        return {
            target: atMatch[1],
            content: atMatch[2].trim() || message,
            type: 'specific'
        };
    }
    
    // 默认发送给system实例
    const currentNamespace = getCurrentNamespace() || 'q_cli';
    return {
        target: `${currentNamespace}_system`,
        content: message,
        type: 'system'
    };
}
```

### 后端API端点

#### 新增 /api/send-message
```python
@bp.route('/send-message', methods=['POST'])
def send_message_new():
    """支持指定实例和system实例的消息发送"""
    data = request.get_json()
    target_instance = data.get('target_instance')
    message = data.get('message')
    
    result = instance_manager.send_message(target_instance, message)
    return jsonify(result)
```

#### 现有 /api/broadcast (支持namespace)
```python
@bp.route('/broadcast', methods=['POST'])
def broadcast_message():
    """广播消息到指定namespace"""
    data = request.get_json()
    message = data.get('message')
    namespace = data.get('namespace')
    
    result = instance_manager.broadcast_message(message, namespace, False)
    return jsonify(result)
```

## 用户界面优化

### 输入框提示
动态显示当前发送目标：
```
输入消息 (默认发送给 q_cli_system，@all 广播，@实例名 指定发送)
```

### 发送反馈
- 指定实例：`消息已发送给 cliextra_123`
- 广播：`消息已广播到 q_cli namespace`
- System实例：`消息已发送给 q_cli_system`

## 使用示例

### 1. 日常交流 (发送给system)
```
输入: 今天天气不错
发送给: q_cli_system
```

### 2. 广播通知
```
输入: @all 系统将在10分钟后重启
广播给: 当前namespace所有实例
```

### 3. 指定协作
```
输入: @frontend_dev 请检查登录页面
发送给: frontend_dev 实例
```

## 测试验证

### 测试页面
```bash
# 打开测试页面
open test/chat_message_logic_test.html
```

### 测试用例
1. ✅ 默认发送给system实例
2. ✅ @all 广播功能
3. ✅ @instance_id 指定发送
4. ✅ 输入框提示更新
5. ✅ Namespace切换适配

## 兼容性

### 向后兼容
- 保留原有的广播API，支持broadcast_all参数
- 保留原有的发送API，新增send-message端点
- 前端逐步迁移，不影响现有功能

### 命令行对应
- `qq send target content` → 指定实例发送
- `qq broadcast content --namespace current` → namespace广播
- `qq send namespace_system content` → system实例发送

## 更新日志

### v1.0.0 (2024-07-24)
- ✅ 实现三种消息发送模式
- ✅ 新增消息解析逻辑
- ✅ 添加 /api/send-message 端点
- ✅ 优化输入框提示功能
- ✅ 创建测试页面和文档
