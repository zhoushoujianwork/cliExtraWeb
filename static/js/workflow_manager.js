/**
 * Workflow Manager JavaScript
 * 处理工作流管理页面的交互逻辑
 */

class WorkflowManager {
    constructor() {
        this.currentNamespace = 'default';
        this.workflows = [];
        this.init();
    }

    async init() {
        await this.loadWorkflowList();
        this.bindEvents();
    }

    async loadWorkflowList() {
        try {
            const response = await fetch(`/api/workflow/list?namespace=${this.currentNamespace}`);
            const data = await response.json();
            
            if (data.success) {
                this.workflows = data.workflows;
                this.renderWorkflowList();
            } else {
                console.error('加载 workflow 列表失败:', data.error);
                this.showError('加载工作流列表失败: ' + data.error);
            }
        } catch (error) {
            console.error('加载 workflow 列表异常:', error);
            this.showError('加载工作流列表异常: ' + error.message);
        }
    }

    renderWorkflowList() {
        const container = document.getElementById('workflowList');
        if (!container) return;

        if (this.workflows.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="card">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">暂无工作流</h5>
                            <p class="text-muted">当前 namespace 下还没有创建任何工作流</p>
                            <button class="btn btn-primary" onclick="workflowManager.createWorkflow()">
                                <i class="fas fa-plus"></i> 创建第一个工作流
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        this.workflows.forEach(workflow => {
            const statusBadge = this.getStatusBadge(workflow.status);
            const createdDate = new Date(workflow.created_at).toLocaleDateString();
            const updatedDate = new Date(workflow.updated_at).toLocaleDateString();

            html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card workflow-card h-100" data-workflow-id="${workflow.id}">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${workflow.name}</h6>
                            ${statusBadge}
                        </div>
                        <div class="card-body">
                            <p class="card-text text-muted small">${workflow.description || '无描述'}</p>
                            <div class="row text-center">
                                <div class="col-4">
                                    <div class="text-primary fw-bold">${workflow.node_count}</div>
                                    <small class="text-muted">节点</small>
                                </div>
                                <div class="col-4">
                                    <div class="text-success fw-bold">${workflow.edge_count}</div>
                                    <small class="text-muted">连线</small>
                                </div>
                                <div class="col-4">
                                    <div class="text-info fw-bold">${workflow.version}</div>
                                    <small class="text-muted">版本</small>
                                </div>
                            </div>
                            <hr>
                            <div class="d-flex justify-content-between text-muted small">
                                <span>创建: ${createdDate}</span>
                                <span>更新: ${updatedDate}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-outline-primary btn-sm" onclick="workflowManager.openDagEditor('${workflow.id}')">
                                    <i class="fas fa-project-diagram"></i> DAG 编辑
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="workflowManager.viewWorkflowDetail('${workflow.id}')">
                                    <i class="fas fa-eye"></i> 查看详情
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="workflowManager.deleteWorkflow('${workflow.id}')">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    getStatusBadge(status) {
        const badges = {
            'active': '<span class="badge bg-success">活跃</span>',
            'draft': '<span class="badge bg-warning">草稿</span>',
            'archived': '<span class="badge bg-secondary">归档</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">未知</span>';
    }

    openDagEditor(workflowId) {
        // 在新窗口中打开 DAG 编辑器
        const url = `/workflow/dag-editor?id=${workflowId}&namespace=${this.currentNamespace}`;
        window.open(url, '_blank');
    }

    async viewWorkflowDetail(workflowId) {
        try {
            const response = await fetch(`/api/workflow/${this.currentNamespace}/${workflowId}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderWorkflowDetail(data.workflow);
            } else {
                this.showError('加载工作流详情失败: ' + data.error);
            }
        } catch (error) {
            console.error('加载工作流详情异常:', error);
            this.showError('加载工作流详情异常: ' + error.message);
        }
    }

    renderWorkflowDetail(workflow) {
        const container = document.getElementById('workflowDetail');
        if (!container) return;

        const html = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fas fa-project-diagram"></i> ${workflow.name}
                        <button class="btn btn-primary btn-sm float-end" onclick="workflowManager.openDagEditor('${workflow.id}')">
                            <i class="fas fa-edit"></i> 在 DAG 编辑器中打开
                        </button>
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6>基本信息</h6>
                            <table class="table table-sm">
                                <tr>
                                    <td><strong>名称:</strong></td>
                                    <td>${workflow.name}</td>
                                </tr>
                                <tr>
                                    <td><strong>描述:</strong></td>
                                    <td>${workflow.description || '无描述'}</td>
                                </tr>
                                <tr>
                                    <td><strong>节点数量:</strong></td>
                                    <td>${workflow.nodes ? workflow.nodes.length : 0}</td>
                                </tr>
                                <tr>
                                    <td><strong>连线数量:</strong></td>
                                    <td>${workflow.edges ? workflow.edges.length : 0}</td>
                                </tr>
                            </table>
                        </div>
                        <div class="col-md-4">
                            <h6>节点列表</h6>
                            <div class="list-group list-group-flush">
                                ${workflow.nodes ? workflow.nodes.map(node => `
                                    <div class="list-group-item py-2">
                                        <div class="d-flex justify-content-between">
                                            <span class="fw-bold">${node.data ? node.data.label : node.name}</span>
                                            <span class="badge bg-secondary">${node.type}</span>
                                        </div>
                                        ${node.data && node.data.description ? `<small class="text-muted">${node.data.description}</small>` : ''}
                                    </div>
                                `).join('') : '<div class="text-muted">无节点</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    showError(message) {
        console.error(message);
        alert('错误: ' + message);
    }

    bindEvents() {
        // 可以在这里添加其他事件绑定
    }
}

// 全局实例
let workflowManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    workflowManager = new WorkflowManager();
});
