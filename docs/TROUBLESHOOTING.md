# 故障排除指南

## 🔧 常见问题解决方案

### 启动脚本无法运行

#### 问题：`./start.sh` 或 `./start_new.sh` 报错

**解决方案：**
1. 首先运行环境检查：
   ```bash
   ./check_env.sh
   ```

2. 检查脚本权限：
   ```bash
   chmod +x start.sh start_new.sh check_env.sh
   ```

3. 检查依赖是否安装：
   ```bash
   # 检查Python
   python3 --version
   
   # 检查Q CLI
   q --version
   
   # 检查Screen
   screen --version
   ```

### Screen相关问题

#### 问题：Screen未安装或版本检查失败

**解决方案：**
```bash
# macOS
brew install screen

# Linux
sudo apt-get install screen

# 验证安装
screen --version
```

#### 问题：Screen会话无法接管

**解决方案：**
```bash
# 查看所有Screen会话
screen -list

# 强制接管会话
screen -dr q_instance_1

# 清理僵尸会话
screen -wipe
```

#### 问题：Screen实例启动失败

**解决方案：**
```bash
# 检查Screen脚本权限
chmod +x bin/screen_q_chat.sh

# 手动测试脚本
./bin/screen_q_chat.sh help

# 清理所有实例重新开始
./bin/screen_q_chat.sh clean-all
```

### Python环境问题

#### 问题：模块导入错误

**解决方案：**
```bash
# 确保激活虚拟环境
source venv/bin/activate

# 重新安装依赖
pip install -r requirements.txt

# 检查Flask是否正确安装
python3 -c "import flask; print('Flask OK')"
```

#### 问题：虚拟环境问题

**解决方案：**
```bash
# 删除旧的虚拟环境
rm -rf venv

# 重新创建
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 应用运行问题

#### 问题：端口被占用

**解决方案：**
```bash
# 查找占用端口5001的进程
lsof -i :5001

# 终止进程
kill -9 <PID>

# 或修改端口（在run.py中）
# socketio.run(app, port=5002)
```

#### 问题：WebSocket连接失败

**解决方案：**
1. 检查防火墙设置
2. 确保浏览器支持WebSocket
3. 尝试刷新页面
4. 检查控制台错误信息

### Q CLI相关问题

#### 问题：Q CLI未安装或无法找到

**解决方案：**
```bash
# 检查Q CLI安装
which q

# 如果未安装，参考官方文档：
# https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/cli-install.html

# 检查PATH环境变量
echo $PATH
```

#### 问题：Q CLI认证问题

**解决方案：**
```bash
# 重新登录Q CLI
q auth login

# 检查认证状态
q auth status
```

### 日志和调试

#### 查看应用日志

```bash
# 查看Flask日志
tail -f flask.log

# 查看应用日志目录
ls -la logs/

# 查看Screen实例日志
ls -la /tmp/q_chat_sessions/
```

#### 启用调试模式

```bash
# 设置环境变量
export FLASK_ENV=development
export FLASK_DEBUG=1

# 启动应用
python3 run.py
```

### 权限问题

#### 问题：脚本权限不足

**解决方案：**
```bash
# 修复所有脚本权限
chmod +x *.sh bin/*.sh

# 检查文件权限
ls -la *.sh bin/*.sh
```

#### 问题：临时目录权限

**解决方案：**
```bash
# 清理临时目录
rm -rf /tmp/q_chat_sessions

# 重新创建
mkdir -p /tmp/q_chat_sessions
```

### 性能问题

#### 问题：应用响应慢

**解决方案：**
1. 检查系统资源使用情况
2. 减少同时运行的实例数量
3. 清理旧的Screen会话
4. 重启应用

#### 问题：内存占用高

**解决方案：**
```bash
# 查看进程内存使用
ps aux | grep python

# 清理不需要的Screen会话
screen -wipe

# 重启应用
pkill -f "python.*run.py"
./start_new.sh
```

## 🆘 获取帮助

### 检查系统状态
```bash
# 运行完整的环境检查
./check_env.sh

# 查看Screen脚本帮助
./bin/screen_q_chat.sh help

# 查看所有Screen会话
screen -list
```

### 收集调试信息
```bash
# 系统信息
uname -a
python3 --version
q --version
screen --version

# 应用状态
ps aux | grep python
lsof -i :5001
```

### 重置应用
```bash
# 完全重置（谨慎使用）
./bin/screen_q_chat.sh clean-all
pkill -f "python.*run.py"
rm -rf /tmp/q_chat_sessions
./start_new.sh
```

## 📞 联系支持

如果以上解决方案都无法解决问题，请：

1. 运行 `./check_env.sh` 收集环境信息
2. 查看相关日志文件
3. 记录具体的错误信息
4. 创建Issue并提供详细信息

---

**提示**: 大多数问题都可以通过运行 `./check_env.sh` 来诊断和解决。
