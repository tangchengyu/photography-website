// 数据管理模块 - 支持GitHub云端存储
// 用于实现跨设备数据共享

class DataManager {
    constructor() {
        // 数据文件配置
        this.dataFiles = {
            photos: 'data/photos.json',
            notes: 'data/notes.json',
            categories: 'data/categories.json',
            folders: 'data/folders.json',
            about: 'data/about.json'
        };
        
        // 缓存数据
        this.cache = {
            photos: null,
            notes: null,
            categories: null,
            folders: null,
            about: null
        };
        
        // 缓存过期时间（毫秒）
        this.cacheExpiry = 30 * 1000; // 30秒，确保能及时获取最新数据
        this.cacheTimestamps = {};
        
        // 初始化
        this.init();
    }
    
    async init() {
        // 等待GitHub管理器初始化
        if (window.githubManager) {
            console.log('数据管理器已初始化');
        } else {
            console.warn('GitHub管理器未找到，仅支持本地存储');
        }
    }
    
    // 清除所有缓存
    clearCache() {
        this.cache = {
            photos: null,
            notes: null,
            categories: null,
            folders: null,
            about: null
        };
        this.cacheTimestamps = {};
        console.log('数据缓存已清除');
    }
    
    // 清除特定类型的缓存
    clearCacheByType(type) {
        if (this.cache.hasOwnProperty(type)) {
            this.cache[type] = null;
            delete this.cacheTimestamps[type];
            console.log(`${type}缓存已清除`);
        }
    }
    
    // 强制刷新数据（跳过缓存直接从GitHub加载）
    async forceRefreshData(type) {
        console.log(`强制刷新${type}数据...`);
        
        // 清除缓存
        this.clearCacheByType(type);
        
        // 根据类型调用相应的获取方法
        switch(type) {
            case 'photos':
                return await this.getPhotos();
            case 'notes':
                return await this.getNotes();
            case 'categories':
                return await this.getCategories();
            case 'folders':
                return await this.getFolders();
            case 'about':
                return await this.getAboutInfo();
            default:
                console.warn(`未知的数据类型: ${type}`);
                return null;
        }
    }
    
    // 检查缓存是否过期
    isCacheExpired(type) {
        if (!this.cacheTimestamps[type]) {
            return true;
        }
        return Date.now() - this.cacheTimestamps[type] > this.cacheExpiry;
    }
    
    // 设置缓存时间戳
    setCacheTimestamp(type) {
        this.cacheTimestamps[type] = Date.now();
    }
    
    // 获取GitHub管理器
    getGitHubManager() {
        return window.githubManager;
    }
    
    // 检查GitHub是否已配置
    isGitHubConfigured() {
        const manager = this.getGitHubManager();
        return manager && manager.isConfigured();
    }
    
    // 检查云端存储是否可用
    async isCloudStorageAvailable() {
        return this.isGitHubConfigured();
    }
    
    // 从GitHub获取文件内容
    async getFileFromGitHub(filename) {
        const manager = this.getGitHubManager();
        if (!manager || !manager.isConfigured()) {
            return null;
        }
        
        try {
            const fileData = await manager.getFile(filename);
            if (!fileData) {
                return null;
            }
            
            return JSON.parse(fileData.content);
        } catch (error) {
            console.error(`从GitHub获取${filename}失败:`, error);
            return null;
        }
    }
    
    // 直接从GitHub加载数据（用于外部调用）
    async loadDataFromGitHub(filename) {
        return await this.getFileFromGitHub(filename);
    }
    
    // 保存文件到GitHub
    async saveFileToGitHub(filename, data) {
        const manager = this.getGitHubManager();
        if (!manager || !manager.isConfigured()) {
            console.warn('GitHub未配置，无法保存到云端');
            return false;
        }
        
        try {
            // 获取现有文件的SHA（如果存在）
            const existingFile = await manager.getFile(filename);
            const sha = existingFile ? existingFile.sha : null;
            
            // 保存文件
            const content = JSON.stringify(data, null, 2);
            const message = `更新${filename} - ${new Date().toLocaleString()}`;
            
            await manager.createOrUpdateFile(filename, content, message, sha);
            
            console.log(`${filename}已成功保存到GitHub`);
            return true;
            
        } catch (error) {
            console.error(`保存${filename}到GitHub失败:`, error);
            return false;
        }
    }
    
    // 上传图片文件到GitHub
    async uploadImageToGitHub(file, path) {
        const manager = this.getGitHubManager();
        if (!manager || !manager.isConfigured()) {
            throw new Error('GitHub未配置，无法上传图片');
        }
        
        try {
            // 将文件转换为base64
            const base64Content = await this.fileToBase64(file);
            
            // 检查文件是否已存在
            const existingFile = await manager.getFile(path);
            const sha = existingFile ? existingFile.sha : null;
            
            // 上传文件到GitHub
            const message = `上传图片: ${file.name} - ${new Date().toLocaleString()}`;
            const result = await manager.createOrUpdateFile(path, base64Content, message, sha);
            
            // 返回GitHub Pages的访问URL
            const githubPagesUrl = manager.getGitHubPagesUrl() + '/' + path;
            
            return {
                success: true,
                url: githubPagesUrl,
                downloadUrl: result.content?.download_url
            };
            
        } catch (error) {
            console.error('上传图片到GitHub失败:', error);
            throw error;
        }
    }

    
    // 将文件转换为base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            // 设置超时处理
            const timeout = setTimeout(() => {
                reader.abort();
                reject(new Error('文件读取超时'));
            }, 30000); // 30秒超时
            
            reader.onload = () => {
                clearTimeout(timeout);
                try {
                    // 移除data:image/...;base64,前缀
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } catch (error) {
                    reject(new Error('Base64转换失败: ' + error.message));
                }
            };
            
            reader.onerror = (error) => {
                clearTimeout(timeout);
                reject(new Error('文件读取失败: ' + error.message));
            };
            
            reader.onabort = () => {
                clearTimeout(timeout);
                reject(new Error('文件读取被中断'));
            };
            
            reader.readAsDataURL(file);
        });
    }
    

    
    // 获取照片数据
    async getPhotos() {
        // 检查缓存是否有效且未过期
        if (this.cache.photos && !this.isCacheExpired('photos')) {
            return this.cache.photos;
        }
        
        let photos = [];
        
        if (this.isGitHubConfigured()) {
            try {
                const cloudData = await this.getFileFromGitHub(this.dataFiles.photos);
                if (cloudData && Array.isArray(cloudData)) {
                    photos = cloudData;
                    console.log('从GitHub加载照片数据成功');
                }
            } catch (error) {
                console.warn('从GitHub加载照片数据失败:', error);
            }
        }
        
        // 如果云端没有数据，尝试从localStorage获取
        if (photos.length === 0) {
            const localData = localStorage.getItem('photographyPhotos');
            if (localData) {
                try {
                    photos = JSON.parse(localData);
                    console.log('从本地存储加载照片数据');
                } catch (error) {
                    console.error('解析本地照片数据失败:', error);
                    photos = [];
                }
            }
        }
        
        // 更新缓存和时间戳
        this.cache.photos = photos;
        this.setCacheTimestamp('photos');
        return photos;
    }
    
    // 保存照片数据
    async savePhotos(photos) {
        try {
            // 更新缓存
            this.cache.photos = photos;
            this.setCacheTimestamp('photos');
            
            // 始终保存到localStorage作为备份
            localStorage.setItem('photographyPhotos', JSON.stringify(photos));
            console.log('照片数据已保存到本地存储');
            
            // 如果配置了GitHub，同步到云端
            if (this.isGitHubConfigured()) {
                try {
                    await this.saveFileToGitHub(this.dataFiles.photos, photos);
                    console.log('照片数据已同步到GitHub');
                } catch (error) {
                    console.error('同步照片数据到GitHub失败:', error);
                    throw error;
                }
            }
            
            return true;
        } catch (error) {
            console.error('保存照片数据失败:', error);
            throw error;
        }
    }
    
    // 获取记事本数据
    async getNotes() {
        // 检查缓存是否有效且未过期
        if (this.cache.notes && !this.isCacheExpired('notes')) {
            return this.cache.notes;
        }
        
        let notes = [];
        
        if (this.isGitHubConfigured()) {
            try {
                const cloudData = await this.getFileFromGitHub(this.dataFiles.notes);
                if (cloudData && Array.isArray(cloudData)) {
                    notes = cloudData;
                    console.log('从GitHub加载记事本数据成功');
                }
            } catch (error) {
                console.warn('从GitHub加载记事本数据失败:', error);
            }
        }
        
        // 如果云端没有数据，尝试从localStorage获取
        if (notes.length === 0) {
            const localData = localStorage.getItem('photographyNotes');
            if (localData) {
                try {
                    notes = JSON.parse(localData);
                    console.log('从本地存储加载记事本数据');
                } catch (error) {
                    console.error('解析本地记事本数据失败:', error);
                    notes = [];
                }
            }
        }
        
        // 更新缓存和时间戳
        this.cache.notes = notes;
        this.setCacheTimestamp('notes');
        return notes;
    }
    
    // 保存记事本数据
    async saveNotes(notes) {
        try {
            // 更新缓存
            this.cache.notes = notes;
            this.setCacheTimestamp('notes');
            
            // 始终保存到localStorage作为备份
            localStorage.setItem('photographyNotes', JSON.stringify(notes));
            console.log('记事本数据已保存到本地存储');
            
            // 如果配置了GitHub，同步到云端
            if (this.isGitHubConfigured()) {
                try {
                    await this.saveFileToGitHub(this.dataFiles.notes, notes);
                    console.log('记事本数据已同步到GitHub');
                } catch (error) {
                    console.error('同步记事本数据到GitHub失败:', error);
                    throw error;
                }
            }
            
            return true;
        } catch (error) {
            console.error('保存记事本数据失败:', error);
            throw error;
        }
    }
    
    // 获取自定义分类数据
    async getCategories() {
        // 检查缓存是否有效且未过期
        if (this.cache.categories && !this.isCacheExpired('categories')) {
            return this.cache.categories;
        }
        
        let categories = [];
        
        if (this.isGitHubConfigured()) {
            try {
                const cloudData = await this.getFileFromGitHub(this.dataFiles.categories);
                if (cloudData && Array.isArray(cloudData)) {
                    categories = cloudData;
                    console.log('从GitHub加载分类数据成功');
                }
            } catch (error) {
                console.warn('从GitHub加载分类数据失败:', error);
            }
        }
        
        // 如果云端没有数据，尝试从localStorage获取
        if (categories.length === 0) {
            const localData = localStorage.getItem('customCategories');
            if (localData) {
                try {
                    categories = JSON.parse(localData);
                    console.log('从本地存储加载分类数据');
                } catch (error) {
                    console.error('解析本地分类数据失败:', error);
                    categories = [];
                }
            }
        }
        
        // 更新缓存和时间戳
        this.cache.categories = categories;
        this.setCacheTimestamp('categories');
        return categories;
    }
    
    // 保存自定义分类数据
    async saveCategories(categories) {
        try {
            // 更新缓存
            this.cache.categories = categories;
            this.setCacheTimestamp('categories');
            
            // 始终保存到localStorage作为备份
            localStorage.setItem('customCategories', JSON.stringify(categories));
            console.log('分类数据已保存到本地存储');
            
            // 如果配置了GitHub，同步到云端
            if (this.isGitHubConfigured()) {
                try {
                    await this.saveFileToGitHub(this.dataFiles.categories, categories);
                    console.log('分类数据已同步到GitHub');
                } catch (error) {
                    console.error('同步分类数据到GitHub失败:', error);
                    throw error;
                }
            }
            
            return true;
        } catch (error) {
            console.error('保存分类数据失败:', error);
            throw error;
        }
    }
    
    // 获取文件夹数据
    async getFolders() {
        // 检查缓存是否有效且未过期
        if (this.cache.folders && !this.isCacheExpired('folders')) {
            return this.cache.folders;
        }
        
        let folders = [];
        
        if (this.isGitHubConfigured()) {
            try {
                const cloudData = await this.getFileFromGitHub(this.dataFiles.folders);
                if (cloudData && Array.isArray(cloudData)) {
                    folders = cloudData;
                    console.log('从GitHub加载文件夹数据成功');
                }
            } catch (error) {
                console.warn('从GitHub加载文件夹数据失败:', error);
            }
        }
        
        // 如果云端没有数据，尝试从localStorage获取
        if (folders.length === 0) {
            const localData = localStorage.getItem('photographyFolders');
            if (localData) {
                try {
                    folders = JSON.parse(localData);
                    console.log('从本地存储加载文件夹数据');
                } catch (error) {
                    console.error('解析本地文件夹数据失败:', error);
                    folders = [];
                }
            }
        }
        
        // 更新缓存和时间戳
        this.cache.folders = folders;
        this.setCacheTimestamp('folders');
        return folders;
    }
    
    // 保存文件夹数据
    async saveFolders(folders) {
        try {
            // 更新缓存
            this.cache.folders = folders;
            this.setCacheTimestamp('folders');
            
            // 始终保存到localStorage作为备份
            localStorage.setItem('photographyFolders', JSON.stringify(folders));
            console.log('文件夹数据已保存到本地存储');
            
            // 如果配置了GitHub，同步到云端
            if (this.isGitHubConfigured()) {
                try {
                    await this.saveFileToGitHub(this.dataFiles.folders, folders);
                    console.log('文件夹数据已同步到GitHub');
                } catch (error) {
                    console.error('同步文件夹数据到GitHub失败:', error);
                    throw error;
                }
            }
            
            return true;
        } catch (error) {
            console.error('保存文件夹数据失败:', error);
            throw error;
        }
    }
    
    // 获取关于我数据
    async getAboutInfo() {
        // 检查缓存是否有效且未过期
        if (this.cache.about && !this.isCacheExpired('about')) {
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
        
        if (this.isGitHubConfigured()) {
            try {
                const cloudData = await this.getFileFromGitHub(this.dataFiles.about);
                if (cloudData) {
                    aboutInfo = cloudData;
                    console.log('从GitHub加载关于我数据成功');
                }
            } catch (error) {
                console.warn('从GitHub加载关于我数据失败:', error);
            }
        }
        
        // 如果云端没有数据，尝试从localStorage获取
        if (!aboutInfo || Object.keys(aboutInfo).length === 0) {
            const localData = localStorage.getItem('aboutInfo');
            if (localData) {
                try {
                    const parsedData = JSON.parse(localData);
                    if (parsedData && Object.keys(parsedData).length > 0) {
                        aboutInfo = parsedData;
                        console.log('从本地存储加载关于我数据');
                    }
                } catch (error) {
                    console.error('解析本地关于我数据失败:', error);
                }
            }
        }
        
        // 更新缓存和时间戳
        this.cache.about = aboutInfo;
        this.setCacheTimestamp('about');
        return aboutInfo;
    }
    
    // 保存关于我数据
    async saveAboutInfo(aboutInfo) {
        try {
            // 更新缓存
            this.cache.about = aboutInfo;
            this.setCacheTimestamp('about');
            
            // 始终保存到localStorage作为备份
            localStorage.setItem('aboutInfo', JSON.stringify(aboutInfo));
            console.log('关于我数据已保存到本地存储');
            
            // 如果配置了GitHub，同步到云端
            if (this.isGitHubConfigured()) {
                try {
                    await this.saveFileToGitHub(this.dataFiles.about, aboutInfo);
                    console.log('关于我数据已同步到GitHub');
                } catch (error) {
                    console.error('同步关于我数据到GitHub失败:', error);
                    throw error;
                }
            }
            
            return true;
        } catch (error) {
            console.error('保存关于我数据失败:', error);
            throw error;
        }
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
        if (!this.isGitHubConfigured()) {
            console.log('GitHub未配置，无法同步到云端');
            return false;
        }
        
        try {
            console.log('开始同步所有数据到云端...');
            
            // 获取本地数据并同步到云端
            const photos = JSON.parse(localStorage.getItem('photographyPhotos') || '[]');
            const notes = JSON.parse(localStorage.getItem('photographyNotes') || '[]');
            const categories = JSON.parse(localStorage.getItem('customCategories') || '[]');
            const folders = JSON.parse(localStorage.getItem('photographyFolders') || '[]');
            const aboutInfo = JSON.parse(localStorage.getItem('aboutInfo') || '{}');
            
            // 并行同步所有数据
            const syncPromises = [
                this.saveFileToGitHub(this.dataFiles.photos, photos),
                this.saveFileToGitHub(this.dataFiles.notes, notes),
                this.saveFileToGitHub(this.dataFiles.categories, categories),
                this.saveFileToGitHub(this.dataFiles.folders, folders),
                this.saveFileToGitHub(this.dataFiles.about, aboutInfo)
            ];
            
            await Promise.all(syncPromises);
            
            // 清除缓存以确保下次获取最新数据
            this.clearCache();
            
            console.log('所有数据同步到云端完成');
            return true;
        } catch (error) {
            console.error('数据同步失败:', error);
            throw error;
        }
    }
}

// 创建全局数据管理器实例
window.dataManager = new DataManager();