// GitHub配置文件
// 用于管理GitHub API相关的配置信息

class GitHubConfig {
    constructor() {
        // GitHub仓库配置
        this.owner = ''; // GitHub用户名，需要管理员设置
        this.repo = ''; // 仓库名，需要管理员设置
        this.branch = 'main'; // 默认分支
        this.token = ''; // GitHub Personal Access Token，需要管理员设置
        
        // API基础URL
        this.apiBase = 'https://api.github.com';
        
        // 从localStorage加载配置
        this.loadConfig();
    }
    
    // 从localStorage加载配置
    loadConfig() {
        const savedConfig = localStorage.getItem('github-config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            this.owner = config.owner || '';
            this.repo = config.repo || '';
            this.branch = config.branch || 'main';
            this.token = config.token || '';
        }
    }
    
    // 保存配置到localStorage
    saveConfig() {
        const config = {
            owner: this.owner,
            repo: this.repo,
            branch: this.branch,
            token: this.token
        };
        localStorage.setItem('github-config', JSON.stringify(config));
    }
    
    // 设置GitHub配置
    setConfig(owner, repo, token, branch = 'main') {
        this.owner = owner;
        this.repo = repo;
        this.token = token;
        this.branch = branch;
        this.saveConfig();
    }
    
    // 检查配置是否完整
    isConfigured() {
        return this.owner && this.repo && this.token;
    }
    
    // 获取API请求头
    getHeaders() {
        return {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        };
    }
    
    // 获取文件API URL
    getFileUrl(path) {
        return `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`;
    }
    
    // 显示配置对话框
    showConfigDialog() {
        const owner = prompt('请输入GitHub用户名:', this.owner);
        if (!owner) return false;
        
        const repo = prompt('请输入仓库名:', this.repo);
        if (!repo) return false;
        
        const token = prompt('请输入GitHub Token:', this.token ? '***已设置***' : '');
        if (!token || token === '***已设置***') {
            if (!this.token) {
                alert('Token不能为空');
                return false;
            }
        } else {
            this.token = token;
        }
        
        this.setConfig(owner, repo, this.token);
        alert('GitHub配置已保存！');
        return true;
    }
}

// 创建全局配置实例
const githubConfig = new GitHubConfig();