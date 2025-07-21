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
    
    def _merge_empty_lines(self, text: str) -> str:
        """合并连续的空行"""
        # 将多个连续的空行合并为一个
        return re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    
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
