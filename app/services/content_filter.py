"""
对话内容过滤器
用于清理Q CLI输出，只保留实际的AI回复内容
"""
import re
from typing import List, Dict, Any

class ContentFilter:
    """内容过滤器"""
    
    def __init__(self):
        # Q CLI界面元素的正则表达式
        self.ui_patterns = [
            # ASCII艺术和装饰
            r'^[⠀-⣿\s]*$',  # Braille字符
            r'^[╭╮╯╰─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬]+.*$',  # 框线字符
            r'^[▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▔▕▖▗▘▙▚▛▜▝▞▟]+.*$',  # 块字符
            
            # Q CLI提示信息
            r'.*Did you know\?.*',
            r'.*You can execute bash commands.*',
            r'.*ctrl \+ j new lines.*',
            r'.*\/help all commands.*',
            r'.*All tools are now trusted.*',
            r'.*Agents can sometimes do unexpected things.*',
            r'.*Learn more at https:\/\/docs\.aws\.amazon\.com.*',
            r'.*🤖 You are chatting with.*',
            r'.*Picking up where we left off.*',
            
            # 时间戳和控制字符
            r'^\[.*\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.*\]$',
            r'^.*\[\d+G.*$',  # 光标控制
            r'^.*\?\d+[hl].*$',  # 终端控制序列
            
            # 空行和纯空白
            r'^\s*$',
            
            # ANSI转义序列残留
            r'^[\x1b\[\d;]*[mK]*$',
        ]
        
        # 编译正则表达式以提高性能
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.ui_patterns]
    
    def clean_content(self, raw_content: str) -> str:
        """
        清理原始内容，只保留实际的AI回复
        
        Args:
            raw_content: 原始内容
            
        Returns:
            清理后的内容
        """
        if not raw_content:
            return ""
        
        lines = raw_content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # 移除ANSI转义序列
            clean_line = self._remove_ansi_sequences(line)
            
            # 检查是否是UI元素
            if not self._is_ui_element(clean_line):
                # 进一步清理内容
                processed_line = self._process_content_line(clean_line)
                if processed_line.strip():
                    cleaned_lines.append(processed_line)
        
        # 合并连续的空行
        result = self._merge_empty_lines('\n'.join(cleaned_lines))
        
        # 移除开头和结尾的空行
        return result.strip()
    
    def _remove_ansi_sequences(self, text: str) -> str:
        """移除ANSI转义序列"""
        # 移除ANSI颜色和控制序列
        ansi_pattern = re.compile(r'\x1b\[[0-9;]*[mK]')
        text = ansi_pattern.sub('', text)
        
        # 移除其他控制字符
        control_pattern = re.compile(r'\x1b\[[?]?\d*[hl]')
        text = control_pattern.sub('', text)
        
        return text
    
    def _is_ui_element(self, line: str) -> bool:
        """检查是否是UI元素"""
        for pattern in self.compiled_patterns:
            if pattern.match(line):
                return True
        return False
    
    def _process_content_line(self, line: str) -> str:
        """处理内容行"""
        # 移除行首的特殊字符（如 > 提示符）
        line = re.sub(r'^[\s>]*', '', line)
        
        # 移除行尾的控制字符
        line = re.sub(r'[\x00-\x1f\x7f-\x9f]*$', '', line)
        
        return line
    
    def parse_conversation(self, raw_content: str) -> List[Dict[str, Any]]:
        """
        解析对话内容，区分AI输出和用户输入
        
        Args:
            raw_content: 原始内容
            
        Returns:
            对话列表，每个元素包含 type, content, timestamp
        """
        if not raw_content:
            return []
        
        lines = raw_content.split('\n')
        conversations = []
        current_message = {
            'type': None,
            'content': '',
            'timestamp': None,
            'raw_lines': []
        }
        
        for line in lines:
            # 清理ANSI序列
            clean_line = self._remove_ansi_sequences(line)
            
            # 检测发言者标识
            speaker_info = self._detect_speaker(clean_line)
            
            if speaker_info:
                # 保存之前的消息
                if current_message['type'] and current_message['content'].strip():
                    conversations.append({
                        'type': current_message['type'],
                        'content': current_message['content'].strip(),
                        'timestamp': current_message['timestamp'] or self._extract_timestamp(line),
                        'raw_content': '\n'.join(current_message['raw_lines'])
                    })
                
                # 开始新消息
                current_message = {
                    'type': speaker_info['type'],
                    'content': speaker_info['content'],
                    'timestamp': speaker_info['timestamp'] or self._extract_timestamp(line),
                    'raw_lines': [line]
                }
            elif current_message['type'] and self._is_message_continuation(clean_line):
                # 继续当前消息
                current_message['content'] += '\n' + clean_line
                current_message['raw_lines'].append(line)
            elif current_message['type']:
                # 消息结束，保存当前消息
                if current_message['content'].strip():
                    conversations.append({
                        'type': current_message['type'],
                        'content': current_message['content'].strip(),
                        'timestamp': current_message['timestamp'],
                        'raw_content': '\n'.join(current_message['raw_lines'])
                    })
                current_message = {'type': None, 'content': '', 'timestamp': None, 'raw_lines': []}
        
        # 保存最后一条消息
        if current_message['type'] and current_message['content'].strip():
            conversations.append({
                'type': current_message['type'],
                'content': current_message['content'].strip(),
                'timestamp': current_message['timestamp'],
                'raw_content': '\n'.join(current_message['raw_lines'])
            })
        
        return self._filter_conversations(conversations)
    
    def _detect_speaker(self, line: str) -> Dict[str, Any]:
        """
        检测发言者类型
        
        Args:
            line: 清理后的行内容
            
        Returns:
            发言者信息字典，包含 type, content, timestamp
        """
        # 用户输入标识：!> 开头
        user_patterns = [
            r'^!>\s*(.*)$',                     # !> 用户输入
            r'^User:\s*(.*)$',                  # User: 格式
            r'^你:\s*(.*)$',                    # 中文用户标识
            r'^Question:\s*(.*)$',              # Question: 格式
            r'^>\s+(.+)$'                       # > 后面跟内容（用户输入）
        ]
        
        # AI输出标识：> 开头（但不是用户输入）
        ai_patterns = [
            r'^>\s*$',                          # 单独的 > （AI开始响应）
            r'^>\[0m\s*(.*)$',                  # >[0m AI响应
            r'^Assistant:\s*(.*)$',             # Assistant: 格式
            r'^AI:\s*(.*)$',                    # AI: 格式
            r'^回答:\s*(.*)$',                  # 中文回答标识
            r'^Answer:\s*(.*)$'                 # Answer: 格式
        ]
        
        # 系统消息标识
        system_patterns = [
            r'^System:\s*(.*)$',                # System: 格式
            r'^系统:\s*(.*)$',                  # 中文系统标识
            r'^\[系统\]\s*(.*)$',               # [系统] 格式
            r'^\[INFO\]\s*(.*)$',               # [INFO] 格式
            r'^\[ERROR\]\s*(.*)$'               # [ERROR] 格式
        ]
        
        # 检测用户输入
        for pattern in user_patterns:
            match = re.match(pattern, line)
            if match:
                return {
                    'type': 'user',
                    'content': match.group(1).strip() if match.group(1) else '',
                    'timestamp': self._extract_timestamp(line)
                }
        
        # 检测AI输出
        for pattern in ai_patterns:
            match = re.match(pattern, line)
            if match:
                return {
                    'type': 'assistant',
                    'content': match.group(1).strip() if len(match.groups()) > 0 and match.group(1) else '',
                    'timestamp': self._extract_timestamp(line)
                }
        
        # 检测系统消息
        for pattern in system_patterns:
            match = re.match(pattern, line)
            if match:
                return {
                    'type': 'system',
                    'content': match.group(1).strip() if match.group(1) else '',
                    'timestamp': self._extract_timestamp(line)
                }
        
        return None
    
    def _is_message_continuation(self, line: str) -> bool:
        """
        判断是否为消息继续行
        
        Args:
            line: 清理后的行内容
            
        Returns:
            是否为消息继续
        """
        # 排除明显的分隔符和系统信息
        exclude_patterns = [
            r'^=+$',                            # 等号分隔符
            r'^-+$',                            # 减号分隔符
            r'^\[.*\]$',                        # 方括号包围的系统信息
            r'Thinking\.\.\.',                  # Thinking... (完全匹配)
            r'Loading\.\.\.',                   # Loading... (完全匹配)
            r'^\d{4}-\d{2}-\d{2}',             # 日期格式
            r'^\d{2}:\d{2}:\d{2}',             # 时间格式
            r'^[>!>]\s*',                       # 新的发言者标识
            r'^(User|Assistant|AI|System|你|回答|系统):\s*'  # 角色标识
        ]
        
        for pattern in exclude_patterns:
            if re.match(pattern, line):
                return False
        
        return line.strip() != ''
    
    def _extract_timestamp(self, line: str) -> str:
        """
        从行中提取时间戳
        
        Args:
            line: 原始行内容
            
        Returns:
            时间戳字符串
        """
        # 匹配常见的时间格式
        time_patterns = [
            r'(\d{2}:\d{2}:\d{2})',             # HH:MM:SS
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})',  # YYYY-MM-DD HH:MM:SS
            r'\[(\d{2}:\d{2}:\d{2})\]'          # [HH:MM:SS]
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1)
        
        # 如果没有找到时间戳，返回当前时间
        from datetime import datetime
        return datetime.now().strftime('%H:%M:%S')
    
    def _filter_conversations(self, conversations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        过滤和清理对话列表
        
        Args:
            conversations: 原始对话列表
            
        Returns:
            过滤后的对话列表
        """
        filtered = []
        
        for conv in conversations:
            # 过滤掉太短的消息
            if len(conv['content']) < 2:
                continue
            
            # 过滤掉纯系统噪音
            system_noise = [
                'Thinking...',
                'Loading...',
                'Please wait...',
                '请稍等...',
                'hi',
                '...'
            ]
            
            if any(noise in conv['content'] for noise in system_noise):
                continue
            
            # 清理内容
            conv['content'] = self._clean_conversation_content(conv['content'])
            
            # 添加处理标记
            conv['needs_rich_text'] = self._needs_rich_text_rendering(conv['content'])
            conv['id'] = f"{conv['type']}_{len(filtered)}_{hash(conv['content']) % 10000}"
            
            filtered.append(conv)
        
        return filtered
    
    def _clean_conversation_content(self, content: str) -> str:
        """
        清理对话内容
        
        Args:
            content: 原始内容
            
        Returns:
            清理后的内容
        """
        # 移除多余的空行
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
        
        # 移除行首的提示符残留
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # 移除行首的 > 或 !> 残留
            line = re.sub(r'^[>!]+\s*', '', line)
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines).strip()
    
    def _needs_rich_text_rendering(self, content: str) -> bool:
        """
        判断是否需要富文本渲染
        
        Args:
            content: 内容
            
        Returns:
            是否需要富文本渲染
        """
        rich_text_indicators = [
            '```',              # 代码块
            '![',               # 图片
            '**',               # 粗体
            '*',                # 斜体
            '#',                # 标题
            '- ',               # 列表
            '1. ',              # 编号列表
            '✅', '❌', '⚠️',   # 状态图标
            'http://',          # 链接
            'https://'          # 链接
        ]
        
        return any(indicator in content for indicator in rich_text_indicators)
    
    def extract_code_blocks(self, content: str) -> List[Dict[str, Any]]:
        """
        提取代码块
        
        Args:
            content: 内容
            
        Returns:
            代码块列表
        """
        code_blocks = []
        
        # 匹配代码块
        code_pattern = re.compile(r'```(\w+)?\n(.*?)\n```', re.DOTALL)
        matches = code_pattern.finditer(content)
        
        for match in matches:
            language = match.group(1) or 'text'
            code = match.group(2)
            code_blocks.append({
                'language': language,
                'code': code,
                'start': match.start(),
                'end': match.end()
            })
        
        return code_blocks
    
    def format_for_display(self, content: str) -> str:
        """
        格式化内容用于显示
        
        Args:
            content: 清理后的内容
            
        Returns:
            格式化后的内容
        """
        if not content:
            return ""
        
        # 自动检测和格式化代码块
        content = self._auto_format_code_blocks(content)
        
        # 格式化列表
        content = self._format_lists(content)
        
        # 格式化链接
        content = self._format_links(content)
        
        return content
    
    def _auto_format_code_blocks(self, content: str) -> str:
        """自动格式化代码块"""
        lines = content.split('\n')
        formatted_lines = []
        in_code_block = False
        code_lines = []
        
        for line in lines:
            # 检测代码行（以特定字符开头或包含命令）
            if self._looks_like_code(line) and not in_code_block:
                if code_lines:
                    # 结束之前的代码块
                    formatted_lines.append('```bash')
                    formatted_lines.extend(code_lines)
                    formatted_lines.append('```')
                    code_lines = []
                
                in_code_block = True
                code_lines.append(line)
            elif in_code_block and (self._looks_like_code(line) or line.strip() == ''):
                code_lines.append(line)
            else:
                if in_code_block:
                    # 结束代码块
                    formatted_lines.append('```bash')
                    formatted_lines.extend(code_lines)
                    formatted_lines.append('```')
                    code_lines = []
                    in_code_block = False
                
                formatted_lines.append(line)
        
        # 处理最后的代码块
        if in_code_block and code_lines:
            formatted_lines.append('```bash')
            formatted_lines.extend(code_lines)
            formatted_lines.append('```')
        
        return '\n'.join(formatted_lines)
    
    def _looks_like_code(self, line: str) -> bool:
        """判断是否像代码行"""
        code_indicators = [
            r'^\s*[/$#>]\s+',  # 命令提示符
            r'^\s*\w+\s*=',    # 变量赋值
            r'^\s*function\s+', # 函数定义
            r'^\s*if\s+',      # 条件语句
            r'^\s*for\s+',     # 循环语句
            r'^\s*while\s+',   # 循环语句
            r'^\s*echo\s+',    # echo命令
            r'^\s*cd\s+',      # cd命令
            r'^\s*ls\s+',      # ls命令
            r'^\s*grep\s+',    # grep命令
            r'^\s*awk\s+',     # awk命令
            r'^\s*sed\s+',     # sed命令
        ]
        
        for pattern in code_indicators:
            if re.match(pattern, line):
                return True
        
        return False
    
    def _format_lists(self, content: str) -> str:
        """格式化列表"""
        # 将 • 转换为 -
        content = re.sub(r'^\s*•\s+', '- ', content, flags=re.MULTILINE)
        return content
    
    def _format_links(self, content: str) -> str:
        """格式化链接"""
        # 自动转换URL为Markdown链接
        url_pattern = re.compile(r'(https?://[^\s]+)')
        content = url_pattern.sub(r'[\1](\1)', content)
        return content

# 创建全局实例
content_filter = ContentFilter()
