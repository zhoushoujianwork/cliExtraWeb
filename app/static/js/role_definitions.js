/**
 * 角色定义和配置
 * 支持所有可用的 cliExtra 角色
 */

const ROLE_DEFINITIONS = {
    // 原有角色
    'devops-engineer': {
        name: 'DevOps 工程师',
        description: '运维工程师 - Shell脚本开发和系统管理',
        icon: 'fas fa-server',
        color: '#28a745',
        tags: ['Shell', 'Linux', 'Docker', '自动化'],
        responsibilities: [
            'Shell脚本开发和维护',
            '系统配置和服务管理', 
            '自动化运维脚本编写',
            '监控和部署管理'
        ]
    },
    
    'frontend-engineer': {
        name: '前端工程师',
        description: '前端工程师 - Web界面开发',
        icon: 'fas fa-code',
        color: '#007bff',
        tags: ['JavaScript', 'React', 'Vue', 'CSS'],
        responsibilities: [
            'Web界面开发和优化',
            '前端用户体验设计',
            'API集成和数据展示',
            '前端性能优化'
        ]
    },

    // 新增专业角色
    'fullstack': {
        name: '全栈工程师',
        description: '全栈工程师 - 前后端全栈开发',
        icon: 'fas fa-layer-group',
        color: '#6f42c1',
        tags: ['Go', 'Vue.js', 'Python', 'React', '全栈'],
        responsibilities: [
            '前后端全栈开发',
            'Go+Vue.js 技术栈',
            'Python+React 技术栈',
            '完整项目架构设计',
            '前后端接口设计',
            '全栈性能优化'
        ],
        techStack: {
            backend: ['Go', 'Python', 'Node.js'],
            frontend: ['Vue.js', 'React', 'TypeScript'],
            database: ['PostgreSQL', 'MongoDB', 'Redis'],
            tools: ['Docker', 'Git', 'CI/CD']
        }
    },

    'golang': {
        name: 'Go语言专家',
        description: 'Go语言专家 - 高性能后端服务开发',
        icon: 'fab fa-golang',
        color: '#00add8',
        tags: ['Go', 'Gin', 'gRPC', '微服务', '并发'],
        responsibilities: [
            '高性能后端服务开发',
            'Gin框架Web开发',
            'gRPC微服务架构',
            '并发编程和性能优化',
            '分布式系统设计',
            'Go语言最佳实践'
        ],
        techStack: {
            frameworks: ['Gin', 'Echo', 'Fiber'],
            microservices: ['gRPC', 'Protocol Buffers'],
            database: ['PostgreSQL', 'MongoDB', 'Redis'],
            tools: ['Docker', 'Kubernetes', 'Prometheus']
        }
    },

    'python': {
        name: 'Python专家',
        description: 'Python专家 - Web开发和数据分析',
        icon: 'fab fa-python',
        color: '#3776ab',
        tags: ['Python', 'Django', 'FastAPI', '数据分析', 'AI'],
        responsibilities: [
            'Django/FastAPI Web开发',
            '数据处理和分析',
            '异步编程和任务调度',
            'RESTful API设计',
            '机器学习和AI集成',
            'Python性能优化'
        ],
        techStack: {
            web: ['Django', 'FastAPI', 'Flask'],
            data: ['Pandas', 'NumPy', 'Matplotlib'],
            async: ['asyncio', 'Celery', 'aiohttp'],
            ai: ['TensorFlow', 'PyTorch', 'scikit-learn']
        }
    },

    'vue': {
        name: 'Vue.js专家',
        description: 'Vue.js专家 - 现代前端开发',
        icon: 'fab fa-vuejs',
        color: '#4fc08d',
        tags: ['Vue.js', 'Composition API', 'Pinia', 'Vite'],
        responsibilities: [
            'Vue 3 Composition API开发',
            '现代前端工具链配置',
            '组件库开发和维护',
            'Pinia状态管理',
            'Vue生态系统集成',
            '前端性能优化'
        ],
        techStack: {
            core: ['Vue 3', 'Composition API', 'TypeScript'],
            state: ['Pinia', 'Vuex'],
            routing: ['Vue Router'],
            build: ['Vite', 'Webpack'],
            ui: ['Element Plus', 'Ant Design Vue', 'Quasar']
        }
    }
};

/**
 * 获取角色定义
 */
function getRoleDefinition(roleKey) {
    return ROLE_DEFINITIONS[roleKey] || null;
}

/**
 * 获取所有角色列表
 */
function getAllRoles() {
    return Object.keys(ROLE_DEFINITIONS).map(key => ({
        key,
        ...ROLE_DEFINITIONS[key]
    }));
}

/**
 * 按类别分组角色
 */
function getRolesByCategory() {
    const categories = {
        'backend': ['devops-engineer', 'golang', 'python'],
        'frontend': ['frontend-engineer', 'vue'],
        'fullstack': ['fullstack']
    };

    const result = {};
    for (const [category, roleKeys] of Object.entries(categories)) {
        result[category] = roleKeys.map(key => ({
            key,
            ...ROLE_DEFINITIONS[key]
        }));
    }

    return result;
}

/**
 * 搜索角色
 */
function searchRoles(query) {
    const lowerQuery = query.toLowerCase();
    return getAllRoles().filter(role => 
        role.name.toLowerCase().includes(lowerQuery) ||
        role.description.toLowerCase().includes(lowerQuery) ||
        role.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

// 导出供全局使用
window.ROLE_DEFINITIONS = ROLE_DEFINITIONS;
window.getRoleDefinition = getRoleDefinition;
window.getAllRoles = getAllRoles;
window.getRolesByCategory = getRolesByCategory;
window.searchRoles = searchRoles;
