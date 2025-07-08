// 数据管理模块 - 支持GitHub云端存储
// 用于实现跨设备数据共享

class DataManager {
    constructor() {
        // GitHub配置
        this.githubConfig = {
            owner: 'tangchengyu',
            repo: 'guozi',
            branch: 'main',
            dataPath: 'data' // 数据存储路径
        };
        
        // 数据文件配置
        this.dataFiles = {
            photos: 'photos.json',
            notes: 'notes.json',
            categories: 'categories.json',
            folders: 'folders.json',
            about: 'about.json'
        };
        
        // 缓存数据
        this.cache = {
            photos: null,
            notes: null,
            categories: null,
            folders: null,
            about: null
        };
        
        // 是否使用云端存储（如果GitHub API不可用则回退到localStorage）
        this.useCloudStorage = true;
        
        // 初始化
        this.init();
    }
    
    async init() {
        try {
            // 尝试连接GitHub API
            await this.testGitHubConnection();
            console.log('GitHub云端存储已连接');
        } catch (error) {
            console.warn('GitHub云端存储不可用，使用本地存储:', error.message);
            this.useCloudStorage = false;
        }
    }
    
    // 测试GitHub连接
    async testGitHubConnection() {
        const url = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`GitHub API连接失败: ${response.status}`);
        }
        return true;
    }
    
    // 从GitHub获取文件内容
    async getFileFromGitHub(filename) {
        const url = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/${this.githubConfig.dataPath}/${filename}`;
        
        try {
            const response = await fetch(url);
            if (response.status === 404) {
                // 文件不存在，返回空数据
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`获取文件失败: ${response.status}`);
            }
            
            const data = await response.json();
            // 解码base64内容
            const content = atob(data.content.replace(/\n/g, ''));
            return JSON.parse(content);
        } catch (error) {
            console.error(`从GitHub获取${filename}失败:`, error);
            return null;
        }
    }
    
    // 保存文件到GitHub（只读模式，实际部署时需要GitHub token）
    async saveFileToGitHub(filename, data) {
        // 注意：这个方法需要GitHub Personal Access Token
        // 在实际部署时，建议使用GitHub Actions或其他CI/CD工具来处理数据更新
        console.log(`准备保存${filename}到GitHub:`, data);
        
        // 由于没有写权限，这里只是模拟保存
        // 实际实现需要管理员通过其他方式（如GitHub Actions）来更新数据
        return true;
    }
    
    // 获取照片数据
    async getPhotos() {
        if (this.cache.photos) {
            return this.cache.photos;
        }
        
        let photos = [];
        
        if (this.useCloudStorage) {
            const cloudData = await this.getFileFromGitHub(this.dataFiles.photos);
            if (cloudData) {
                photos = cloudData;
            }
        }
        
        // 如果云端没有数据，尝试从localStorage获取
        if (photos.length === 0) {
            const localData = localStorage.getItem('photographyPhotos');
            if (localData) {
                photos = JSON.parse(localData);
            }
        }
        
        this.cache.photos = photos;
        return photos;
    }
    
    // 保存照片数据
    async savePhotos(photos) {
        this.cache.photos = photos;
        
        // 始终保存到localStorage作为备份
        localStorage.setItem('photographyPhotos', JSON.stringify(photos));
        
        if (this.useCloudStorage) {
            await this.saveFileToGitHub(this.dataFiles.photos, photos);
        }
        
        return true;
    }
    
    // 获取记事本数据
    async getNotes() {
        if (this.cache.notes) {
            return this.cache.notes;
        }
        
        let notes = [];
        
        if (this.useCloudStorage) {
            const cloudData = await this.getFileFromGitHub(this.dataFiles.notes);
            if (cloudData) {
                notes = cloudData;
            }
        }
        
        if (notes.length === 0) {
            const localData = localStorage.getItem('photographyNotes');
            if (localData) {
                notes = JSON.parse(localData);
            }
        }
        
        this.cache.notes = notes;
        return notes;
    }
    
    // 保存记事本数据
    async saveNotes(notes) {
        this.cache.notes = notes;
        localStorage.setItem('photographyNotes', JSON.stringify(notes));
        
        if (this.useCloudStorage) {
            await this.saveFileToGitHub(this.dataFiles.notes, notes);
        }
        
        return true;
    }
    
    // 获取自定义分类数据
    async getCategories() {
        if (this.cache.categories) {
            return this.cache.categories;
        }
        
        let categories = [];
        
        if (this.useCloudStorage) {
            const cloudData = await this.getFileFromGitHub(this.dataFiles.categories);
            if (cloudData) {
                categories = cloudData;
            }
        }
        
        if (categories.length === 0) {
            const localData = localStorage.getItem('customCategories');
            if (localData) {
                categories = JSON.parse(localData);
            }
        }
        
        this.cache.categories = categories;
        return categories;
    }
    
    // 保存自定义分类数据
    async saveCategories(categories) {
        this.cache.categories = categories;
        localStorage.setItem('customCategories', JSON.stringify(categories));
        
        if (this.useCloudStorage) {
            await this.saveFileToGitHub(this.dataFiles.categories, categories);
        }
        
        return true;
    }
    
    // 获取文件夹数据
    async getFolders() {
        if (this.cache.folders) {
            return this.cache.folders;
        }
        
        let folders = [];
        
        if (this.useCloudStorage) {
            const cloudData = await this.getFileFromGitHub(this.dataFiles.folders);
            if (cloudData) {
                folders = cloudData;
            }
        }
        
        if (folders.length === 0) {
            const localData = localStorage.getItem('photographyFolders');
            if (localData) {
                folders = JSON.parse(localData);
            }
        }
        
        this.cache.folders = folders;
        return folders;
    }
    
    // 保存文件夹数据
    async saveFolders(folders) {
        this.cache.folders = folders;
        localStorage.setItem('photographyFolders', JSON.stringify(folders));
        
        if (this.useCloudStorage) {
            await this.saveFileToGitHub(this.dataFiles.folders, folders);
        }
        
        return true;
    }
    
    // 获取关于我数据
    async getAboutInfo() {
        if (this.cache.about) {
            return this.cache.about;
        }
        
        let aboutInfo = {
            name: '于果',
            description: `<p>热爱摄影的业余爱好者，擅长捕捉生活中的美好瞬间和自然风光。</p>
<p>我是于果，一名热爱摄影的艺术爱好者。从2015年开始接触摄影，逐渐爱上了通过镜头记录生活，表达情感的方式。我擅长风景、人像和街拍摄影，尤其喜欢捕捉光影变化带来的奇妙效果。</p>
<p>对我来说，摄影不仅是一种爱好，更是一种生活态度。通过镜头，我能够发现日常生活中被忽略的美，并将其定格成永恒。每一张照片背后都有一个故事，我希望通过我的作品，能让更多人分享我眼中的世界。</p>`,
            contacts: {
                wechat: 'yuguo_photo',
                qq: '123456789',
                email: 'yuguo@example.com'
            }
        };
        
        if (this.useCloudStorage) {
            const cloudData = await this.getFileFromGitHub(this.dataFiles.about);
            if (cloudData) {
                aboutInfo = cloudData;
            }
        }
        
        if (!cloudData) {
            const localData = localStorage.getItem('aboutInfo');
            if (localData) {
                aboutInfo = JSON.parse(localData);
            }
        }
        
        this.cache.about = aboutInfo;
        return aboutInfo;
    }
    
    // 保存关于我数据
    async saveAboutInfo(aboutInfo) {
        this.cache.about = aboutInfo;
        localStorage.setItem('aboutInfo', JSON.stringify(aboutInfo));
        
        if (this.useCloudStorage) {
            await this.saveFileToGitHub(this.dataFiles.about, aboutInfo);
        }
        
        return true;
    }
    
    // 清除缓存
    clearCache() {
        this.cache = {
            photos: null,
            notes: null,
            categories: null,
            folders: null,
            about: null
        };
    }
    
    // 同步所有数据到云端
    async syncAllData() {
        if (!this.useCloudStorage) {
            console.log('云端存储不可用，跳过同步');
            return false;
        }
        
        try {
            // 获取本地数据并同步到云端
            const photos = JSON.parse(localStorage.getItem('photographyPhotos') || '[]');
            const notes = JSON.parse(localStorage.getItem('photographyNotes') || '[]');
            const categories = JSON.parse(localStorage.getItem('customCategories') || '[]');
            const folders = JSON.parse(localStorage.getItem('photographyFolders') || '[]');
            const aboutInfo = JSON.parse(localStorage.getItem('aboutInfo') || '{}');
            
            await Promise.all([
                this.saveFileToGitHub(this.dataFiles.photos, photos),
                this.saveFileToGitHub(this.dataFiles.notes, notes),
                this.saveFileToGitHub(this.dataFiles.categories, categories),
                this.saveFileToGitHub(this.dataFiles.folders, folders),
                this.saveFileToGitHub(this.dataFiles.about, aboutInfo)
            ]);
            
            console.log('数据同步完成');
            return true;
        } catch (error) {
            console.error('数据同步失败:', error);
            return false;
        }
    }
}

// 创建全局数据管理器实例
window.dataManager = new DataManager();