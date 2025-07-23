# -*- coding: utf-8 -*-
"""
工作流初始化服务
为 default namespace 创建默认的工作流模板
"""

import os
import json
from datetime import datetime

def create_default_workflows():
    """创建默认的工作流模板"""
    
    # 确保工作流目录存在
    workflow_dir = os.path.join(os.getcwd(), '.amazonq', 'workflows', 'default')
    if not os.path.exists(workflow_dir):
        os.makedirs(workflow_dir)
    
    # 默认开发工作流
    default_dev_workflow = {
        "id": "default-workflow-1",
        "name": "默认开发流程",
        "description": "标准的软件开发工作流程",
        "version": "1.0.0",
        "project_name": "cliExtra",
        "project_description": "基于tmux的Amazon Q CLI实例管理系统",
        "repository": "https://github.com/zhoushoujianwork/cliExtra.git",
        "nodes": [
            {
                "id": "start-1",
                "type": "start",
                "name": "开始",
                "description": "工作流开始",
                "position": {"x": 100, "y": 200},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#10b981",
                    "border_color": "#059669",
                    "text_color": "#ffffff"
                },
                "owner": "any",
                "status": "pending"
            },
            {
                "id": "task-1",
                "type": "task", 
                "name": "需求分析",
                "description": "分析用户需求和技术可行性",
                "position": {"x": 300, "y": 200},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#3b82f6",
                    "border_color": "#2563eb",
                    "text_color": "#ffffff"
                },
                "owner": "any",
                "responsibilities": ["需求收集", "可行性分析", "技术调研"],
                "deliverables": ["需求文档", "技术方案"],
                "status": "pending"
            },
            {
                "id": "task-2",
                "type": "task",
                "name": "技术设计", 
                "description": "设计系统架构和技术方案",
                "position": {"x": 500, "y": 200},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#3b82f6",
                    "border_color": "#2563eb",
                    "text_color": "#ffffff"
                },
                "owner": "devops-engineer",
                "responsibilities": ["架构设计", "技术选型", "接口设计"],
                "deliverables": ["架构文档", "接口规范"],
                "status": "pending"
            },
            {
                "id": "parallel-1",
                "type": "decision",
                "name": "并行开发",
                "description": "CLI和Web界面并行开发",
                "position": {"x": 700, "y": 200},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#f59e0b",
                    "border_color": "#d97706",
                    "text_color": "#ffffff"
                },
                "owner": "devops-engineer",
                "status": "pending"
            },
            {
                "id": "task-3",
                "type": "task",
                "name": "CLI开发",
                "description": "开发和测试CLI功能",
                "position": {"x": 600, "y": 100},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#3b82f6",
                    "border_color": "#2563eb",
                    "text_color": "#ffffff"
                },
                "owner": "devops-engineer",
                "responsibilities": ["Shell脚本开发", "功能测试", "文档更新"],
                "deliverables": ["CLI工具", "测试报告", "使用文档"],
                "status": "pending"
            },
            {
                "id": "task-4",
                "type": "task",
                "name": "Web界面开发",
                "description": "开发Web管理界面",
                "position": {"x": 600, "y": 300},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#3b82f6",
                    "border_color": "#2563eb",
                    "text_color": "#ffffff"
                },
                "owner": "frontend-engineer",
                "responsibilities": ["前端开发", "用户体验", "API集成"],
                "deliverables": ["Web界面", "用户手册"],
                "status": "pending"
            },
            {
                "id": "task-5",
                "type": "task",
                "name": "集成测试",
                "description": "测试CLI和Web功能集成",
                "position": {"x": 800, "y": 200},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#3b82f6",
                    "border_color": "#2563eb",
                    "text_color": "#ffffff"
                },
                "owner": "both",
                "responsibilities": ["集成测试", "Bug修复", "性能优化"],
                "deliverables": ["测试报告", "修复记录"],
                "status": "pending"
            },
            {
                "id": "end-1",
                "type": "end",
                "name": "结束",
                "description": "工作流结束",
                "position": {"x": 1000, "y": 200},
                "style": {
                    "width": 150,
                    "height": 60,
                    "background_color": "#ef4444",
                    "border_color": "#dc2626",
                    "text_color": "#ffffff"
                },
                "owner": "any",
                "status": "pending"
            }
        ],
        "edges": [
            {
                "id": "edge-1",
                "source_node_id": "start-1",
                "target_node_id": "task-1",
                "source_handle": "output",
                "target_handle": "input",
                "label": "",
                "style": {"color": "#6b7280", "width": 2}
            },
            {
                "id": "edge-2", 
                "source_node_id": "task-1",
                "target_node_id": "task-2",
                "source_handle": "output",
                "target_handle": "input",
                "label": "",
                "style": {"color": "#6b7280", "width": 2}
            },
            {
                "id": "edge-3",
                "source_node_id": "task-2",
                "target_node_id": "parallel-1",
                "source_handle": "output",
                "target_handle": "input",
                "label": "",
                "style": {"color": "#6b7280", "width": 2}
            },
            {
                "id": "edge-4",
                "source_node_id": "parallel-1",
                "target_node_id": "task-3",
                "source_handle": "output",
                "target_handle": "input",
                "label": "CLI分支",
                "style": {"color": "#3b82f6", "width": 2}
            },
            {
                "id": "edge-5",
                "source_node_id": "parallel-1", 
                "target_node_id": "task-4",
                "source_handle": "output",
                "target_handle": "input",
                "label": "Web分支",
                "style": {"color": "#10b981", "width": 2}
            },
            {
                "id": "edge-6",
                "source_node_id": "task-3",
                "target_node_id": "task-5",
                "source_handle": "output",
                "target_handle": "input",
                "label": "",
                "style": {"color": "#6b7280", "width": 2}
            },
            {
                "id": "edge-7",
                "source_node_id": "task-4",
                "target_node_id": "task-5",
                "source_handle": "output",
                "target_handle": "input",
                "label": "",
                "style": {"color": "#6b7280", "width": 2}
            },
            {
                "id": "edge-8",
                "source_node_id": "task-5",
                "target_node_id": "end-1",
                "source_handle": "output",
                "target_handle": "input",
                "label": "",
                "style": {"color": "#6b7280", "width": 2}
            }
        ],
        "roles": [
            {
                "name": "devops-engineer",
                "description": "运维工程师 - Shell脚本开发和系统管理",
                "tools": ["git", "shell", "tmux", "bash"],
                "responsibilities": ["Shell脚本开发", "系统管理", "自动化运维"]
            },
            {
                "name": "frontend-engineer", 
                "description": "前端工程师 - Web界面开发",
                "tools": ["git", "flask", "javascript", "html", "css", "python"],
                "responsibilities": ["Web界面开发", "用户体验设计", "API集成"]
            }
        ],
        "collaboration_rules": [
            {
                "id": "collab-1",
                "from_role": "devops-engineer",
                "to_role": "frontend-engineer",
                "trigger": "CLI功能更新",
                "action": "通知Web界面适配",
                "message_template": "CLI功能已更新，请适配Web界面",
                "priority": "high",
                "auto_execute": True
            }
        ],
        "notifications": {
            "auto_notify": True,
            "channels": ["cliExtra_send", "cliExtra_broadcast"]
        },
        "canvas_config": {
            "width": 1200,
            "height": 800,
            "zoom": 1.0,
            "pan_x": 0,
            "pan_y": 0
        },
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "created_by": "system"
    }
    
    # 保存默认工作流
    workflow_file = os.path.join(workflow_dir, "default-workflow-1.json")
    if not os.path.exists(workflow_file):
        with open(workflow_file, 'w') as f:
            json.dump(default_dev_workflow, f, ensure_ascii=False, indent=2)
        print("创建默认工作流: {}".format(workflow_file))
    
    # 简单测试工作流
    test_workflow = {
        "id": "test-workflow",
        "name": "测试工作流",
        "description": "用于测试的简单工作流",
        "version": "1.0.0",
        "nodes": [
            {
                "id": "start-1",
                "type": "start",
                "name": "开始",
                "description": "测试开始",
                "position": {"x": 100, "y": 100},
                "style": {
                    "background_color": "#10b981",
                    "border_color": "#059669",
                    "text_color": "#ffffff"
                },
                "status": "pending"
            },
            {
                "id": "task-1",
                "type": "task",
                "name": "测试任务",
                "description": "执行测试任务",
                "position": {"x": 300, "y": 100},
                "style": {
                    "background_color": "#3b82f6",
                    "border_color": "#2563eb", 
                    "text_color": "#ffffff"
                },
                "owner": "any",
                "status": "pending"
            },
            {
                "id": "end-1",
                "type": "end",
                "name": "结束",
                "description": "测试结束",
                "position": {"x": 500, "y": 100},
                "style": {
                    "background_color": "#ef4444",
                    "border_color": "#dc2626",
                    "text_color": "#ffffff"
                },
                "status": "pending"
            }
        ],
        "edges": [
            {
                "id": "edge-1",
                "source_node_id": "start-1",
                "target_node_id": "task-1",
                "style": {"color": "#6b7280", "width": 2}
            },
            {
                "id": "edge-2",
                "source_node_id": "task-1", 
                "target_node_id": "end-1",
                "style": {"color": "#6b7280", "width": 2}
            }
        ],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "created_by": "system"
    }
    
    # 保存测试工作流
    test_file = os.path.join(workflow_dir, "test-workflow.json")
    if not os.path.exists(test_file):
        with open(test_file, 'w') as f:
            json.dump(test_workflow, f, ensure_ascii=False, indent=2)
        print("创建测试工作流: {}".format(test_file))

if __name__ == "__main__":
    create_default_workflows()
