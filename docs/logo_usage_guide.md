# LOGO 使用指南

## 已集成的 LOGO 文件

### 主要 LOGO
- **Ai.svg** - 主要 LOGO，SVG 矢量格式
  - 位置: `/static/images/Ai.svg`
  - 特点: 可无损缩放，适合各种尺寸
  - 用途: 导航栏、页面标题、Favicon

### 备用 LOGO
- **Ai.png** - PNG 格式备用
  - 位置: `/static/images/Ai.png`
  - 用途: 不支持 SVG 的场景

- **aite.png** - @ 符号设计
  - 位置: `/static/images/aite.png`
  - 用途: 特殊场景或主题变化

## 使用方式

### 在模板中使用
```html
<!-- 导航栏 LOGO -->
<img src="{{ url_for('static', filename='images/Ai.svg') }}" 
     alt="Q Chat Manager" width="32" height="32">

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" 
      href="{{ url_for('static', filename='images/Ai.svg') }}">
```

### CSS 样式
```css
.navbar-brand img {
    margin-right: 8px;
}
```

## 尺寸建议
- 导航栏: 32x32px
- 页面标题: 48x48px
- Favicon: 16x16px, 32x32px
- 大图标: 64x64px

## 颜色主题
- 主色调: 橙黄色渐变
- 适合: AI、科技、管理工具主题
- 背景: 透明或白色背景均可

## 注意事项
1. SVG 格式优先，确保清晰度
2. 保持适当的边距和间距
3. 在深色背景上测试可见性
4. 确保 alt 属性描述准确
