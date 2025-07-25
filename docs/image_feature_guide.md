# 图片功能使用指南

## 📸 功能概述

聊天界面现在支持图片上传、显示和查看功能，图片会与聊天记录存储在同一目录结构下，便于管理和备份。

## 🚀 如何使用

### 1. 上传图片

#### 方法一：粘贴图片
- 复制图片到剪贴板（截图、复制图片文件等）
- 在聊天输入框中按 `Ctrl+V`（Windows）或 `Cmd+V`（Mac）
- 图片会自动上传并在输入框中插入图片标记

#### 方法二：拖拽图片
- 将图片文件直接拖拽到聊天输入框
- 图片会自动上传并插入

### 2. 图片格式支持

支持以下图片格式：
- PNG
- JPG/JPEG  
- GIF
- BMP
- WEBP

### 3. 图片在消息中的显示

#### Markdown格式（推荐）
```
![图片描述](图片URL)
```

#### 旧格式（兼容）
```
[图片: 图片路径]
```

### 4. 查看大图

- 点击聊天记录中的任意图片
- 图片会在模态框中放大显示
- 支持下载和复制链接功能
- 按 `ESC` 键或点击背景关闭

## 📁 存储结构

图片按namespace分别存储：

```
.cliExtra/
└── namespaces/
    ├── default/
    │   └── conversations/
    │       ├── images/           # 图片文件
    │       └── instance1.json   # 聊天记录
    ├── test/
    │   └── conversations/
    │       ├── images/
    │       └── instance2.json
    └── q_cli/
        └── conversations/
            ├── images/
            └── instance3.json
```

## 🎨 界面特性

### 图片显示样式
- 自动适配聊天气泡宽度
- 圆角设计，与聊天风格一致
- 悬停时轻微放大效果
- 支持懒加载，优化性能

### 模态框功能
- 高清大图显示
- 毛玻璃背景效果
- 下载按钮：保存图片到本地
- 复制链接：复制图片URL到剪贴板
- 响应式设计，适配移动端

## 🔧 技术细节

### 图片命名规则
```
image_{timestamp}_{pid}.{extension}
```
- `timestamp`: 毫秒级时间戳
- `pid`: 进程ID，避免冲突
- `extension`: 原始文件扩展名

### 访问URL格式
```
/static/data/namespaces/{namespace}/conversations/images/{filename}
```

### API接口

#### 上传图片
```
POST /api/upload-image
Content-Type: multipart/form-data

参数：
- image: 图片文件
- filename: 文件名（可选）
- namespace: 命名空间（默认：default）
```

#### 访问图片
```
GET /api/image/{namespace}/{filename}
```

## 📱 移动端适配

- 图片自动缩放适配屏幕宽度
- 模态框在小屏幕上全屏显示
- 触摸友好的按钮设计
- 支持手势关闭模态框

## 🛠️ 故障排除

### 常见问题

**Q: 图片上传失败**
A: 检查以下几点：
- 文件格式是否支持
- 文件大小是否过大
- 网络连接是否正常
- 服务器磁盘空间是否充足

**Q: 图片显示不出来**
A: 可能的原因：
- 图片文件已被删除或移动
- 权限问题导致无法访问
- URL路径不正确

**Q: 模态框无法关闭**
A: 尝试以下方法：
- 按 ESC 键
- 点击图片外的背景区域
- 刷新页面

### 调试信息

开启浏览器开发者工具查看：
- Network标签：检查图片请求状态
- Console标签：查看JavaScript错误
- Application标签：检查本地存储

## 🔒 安全考虑

- 文件类型严格验证
- 路径安全检查，防止目录遍历
- 文件大小限制
- 仅允许访问指定目录下的文件

## 📈 性能优化

- 图片懒加载，减少初始加载时间
- 压缩图片存储，节省空间
- CDN支持（可配置）
- 缓存策略优化

## 🔄 版本兼容

- 向后兼容旧的图片标记格式
- 自动迁移现有图片路径
- 渐进式功能增强

## 📞 技术支持

如遇问题，请：
1. 查看浏览器控制台错误信息
2. 检查服务器日志
3. 确认文件权限设置
4. 联系技术支持团队
