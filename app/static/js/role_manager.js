// 角色管理页面 JavaScript

class RoleManager {
    constructor() {
        this.currentRole = null;
        this.availableRoles = [];
        this.instances = [];
        this.selectedInstanceId = null;
        this.selectedRoleName = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadData();
    }
    
    bindEvents() {
        // 刷新按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });
        
        // 移除项目角色
        document.getElementById('removeProjectRoleBtn').addEventListener('click', () => {
            this.removeProjectRole();
        });
        
        // 创建自定义角色
        document.getElementById('createCustomRoleBtn').addEventListener('click', () => {
            this.showCreateRoleModal();
        });
        
        // 模态框关闭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // 表单提交
        document.getElementById('createRoleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCustomRole();
        });
        
        document.getElementById('editRoleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateRole();
        });
        
        // 应用角色到项目
        document.getElementById('applyToProjectBtn').addEventListener('click', () => {
            this.applyRoleToProject();
        });
        
        // 编辑角色
        document.getElementById('editRoleBtn').addEventListener('click', () => {
            this.showEditRoleModal();
        });
        
        // 应用实例角色
        document.getElementById('applyInstanceRoleBtn').addEventListener('click', () => {
            this.applyRoleToInstance();
        });
    }
    
    async loadData() {
        try {
            await Promise.all([
                this.loadProjectRole(),
                this.loadAvailableRoles(),
                this.loadInstances()
            ]);
        } catch (error) {
            this.showMessage('加载数据失败: ' + error.message, 'error');
        }
    }
    
    async loadProjectRole() {
        try {
            const response = await fetch('/api/project/role');
            const data = await response.json();
            
            if (data.success) {
                this.renderProjectRole(data.role_info);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('加载项目角色失败:', error);
            document.getElementById('projectRoleStatus').innerHTML = 
                '<div class="no-role"><i class="fas fa-exclamation-triangle"></i><div><h3>加载失败</h3><p>' + error.message + '</p></div></div>';
        }
    }
    
    async loadAvailableRoles() {
        try {
            const response = await fetch('/api/roles');
            const data = await response.json();
            
            if (data.success) {
                this.availableRoles = data.roles;
                this.renderAvailableRoles();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('加载可用角色失败:', error);
            document.getElementById('availableRoles').innerHTML = 
                '<div class="no-role"><i class="fas fa-exclamation-triangle"></i><div><h3>加载失败</h3><p>' + error.message + '</p></div></div>';
        }
    }
    
    async loadInstances() {
        try {
            const response = await fetch('/api/instances');
            const data = await response.json();
            
            if (data.success) {
                this.instances = data.instances;
                this.renderInstances();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('加载实例失败:', error);
            document.getElementById('instanceRoles').innerHTML = 
                '<div class="no-role"><i class="fas fa-exclamation-triangle"></i><div><h3>加载失败</h3><p>' + error.message + '</p></div></div>';
        }
    }
    
    renderProjectRole(roleInfo) {
        const container = document.getElementById('projectRoleStatus');
        const removeBtn = document.getElementById('removeProjectRoleBtn');
        
        if (roleInfo.current_role) {
            container.innerHTML = `
                <div class="current-role">
                    <i class="fas fa-user-check"></i>
                    <div class="role-info">
                        <h3>当前角色: ${roleInfo.current_role}</h3>
                        <p>项目路径: ${roleInfo.project_path}</p>
                        <p>Amazon Q 目录: ${roleInfo.amazonq_exists ? '已存在' : '不存在'}</p>
                    </div>
                </div>
            `;
            removeBtn.style.display = 'inline-flex';
        } else {
            container.innerHTML = `
                <div class="no-role">
                    <i class="fas fa-info-circle"></i>
                    <div class="role-info">
                        <h3>未设置角色</h3>
                        <p>当前项目未应用任何角色预设</p>
                        <p>项目路径: ${roleInfo.project_path}</p>
                    </div>
                </div>
            `;
            removeBtn.style.display = 'none';
        }
        
        this.currentRole = roleInfo.current_role;
    }
    
    renderAvailableRoles() {
        const container = document.getElementById('availableRoles');
        
        if (this.availableRoles.length === 0) {
            container.innerHTML = `
                <div class="no-role">
                    <i class="fas fa-info-circle"></i>
                    <div><h3>暂无可用角色</h3><p>请先创建角色预设</p></div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.availableRoles.map(role => `
            <div class="role-card ${role.name === this.currentRole ? 'current' : ''}" 
                 onclick="roleManager.showRoleDetail('${role.name}')">
                <h3>
                    <i class="fas fa-user-tie"></i>
                    ${role.name}
                    ${role.name === this.currentRole ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : ''}
                </h3>
                <p>${role.description}</p>
                <div class="role-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); roleManager.showRoleDetail('${role.name}')">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); roleManager.quickApplyToProject('${role.name}')">
                        <i class="fas fa-bolt"></i> 快速应用
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    renderInstances() {
        const container = document.getElementById('instanceRoles');
        
        if (this.instances.length === 0) {
            container.innerHTML = `
                <div class="no-role">
                    <i class="fas fa-info-circle"></i>
                    <div><h3>暂无运行实例</h3><p>请先启动 cliExtra 实例</p></div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.instances.map(instance => `
            <div class="instance-item">
                <div class="instance-info">
                    <h4>
                        <i class="fas fa-server"></i>
                        ${instance.id}
                        <span class="instance-status ${instance.status === 'running' ? 'running' : 'stopped'}">
                            ${instance.status === 'running' ? '运行中' : '已停止'}
                        </span>
                        ${instance.role ? `<span class="badge badge-info ms-2"><i class="fas fa-user-tie"></i> ${instance.role}</span>` : ''}
                    </h4>
                    ${instance.path ? `<p><i class="fas fa-folder"></i> 路径: ${instance.path}</p>` : ''}
                    ${instance.start_time ? `<p><i class="fas fa-clock"></i> 启动时间: ${instance.start_time}</p>` : ''}
                    ${instance.screen_session ? `<p><i class="fas fa-terminal"></i> Screen会话: ${instance.screen_session}</p>` : ''}
                    ${instance.pid ? `<p><i class="fas fa-microchip"></i> PID: ${instance.pid}</p>` : ''}
                </div>
                <div class="instance-actions">
                    <button class="btn btn-primary btn-sm" onclick="roleManager.showInstanceRoleModal('${instance.id}')">
                        <i class="fas fa-user-plus"></i> 应用角色
                    </button>
                    ${instance.role ? `
                    <button class="btn btn-warning btn-sm" onclick="roleManager.removeInstanceRole('${instance.id}')">
                        <i class="fas fa-user-minus"></i> 移除角色
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    async showRoleDetail(roleName) {
        try {
            const response = await fetch(`/api/roles/${roleName}`);
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('roleDetailTitle').textContent = `角色详情: ${roleName}`;
                document.getElementById('roleContent').textContent = data.content;
                this.selectedRoleName = roleName;
                this.showModal('roleDetailModal');
            } else {
                this.showMessage('获取角色内容失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('获取角色内容失败: ' + error.message, 'error');
        }
    }
    
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
    
    async quickApplyToProject(roleName) {
        if (confirm(`确定要将角色 "${roleName}" 应用到当前项目吗？`)) {
            await this.applyRoleToProject(roleName);
        }
    }
    
    async applyRoleToProject(roleName = null) {
        const roleToApply = roleName || this.selectedRoleName;
        if (!roleToApply) return;
        
        try {
            const response = await fetch('/api/project/role/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role_name: roleToApply,
                    force: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal('roleDetailModal');
                await this.loadProjectRole();
                this.renderAvailableRoles(); // 重新渲染以更新当前角色标记
            } else {
                this.showMessage('应用角色失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('应用角色失败: ' + error.message, 'error');
        }
    }
    
    async removeProjectRole() {
        if (confirm('确定要移除当前项目的角色预设吗？')) {
            try {
                const response = await fetch('/api/project/role/remove', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showMessage(data.message, 'success');
                    await this.loadProjectRole();
                    this.renderAvailableRoles();
                } else {
                    this.showMessage('移除角色失败: ' + data.error, 'error');
                }
            } catch (error) {
                this.showMessage('移除角色失败: ' + error.message, 'error');
            }
        }
    }
    
    showCreateRoleModal() {
        document.getElementById('newRoleName').value = '';
        document.getElementById('newRoleContent').value = '';
        this.showModal('createRoleModal');
    }
    
    async createCustomRole() {
        const roleName = document.getElementById('newRoleName').value.trim();
        const content = document.getElementById('newRoleContent').value.trim();
        
        if (!roleName || !content) {
            this.showMessage('请填写完整的角色信息', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/roles/custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role_name: roleName,
                    content: content
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal('createRoleModal');
                await this.loadAvailableRoles();
            } else {
                this.showMessage('创建角色失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('创建角色失败: ' + error.message, 'error');
        }
    }
    
    showEditRoleModal() {
        if (!this.selectedRoleName) return;
        
        document.getElementById('editRoleName').value = this.selectedRoleName;
        document.getElementById('editRoleContent').value = document.getElementById('roleContent').textContent;
        document.getElementById('editRoleTitle').textContent = `编辑角色: ${this.selectedRoleName}`;
        
        this.closeModal('roleDetailModal');
        this.showModal('editRoleModal');
    }
    
    async updateRole() {
        const roleName = document.getElementById('editRoleName').value.trim();
        const content = document.getElementById('editRoleContent').value.trim();
        
        if (!roleName || !content) {
            this.showMessage('请填写完整的角色信息', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/roles/${roleName}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal('editRoleModal');
                await this.loadAvailableRoles();
            } else {
                this.showMessage('更新角色失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('更新角色失败: ' + error.message, 'error');
        }
    }
    
    showInstanceRoleModal(instanceId) {
        this.selectedInstanceId = instanceId;
        document.getElementById('instanceRoleTitle').textContent = `为实例 ${instanceId} 应用角色`;
        
        // 渲染角色选择
        const container = document.getElementById('instanceRoleSelect');
        container.innerHTML = this.availableRoles.map(role => `
            <div class="role-option" onclick="roleManager.selectRoleForInstance('${role.name}')">
                <strong>${role.name}</strong><br>
                <small>${role.description}</small>
            </div>
        `).join('');
        
        this.showModal('instanceRoleModal');
    }
    
    selectRoleForInstance(roleName) {
        // 清除之前的选择
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // 选择当前角色
        event.target.closest('.role-option').classList.add('selected');
        this.selectedRoleName = roleName;
    }
    
    async applyRoleToInstance() {
        if (!this.selectedInstanceId || !this.selectedRoleName) {
            this.showMessage('请选择实例和角色', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/instance/${this.selectedInstanceId}/role/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role_name: this.selectedRoleName,
                    force: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal('instanceRoleModal');
            } else {
                this.showMessage('应用角色失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('应用角色失败: ' + error.message, 'error');
        }
    }
    
    async removeInstanceRole(instanceId) {
        if (confirm(`确定要移除实例 ${instanceId} 的角色预设吗？`)) {
            try {
                const response = await fetch(`/api/instance/${instanceId}/role/remove`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showMessage(data.message, 'success');
                } else {
                    this.showMessage('移除实例角色失败: ' + data.error, 'error');
                }
            } catch (error) {
                this.showMessage('移除实例角色失败: ' + error.message, 'error');
            }
        }
    }
}

// 全局实例
let roleManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    roleManager = new RoleManager();
});

// 全局函数（供 HTML 调用）
function closeModal(modalId) {
    roleManager.closeModal(modalId);
}
