# AI任务托管平台

基于Amazon Q CLI的多AI协作开发平台，让AI代理自主完成项目开发。

## 🚀 快速开始

### 1. 启动平台

```bash
./start_platform.sh
```

访问 http://localhost:5000

### 2. 创建项目

1. 点击"项目管理"
2. 点击"创建项目"
3. 输入项目名称和描述

### 3. 添加AI代理

1. 进入项目详情页面
2. 点击"添加AI"
3. 选择角色类型（后端工程师、前端工程师等）
4. 配置技术栈和项目路径
5. 点击"添加AI代理"

### 4. 开始协作

在团队聊天中输入需求，AI代理会自动协作完成开发：

```
@所有人 我需要新增云资源机器的看板，支持切换不同region，数据要入库。
```

## 🤖 支持的AI角色

### 后端工程师
- **技术栈**: Golang, Gin, GORM, Redis, MySQL
- **能力**: API开发、数据库设计、性能优化、微服务架构

### 前端工程师
- **Vue工程师**: Vue3, TypeScript, Element-Plus, Vite
- **React工程师**: React, TypeScript, Antd, Webpack

### 产品经理
- **能力**: 需求梳理、产品设计、用户研究、项目管理

### 代码审查员
- **能力**: 代码审查、安全检测、性能分析、规范检查

### 测试工程师
- **能力**: 测试用例设计、自动化测试、性能测试、缺陷跟踪

## 💡 核心特性

### 1. 多AI协作
- 支持多种AI角色同时工作
- 每个角色有专业的技能和知识
- 自动任务分配和协调

### 2. 智能调度
- 使用@提及指定特定AI代理
- AI代理间自动通知和协调
- 链路式任务传递

### 3. 项目管理
- 支持多项目并行开发
- 独立的AI团队和上下文
- 项目进度跟踪

### 4. 上下文保持
- 每个AI代理保持独立会话
- 项目级别的上下文共享
- 自动保存聊天历史

## 🔧 使用场景

### 场景1：前后端协作开发

```
用户: @后端工程师 请实现用户管理的CRUD接口
后端工程师: 我已经实现了用户管理接口，包括增删改查功能...
后端工程师: @前端工程师 请根据以下API文档实现前端页面...
前端工程师: 收到，我会实现用户管理的前端页面...
```

### 场景2：工作流自动化

```
用户: @所有人 张三离职了，请处理相关系统权限
代码审查员: 我会检查张三的代码提交记录...
测试工程师: 我会验证相关功能是否正常...
```

## 📁 项目结构

```
cliExtra/
├── app.py                    # Flask主应用
├── persistent_q_chat.sh      # Q CLI实例管理脚本
├── start_platform.sh         # 平台启动脚本
├── templates/                # HTML模板
│   ├── base.html            # 基础模板
│   ├── index.html           # 主页
│   ├── projects.html        # 项目列表
│   ├── project_detail.html  # 项目详情
│   └── chat.html            # 聊天页面
└── README.md                # 原始需求文档
```

## 🛠️ 技术架构

### 后端
- **Flask**: Web框架
- **Python**: 主要开发语言
- **JSON**: 数据存储格式

### 前端
- **Bootstrap 5**: UI框架
- **JavaScript**: 交互逻辑
- **Font Awesome**: 图标库

### AI集成
- **Amazon Q CLI**: AI能力提供
- **FIFO管道**: 进程间通信
- **会话管理**: 上下文保持

## 🔄 工作流程

1. **项目创建**: 用户创建项目并配置基本信息
2. **团队组建**: 添加不同角色的AI代理到项目
3. **任务分配**: 用户在聊天中描述需求
4. **智能调度**: 系统自动分配任务给合适的AI代理
5. **协作开发**: AI代理间自动协调完成开发
6. **进度跟踪**: 实时查看项目进度和聊天历史

## 🚨 注意事项

1. **Q CLI依赖**: 需要先安装Amazon Q CLI
2. **权限配置**: 确保Q CLI有足够的权限访问项目文件
3. **资源消耗**: 多个AI实例会消耗较多系统资源
4. **网络连接**: 需要稳定的网络连接访问AI服务

## 🔮 未来规划

- [ ] 支持更多AI角色和技术栈
- [ ] 集成更多开发工具（Git、JIRA、Confluence）
- [ ] 支持工作流可视化编辑
- [ ] 添加项目模板和最佳实践
- [ ] 支持API接口调用
- [ ] 添加权限管理和用户系统

## 📞 支持

如有问题或建议，请提交Issue或联系开发团队。

---

**让AI代理替你写代码，你只需要喝茶看短剧！** ☕️ 📺
