"""
Main views for Q Chat Manager
"""
from flask import Blueprint, render_template, request

from app.services.instance_manager import instance_manager
from app.services.chat_manager import chat_manager

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """主页面"""
    instances = instance_manager.get_instances()
    chat_history = chat_manager.get_chat_history(limit=50)
    
    return render_template('chat_manager.html', 
                         instances=instances, 
                         chat_history=chat_history)

@bp.route('/roles')
def roles():
    """角色管理页面"""
    return render_template('role_manager.html')

@bp.route('/workflow')
def workflow_manager():
    """Workflow 管理页面"""
    return render_template('workflow_manager.html')

@bp.route('/workflow/dag-editor')
def workflow_dag_editor():
    """Workflow DAG 编辑器页面"""
    return render_template('workflow_dag_editor.html')

@bp.route('/health')
def health():
    """健康检查"""
    return {'status': 'ok', 'instances': len(instance_manager.instances)}
