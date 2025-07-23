# DAG 工作流 API 接口文档

## 📋 概述

DAG (有向无环图) 工作流可视化功能提供了一套完整的后端API，支持工作流的查看、管理和执行状态跟踪。

## 🔗 API 端点列表

### 1. 获取DAG结构

**GET** `/api/workflow/dag`

获取指定namespace的DAG工作流结构。

#### 请求参数
| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| namespace | string | 否 | default | 命名空间 |

#### 响应示例
```json
{
  "success": true,
  "dag": {
    "id": "workflow-default",
    "name": "默认工作流",
    "description": "默认工作流结构",
    "namespace": "default",
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "name": "开始",
        "description": "工作流开始",
        "role": null,
        "instance_id": null,
        "status": "pending",
        "position": {"x": 100, "y": 100},
        "config": {}
      },
      {
        "id": "backend_dev",
        "type": "task",
        "name": "后端开发",
        "description": "后端API开发任务",
        "role": "backend",
        "instance_id": "backend-api",
        "status": "pending",
        "position": {"x": 300, "y": 100},
        "config": {
          "deliverables": ["API接口", "接口文档", "测试数据"],
          "tools": ["code", "test", "document"]
        },
        "available_instances": ["backend-api", "backend-service"],
        "preferred_instance": "backend-api"
      }
    ],
    "edges": [
      {
        "id": "start-backend_dev",
        "source": "start",
        "target": "backend_dev",
        "condition": null,
        "label": "开始开发"
      }
    ],
    "current_node": null,
    "status": "inactive"
  }
}
```

### 2. 获取工作流状态

**GET** `/api/workflow/status`

获取工作流的当前执行状态。

#### 请求参数
| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| namespace | string | 否 | default | 命名空间 |

#### 响应示例
```json
{
  "success": true,
  "status": {
    "namespace": "default",
    "current_node": "backend_dev",
    "completed_nodes": ["start"],
    "active_instances": {
      "backend_dev": "backend-api"
    },
    "raw_output": "workflow status output"
  }
}
```

### 3. 完成任务节点

**POST** `/api/workflow/complete`

标记指定任务节点为完成状态，触发工作流继续执行。

#### 请求体
```json
{
  "task_id": "backend_dev",
  "namespace": "default",
  "deliverables": "API接口,接口文档,测试数据"
}
```

#### 响应示例
```json
{
  "success": true,
  "message": "任务 backend_dev 完成成功",
  "output": "Task completed successfully"
}
```

### 4. 获取角色实例映射

**GET** `/api/instances/mapping`

获取角色与实例的映射关系。

#### 请求参数
| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| namespace | string | 否 | null | 命名空间，null表示所有 |

#### 响应示例
```json
{
  "success": true,
  "mappings": {
    "backend": {
      "role": "backend",
      "instances": ["backend-api", "backend-service"],
      "preferred_instance": "backend-api",
      "auto_assign": true
    },
    "frontend": {
      "role": "frontend", 
      "instances": ["frontend-web", "frontend-mobile"],
      "preferred_instance": "frontend-web",
      "auto_assign": true
    }
  },
  "namespace": "default"
}
```

### 5. 分配实例到角色

**POST** `/api/instances/assign`

手动分配实例到指定角色。

#### 请求体
```json
{
  "role": "backend",
  "instance_id": "backend-api",
  "namespace": "default"
}
```

#### 响应示例
```json
{
  "success": true,
  "message": "实例 backend-api 已分配到角色 backend"
}
```

### 6. 获取实例详情

**GET** `/api/instances/details/{instance_id}`

获取指定实例的详细信息。

#### 路径参数
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| instance_id | string | 是 | 实例ID |

#### 响应示例
```json
{
  "success": true,
  "instance": {
    "id": "backend-api",
    "status": "active",
    "namespace": "default",
    "role": "backend",
    "source": "cliextra",
    "created_at": "2024-01-01T00:00:00Z",
    "last_activity": "2024-01-01T12:00:00Z"
  }
}
```

### 7. 获取可用角色列表

**GET** `/api/workflow/roles`

获取系统支持的所有角色类型。

#### 响应示例
```json
{
  "success": true,
  "roles": [
    "backend",
    "frontend", 
    "devops",
    "test",
    "fullstack",
    "reviewer"
  ]
}
```

### 8. 验证DAG结构

**POST** `/api/workflow/dag/validate`

验证DAG结构的有效性。

#### 请求体
```json
{
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "name": "开始"
    },
    {
      "id": "task1", 
      "type": "task",
      "name": "任务1",
      "role": "backend"
    },
    {
      "id": "end",
      "type": "end", 
      "name": "结束"
    }
  ],
  "edges": [
    {
      "id": "start-task1",
      "source": "start",
      "target": "task1"
    },
    {
      "id": "task1-end",
      "source": "task1",
      "target": "end"
    }
  ]
}
```

#### 响应示例
```json
{
  "success": true,
  "valid": true,
  "message": "DAG结构验证通过"
}
```

## 📊 数据结构

### DAG节点 (Node)
```typescript
interface DAGNode {
  id: string;                    // 节点唯一标识
  type: 'start' | 'task' | 'decision' | 'end';  // 节点类型
  name: string;                  // 节点名称
  description?: string;          // 节点描述
  role?: string;                 // 关联角色
  instance_id?: string;          // 分配的实例ID
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  position: {x: number, y: number};  // 节点位置
  config?: any;                  // 节点配置
  available_instances?: string[]; // 可用实例列表
  preferred_instance?: string;    // 首选实例
}
```

### DAG边 (Edge)
```typescript
interface DAGEdge {
  id: string;          // 边唯一标识
  source: string;      // 源节点ID
  target: string;      // 目标节点ID
  condition?: string;  // 条件表达式
  label?: string;      // 边标签
}
```

### 角色映射 (RoleMapping)
```typescript
interface RoleMapping {
  role: string;                  // 角色名称
  instances: string[];           // 实例列表
  preferred_instance?: string;   // 首选实例
  auto_assign: boolean;          // 是否自动分配
}
```

## 🔧 集成说明

### cliExtra 命令集成

API后端集成了以下cliExtra命令：

- `qq workflow show <namespace>` - 获取工作流配置
- `qq workflow dag show` - 显示DAG结构
- `qq list -o json` - 获取实例列表
- `workflow-engine status <namespace>` - 获取执行状态
- `workflow-engine complete <task_id> <namespace> [deliverables]` - 完成任务

### 角色匹配规则

系统根据以下关键词自动匹配实例角色：

| 角色 | 关键词 |
|------|--------|
| backend | backend, api, server, 后端, 服务端 |
| frontend | frontend, web, ui, 前端, 界面 |
| devops | devops, ops, deploy, 运维, 部署 |
| test | test, qa, 测试, 质量 |
| fullstack | fullstack, full, 全栈 |
| reviewer | review, 审查, 代码审查 |

## 🚨 错误处理

### 常见错误码

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 404 | Not Found | 资源不存在 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

## 🧪 测试用例

### 基础功能测试
```bash
# 运行完整测试套件
python test/test_dag_workflow.py

# 测试特定功能
curl -X GET "http://localhost:5000/api/workflow/dag?namespace=test"
curl -X GET "http://localhost:5000/api/workflow/status?namespace=test"
curl -X GET "http://localhost:5000/api/instances/mapping"
```

### 任务完成测试
```bash
curl -X POST "http://localhost:5000/api/workflow/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "backend_dev",
    "namespace": "test",
    "deliverables": "API接口,接口文档,测试数据"
  }'
```

## 📈 性能考虑

- API响应时间目标：< 500ms
- 支持并发请求：50+ QPS
- 缓存策略：DAG结构缓存5分钟
- 超时设置：外部命令执行30秒超时

## 🔒 安全考虑

- 输入参数验证和清理
- 命令注入防护
- 路径遍历防护
- 权限检查（基于namespace）

## 📝 更新日志

### v1.0.0 (2024-07-23)
- 初始版本发布
- 支持基础DAG结构获取
- 实现角色实例映射
- 添加任务完成功能
- 提供DAG验证接口
