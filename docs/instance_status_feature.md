# 🖥️ 实例状态管理功能 - 简化版 v2.0

## 功能概述

实例状态管理功能为 cliExtraWeb 提供了简洁的实例状态显示，基于简化的数字状态文件格式。

## 核心功能

### 状态显示
- **idle（空闲）** - 绿色指示器 🟢 (状态文件内容: '0')
- **busy（忙碌）** - 橙色指示器 🟠 (状态文件内容: '1')

### 实时更新
- 每30秒自动更新状态
- 状态变化时的缩放动画效果
- 基于简化状态文件的准确状态读取

## 状态文件格式 v2.0

### 新格式特点
- **极简设计**: 文件内容只包含单个数字字符
- **高效解析**: 无需JSON解析，直接读取数字
- **编码安全**: 避免UTF-8编码问题
- **快速读写**: 最小化I/O操作

### 格式规范
```
状态文件内容：
'0' = idle (空闲状态)
'1' = busy (繁忙状态)

文件位置：
~/Library/Application Support/cliExtra/namespaces/<namespace>/status/<instance_id>.status

示例：
$ cat q_cli_system.status
0

$ cat cliextra_123.status  
1
```

## 技术实现

### 后端逻辑
```python
def _read_status_file(self, instance_name: str) -> Optional[Dict]:
    """读取简化状态文件：0=idle, 1=busy"""
    with open(status_file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    if content == '0':
        return {'status': 'idle', 'color': 'green', 'description': '空闲中'}
    elif content == '1':
        return {'status': 'busy', 'color': 'orange', 'description': '忙碌中'}
    else:
        # 异常内容默认为idle
        return {'status': 'idle', 'color': 'green', 'description': '空闲中'}
```

### 前端显示
- 8px 圆形状态指示器，显示在实例名称旁边
- 状态文本显示（移动端隐藏）
- 工具提示显示文件修改时间

### 状态判断
```javascript
// 只有两种状态，基于文件内容
'0' → 🟢 绿色 "空闲"
'1' → 🟠 橙色 "忙碌"
```

## 使用方法

### 查看状态
实例列表中每个实例名称后会显示彩色状态指示器和状态文本

### 工具提示
鼠标悬停在状态指示器上可查看详细信息：
- 当前状态
- 状态文件路径
- 文件修改时间

## 配置选项

### 更新频率
```javascript
// 默认30秒，可在 instance-status.js 中修改
this.statusUpdateInterval = setInterval(() => {
    this.updateAllInstancesStatus();
}, 30000);
```

### 状态颜色
```javascript
this.statusColors = {
    'idle': { color: '#28a745', text: '空闲' },
    'busy': { color: '#ff8c00', text: '忙碌' }
};
```

## 文件结构

```
app/
├── services/instance_manager.py  # 简化状态文件读取逻辑
├── static/
│   ├── js/instance-status.js    # 简化状态管理
│   └── css/instance-status.css  # 简化样式
├── views/api.py                 # 状态API端点
└── test/status_file_test.html   # 状态测试页面
```

## 优势对比

### v2.0 简化格式优势
- ✅ **解析速度快**: 无需JSON解析，直接字符比较
- ✅ **编码安全**: 避免UTF-8编码问题
- ✅ **文件小**: 单字符文件，最小化存储
- ✅ **易于调试**: 直接cat命令查看状态
- ✅ **跨平台兼容**: 纯ASCII字符，无编码问题

### v1.0 JSON格式问题
- ❌ JSON解析开销
- ❌ UTF-8编码风险
- ❌ 文件体积较大
- ❌ 复杂的错误处理

## 测试验证

### 测试页面
```bash
# 打开测试页面
open test/status_file_test.html
```

### 测试API
```bash
# 测试状态读取
curl http://localhost:5001/api/test-status

# 常规状态API
curl http://localhost:5001/api/instances/status
```

### 测试用例
1. ✅ 读取'0'状态文件显示idle
2. ✅ 读取'1'状态文件显示busy
3. ✅ 异常内容默认为idle
4. ✅ 文件不存在默认为idle
5. ✅ 状态统计和分布显示
6. ✅ 实时状态更新

## 状态文件管理

### 创建状态文件
```bash
# 设置为空闲
echo '0' > ~/Library/Application\ Support/cliExtra/namespaces/q_cli/status/instance_name.status

# 设置为繁忙  
echo '1' > ~/Library/Application\ Support/cliExtra/namespaces/q_cli/status/instance_name.status
```

### 批量状态设置
```bash
# 将所有实例设为空闲
find ~/Library/Application\ Support/cliExtra -name "*.status" -exec sh -c 'echo "0" > "$1"' _ {} \;

# 将特定namespace实例设为繁忙
find ~/Library/Application\ Support/cliExtra/namespaces/q_cli/status -name "*.status" -exec sh -c 'echo "1" > "$1"' _ {} \;
```

## 更新日志

### v2.0.0 (2024-07-24) - 简化格式
- ✅ 状态文件格式简化为单数字：0=idle, 1=busy
- ✅ 移除JSON解析，提升性能和稳定性
- ✅ 解决UTF-8编码问题
- ✅ 添加文件修改时间显示
- ✅ 新增状态测试页面和API
- ✅ 完善错误处理和默认值机制

### v1.0.0 (2024-07-24) - JSON格式
- ✅ 基于JSON格式的状态文件
- ✅ 支持复杂状态信息
- ❌ 存在编码和解析问题
