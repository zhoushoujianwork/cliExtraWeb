# 贡献指南

感谢您对Q Chat Manager项目的关注！本文档将指导您如何参与项目开发。

## 🔄 Git工作流

### 分支策略
- `main` - 主分支，稳定版本
- `develop` - 开发分支，最新功能
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支

### 开发流程

1. **Fork项目**
   ```bash
   # 在GitHub上Fork项目
   git clone https://github.com/your-username/cliExtra.git
   cd cliExtra
   ```

2. **设置上游仓库**
   ```bash
   git remote add upstream https://github.com/original-owner/cliExtra.git
   ```

3. **创建功能分支**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

4. **开发和测试**
   ```bash
   # 进行开发
   # 运行测试
   python -m pytest tests/
   ```

5. **提交更改**
   ```bash
   git add .
   git commit -m "✨ Add: your feature description"
   ```

6. **推送和创建PR**
   ```bash
   git push origin feature/your-feature-name
   # 在GitHub上创建Pull Request
   ```

## 📝 提交规范

使用[Conventional Commits](https://www.conventionalcommits.org/)规范：

### 提交类型
- `✨ feat:` 新功能
- `🐛 fix:` 修复bug
- `📝 docs:` 文档更新
- `💄 style:` 代码格式化
- `♻️ refactor:` 代码重构
- `⚡ perf:` 性能优化
- `✅ test:` 测试相关
- `🔧 chore:` 构建/工具相关

### 示例
```bash
git commit -m "✨ feat: add markdown rendering for Q CLI responses"
git commit -m "🐛 fix: resolve WebSocket connection timeout issue"
git commit -m "📝 docs: update API documentation"
```

## 🧪 测试要求

### 运行测试
```bash
# 激活虚拟环境
source venv/bin/activate

# 安装测试依赖
pip install pytest pytest-cov

# 运行所有测试
python -m pytest

# 运行测试并生成覆盖率报告
python -m pytest --cov=app tests/
```

### 测试覆盖率
- 新功能必须包含测试
- 测试覆盖率应保持在80%以上
- 关键功能需要集成测试

## 📋 代码规范

### Python代码风格
- 遵循[PEP 8](https://pep8.org/)规范
- 使用类型提示
- 添加适当的文档字符串

### 示例
```python
def create_instance(self, instance_id: str) -> Dict[str, Any]:
    """创建新的Q CLI实例
    
    Args:
        instance_id: 实例唯一标识符
        
    Returns:
        Dict[str, Any]: 包含成功状态和实例信息的字典
        
    Raises:
        ValueError: 当实例ID无效时
    """
    pass
```

### JavaScript代码风格
- 使用ES6+语法
- 适当的注释
- 一致的命名规范

## 🔍 代码审查

### PR要求
- [ ] 代码符合项目规范
- [ ] 包含适当的测试
- [ ] 文档已更新
- [ ] 通过所有CI检查
- [ ] 功能完整且无明显bug

### 审查流程
1. 自动化测试通过
2. 至少一个维护者审查
3. 解决所有审查意见
4. 合并到目标分支

## 🐛 问题报告

### Bug报告模板
```markdown
**描述**
简要描述bug

**重现步骤**
1. 执行步骤1
2. 执行步骤2
3. 看到错误

**期望行为**
描述期望的正确行为

**实际行为**
描述实际发生的错误行为

**环境信息**
- OS: [e.g. macOS 12.0]
- Python版本: [e.g. 3.9.0]
- Q CLI版本: [e.g. 1.0.0]

**附加信息**
其他相关信息、截图等
```

### 功能请求模板
```markdown
**功能描述**
简要描述建议的功能

**使用场景**
描述什么情况下需要这个功能

**建议实现**
如果有具体的实现建议

**替代方案**
是否考虑过其他解决方案
```

## 📚 开发环境设置

### 本地开发
```bash
# 克隆项目
git clone <repository-url>
cd cliExtra

# 设置虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
pip install -r requirements-dev.txt  # 开发依赖

# 启动开发服务器
python run.py
```

### 开发工具推荐
- **IDE**: VS Code, PyCharm
- **调试**: Flask Debug Toolbar
- **测试**: pytest, coverage
- **代码质量**: flake8, black, mypy

## 🎯 发布流程

### 版本号规范
使用[语义化版本](https://semver.org/)：
- `MAJOR.MINOR.PATCH`
- 例如：`2.1.0`

### 发布步骤
1. 更新版本号
2. 更新CHANGELOG.md
3. 创建发布标签
4. 发布到GitHub Releases

## 📞 联系方式

- **Issues**: GitHub Issues
- **讨论**: GitHub Discussions
- **邮件**: project-maintainer@example.com

---

感谢您的贡献！🎉
