/**
 * Workflow 管理模块
 * 提供 namespace workflow 的可视化和管理功能
 */

class WorkflowManager {
    constructor() {
        this.currentWorkflow = null;
        this.workflows = [];
        this.init();
    }

    init() {
        console.log('WorkflowManager 初始化...');
        this.loadWorkflowList();
    }

    /**
     * 加载所有 workflow 列表
     */
    async loadWorkflowList() {
        try {
            const response = await fetch('/api/workflow/list');
            const data = await response.json();
            
            if (data.success) {
                this.workflows = data.workflows;
                this.updateWorkflowList();
                console.log('Workflow 列表加载完成:', this.workflows);
            } else {
                console.error('加载 workflow 列表失败:', data.error);
                this.showError('加载 workflow 列表失败: ' + data.error);
            }
        } catch (error) {
            console.error('加载 workflow 列表异常:', error);
            this.showError('加载 workflow 列表异常: ' + error.message);
        }
    }

    /**
     * 获取指定 namespace 的 workflow
     */
    async loadWorkflow(namespace) {
        try {
            const response = await fetch(`/api/workflow/${namespace}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentWorkflow = data.workflow;
                this.displayWorkflow(namespace, data.workflow);
                console.log(`Workflow ${namespace} 加载完成:`, data.workflow);
            } else {
                console.error(`加载 workflow ${namespace} 失败:`, data.error);
                this.showError(`加载 workflow ${namespace} 失败: ` + data.error);
            }
        } catch (error) {
            console.error(`加载 workflow ${namespace} 异常:`, error);
            this.showError(`加载 workflow ${namespace} 异常: ` + error.message);
        }
    }

    /**
     * 更新 workflow 列表显示
     */
    updateWorkflowList() {
        const listContainer = document.getElementById('workflowList');
        if (!listContainer) return;

        let html = '<div class="row">';
        
        this.workflows.forEach(workflow => {
            const statusBadge = workflow.has_workflow 
                ? '<span class="badge bg-success">已配置</span>'
                : '<span class="badge bg-secondary">未配置</span>';
            
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="fas fa-project-diagram"></i> ${workflow.namespace}
                                ${statusBadge}
                            </h6>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i class="fas fa-server"></i> ${workflow.instance_count} 个实例
                                </small>
                            </p>
                            ${workflow.has_workflow ? `
                                <button class="btn btn-primary btn-sm" onclick="workflowManager.loadWorkflow('${workflow.namespace}')">
                                    <i class="fas fa-eye"></i> 查看详情
                                </button>
                            ` : `
                                <button class="btn btn-outline-secondary btn-sm" disabled>
                                    <i class="fas fa-times"></i> 无配置
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        listContainer.innerHTML = html;
    }

    /**
     * 显示 workflow 详情
     */
    displayWorkflow(namespace, workflow) {
        const detailContainer = document.getElementById('workflowDetail');
        if (!detailContainer) return;

        let html = `
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-project-diagram"></i> ${namespace} Workflow</h5>
                </div>
                <div class="card-body">
        `;

        // 项目信息
        if (workflow.project) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-info-circle"></i> 项目信息</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <strong>项目名称:</strong> ${workflow.project.name || 'N/A'}
                        </div>
                        <div class="col-md-6">
                            <strong>仓库:</strong> 
                            ${workflow.project.repository ? 
                                `<a href="${workflow.project.repository}" target="_blank">${workflow.project.repository}</a>` : 
                                'N/A'
                            }
                        </div>
                    </div>
                    <div class="mt-2">
                        <strong>描述:</strong> ${workflow.project.description || 'N/A'}
                    </div>
                </div>
            `;
        }

        // 角色信息
        if (workflow.roles && workflow.roles.length > 0) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-users"></i> 角色定义</h6>
                    <div class="row">
            `;
            
            workflow.roles.forEach(role => {
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">
                                    <i class="fas fa-user-tag"></i> ${role.name}
                                </h6>
                                <p class="card-text">${role.description || ''}</p>
                                ${role.tools && role.tools.length > 0 ? `
                                    <div class="mb-2">
                                        <strong>工具:</strong>
                                        ${role.tools.map(tool => `<span class="badge bg-info me-1">${tool}</span>`).join('')}
                                    </div>
                                ` : ''}
                                ${role.responsibilities && role.responsibilities.length > 0 ? `
                                    <div>
                                        <strong>职责:</strong>
                                        <ul class="small mb-0">
                                            ${role.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // 协作关系
        if (workflow.collaboration && workflow.collaboration.length > 0) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-handshake"></i> 协作关系</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>从</th>
                                    <th>到</th>
                                    <th>触发条件</th>
                                    <th>优先级</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            workflow.collaboration.forEach(collab => {
                const priorityBadge = collab.priority === 'high' ? 'bg-danger' : 
                                    collab.priority === 'medium' ? 'bg-warning' : 'bg-info';
                
                html += `
                    <tr>
                        <td><span class="badge bg-primary">${collab.from}</span></td>
                        <td><span class="badge bg-success">${collab.to}</span></td>
                        <td>${collab.trigger}</td>
                        <td><span class="badge ${priorityBadge}">${collab.priority}</span></td>
                        <td>${collab.action}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // 开发流程
        if (workflow.workflow && workflow.workflow.development) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-tasks"></i> 开发流程</h6>
                    <div class="workflow-steps">
            `;
            
            workflow.workflow.development.forEach((step, index) => {
                html += `
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="card-title">
                                        <span class="badge bg-primary me-2">${index + 1}</span>
                                        ${step.step}
                                    </h6>
                                    <p class="card-text">${step.description}</p>
                                    <div class="mb-2">
                                        <strong>负责人:</strong> 
                                        <span class="badge bg-info">${step.owner}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${step.dependencies && step.dependencies.length > 0 ? `
                                <div class="mb-2">
                                    <strong>依赖:</strong>
                                    ${step.dependencies.map(dep => `<span class="badge bg-warning me-1">${dep}</span>`).join('')}
                                </div>
                            ` : ''}
                            
                            ${step.deliverables && step.deliverables.length > 0 ? `
                                <div class="mb-2">
                                    <strong>交付物:</strong>
                                    ${step.deliverables.map(del => `<span class="badge bg-success me-1">${del}</span>`).join('')}
                                </div>
                            ` : ''}
                            
                            ${step.next && step.next.length > 0 ? `
                                <div>
                                    <strong>下一步:</strong>
                                    ${step.next.map(next => `<span class="badge bg-secondary me-1">${next}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // 当前实例
        if (workflow.current_instances && workflow.current_instances.length > 0) {
            html += `
                <div class="mb-4">
                    <h6><i class="fas fa-server"></i> 当前实例</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>实例 ID</th>
                                    <th>角色</th>
                                    <th>状态</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            workflow.current_instances.forEach(instance => {
                const statusBadge = instance.status === 'active' ? 'bg-success' : 'bg-secondary';
                
                html += `
                    <tr>
                        <td><code>${instance.id}</code></td>
                        <td><span class="badge bg-primary">${instance.role}</span></td>
                        <td><span class="badge ${statusBadge}">${instance.status}</span></td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        detailContainer.innerHTML = html;
        
        // 滚动到详情区域
        detailContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        // 可以集成到现有的通知系统
        console.error(message);
        if (typeof addSystemMessage === 'function') {
            addSystemMessage(`❌ ${message}`);
        }
    }

    /**
     * 刷新 workflow 数据
     */
    refresh() {
        this.loadWorkflowList();
    }
}

// 全局实例
let workflowManager;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    workflowManager = new WorkflowManager();
});

// 导出供全局使用
window.workflowManager = workflowManager;
