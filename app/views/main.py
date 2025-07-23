"""
Main views for Q Chat Manager
"""
from flask import Blueprint, render_template, request, send_from_directory, abort
import os

from app.services.instance_manager import instance_manager
from app.services.chat_manager import chat_manager

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """主页面"""
    # 获取 namespace 参数
    namespace = request.args.get('namespace', 'q_cli')
    
    instances = instance_manager.get_instances()
    
    # 加载包含 namespace 缓存的聊天历史
    chat_history = chat_manager.get_chat_history(limit=50, namespace=namespace)
    
    return render_template('chat_manager.html', 
                         instances=instances, 
                         chat_history=chat_history,
                         current_namespace=namespace)

@bp.route('/roles')
def roles():
    """角色管理页面"""
    return render_template('role_manager.html')

@bp.route('/static/data/<path:filename>')
def serve_data_file(filename):
    """提供数据文件的静态访问服务"""
    try:
        # 构建完整的文件路径
        work_dir = instance_manager.work_dir
        file_path = os.path.join(work_dir, filename)
        
        # 安全检查：确保文件路径在工作目录内
        if not os.path.abspath(file_path).startswith(os.path.abspath(work_dir)):
            abort(403)
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            abort(404)
        
        # 获取目录和文件名
        directory = os.path.dirname(file_path)
        filename_only = os.path.basename(file_path)
        
        return send_from_directory(directory, filename_only)
        
    except Exception as e:
        print(f"Error serving data file {filename}: {str(e)}")
        abort(500)

@bp.route('/workflow')
def workflow_manager():
    """Workflow 管理页面"""
    from app.services.dag_workflow_service import dag_workflow_service
    
    # 获取namespace参数
    namespace = request.args.get('namespace', 'default')
    
    # 获取DAG结构数据
    dag_result = dag_workflow_service.get_dag_structure(namespace)
    dag_data = dag_result.get('dag', {}) if dag_result.get('success') else {}
    
    return render_template('workflow_manager.html', 
                         namespace=namespace,
                         dag_data=dag_data)

@bp.route('/workflow/dag-editor')
def workflow_dag_editor():
    """Workflow DAG 编辑器页面"""
    return render_template('workflow_dag_editor.html')

@bp.route('/health')
def health():
    """健康检查"""
    return {'status': 'ok', 'instances': len(instance_manager.instances)}
