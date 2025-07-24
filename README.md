# cliExtraWeb - Q Chat Manager

> 🚀 基于 Flask 的 Amazon Q Developer CLI (cliExtra) Web 管理界面

一个现代化的全栈 Web 应用，为 Amazon Q Developer CLI 提供可视化管理界面，支持实例管理、实时终端交互、工作流协作等功能。

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌟 项目简介

cliExtraWeb 是一个专业的 Web 管理平台，将命令行工具 `cliExtra` (Amazon Q Developer CLI) 转换为直观的可视化界面。通过现代化的 Web 技术栈，提供实例管理、实时交互、工作流协作等核心功能，大幅提升开发效率和协作体验。

### 核心价值
- 🌐 **Web化管理**: 将命令行工具转换为可视化Web界面
- 🔄 **实时交互**: 支持浏览器中直接与 Q CLI 实例交互  
- 📊 **工作流管理**: 提供可视化的工作流编辑和执行
- 🎯 **多实例协作**: 支持多个 Q CLI 实例的协同工作

## ✨ 功能特性

### 🖥️ 实例管理
- **智能创建**: 通过 Web 界面创建和配置 cliExtra 实例
- **实时监控**: 显示实例状态、资源使用和运行日志
- **批量操作**: 支持批量启动、停止、清理实例
- **命名空间**: 按项目或环境分组管理实例

### 🔧 交互终端
- **双模式终端**: 只读监控 + 完全交互两种模式
- **无缝切换**: 在监控和交互模式间一键切换
- **完整体验**: 支持所有终端快捷键和功能
- **安全隔离**: 可随时断开交互，保持实例运行

### 📋 工作流协作
- **DAG工作流**: 可视化工作流编辑器
- **角色分配**: 支持多角色协作和任务分配
- **实时通信**: 基于 WebSocket 的实时消息传递
- **进度跟踪**: 工作流执行状态和进度监控

### 🎨 用户界面
- **现代设计**: 响应式设计，适配各种屏幕尺寸
- **专业 LOGO**: AI 主题的橙黄色 SVG 矢量 LOGO
- **直观操作**: 清晰的导航和操作界面
- **实时反馈**: 操作状态和结果的即时反馈

## 🛠️ 技术栈

### 开发语言
- **Python 3.7+**: 主要后端开发语言
- **JavaScript (ES6+)**: 前端交互逻辑
- **HTML5/CSS3**: 前端界面结构和样式
- **Shell Script**: 启动脚本和环境检查

### 框架和库

#### 后端框架
- **Flask 2.3.3**: 轻量级Web框架，作为主要后端框架
- **Flask-SocketIO 5.3.6**: WebSocket支持，实现实时双向通信
- **python-socketio 5.8.0**: Socket.IO Python实现
- **python-engineio 4.7.1**: Engine.IO Python实现
- **eventlet 0.33.3**: 异步网络库，支持WebSocket
- **gunicorn 21.2.0**: WSGI HTTP服务器，用于生产环境部署

#### 系统集成
- **pexpect 4.8.0**: Python expect实现，用于终端交互
- **PyYAML 6.0.2**: YAML配置文件解析
- **tmux**: 终端复用器，管理Q CLI会话

#### 前端技术
- **xterm.js**: Web终端模拟器
- **Socket.IO Client**: 客户端WebSocket通信
- **Bootstrap/现代CSS**: 响应式UI框架
- **SVG图标**: 矢量图标系统

### 构建工具
- **pip**: Python包管理器
- **venv**: Python虚拟环境
- **requirements.txt**: 依赖管理
- **start.sh**: 自动化启动脚本

## 🏗️ 项目架构

### 架构模式
**MVC + 微服务化模块设计**
- **Model**: 数据模型和业务逻辑封装
- **View**: Flask蓝图 + HTML模板
- **Controller**: 服务层 + API层
- **Service**: 独立的业务服务模块

### 目录结构
```
cliExtraWeb/
├── app/                          # 主应用目录
│   ├── __init__.py              # Flask应用工厂
│   ├── models/                  # 数据模型
│   ├── views/                   # 视图控制器（蓝图）
│   │   ├── main.py             # 主页面路由
│   │   ├── api.py              # REST API
│   │   ├── websocket.py        # WebSocket处理
│   │   ├── terminal_api.py     # 终端API
│   │   ├── workflow_api.py     # 工作流API
│   │   └── ...                 # 其他API模块
│   ├── services/               # 业务服务层
│   │   ├── instance_manager.py # 实例管理核心
│   │   ├── web_terminal.py     # Web终端服务
│   │   ├── workflow_service.py # 工作流服务
│   │   ├── chat_manager.py     # 聊天管理
│   │   └── ...                 # 其他服务
│   ├── templates/              # HTML模板
│   ├── static/                 # 静态资源
│   └── utils/                  # 工具函数
├── config/                     # 配置文件
├── docs/                       # 项目文档
├── test/                       # 测试文件
├── logs/                       # 日志文件
├── requirements.txt            # Python依赖
├── run.py                      # 应用入口
└── start.sh                    # 启动脚本
```

### 核心模块

#### 1. 实例管理模块 (instance_manager.py)
- **功能**: 管理 cliExtra 实例的生命周期
- **特性**: 基于tmux的会话管理，支持namespace分组
- **核心方法**: 创建、启动、停止、监控实例

#### 2. Web终端模块 (web_terminal.py)
- **功能**: 浏览器中的终端交互
- **特性**: 支持只读监控和完全交互两种模式
- **技术**: pexpect + tmux会话接管

#### 3. 工作流管理模块 (workflow_service.py)
- **功能**: 可视化工作流编辑和执行
- **特性**: DAG工作流、角色分配、任务协作
- **接口**: RESTful API + WebSocket通信

#### 4. 聊天管理模块 (chat_manager.py)
- **功能**: 实例间消息传递和聊天记录
- **特性**: 实时消息、历史记录、内容过滤
- **通信**: Socket.IO双向通信
- **日志系统**: 完整的操作日志记录

## 📦 安装要求

### 环境要求
- **操作系统**: macOS/Linux (推荐)，Windows (部分支持)
- **Python**: 3.7+ (推荐 3.9+)
- **Node.js**: 可选，用于前端工具链
- **系统工具**: tmux, lsof, kill

### 必需软件
1. **Amazon Q Developer CLI (cliExtra)**
   ```bash
   # 安装Q CLI
   # 确保 'q' 或 'qq' 命令可用
   ```

2. **tmux终端复用器**
   ```bash
   # macOS
   brew install tmux
   
   # Linux
   sudo apt-get install tmux
   ```

3. **Python虚拟环境**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## 🚀 快速开始

### 自动启动（推荐）
```bash
# 一键启动，自动检查环境和依赖
./start.sh
```

### 手动启动
```bash
# 1. 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动应用
python3 run.py
```

### 访问应用
- **Web界面**: http://localhost:5001
- **日志文件**: logs/app.log
- **配置文件**: config/config.py

## 📖 使用指南

### 基本操作流程
1. **创建实例** → 选择角色和配置参数
2. **监控实例** → 查看实时日志输出和状态
3. **交互模式** → 直接与实例进行终端交互
4. **工作流协作** → 多实例协同工作和任务分配

### 终端交互详解
1. **开始监控**: 点击实例的"监控"按钮
2. **切换模式**: 点击终端右上角的"交互模式"按钮
3. **直接输入**: 在交互模式下直接输入命令和对话
4. **返回只读**: 点击"只读模式"按钮返回日志监控

### 工作流协作
1. **DAG编辑器**: 可视化设计工作流程
2. **角色分配**: 为不同任务分配专业角色
3. **实时通信**: 实例间消息传递和状态同步
4. **进度跟踪**: 监控工作流执行状态

## 📚 文档

详细文档位于 `docs/` 目录：

### 核心文档
- [交互终端使用指南](docs/interactive_terminal_guide.md) - 终端功能详解
- [工作流协作指南](docs/dag_workflow_api.md) - DAG工作流使用
- [项目结构说明](docs/PROJECT_STRUCTURE.md) - 代码架构解析
- [故障排除指南](docs/TROUBLESHOOTING.md) - 常见问题解决

### 功能文档
- [实例选择功能](docs/instance_selection_feature.md)
- [SVG头像系统](docs/svg_avatars_feature.md)
- [聊天快捷键](docs/chat_shortcuts.md)
- [图片处理功能](docs/image_feature_guide.md)

### 开发文档
- [贡献指南](docs/CONTRIBUTING.md)
- [更新日志](docs/CHANGELOG.md)
- [部署检查清单](docs/dag_deployment_checklist.md)

## 🛠️ 开发环境

### 开发工具
- **IDE**: VS Code, PyCharm (推荐)
- **调试**: Flask内置调试器 + Python debugger
- **日志**: 结构化日志系统 (logs/app.log)
- **测试**: pytest框架 (test/目录)

### 配置文件
- **config/config.py**: 应用配置
- **requirements.txt**: Python依赖
- **.gitignore**: Git忽略规则
- **start.sh**: 一键启动脚本

### 开发模式
```bash
# 开发环境启动
export FLASK_ENV=development
export FLASK_DEBUG=1
python3 run.py

# 生产环境启动
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5001 run:app
```

## 🎯 建议的开发人员配置

基于项目特点，推荐以下 cliExtra 角色配置：

### 推荐角色

#### 主要角色: **fullstack** (全栈工程师)
- **职责**: 前后端全栈开发，系统架构设计
- **适用场景**: 
  - ✅ 项目涉及完整的前后端开发
  - ✅ 需要Flask后端 + Web前端集成
  - ✅ 包含WebSocket实时通信
  - ✅ 需要系统集成和API设计

#### 辅助角色建议

1. **backend** (后端工程师)
   - **适用**: 专注API开发、服务层优化
   - **场景**: 复杂业务逻辑、性能优化

2. **frontend** (前端工程师)
   - **适用**: 专注UI/UX、前端交互优化
   - **场景**: 界面重构、用户体验提升

3. **devops** (运维工程师)
   - **适用**: 部署优化、监控告警
   - **场景**: 生产环境部署、性能监控

### 启动命令示例
```bash
# 推荐：全栈开发模式
qq start --role fullstack --name cliextraweb-fullstack

# 专项开发模式
qq start --role backend --name cliextraweb-backend
qq start --role frontend --name cliextraweb-frontend

# 查看协作实例
qq list --namespace cliextraweb
```

## 🌟 项目特点

### 技术亮点
1. **🔄 双向通信**: Flask-SocketIO实现的实时WebSocket通信
2. **🖥️ 终端集成**: 浏览器中完整的终端交互体验
3. **⚡ 异步处理**: eventlet支持的高并发异步处理
4. **🎯 模块化设计**: 清晰的服务层分离和蓝图组织
5. **🔧 系统集成**: 深度集成tmux和cliExtra命令行工具

### 开发注意事项
1. **环境依赖**: 强依赖tmux和cliExtra，需确保系统环境正确
2. **权限管理**: 涉及系统进程管理，需要适当的系统权限
3. **并发处理**: 多实例管理需要注意线程安全和资源竞争
4. **错误处理**: 系统调用失败的优雅降级和错误恢复

### 扩展方向
- **🔐 认证授权**: 添加用户认证和权限管理
- **📊 监控面板**: 增强系统监控和性能指标
- **🌐 多租户**: 支持多用户和租户隔离
- **📱 移动端**: 响应式设计优化和移动端适配

## 🚀 部署建议

### 开发环境
- 使用内置Flask服务器 + 调试模式
- 自动重载和错误调试

### 生产环境
- gunicorn + nginx反向代理
- 进程管理和负载均衡
- 日志聚合和监控告警

### 容器化部署
```dockerfile
# Docker容器化部署 (需要特殊处理tmux)
FROM python:3.9-slim
RUN apt-get update && apt-get install -y tmux
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5001", "run:app"]
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献指南

欢迎贡献代码！请查看 [CONTRIBUTING.md](docs/CONTRIBUTING.md) 了解详细的贡献流程。

## 📝 更新日志

### v1.3.0 (最新)
- 🆕 角色选择改进 - 支持可选角色和动态加载
- 🆕 从/api/roles接口动态获取最新角色列表
- 🆕 支持10种角色类型的完整显示和选择
- 🆕 角色信息包含名称、描述和显示名称
- 🔧 更新RoleManager使用qq命令替代cliExtra
- 🔧 移除角色必填验证，支持无角色创建实例
- 📚 新增角色选择功能文档和测试页面

### v1.2.0
- 🆕 新增创建实例完整等待状态显示
- 🆕 创建按钮加载动画和禁用状态
- 🆕 实时进度条和步骤指示器
- 🆕 完善的错误处理和状态恢复
- 🔧 优化用户体验，防止重复点击
- 🔧 增加2分钟超时保护机制
- 📚 新增详细的功能文档和测试文件

### v1.1.0
- 🆕 新增交互终端功能
- 🆕 支持只读/交互模式切换
- 🆕 完整的终端快捷键支持
- 🆕 WebSocket 双向通信
- 🆕 tmux 会话管理
- 🔧 优化终端显示效果
- 🔧 增强错误处理机制

### v1.0.0
- ✅ 基础实例管理功能
- ✅ 只读终端监控
- ✅ 实例创建和清理
- ✅ 基础 Web 界面

---

**总结**: cliExtraWeb是一个技术栈现代、架构清晰的全栈Web应用，专门为cliExtra命令行工具提供可视化管理界面。项目最适合由**全栈工程师**主导开发，具备完整的前后端技术栈和系统集成能力。







