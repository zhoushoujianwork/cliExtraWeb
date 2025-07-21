# cliExtra 命令行工具说明

## 基本信息
cliExtra 是基于 tmux 的 Q CLI 实例管理系统，支持 namespace 管理和会话历史功能。

## 目录结构

### 工作目录结构（新版本）
```
# macOS 系统
~/Library/Application Support/cliExtra/
├── config                      # 全局配置
├── namespaces/                 # 所有namespace统一管理
│   ├── default/                # default namespace
│   │   ├── instances/          # 实例目录
│   │   │   └── instance_123/
│   │   │       ├── tmux.log    # tmux会话日志
│   │   │       ├── info        # 实例详细信息
│   │   │       ├── project_path # 项目路径引用
│   │   │       └── namespace   # namespace信息（向后兼容）
│   │   ├── logs/               # 实例日志目录
│   │   │   └── instance_123.log
│   │   ├── conversations/      # 对话记录目录
│   │   │   └── instance_123.json
│   │   └── namespace_cache.json # namespace缓存
│   ├── frontend/               # frontend namespace
│   │   ├── instances/
│   │   ├── logs/
│   │   ├── conversations/
│   │   └── namespace_cache.json
│   └── backend/                # backend namespace
│       ├── instances/
│       ├── logs/
│       ├── conversations/
│       └── namespace_cache.json
└── projects/                   # Git克隆的项目（可选）
    └── cloned-repo/

# Linux 系统
/opt/cliExtra/
├── config
├── namespaces/
│   ├── default/
│   ├── frontend/
│   └── backend/
└── projects/
```

## 主要命令

### 实例管理
```bash
# 启动实例
cliExtra start                    # 在当前目录启动
cliExtra start --name myproject   # 指定实例名
cliExtra start --role frontend    # 应用角色预设
cliExtra start --namespace frontend # 指定namespace

# 列出实例
cliExtra list                     # 简洁格式
cliExtra list --json             # JSON格式，包含namespace信息

# 实例操作
cliExtra send myproject "消息"    # 发送消息
cliExtra attach myproject         # 接管终端
cliExtra stop myproject           # 停止实例
cliExtra clean myproject          # 清理实例
```

### Namespace管理
```bash
# 创建namespace
cliExtra ns create frontend
cliExtra ns create backend

# 查看namespace
cliExtra ns show                  # 显示所有namespace
cliExtra ns show frontend         # 显示指定namespace详情
cliExtra ns show --json           # JSON格式输出

# 删除namespace
cliExtra ns delete frontend       # 删除空namespace
cliExtra ns delete backend --force # 强制删除

# 修改实例namespace
cliExtra set-ns myinstance backend # 移动实例到指定namespace
```

### 对话记录和回放
```bash
# 查看可用的对话记录
cliExtra replay list

# 回放指定实例的对话记录
cliExtra replay instance backend-api
cliExtra replay instance frontend-dev --format json

# 回放指定namespace的消息历史
cliExtra replay namespace development
cliExtra replay namespace backend --format timeline

# 限制显示记录数量
cliExtra replay instance backend-api --limit 10

# 显示指定时间后的记录
cliExtra replay namespace development --since "2025-01-20"
```

### 实例协作
```bash
# 发送消息到指定实例
cliExtra send backend-api "API开发完成，请进行前端集成"

# 广播消息到所有实例
cliExtra broadcast "系统维护通知：今晚22:00-24:00进行系统升级"

# 广播到指定namespace
cliExtra broadcast "前端组件库更新" --namespace frontend

# 排除特定实例的广播
cliExtra broadcast "测试环境重启" --exclude self

# 预览广播目标（不实际发送）
cliExtra broadcast "部署通知" --dry-run
```

## 重要变更

### 1. 基于 Namespace 的目录结构
- 所有实例数据按 namespace 分组存储
- 每个 namespace 有独立的 instances、logs、conversations 目录
- 支持跨项目协作，同一 namespace 下的实例可以协作

### 2. 会话历史功能
- 每个实例的对话记录保存在 `conversations/` 目录
- 支持实例级别和 namespace 级别的历史查看
- 提供 `cliExtra replay` 命令进行对话回放

### 3. tmux 日志文件位置
- 新位置：`~/Library/Application Support/cliExtra/namespaces/{namespace}/instances/{instance_id}/tmux.log`
- 旧位置仍然兼容，但建议使用新结构

### 4. JSON 输出格式
`cliExtra list --json` 现在包含更多信息：
```json
{
  "instances": [
    {
      "id": "instance_123",
      "status": "Attached",
      "session": "q_instance_123",
      "namespace": "frontend",
      "project_path": "/path/to/project",
      "role": "frontend",
      "attach_command": "tmux attach-session -t q_instance_123"
    }
  ]
}
```

## Web 管理界面集成

Web 管理界面已更新以支持新功能：

1. **Namespace 选择器**：支持按 namespace 过滤实例
2. **对话历史按钮**：每个实例都有对话历史查看按钮
3. **Namespace 历史**：可以查看整个 namespace 的对话历史
4. **实时同步**：自动同步 namespace 和实例状态

## 兼容性

- 向后兼容旧版本的目录结构
- 自动迁移现有实例到新的 namespace 结构
- 保持现有 API 接口的兼容性