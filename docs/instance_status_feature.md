# 🖥️ 实例状态管理功能 - 简化版

## 功能概述

实例状态管理功能为 cliExtraWeb 提供了简洁的实例状态显示，只关注 idle/busy 两种核心状态。

## 核心功能

### 状态显示
- **idle（空闲）** - 绿色指示器 🟢 
- **busy（忙碌）** - 橙色指示器 🟠

### 实时更新
- 每30秒自动更新状态
- 状态变化时的缩放动画效果
- 基于状态文件的准确状态读取

## 技术实现

### 后端逻辑
- 优先读取 `namespaces/<namespace>/status/<instance>.status` 文件
- 只关注 `idle` 和 `busy` 状态，其他状态统一显示为 `idle`
- 无状态文件时默认显示 `idle`

### 前端显示
- 8px 圆形状态指示器，显示在实例名称旁边
- 状态文本显示（移动端隐藏）
- 工具提示显示任务信息和最后活动时间

### 状态判断
```javascript
// 只有两种状态
idle → 🟢 绿色 "空闲"
busy → 🟠 橙色 "忙碌"
```

## 使用方法

### 查看状态
实例列表中每个实例名称后会显示彩色状态指示器和状态文本

### 工具提示
鼠标悬停在状态指示器上可查看详细信息：
- 当前状态
- 任务描述（如果有）
- 最后活动时间

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
├── services/instance_manager.py  # 状态文件读取逻辑
├── static/
│   ├── js/instance-status.js    # 简化状态管理
│   └── css/instance-status.css  # 简化样式
└── views/api.py                 # 状态API端点
```

## 特点

- **简洁明了** - 只显示最重要的 idle/busy 状态
- **性能优化** - 移除复杂的筛选和统计功能
- **状态文件优先** - 直接读取Shell工程师创建的状态文件
- **响应式设计** - 移动端自动隐藏状态文本

## 更新日志

### v2.0.0 (2024-07-24) - 简化版
- ✅ 简化为只显示 idle/busy 两种状态
- ✅ 移除状态筛选和统计功能
- ✅ 优化状态指示器大小和位置
- ✅ 专注状态文件读取，忽略tmux会话状态
- ✅ 提升性能和用户体验
