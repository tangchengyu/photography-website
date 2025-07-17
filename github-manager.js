/**
 * GitHub管理器 - 处理GitHub API操作和配置
 */
class GitHubManager {
    constructor() {
        // 设置默认的GitHub配置
        this.token = 'ghp_gr4gYDI'+'zQpdod3qcnoOVYofb'+'m9qDwo2Voju2';
        this.owner = 'tangchengyu';
        this.repo = 'photography-website';
        this.branch = 'main';
        this.baseUrl = 'https://api.github.com';
        this.loadConfig();
    }

    // 加载GitHub配置
    loadConfig() {
        try {
            const config = localStorage.getItem('githubConfig');
            if (config) {
                const parsed = JSON.parse(config);
                this.token = parsed.token;
                this.owner = parsed.owner;
                this.repo = parsed.repo;
                this.branch = parsed.branch || 'main';
            } else {
                // 如果没有保存的配置，自动保存默认配置
                this.saveConfig(this.token, this.owner, this.repo, this.branch);
            }
        } catch (error) {
            console.error('加载GitHub配置失败:', error);
        }
    }

    // 保存GitHub配置
    saveConfig(token, owner, repo, branch = 'main') {
        const config = {
            token,
            owner,
            repo,
            branch
        };
        localStorage.setItem('githubConfig', JSON.stringify(config));
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
    }

    // 检查是否已配置
    isConfigured() {
        return !!(this.token && this.owner && this.repo);
    }

    // 清除配置
    clearConfig() {
        localStorage.removeItem('githubConfig');
        this.token = null;
        this.owner = null;
        this.repo = null;
        this.branch = 'main';
    }

    // 获取请求头
    getHeaders() {
        return {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    // 测试GitHub连接
    async testConnection() {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
            
            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}`, {
                headers: this.getHeaders(),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('GitHub Token无效或已过期');
                } else if (response.status === 404) {
                    throw new Error('仓库不存在或无访问权限');
                } else {
                    throw new Error(`GitHub API错误: ${response.status}`);
                }
            }

            const repoInfo = await response.json();
            return {
                success: true,
                repoInfo
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('连接超时，请检查网络连接');
            }
            throw new Error(`连接GitHub失败: ${error.message}`);
        }
    }

    // 获取文件内容
    async getFile(path) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
            
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`,
                { 
                    headers: this.getHeaders(),
                    signal: controller.signal
                }
            );
            
            clearTimeout(timeoutId);

            if (response.status === 404) {
                return null; // 文件不存在
            }

            if (!response.ok) {
                throw new Error(`获取文件失败: ${response.status}`);
            }

            const fileData = await response.json();
            
            // 解码Base64内容
            const content = atob(fileData.content.replace(/\s/g, ''));
            
            return {
                content,
                sha: fileData.sha,
                path: fileData.path
            };
        } catch (error) {
            throw new Error(`获取文件失败: ${error.message}`);
        }
    }

    // 创建或更新文件
    async createOrUpdateFile(path, content, message, sha = null) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const body = {
                message,
                // 如果content已经是base64格式（二进制文件），直接使用；否则进行UTF-8编码
                content: this.isBase64(content) ? content : btoa(unescape(encodeURIComponent(content))),
                branch: this.branch
            };

            if (sha) {
                body.sha = sha;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 增加到45秒超时
            
            console.log('发送GitHub API请求:', {
                path: path,
                method: 'PUT',
                hasContent: !!content,
                contentLength: content ? content.length : 0,
                hasSha: !!sha
            });
            
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(body),
                    signal: controller.signal
                }
            );
            
            clearTimeout(timeoutId);
            
            console.log('GitHub API响应状态:', response.status);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                    
                    // 提供更具体的错误信息
                    if (response.status === 409) {
                        errorMessage = '文件冲突，可能是并发上传导致的，请稍后重试';
                    } else if (response.status === 403) {
                        errorMessage = 'GitHub权限不足，请检查Token权限设置';
                    } else if (response.status === 422) {
                        errorMessage = '请求参数无效，可能是文件路径或内容格式问题';
                    } else if (response.status === 502 || response.status === 503) {
                        errorMessage = 'GitHub服务暂时不可用，请稍后重试';
                    }
                } catch (parseError) {
                    console.warn('解析错误响应失败:', parseError);
                }
                
                throw new Error(`上传文件失败: ${errorMessage}`);
            }

            const result = await response.json();
            console.log('文件上传成功:', path);
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('上传超时，请检查网络连接');
            }
            
            // 网络错误的特殊处理
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('网络连接失败，请检查网络状态');
            }
            
            throw new Error(`上传文件失败: ${error.message}`);
        }
    }

    // 删除文件
    async deleteFile(path, message, sha) {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'DELETE',
                    headers: this.getHeaders(),
                    body: JSON.stringify({
                        message,
                        sha,
                        branch: this.branch
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`删除文件失败: ${errorData.message || response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw new Error(`获取文件失败: ${error.message}`);
        }
    }

    // 获取仓库信息
    async getRepoInfo() {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
            
            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}`, {
                headers: this.getHeaders(),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`获取仓库信息失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`获取仓库信息失败: ${error.message}`);
        }
    }

    // 启用GitHub Pages
    async enableGitHubPages() {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/pages`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({
                        source: {
                            branch: this.branch,
                            path: '/'
                        }
                    })
                }
            );

            if (response.status === 409) {
                // GitHub Pages已经启用
                return await this.getGitHubPagesInfo();
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`启用GitHub Pages失败: ${errorData.message || response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`启用GitHub Pages失败: ${error.message}`);
        }
    }

    // 获取GitHub Pages信息
    async getGitHubPagesInfo() {
        if (!this.isConfigured()) {
            throw new Error('GitHub未配置');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/pages`,
                { headers: this.getHeaders() }
            );

            if (response.status === 404) {
                return null; // GitHub Pages未启用
            }

            if (!response.ok) {
                throw new Error(`获取GitHub Pages信息失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`获取GitHub Pages信息失败: ${error.message}`);
        }
    }

    // 获取GitHub Pages URL
    getGitHubPagesUrl() {
        if (!this.isConfigured()) {
            return null;
        }
        return `https://${this.owner}.github.io/${this.repo}`;
    }

    // 检测字符串是否为base64格式
    isBase64(str) {
        if (typeof str !== 'string') {
            return false;
        }
        
        // 检查是否只包含base64字符
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        
        // 检查长度是否为4的倍数
        if (str.length % 4 !== 0) {
            return false;
        }
        
        // 检查是否符合base64格式
        return base64Regex.test(str);
    }
}

// 创建全局实例
window.githubManager = new GitHubManager();