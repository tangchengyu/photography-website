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
        
        // 初始化状态
        this.isInitialized = false;
        
        // 缓存过期时间（毫秒）
        this.cacheExpiry = 30 * 1000; // 30秒，确保能及时获取最新数据
        this.cacheTimestamps = {};
        
        // 注意：init()方法将在GitHub管理器准备就绪后被外部调用
    }
    
    async init() {
        try {
            // 等待GitHub管理器初始化
            if (window.githubManager) {
                console.log('数据管理器开始初始化...');
                
                // 初始化数据文件
                await this.initializeDataFiles();
                
                console.log('数据管理器初始化完成');
            } else {
                console.warn('GitHub管理器未找到，数据管理器将仅使用本地存储');
            }
        } catch (error) {
            console.error('数据管理器初始化失败:', error);
        } finally {
            // 无论成功还是失败，都标记为已初始化
            this.isInitialized = true;
        }
    }
    
    // 初始化数据文件（如果GitHub中不存在则创建）
    async initializeDataFiles() {
        if (!this.isGitHubConfigured()) {
            return;
        }
        
        try {
            const manager = this.getGitHubManager();
            
            // 检查并创建各个数据文件
            const filesToCheck = [
                { path: this.dataFiles.photos, defaultData: [] },
                { path: this.dataFiles.notes, defaultData: [] },
                { path: this.dataFiles.categories, defaultData: [] },
                { path: this.dataFiles.folders, defaultData: [] },
                { path: this.dataFiles.about, defaultData: {} }
            ];
            
            for (const file of filesToCheck) {
                try {
                    const existingFile = await manager.getFile(file.path);
                    if (!existingFile) {
                        // 文件不存在，创建默认文件
                        console.log(`创建初始数据文件: ${file.path}`);
                        const content = JSON.stringify(file.defaultData, null, 2);
                        const message = `初始化数据文件: ${file.path}`;
                        await manager.createOrUpdateFile(file.path, content, message);
                    }
                } catch (error) {
                    // 如果是404错误，说明文件不存在，创建文件
                    if (error.message.includes('404') || error.message.includes('获取文件失败')) {
                        console.log(`文件不存在，创建初始数据文件: ${file.path}`);
                        const content = JSON.stringify(file.defaultData, null, 2);
                        const message = `初始化数据文件: ${file.path}`;
                        await manager.createOrUpdateFile(file.path, content, message);
                    } else {
                        console.warn(`检查文件 ${file.path} 时出错:`, error);
                    }
                }
            }
            
            console.log('数据文件初始化完成');
        } catch (error) {
            console.error('初始化数据文件失败:', error);
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
        
        // 添加重试机制
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`尝试保存文件到GitHub (${attempt}/${maxRetries}):`, filename);
                
                // 获取现有文件的SHA（如果存在）
                let sha = null;
                try {
                    const existingFile = await manager.getFile(filename);
                    sha = existingFile ? existingFile.sha : null;
                    console.log('文件检查结果:', existingFile ? '文件已存在' : '文件不存在');
                } catch (error) {
                    // 文件不存在是正常的，继续创建新文件
                    console.log('文件不存在，将创建新文件:', filename);
                }
                
                // 保存文件
                const content = JSON.stringify(data, null, 2);
                const message = `更新${filename} - ${new Date().toLocaleString()}`;
                
                await manager.createOrUpdateFile(filename, content, message, sha);
                
                console.log(`${filename}已成功保存到GitHub (${attempt}/${maxRetries})`);
                return true;
                
            } catch (error) {
                lastError = error;
                console.error(`保存文件尝试 ${attempt}/${maxRetries} 失败:`, error.message);
                
                // 如果是网络相关错误且还有重试机会，继续重试
                if (attempt < maxRetries && (
                    error.message.includes('timeout') || 
                    error.message.includes('网络') || 
                    error.message.includes('连接') ||
                    error.message.includes('409') || // 冲突错误
                    error.message.includes('502') || // 网关错误
                    error.message.includes('503')    // 服务不可用
                )) {
                    console.log(`将在 ${1000 * attempt}ms 后重试保存文件...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
                    continue;
                }
                
                // 如果不是可重试的错误，或者已经达到最大重试次数，跳出循环
                break;
            }
        }
        
        console.error(`保存${filename}到GitHub最终失败:`, lastError);
        return false;
    }
    
    // 上传图片文件到GitHub
    async uploadImageToGitHub(file, path) {
        // 参数验证
        if (!file) {
            throw new Error('文件参数不能为空');
        }
        if (!path || typeof path !== 'string') {
            throw new Error('路径参数必须是非空字符串');
        }
        
        console.log('开始上传图片到GitHub:', {
            fileName: file.name,
            fileSize: file.size,
            path: path
        });
        
        const manager = this.getGitHubManager();
        if (!manager || !manager.isConfigured()) {
            throw new Error('GitHub未配置，无法上传图片');
        }
        
        // 添加重试机制
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`尝试上传 (${attempt}/${maxRetries}):`, path);
                
                // 将文件转换为base64
                const base64Content = await this.fileToBase64(file);
                
                // 检查文件是否已存在
                console.log('检查文件是否存在:', path);
                let existingFile = null;
                let sha = null;
                
                try {
                    existingFile = await manager.getFile(path);
                    sha = existingFile ? existingFile.sha : null;
                    console.log('文件检查结果:', existingFile ? '文件已存在' : '文件不存在');
                } catch (error) {
                    console.log('检查文件时出错:', error.message);
                    // 如果是404错误，说明文件不存在，这是正常的
                    if (error.message.includes('404') || error.message.includes('不存在')) {
                        console.log('文件不存在，将创建新文件');
                        existingFile = null;
                        sha = null;
                    } else {
                        // 其他错误，如果是网络问题，可以重试
                        if (attempt < maxRetries && (error.message.includes('timeout') || error.message.includes('网络') || error.message.includes('连接'))) {
                            console.warn(`检查文件失败，将重试 (${attempt}/${maxRetries}):`, error.message);
                            lastError = error;
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
                            continue;
                        }
                        throw error;
                    }
                }
                
                // 上传文件到GitHub
                const message = `上传图片: ${file.name} - ${new Date().toLocaleString()}`;
                const result = await manager.createOrUpdateFile(path, base64Content, message, sha);
                
                // 返回GitHub Pages的访问URL
                const baseUrl = manager.getGitHubPagesUrl();
                // 对路径进行URL编码，确保中文字符能正确访问
                const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/');
                const githubPagesUrl = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + encodedPath;
                
                console.log(`图片上传成功 (${attempt}/${maxRetries}):`, path);
                return {
                    success: true,
                    url: githubPagesUrl,
                    downloadUrl: result.content?.download_url
                };
                
            } catch (error) {
                lastError = error;
                console.error(`上传尝试 ${attempt}/${maxRetries} 失败:`, error.message);
                
                // 如果是网络相关错误且还有重试机会，继续重试
                if (attempt < maxRetries && (
                    error.message.includes('timeout') || 
                    error.message.includes('网络') || 
                    error.message.includes('连接') ||
                    error.message.includes('409') || // 冲突错误
                    error.message.includes('502') || // 网关错误
                    error.message.includes('503')    // 服务不可用
                )) {
                    console.log(`将在 ${1000 * attempt}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
                    continue;
                }
                
                // 如果不是可重试的错误，或者已经达到最大重试次数，抛出错误
                break;
            }
        }
        
        console.error('上传图片到GitHub最终失败:', lastError);
        throw lastError || new Error('上传失败，已达到最大重试次数');
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
            description: '<p>我是于果manager</p>',
            contacts: {
                wechat: 'yg12345',
                qq: '12345',
                email: 'yuguo@example.com'
            }
        };
        
        // 首先尝试从about.json文件加载数据
        try {
            // 使用强制UTF-8编码的fetch函数
            const response = await window.fetchUTF8('./data/about.json');
            if (response && response.ok) {
                const text = await response.text();
                // 检测并修复可能的乱码
                const cleanText = window.fixGarbledText(text);
                // 使用专门的UTF-8 JSON解析函数
                const jsonData = window.parseUTF8JSON(cleanText);
                if (jsonData && Object.keys(jsonData).length > 0) {
                    // 批量处理所有字符串字段，确保UTF-8编码正确
                    aboutInfo = window.sanitizeObjectUTF8(jsonData);
                    console.log('从about.json文件加载关于我数据成功');
                }
            }
        } catch (error) {
            console.warn('从about.json文件加载数据失败:', error);
        }
        
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

// 当GitHub管理器准备就绪时，初始化数据管理器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // 等待GitHub管理器初始化完成
        if (window.githubManager) {
            await window.dataManager.init();
        }
    });
} else {
    // 如果DOM已经加载完成，立即初始化
    setTimeout(async () => {
        if (window.githubManager) {
            await window.dataManager.init();
        }
    }, 100); // 给GitHub管理器一点时间初始化
}