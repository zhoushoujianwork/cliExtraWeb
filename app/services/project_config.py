"""
项目配置管理
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class ProjectConfig:
    """项目配置管理器"""
    
    def __init__(self):
        self.config_dir = os.path.expanduser('~/.cliExtraWeb')
        self.config_file = os.path.join(self.config_dir, 'config.json')
        self._config = self._load_config()
    
    def _load_config(self) -> Dict:
        """加载配置文件"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f'加载配置文件失败: {e}')
        
        # 返回默认配置
        return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """获取默认配置"""
        # 尝试从cliExtra获取配置
        cliextra_projects_dir = self._get_cliextra_projects_dir()
        
        return {
            'default_projects_dir': cliextra_projects_dir,
            'git_clone_timeout': 300,  # 5分钟
            'auto_create_projects_dir': True,
            'git_clone_naming': 'repo_name',  # 'repo_name' 或 'instance_name'
            'version': '1.0'
        }
    
    def _get_cliextra_projects_dir(self) -> str:
        """从cliExtra配置获取Projects目录"""
        try:
            import subprocess
            result = subprocess.run(
                ['cliExtra', 'config', 'show'],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                # 解析输出找到Projects目录
                lines = result.stdout.split('\n')
                for line in lines:
                    if line.startswith('Projects:'):
                        projects_dir = line.split(':', 1)[1].strip()
                        if os.path.exists(projects_dir):
                            logger.info(f'使用cliExtra配置的Projects目录: {projects_dir}')
                            return projects_dir
                        
        except Exception as e:
            logger.warning(f'获取cliExtra配置失败: {e}')
        
        # 回退到默认路径
        home_dir = os.path.expanduser('~')
        fallback_dir = os.path.join(home_dir, 'Projects')
        logger.info(f'使用默认Projects目录: {fallback_dir}')
        return fallback_dir
    
    def _save_config(self):
        """保存配置文件"""
        try:
            # 确保配置目录存在
            os.makedirs(self.config_dir, exist_ok=True)
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            
            logger.info(f'配置已保存到: {self.config_file}')
        except Exception as e:
            logger.error(f'保存配置文件失败: {e}')
    
    def get(self, key: str, default=None):
        """获取配置值"""
        return self._config.get(key, default)
    
    def set(self, key: str, value):
        """设置配置值"""
        self._config[key] = value
        self._save_config()
    
    def get_default_projects_dir(self) -> str:
        """获取默认项目目录"""
        projects_dir = self.get('default_projects_dir')
        
        # 展开用户目录
        projects_dir = os.path.expanduser(projects_dir)
        
        # 如果配置了自动创建目录且目录不存在，则创建
        if self.get('auto_create_projects_dir', True) and not os.path.exists(projects_dir):
            try:
                os.makedirs(projects_dir, exist_ok=True)
                logger.info(f'创建默认项目目录: {projects_dir}')
            except Exception as e:
                logger.error(f'创建项目目录失败: {e}')
                # 回退到用户主目录
                projects_dir = os.path.expanduser('~')
        
        return projects_dir
    
    def set_default_projects_dir(self, path: str):
        """设置默认项目目录"""
        expanded_path = os.path.expanduser(path)
        
        # 验证路径
        if not os.path.exists(expanded_path):
            raise ValueError(f'目录不存在: {expanded_path}')
        
        if not os.path.isdir(expanded_path):
            raise ValueError(f'不是有效的目录: {expanded_path}')
        
        if not os.access(expanded_path, os.W_OK):
            raise ValueError(f'没有写入权限: {expanded_path}')
        
        self.set('default_projects_dir', expanded_path)
    
    def get_git_clone_timeout(self) -> int:
        """获取Git克隆超时时间（秒）"""
        return self.get('git_clone_timeout', 300)
    
    def set_git_clone_timeout(self, timeout: int):
        """设置Git克隆超时时间（秒）"""
        if timeout < 30:
            raise ValueError('超时时间不能少于30秒')
        if timeout > 1800:
            raise ValueError('超时时间不能超过30分钟')
        
        self.set('git_clone_timeout', timeout)
    
    def get_git_clone_naming(self) -> str:
        """获取Git克隆目录命名策略"""
        return self.get('git_clone_naming', 'repo_name')
    
    def set_git_clone_naming(self, naming: str):
        """设置Git克隆目录命名策略"""
        if naming not in ['repo_name', 'instance_name']:
            raise ValueError('命名策略必须是 repo_name 或 instance_name')
        
        self.set('git_clone_naming', naming)
    
    def get_config_summary(self) -> Dict:
        """获取配置摘要"""
        return {
            'default_projects_dir': self.get_default_projects_dir(),
            'git_clone_timeout': self.get_git_clone_timeout(),
            'git_clone_naming': self.get_git_clone_naming(),
            'auto_create_projects_dir': self.get('auto_create_projects_dir', True),
            'config_file': self.config_file
        }

# 全局配置实例
project_config = ProjectConfig()
