# 实例选中状态功能

## 功能概述

为了提升用户体验，我们为实例列表添加了选中状态的视觉反馈功能。当用户选择某个实例进行终端监控时，该实例在列表中会显示明显的选中状态。

## 功能特性

### 视觉效果
- **选中背景**: 选中的实例项显示淡蓝色背景 (`#e3f2fd`)
- **边框高亮**: 选中实例的边框变为蓝色 (`#2196f3`)
- **阴影效果**: 添加蓝色阴影，增强视觉层次感
- **监控标签**: 显示"监控中"标签，明确当前状态

### 按钮状态
- **监控按钮**: 选中实例的监控按钮变为实心蓝色，并禁用点击
- **其他按钮**: 非选中实例的监控按钮保持轮廓样式，可正常点击

## 技术实现

### CSS样式
```css
/* 实例列表项样式 */
.instance-item {
    transition: all 0.2s ease;
    cursor: pointer;
}

.instance-item:hover {
    background-color: #f8f9fa;
    border-color: #dee2e6;
}

/* 选中状态的实例项 */
.instance-item.instance-selected {
    background-color: #e3f2fd;
    border-color: #2196f3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
}

.instance-item.instance-selected:hover {
    background-color: #e1f5fe;
    border-color: #1976d2;
}
```

### JavaScript函数

#### updateInstanceSelection(selectedInstanceId)
更新实例列表中的选中状态。

**参数:**
- `selectedInstanceId`: 当前选中的实例ID，传入 `null` 表示清除所有选中状态

**功能:**
1. 移除所有实例的选中状态样式
2. 重置所有监控按钮状态
3. 移除所有"监控中"标签
4. 为指定实例添加选中状态
5. 更新对应的按钮状态和标签

#### 集成调用
- 在 `startMonitoring()` 函数中调用 `updateInstanceSelection(instanceId)`
- 在 `stopMonitoring()` 函数中调用 `updateInstanceSelection(null)`

### HTML结构修改

实例列表项现在包含 `data-instance-id` 属性：
```html
<div class="instance-item mb-2 p-2 border rounded" data-instance-id="instance-123">
    <!-- 实例内容 -->
</div>
```

## 使用方法

### 用户操作
1. 在实例列表中点击任意实例的"监控"按钮
2. 该实例项会立即显示选中状态（蓝色背景和边框）
3. 监控按钮变为实心蓝色并显示为禁用状态
4. 实例名称旁边显示"监控中"标签
5. 切换到其他实例时，之前的选中状态会自动清除

### 状态管理
- **单选模式**: 同时只能有一个实例处于选中状态
- **自动清除**: 停止监控时自动清除选中状态
- **状态同步**: 选中状态与终端监控状态保持同步

## 兼容性

### 浏览器支持
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### 响应式设计
- 在不同屏幕尺寸下保持良好的视觉效果
- 移动设备上的触摸交互友好

## 测试验证

### 自动化测试
运行测试脚本验证功能：
```bash
python test/test_instance_selection_simple.py
```

### 手动测试
1. 启动服务: `./start.sh`
2. 打开浏览器访问 `http://localhost:5000`
3. 在实例列表中点击监控按钮
4. 观察实例项的背景色变化和选中状态
5. 切换不同实例，验证状态正确更新

## 故障排除

### 常见问题

**Q: 选中状态没有显示**
A: 检查以下几点：
- CSS样式是否正确加载
- JavaScript函数是否正确定义
- 浏览器控制台是否有错误信息

**Q: 多个实例同时显示选中状态**
A: 这通常是状态管理问题：
- 检查 `updateInstanceSelection` 函数是否正确清除旧状态
- 确认 `currentMonitoringInstance` 变量正确更新

**Q: 按钮状态不正确**
A: 检查按钮状态更新逻辑：
- 确认CSS类名正确切换
- 检查按钮的 `disabled` 属性设置

### 调试方法
1. 打开浏览器开发者工具
2. 查看控制台日志，寻找相关错误信息
3. 检查元素的CSS类名是否正确应用
4. 验证 `data-instance-id` 属性是否正确设置

## 未来改进

### 计划功能
- **多选支持**: 支持同时监控多个实例
- **状态持久化**: 页面刷新后保持选中状态
- **动画效果**: 添加更流畅的状态切换动画
- **键盘导航**: 支持键盘快捷键选择实例

### 性能优化
- **虚拟滚动**: 大量实例时的性能优化
- **状态缓存**: 减少DOM操作频率
- **懒加载**: 按需加载实例详情

---

## 更新日志

### v1.0.0 (2024-07-24)
- ✅ 实现基础选中状态功能
- ✅ 添加CSS样式和视觉效果
- ✅ 集成JavaScript状态管理
- ✅ 完成自动化测试
- ✅ 编写功能文档
