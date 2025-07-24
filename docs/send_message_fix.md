# Web发送消息功能修复

## 问题描述

Web界面发送消息功能不生效，但后台 `qq send` 命令可以正常工作。

## 根本原因

Web界面的发送消息实现**错误地使用了不支持的 `-system` 参数**。

### 问题分析

**后台命令（正常工作）**：
```bash
qq send <instance_id> "<message>"
```

**Web界面原代码（有问题）**：
```python
['cliExtra', 'send', instance_id, message]  # 缺少参数
```

**第一次修复尝试（仍有问题）**：
```python
['qq', 'send', instance_id, '-system', message]  # -system参数不支持
```

## 最终修复方案

### 正确的命令格式

**修复后（正确）**：
```python
result = subprocess.run(
    ['qq', 'send', instance_id, message],
    capture_output=True, text=True, timeout=10
)
```

### 关键发现

通过详细日志分析发现：
1. `qq send` 命令**不支持 `-system` 参数**
2. 正确格式：`qq send <instance_id> "<message>"`
3. 错误的 `-system` 参数导致 `command send-keys: unknown flag -s` 警告

## 修复文件

- `app/services/instance_manager.py` - `send_message()` 方法

## 验证测试

### 测试命令格式
```bash
# 正确 ✅
qq send cliextraweb_1753348805_23742 "测试消息"

# 错误 ❌
qq send cliextraweb_1753348805_23742 -system "测试消息"
```

### 运行测试脚本
```bash
python3 test/test_fixed_send_message.py
```

## 修复前后对比

### 修复前日志
```
📤 错误输出: command send-keys: unknown flag -s
```

### 修复后日志
```
📤 错误输出: 
✅ 消息发送成功到实例 cliextraweb_1753348805_23742
```

## 预期效果

修复后，Web界面发送的消息应该能够：
1. ✅ 正确发送到目标实例
2. ✅ 在目标实例中正常显示
3. ✅ 无警告或错误信息
4. ✅ 对话记录正常保存

## 技术要点

### qq send 命令规范
```bash
qq send <instance_id> <message>
```

**参数说明**：
- `instance_id`: 目标实例ID
- `message`: 要发送的消息内容
- **不支持**: `-system`, `--system` 等参数

### 详细日志输出

修复后增加了详细的日志输出：
```
🚀 准备发送消息到实例: <instance_id>
📝 消息内容: <message>
🔧 执行命令: qq send <instance_id> "<message>"
📋 命令数组: ['qq', 'send', '<instance_id>', '<message>']
📊 命令返回码: 0
📤 标准输出: ✓ 消息已发送...
📤 错误输出: 
✅ 消息发送成功到实例 <instance_id>
```

## 相关功能

此修复影响以下Web界面功能：
- 实例间消息发送
- 聊天界面消息传递  
- WebSocket消息通信

## 故障排除

### 如果消息仍然发送失败

1. **检查实例状态**：
   ```bash
   qq list
   ```

2. **手动测试命令**：
   ```bash
   qq send <instance_id> "测试消息"
   ```

3. **查看详细日志**：
   - Web服务日志中查看详细的发送过程
   - 确认命令格式和返回码

### 常见错误

- **实例不存在**: `错误: 实例 <instance_id> 未运行`
- **权限问题**: 检查 `qq` 命令是否可执行
- **超时问题**: 网络或系统负载导致的超时

---

**修复完成时间**: 2025-01-24  
**影响范围**: Web消息发送功能  
**测试状态**: ✅ 通过验证  
**关键修复**: 移除不支持的 `-system` 参数
