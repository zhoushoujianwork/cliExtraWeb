# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-07-21

### 🖥️ Web终端功能 - 浏览器内直接接管

#### ✨ 新增功能
- **🌐 Web终端**: 在浏览器中直接接管Screen会话，无需切换到本地终端
- **📱 弹窗界面**: 模态框形式的Web终端，支持关闭和终止操作
- **⌨️ 完整交互**: 支持所有键盘输入、快捷键和终端功能
- **🔄 实时通信**: 基于WebSocket的实时输入输出
- **📏 自适应大小**: 终端窗口大小自动调整

#### 🔧 技术实现
- **pexpect集成**: 使用pexpect库实现Screen会话接管
- **WebSocket扩展**: 新增terminal相关的WebSocket事件
- **新API端点**:
  - `POST /api/terminal/create/<id>` - 创建Web终端
  - `POST /api/terminal/detach/<id>` - 分离Web终端
  - `POST /api/terminal/terminate/<id>` - 终止Web终端连接

#### 🎨 用户界面
- **Web终端组件**: 完整的JavaScript Web终端实现
- **终端样式**: 黑色背景、等宽字体的经典终端外观
- **控制按钮**: 分离、终止连接、关闭等操作按钮
- **状态指示**: 连接状态实时显示

#### 🚀 使用体验
- **一键接管**: 点击桌面图标 🖥️ 即可打开Web终端
- **无缝交互**: 在浏览器中直接与Q CLI交互
- **灵活控制**: 可以分离会话保持后台运行，或完全终止连接
- **跨平台**: 任何支持现代浏览器的设备都可使用

#### 📋 依赖更新
- 新增 `pexpect==4.8.0` 依赖用于终端控制

---

## [3.0.0] - 2025-07-21

### 🔄 Major Architecture Change - Screen Implementation

#### ✨ Added
- **🖥️ Terminal Takeover**: Users can now attach to Screen sessions for direct Q CLI interaction
- **📝 Screen Logging**: Built-in Screen logging with real-time monitoring
- **🔄 Session Management**: Support for session detachment (Ctrl+A, D) and reattachment
- **🛠️ Standard Tools**: Based on mature GNU Screen session management
- **📋 Attach Interface**: One-click copy commands for terminal takeover
- **📊 Session Status**: Real-time Screen session status monitoring

#### 🔧 Technical Improvements
- **Complete Rewrite**: Replaced FIFO-based implementation with Screen-based architecture
- **Unified Management**: Single `InstanceManager` class for all Screen operations
- **New API Endpoints**: 
  - `GET /api/attach/<id>` - Get takeover command information
  - `GET /api/status/<id>` - Get detailed instance status
- **Enhanced WebSocket**: Improved real-time monitoring with Screen log parsing
- **Simplified Codebase**: Removed complex FIFO handling, cleaner architecture

#### 🗑️ Removed
- **FIFO Implementation**: Completely removed `persistent_q_chat.sh` based system
- **Complex Process Management**: Simplified to Screen session management
- **Temporary Files**: No more FIFO files and complex temporary directory structures

#### 📋 System Requirements
- **New Dependency**: GNU Screen is now required
  - macOS: `brew install screen`
  - Linux: `sudo apt-get install screen`

#### 🚀 Usage
1. **Start Instance**: Click "Start" in web interface
2. **Send Messages**: Use `@instance1 your question` format
3. **Takeover Terminal**: Click terminal icon 🖥️, copy command to terminal
4. **Detach Session**: In Screen session, press `Ctrl+A, D`
5. **Reattach**: Use `screen -r q_instance_<id>` or web interface

#### 🎯 Benefits
- **Direct Interaction**: Full terminal capabilities when needed
- **Flexible Usage**: Both programmatic and manual interaction
- **Mature Technology**: Built on widely-used GNU Screen
- **Better Debugging**: Direct access to Q CLI for troubleshooting
- **Session Persistence**: Sessions survive network disconnections

---

## [2.0.0] - 2025-07-18

### 🎉 Major Release - Complete Architecture Rewrite

#### ✨ Added
- **Standard Flask Architecture**: Complete rewrite using Flask application factory pattern
- **Modular Design**: Separated models, services, views, and utilities
- **Multi-Instance Management**: Support for managing multiple Q CLI instances simultaneously
- **Real-time WebSocket Communication**: Live chat updates and instance monitoring
- **Markdown Rich Text Rendering**: 
  - Terminal output with ANSI colors and formatting
  - Web interface with HTML rendering
  - Support for code blocks, headers, lists, links, etc.
- **Complete Response Aggregation**: Wait for full Q CLI responses instead of fragmented output
- **@-mention System**: Select instances using @symbol like modern chat applications
- **System Logs Separation**: Dedicated panel for system messages and logs
- **Responsive Web Interface**: Bootstrap-based UI with mobile support
- **Configuration Management**: Support for multiple environments (dev/prod/test)
- **Comprehensive Documentation**: README, API docs, contribution guidelines

#### 🏗️ Technical Improvements
- **Flask Application Factory**: Proper application structure
- **Blueprint Organization**: Separated main, API, and WebSocket routes
- **Service Layer**: Business logic abstraction
- **Thread-safe Operations**: Proper concurrency handling
- **Error Handling**: Comprehensive error management
- **Logging System**: Structured logging with file rotation
- **Type Hints**: Full type annotation support

#### 🔧 Configuration
- **Environment Variables**: Support for FLASK_ENV, DEBUG, SECRET_KEY
- **Configurable Timeouts**: Adjustable Q CLI response timeouts
- **Instance Limits**: Configurable maximum instance count
- **History Management**: Configurable chat history and log retention

#### 📁 Project Structure
```
app/
├── models/         # Data models
├── services/       # Business logic
├── views/          # Route handlers
├── utils/          # Utilities
├── static/         # Static assets
└── templates/      # Jinja2 templates
config/             # Configuration management
```

#### 🚀 Deployment
- **Docker Ready**: Containerization support
- **Production Config**: Gunicorn + eventlet configuration
- **Health Checks**: Built-in health monitoring endpoints
- **Static Assets**: Optimized CSS/JS delivery

### 🔄 Changed
- **Complete rewrite** from single-file application to modular Flask app
- **Improved UX**: Better chat interface with markdown rendering
- **Enhanced Performance**: Optimized WebSocket handling and response processing

### 🗑️ Removed
- Legacy single-file web manager
- Fragmented response display
- Basic text-only interface

### 🐛 Fixed
- Response fragmentation issues
- WebSocket connection stability
- Memory leaks in long-running instances
- Cross-browser compatibility issues

---

## [1.0.0] - 2025-07-17

### ✨ Initial Release
- Basic Q CLI instance management
- Simple web interface
- Real-time chat functionality
- WebSocket communication

---

## Upcoming Features 🔮

### [2.1.0] - Planned
- [ ] **Enhanced Security**: Authentication and authorization
- [ ] **Plugin System**: Extensible architecture for custom features
- [ ] **Advanced Markdown**: Math equations, diagrams, tables
- [ ] **Export Features**: Chat history export (PDF, HTML, Markdown)
- [ ] **Themes**: Dark/light mode and custom themes
- [ ] **Performance Monitoring**: Instance performance metrics
- [ ] **Backup/Restore**: Configuration and chat history backup

### [2.2.0] - Future
- [ ] **Multi-user Support**: User accounts and permissions
- [ ] **Cloud Integration**: AWS/Azure deployment templates
- [ ] **Mobile App**: React Native companion app
- [ ] **AI Enhancements**: Smart response suggestions
- [ ] **Integration APIs**: Third-party service integrations

---

**Legend:**
- ✨ Added - New features
- 🔧 Changed - Changes in existing functionality  
- 🗑️ Removed - Removed features
- 🐛 Fixed - Bug fixes
- 🔒 Security - Security improvements
