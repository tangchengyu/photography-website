// 全局变量
let currentNoteId = null;
let notes = [];
let photos = [];
let customCategories = [];
let folders = [];
let aboutInfo = {
    name: 'Default Name',
    description: '<p>Default description</p>',
    contacts: {
        wechat: 'default_wechat',
        qq: '000000000',
        email: 'default@example.com'
    }
};
let isAdmin = false;
const ADMIN_PASSWORD = '20231026';

// 数据加载标志
let dataLoaded = false;

// 通知函数
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 设置样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // 根据类型设置背景色
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(45deg, #00b894, #00a085)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(45deg, #e17055, #d63031)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(45deg, #fdcb6e, #e17055)';
            break;
        default:
            notification.style.background = 'linear-gradient(45deg, #74b9ff, #0984e3)';
    }
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动移除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 视图状态管理
let currentViewMode = 'folder'; // 'folder' 或 'photo'
let currentSelectedFolder = null; // 当前选中的文件夹ID
let currentCategory = 'all'; // 当前选中的分类

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
    if (event.error && event.error.message) {
        if (event.error.message.includes('GitHub') || event.error.message.includes('上传')) {
            showNotification('上传过程中出现错误，请检查网络连接后重试', 'error');
        }
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝:', event.reason);
    if (event.reason && event.reason.message) {
        if (event.reason.message.includes('GitHub') || event.reason.message.includes('上传')) {
            showNotification('上传过程中出现错误，请检查网络连接后重试', 'error');
            event.preventDefault(); // 防止错误在控制台显示
        }
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    showLoginModal();
    
    // 等待所有管理器初始化完成
    await waitForManagersInitialization();
    
    await initializeApp();
});

// 等待管理器初始化完成
async function waitForManagersInitialization() {
    console.log('等待管理器初始化...');
    
    // 等待GitHubManager初始化
    let retryCount = 0;
    const maxRetries = 50; // 增加重试次数
    
    while (!window.githubManager && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
    }
    
    if (!window.githubManager) {
        console.error('GitHubManager初始化失败');
        return;
    }
    
    // 等待DataManager初始化
    retryCount = 0;
    while (!window.dataManager && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
    }
    
    if (!window.dataManager) {
        console.error('DataManager初始化失败');
        return;
    }
    
    // 等待DataManager完全初始化
    retryCount = 0;
    while (!window.dataManager.isInitialized && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
    }
    
    if (retryCount >= maxRetries) {
        console.warn('DataManager初始化超时，但继续启动应用');
    } else {
        console.log('所有管理器初始化完成');
    }
}

// 显示登录模态框
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'flex';
    
    // 绑定登录事件
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAdminLogin);
    }
    
    const guestBtn = document.getElementById('guestBtn');
    if (guestBtn) {
        guestBtn.addEventListener('click', handleGuestLogin);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 绑定GitHub配置按钮事件
    const githubConfigBtn = document.getElementById('githubConfigBtn');
    if (githubConfigBtn) {
        githubConfigBtn.addEventListener('click', function() {
            window.open('github-config.html', '_blank');
        });
    }
    
    // 回车键登录
    const adminPassword = document.getElementById('adminPassword');
    if (adminPassword) {
        adminPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAdminLogin();
            }
        });
    }
}

// 管理员登录
function handleAdminLogin() {
    const adminPasswordElement = document.getElementById('adminPassword');
    if (!adminPasswordElement) return;
    const password = adminPasswordElement.value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
        updateUserInterface();
        showNotification('管理员登录成功！', 'success');
    } else {
        errorDiv.style.display = 'block';
        const adminPasswordElement = document.getElementById('adminPassword');
        if (adminPasswordElement) {
            adminPasswordElement.value = '';
        }
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// 游客登录
function handleGuestLogin() {
    isAdmin = false;
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
    updateUserInterface();
    showNotification('欢迎以游客身份访问！', 'success');
}

// 退出登录
function handleLogout() {
    isAdmin = false;
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'flex';
    }
    const adminPasswordElement = document.getElementById('adminPassword');
     if (adminPasswordElement) {
         adminPasswordElement.value = '';
     }
    updateUserInterface();
}

// 更新用户界面
function updateUserInterface() {
    const adminElements = document.querySelectorAll('.admin-only');
    const userStatus = document.getElementById('userStatus');
    
    adminElements.forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none';
    });
    
    // 特殊处理导航链接和按钮
    const adminNavLinks = document.querySelectorAll('.nav-menu .admin-only');
    adminNavLinks.forEach(element => {
        if (element.tagName === 'A') {
            element.style.display = isAdmin ? 'inline-block' : 'none';
        } else {
            element.style.display = isAdmin ? 'inline-block' : 'none';
        }
    });
    
    if (userStatus) {
        userStatus.textContent = isAdmin ? '管理员模式' : '游客模式';
        userStatus.style.background = isAdmin ? 'rgba(225, 112, 85, 0.2)' : 'rgba(116, 185, 255, 0.2)';
    }
    
    // 更新分类按钮显示
    updateCategoryButtons();
    
    // 重新渲染图片（应用权限过滤）
    renderGallery();
}

// 统一数据保存函数
async function saveData(dataType, data) {
    try {
        // 使用DataManager保存数据，它会自动处理本地存储和云端同步
        if (window.dataManager) {
            switch(dataType) {
                case 'photographyPhotos':
                    await window.dataManager.savePhotos(data);
                    break;
                case 'photographyNotes':
                    await window.dataManager.saveNotes(data);
                    break;
                case 'customCategories':
                    await window.dataManager.saveCategories(data);
                    break;
                case 'photographyFolders':
                    await window.dataManager.saveFolders(data);
                    break;
                case 'aboutInfo':
                    await window.dataManager.saveAboutInfo(data);
                    break;
                default:
                    // 降级到直接保存到localStorage
                    localStorage.setItem(dataType, JSON.stringify(data));
                    console.warn(`未知数据类型 ${dataType}，仅保存到本地存储`);
            }
            console.log(`${dataType} 保存成功`);
        } else {
            // 降级到直接保存到localStorage
            localStorage.setItem(dataType, JSON.stringify(data));
            console.warn('DataManager不可用，仅保存到本地存储');
        }
    } catch (error) {
        console.error(`保存 ${dataType} 失败:`, error);
        // 降级到本地存储
        try {
            localStorage.setItem(dataType, JSON.stringify(data));
            console.log(`${dataType} 已降级保存到本地存储`);
        } catch (localError) {
            console.error(`本地存储也失败:`, localError);
            throw error;
        }
    }
}

// 加载所有数据
async function loadAllData() {
    try {
        console.log('开始加载数据...');
        
        // 使用DataManager加载所有数据
        if (window.dataManager) {
            try {
                // 加载照片数据
                photos = await window.dataManager.getPhotos();
                console.log(`成功加载 ${photos.length} 张照片`);
                
                // 加载记事本数据
                notes = await window.dataManager.getNotes();
                console.log(`成功加载 ${notes.length} 条记录`);
                
                // 加载自定义分类数据
                customCategories = await window.dataManager.getCategories();
                console.log(`成功加载 ${customCategories.length} 个自定义分类`);
                
                // 加载文件夹数据
                folders = await window.dataManager.getFolders();
                console.log(`成功加载 ${folders.length} 个文件夹`);
                
                // 加载关于我数据
                const loadedAboutInfo = await window.dataManager.getAboutInfo();
                if (loadedAboutInfo) {
                    aboutInfo = loadedAboutInfo;
                    console.log('成功从about.json加载关于我数据:', aboutInfo);
                }
                
            } catch (error) {
                console.error('使用DataManager加载数据失败:', error);
                // 降级到直接从localStorage加载
                await loadDataFromLocalStorage();
            }
        } else {
            console.warn('DataManager未初始化，从本地存储加载数据');
            await loadDataFromLocalStorage();
        }
        
        dataLoaded = true;
        console.log('数据加载完成');
        
        // 升级现有照片数据格式（如果需要）
        await upgradeExistingPhotos();
        
    } catch (error) {
        console.error('数据加载失败:', error);
        // 最后的降级方案
        await loadDataFromLocalStorage();
        dataLoaded = true;
    }
}

// 从本地存储加载数据的降级函数
async function loadDataFromLocalStorage() {
    try {
        console.log('从本地存储加载数据...');
        photos = JSON.parse(localStorage.getItem('photographyPhotos') || '[]');
        notes = JSON.parse(localStorage.getItem('photographyNotes') || '[]');
        customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
        folders = JSON.parse(localStorage.getItem('photographyFolders') || '[]');
        
        const savedAboutInfo = localStorage.getItem('aboutInfo');
        if (savedAboutInfo) {
            aboutInfo = JSON.parse(savedAboutInfo);
            console.log('从localStorage加载关于我数据:', aboutInfo);
        }
        
        console.log('本地数据加载完成');
    } catch (error) {
        console.error('从本地存储加载数据失败:', error);
        // 初始化为空数组
        photos = [];
        notes = [];
        customCategories = [];
        folders = [];
    }
}

// 检查GitHub配置状态
function checkGitHubConfigStatus() {
    if (!window.githubManager) {
        console.warn('GitHub管理器未初始化');
        return;
    }
    
    // 只在管理员模式下检查并显示GitHub配置提示
    if (isAdmin && !window.githubManager.isConfigured()) {
        // 显示GitHub配置提示
        showGitHubConfigNotification();
    } else if (window.githubManager.isConfigured()) {
        console.log('GitHub已配置，支持云端同步');
    }
}

// 显示GitHub配置通知
function showGitHubConfigNotification() {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.id = 'githubConfigNotification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 350px;
        font-size: 14px;
        line-height: 1.5;
        animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="font-size: 20px;">☁️</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 8px;">启用云端同步</div>
                <div style="margin-bottom: 12px; opacity: 0.9;">配置GitHub可实现图片云端存储和跨设备同步</div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="showGitHubConfigDialog()" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">立即配置</button>
                    <button onclick="dismissGitHubNotification()" style="
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">稍后提醒</button>
                </div>
            </div>
            <button onclick="dismissGitHubNotification()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                opacity: 0.7;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
        </div>
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // 10秒后自动隐藏
    setTimeout(() => {
        dismissGitHubNotification();
    }, 10000);
}

// 关闭GitHub配置通知
function dismissGitHubNotification() {
    const notification = document.getElementById('githubConfigNotification');
    if (notification) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

// 初始化应用
async function initializeApp() {
    // 清除DataManager缓存以确保获取最新数据
    if (window.dataManager && window.dataManager.cache) {
        window.dataManager.clearCache();
        console.log('已清除DataManager缓存，确保获取最新数据');
    }
    
    // 首先加载所有数据
    await loadAllData();
    
    // 检查GitHub配置状态并显示提示
    checkGitHubConfigStatus();
    
    // 初始化导航
    initializeNavigation();
    
    // 初始化图片展示
    initializeGallery();
    
    // 更新分类按钮
    updateCategoryButtons();
    
    // 初始化上传功能
    initializeUpload();
    
    // 初始化记事本
    await initializeNotebook();
    
    // 初始化模态框
    initializeModal();
    
    // 初始化图片管理功能
    setupPhotoManagement();
    
    // 初始化文件夹功能
    initializeFolders();
    
    // 初始化关于我模块
    initializeAboutSection();
    
    // 加载示例数据（如果是第一次访问）
    if (photos.length === 0) {
        await loadSampleData();
    } else {
        // 升级现有照片数据（添加水印版本）
        await upgradeExistingPhotos();
    }
}

// 设置图片管理功能
function setupPhotoManagement() {
    // 搜索功能
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchPhotos);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPhotos();
            }
        });
    }
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    // 批量操作按钮
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }
    
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedPhotos);
    }
}

// 初始化文件夹功能
function initializeFolders() {
    updateFolderSelect();
    
    // 新建文件夹按钮
    const newFolderBtn = document.getElementById('newFolderBtn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', showNewFolderForm);
    }
    
    // 模态框中的创建文件夹按钮
    const modalCreateBtn = document.getElementById('modalCreateBtn');
    if (modalCreateBtn) {
        modalCreateBtn.addEventListener('click', createFolder);
    }
    
    // 模态框中的取消按钮
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', hideNewFolderForm);
    }
    
    // 模态框关闭按钮
    const closeFolderModal = document.getElementById('closeFolderModal');
    if (closeFolderModal) {
        closeFolderModal.addEventListener('click', hideNewFolderForm);
    }
    
    // 点击模态框外部关闭
    const newFolderModal = document.getElementById('newFolderModal');
    if (newFolderModal) {
        newFolderModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideNewFolderForm();
            }
        });
    }
    
    // 回车键创建文件夹
    const modalFolderName = document.getElementById('modalFolderName');
    if (modalFolderName) {
        modalFolderName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                createFolder();
            }
        });
    }
    
    // 文件夹选择变化
    const folderSelect = document.getElementById('folderSelect');
    if (folderSelect) {
        folderSelect.addEventListener('change', updateFolderSelection);
    }
}

// 更新文件夹选择下拉框
function updateFolderSelect() {
    const folderSelect = document.getElementById('folderSelect');
    if (!folderSelect) return;
    
    // 优先从上传页面的分类选择器获取分类，如果不存在则从图库页面获取
    const uploadCategorySelect = document.getElementById('imageCategory');
    let currentCategory;
    
    if (uploadCategorySelect && uploadCategorySelect.value && uploadCategorySelect.value !== 'custom') {
        // 从上传页面的分类选择器获取
        currentCategory = uploadCategorySelect.value;
    } else {
        // 从图库页面的激活按钮获取
        currentCategory = getCurrentActiveCategory();
    }
    
    // 清空现有选项
    folderSelect.innerHTML = '<option value="" disabled selected>请选择或新建文件夹</option>';
    
    // 添加当前分类下的文件夹
    let categoryFolders;
    if (currentCategory === 'all') {
        // 如果是"所有分类"，显示所有文件夹
        categoryFolders = folders;
    } else {
        // 否则只显示当前分类下的文件夹
        categoryFolders = folders.filter(folder => folder.category === currentCategory);
    }
    
    categoryFolders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        folderSelect.appendChild(option);
    });
    
    // 同时更新文件夹筛选下拉框
    updateFolderFilterSelect();
}

// 更新文件夹筛选下拉框
function updateFolderFilterSelect() {
    const folderFilterSelect = document.getElementById('folderFilterSelect');
    const folderFilter = document.getElementById('folderFilter');
    if (!folderFilterSelect || !folderFilter) return;
    
    const currentCategory = getCurrentActiveCategory();
    
    // 清空现有选项（保留默认选项）
    folderFilterSelect.innerHTML = '<option value="">所有文件夹</option>';
    
    // 获取当前分类下的文件夹
    let categoryFolders;
    if (currentCategory === 'all') {
        // 如果是"所有分类"，显示所有文件夹
        categoryFolders = folders;
    } else {
        // 否则只显示当前分类下的文件夹
        categoryFolders = folders.filter(folder => folder.category === currentCategory);
    }
    
    if (categoryFolders.length > 0) {
        // 有文件夹时显示筛选器
        folderFilter.style.display = 'block';
        
        categoryFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            folderFilterSelect.appendChild(option);
        });
    } else {
        // 没有文件夹时隐藏筛选器
        folderFilter.style.display = 'none';
    }
}

// 获取当前激活的分类
function getCurrentActiveCategory() {
    const activeBtn = document.querySelector('.filter-btn.active');
    return activeBtn ? activeBtn.getAttribute('data-category') : 'all';
}

// 更新模态框中的分类选择器
function updateModalCategorySelect() {
    const categorySelect = document.getElementById('modalCategorySelect');
    if (!categorySelect) return;
    
    // 清空现有选项
    categorySelect.innerHTML = '';
    
    // 添加"所有分类"选项
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '所有分类';
    categorySelect.appendChild(allOption);
    
    // 添加默认分类
    const defaultCategories = [
        { value: 'portrait', name: '人像' },
        { value: 'nature', name: '自然景观' },
        { value: 'social', name: '社会景观' },
        { value: 'love', name: '恋爱空间' }
    ];
    
    defaultCategories.forEach(category => {
        // 如果不是管理员且是恋爱空间分类，则跳过
        if (!isAdmin && category.value === 'love') {
            return;
        }
        
        const option = document.createElement('option');
        option.value = category.value;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    // 添加自定义分类
    customCategories.forEach(category => {
        // 检查是否应该显示此分类
        const shouldShow = isAdmin || category.guestVisible !== false;
        
        if (shouldShow) {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        }
    });
}

// 显示新建文件夹模态框
function showNewFolderForm() {
    console.log('showNewFolderForm function called');
    const modal = document.getElementById('newFolderModal');
    const currentCategory = getCurrentActiveCategory();
    const categorySelect = document.getElementById('modalCategorySelect');
    const folderNameInput = document.getElementById('modalFolderName');
    
    if (!modal || !categorySelect || !folderNameInput) {
        console.error('Required modal elements not found');
        return;
    }
    
    // 更新分类选择器
    updateModalCategorySelect();
    categorySelect.value = currentCategory;
    
    // 清空输入框
    folderNameInput.value = '';
    
    // 显示模态框
    modal.style.display = 'block';
    
    // 聚焦到输入框
    setTimeout(() => {
        folderNameInput.focus();
    }, 100);
    
    // 添加键盘事件监听
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createFolder();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideNewFolderForm();
        }
    };
    
    // 移除之前的事件监听器（如果存在）
    folderNameInput.removeEventListener('keydown', folderNameInput._keyHandler);
    
    // 添加新的事件监听器
    folderNameInput._keyHandler = handleKeyPress;
    folderNameInput.addEventListener('keydown', handleKeyPress);
    
    // 添加实时输入验证
    const handleInput = (e) => {
        const value = e.target.value;
        const createBtn = document.getElementById('modalCreateBtn');
        
        // 实时更新按钮状态
        if (value.trim().length > 0 && value.trim().length <= 20) {
            createBtn.disabled = false;
            createBtn.style.opacity = '1';
        } else {
            createBtn.disabled = true;
            createBtn.style.opacity = '0.6';
        }
        
        // 字符计数提示
        const charCount = value.length;
        if (charCount > 15) {
            folderNameInput.style.borderColor = charCount > 20 ? '#e74c3c' : '#f39c12';
        } else {
            folderNameInput.style.borderColor = '#e1e8ed';
        }
    };
    
    // 移除之前的输入事件监听器
    folderNameInput.removeEventListener('input', folderNameInput._inputHandler);
    
    // 添加新的输入事件监听器
    folderNameInput._inputHandler = handleInput;
    folderNameInput.addEventListener('input', handleInput);
}

// 隐藏新建文件夹模态框
function hideNewFolderForm() {
    const modal = document.getElementById('newFolderModal');
    const folderNameInput = document.getElementById('modalFolderName');
    const createBtn = document.getElementById('modalCreateBtn');
    
    if (!modal || !folderNameInput || !createBtn) {
        console.error('Required modal elements not found');
        return;
    }
    
    // 隐藏模态框
    modal.style.display = 'none';
    
    // 清空输入框
    folderNameInput.value = '';
    
    // 重置输入框样式
    folderNameInput.style.borderColor = '#e1e8ed';
    
    // 重置按钮状态
    createBtn.disabled = false;
    createBtn.textContent = '创建文件夹';
    createBtn.style.opacity = '1';
    
    // 清理事件监听器
    if (folderNameInput._keyHandler) {
        folderNameInput.removeEventListener('keydown', folderNameInput._keyHandler);
        folderNameInput._keyHandler = null;
    }
    
    if (folderNameInput._inputHandler) {
        folderNameInput.removeEventListener('input', folderNameInput._inputHandler);
        folderNameInput._inputHandler = null;
    }
}

// 创建新文件夹
async function createFolder() {
    const folderNameInput = document.getElementById('modalFolderName');
    const categorySelect = document.getElementById('modalCategorySelect');
    const createBtn = document.getElementById('modalCreateBtn');
    
    if (!folderNameInput || !categorySelect || !createBtn) {
        console.error('Required form elements not found');
        return;
    }
    
    const folderName = folderNameInput.value.trim();
    const selectedCategory = categorySelect.value;
    
    if (!folderName) {
        showNotification('请输入文件夹名称', 'error');
        folderNameInput.focus();
        return;
    }
    
    // 验证文件夹名称长度
    if (folderName.length > 20) {
        showNotification('文件夹名称不能超过20个字符', 'error');
        folderNameInput.focus();
        return;
    }
    
    // 验证文件夹名称格式（不能包含特殊字符）
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(folderName)) {
        showNotification('文件夹名称不能包含特殊字符 < > : " / \\ | ? *', 'error');
        folderNameInput.focus();
        return;
    }
    
    // 检查同分类下是否已存在同名文件夹
    const existingFolder = folders.find(folder => 
        folder.category === selectedCategory && folder.name === folderName
    );
    
    if (existingFolder) {
        showNotification('该分类下已存在同名文件夹', 'error');
        folderNameInput.focus();
        folderNameInput.select();
        return;
    }
    
    // 禁用创建按钮，显示加载状态
    createBtn.disabled = true;
    createBtn.textContent = '创建中...';
    
    try {
        // 创建新文件夹
        const newFolder = {
            id: 'folder_' + Date.now(),
            name: folderName,
            category: selectedCategory,
            createdAt: new Date().toISOString()
        };
        
        folders.push(newFolder);
        await saveData('photographyFolders', folders);
        
        // 更新UI
        updateFolderSelect();
        const folderSelect = document.getElementById('folderSelect');
        if (folderSelect) {
            folderSelect.value = newFolder.id;
        }
        hideNewFolderForm();
        
        showNotification(`文件夹 "${folderName}" 创建成功！`, 'success');
        
        // 添加创建成功的视觉反馈
        const categoryDisplayName = getCategoryDisplayName(selectedCategory);
        console.log(`新文件夹已添加到 ${categoryDisplayName} 分类`);
        
    } catch (error) {
        console.error('创建文件夹失败:', error);
        showNotification('创建文件夹失败，请重试', 'error');
    } finally {
        // 恢复按钮状态
        createBtn.disabled = false;
        createBtn.textContent = '创建文件夹';
    }
}

// 更新文件夹选择
function updateFolderSelection() {
    // 这里可以添加文件夹选择变化时的逻辑
}

// 全局变量：选中的图片ID数组
let selectedPhotos = [];

// 搜索图片
function searchPhotos() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        renderGallery();
        return;
    }
    
    const filteredPhotos = photos.filter(photo => 
        photo.title.toLowerCase().includes(searchTerm) ||
        photo.description.toLowerCase().includes(searchTerm) ||
        getCategoryDisplayName(photo.category).toLowerCase().includes(searchTerm)
    );
    
    renderGallery(filteredPhotos);
    showNotification(`找到 ${filteredPhotos.length} 张相关图片`, 'info');
}

// 清除搜索
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    renderGallery();
    showNotification('已清除搜索条件', 'info');
}

// 切换图片选择状态
function togglePhotoSelection(photoId) {
    const index = selectedPhotos.indexOf(photoId);
    const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`);
    
    if (index > -1) {
        selectedPhotos.splice(index, 1);
        photoElement.classList.remove('selected');
    } else {
        selectedPhotos.push(photoId);
        photoElement.classList.add('selected');
    }
    
    updateSelectionUI();
}

// 全选/取消全选
function toggleSelectAll() {
    const visiblePhotos = document.querySelectorAll('.gallery-item');
    const allSelected = selectedPhotos.length === visiblePhotos.length;
    
    selectedPhotos = [];
    visiblePhotos.forEach(item => {
        const photoId = item.dataset.photoId;
        const checkbox = item.querySelector('.photo-checkbox');
        
        if (!allSelected) {
            selectedPhotos.push(photoId);
            item.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            item.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });
    
    updateSelectionUI();
}

// 更新选择状态UI
function updateSelectionUI() {
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    selectAllBtn.textContent = selectedPhotos.length > 0 ? '取消全选' : '全选';
    deleteSelectedBtn.textContent = `&#128465; 删除选中 (${selectedPhotos.length})`;
    deleteSelectedBtn.disabled = selectedPhotos.length === 0;
}

// 删除选中的图片
async function deleteSelectedPhotos() {
    if (selectedPhotos.length === 0) {
        alert('请先选择要删除的图片');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedPhotos.length} 张图片吗？此操作不可撤销。`)) {
        photos = photos.filter(photo => !selectedPhotos.includes(photo.id));
        await saveData('photographyPhotos', photos);
        
        // 清除DataManager缓存
        if (window.dataManager) {
            try {
                if (typeof window.dataManager.clearCacheByType === 'function') {
                    window.dataManager.clearCacheByType('photos');
                } else if (window.dataManager.cache) {
                    window.dataManager.cache.photos = null;
                    if (window.dataManager.cacheTimestamps) {
                        delete window.dataManager.cacheTimestamps.photos;
                    }
                }
                console.log('已清除DataManager缓存');
            } catch (cacheError) {
                console.warn('清除缓存时出错:', cacheError);
            }
        }
        
        selectedPhotos = [];
        renderGallery();
        updateSelectionUI();
        showNotification('选中的图片已删除', 'success');
    }
}

// 删除单张图片
async function deletePhoto(photoId) {
    if (confirm('确定要删除这张图片吗？此操作不可撤销。')) {
        photos = photos.filter(photo => photo.id !== photoId);
        await saveData('photographyPhotos', photos);
        
        // 清除DataManager缓存
        if (window.dataManager) {
            try {
                if (typeof window.dataManager.clearCacheByType === 'function') {
                    window.dataManager.clearCacheByType('photos');
                } else if (window.dataManager.cache) {
                    window.dataManager.cache.photos = null;
                    if (window.dataManager.cacheTimestamps) {
                        delete window.dataManager.cacheTimestamps.photos;
                    }
                }
                console.log('已清除DataManager缓存');
            } catch (cacheError) {
                console.warn('清除缓存时出错:', cacheError);
            }
        }
        
        // 从选中列表中移除
        const index = selectedPhotos.indexOf(photoId);
        if (index > -1) {
            selectedPhotos.splice(index, 1);
        }
        
        renderGallery();
        updateSelectionUI();
        showNotification('图片已删除', 'success');
    }
}

// 删除文件夹
async function deleteFolder(folderId) {
    if (!isAdmin) {
        alert('只有管理员可以删除文件夹');
        return;
    }
    
    // 查找要删除的文件夹
    const folderToDelete = folders.find(folder => folder.id === folderId);
    if (!folderToDelete) {
        showNotification('文件夹不存在', 'error');
        return;
    }
    
    // 检查文件夹中是否有图片
    const folderPhotos = photos.filter(photo => photo.folder === folderId);
    
    let confirmMessage = `确定要删除文件夹"${folderToDelete.name}"吗？此操作不可撤销。`;
    if (folderPhotos.length > 0) {
        confirmMessage += `\n\n注意：该文件夹中有 ${folderPhotos.length} 张图片，删除文件夹后这些图片将移动到默认文件夹。`;
    }
    
    if (confirm(confirmMessage)) {
        try {
            // 将文件夹中的图片移动到默认文件夹（清空folder字段）
            photos.forEach(photo => {
                if (photo.folder === folderId) {
                    photo.folder = null;
                }
            });
            
            // 从文件夹数组中删除该文件夹
            folders = folders.filter(folder => folder.id !== folderId);
            
            // 保存数据
            await saveData('photographyPhotos', photos);
            await saveData('photographyFolders', folders);
            
            // 更新UI
            updateFolderSelect();
            renderGallery();
            
            showNotification(`文件夹"${folderToDelete.name}"已删除${folderPhotos.length > 0 ? `，${folderPhotos.length} 张图片已移动到默认文件夹` : ''}`, 'success');
            
        } catch (error) {
            console.error('删除文件夹失败:', error);
            showNotification('删除文件夹失败，请重试', 'error');
        }
    }
}

// 替换图片
function replacePhoto(photoId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const originalUrl = event.target.result;
                
                // 添加水印后替换
                addWatermarkToImage(originalUrl, async (watermarkedUrl) => {
                    const photo = photos.find(p => p.id === photoId);
                    if (photo) {
                        // 更新图片数据，保存原始版本和水印版本
                        photo.originalUrl = originalUrl;
                        photo.watermarkedUrl = watermarkedUrl;
                        // 保持向后兼容
                        photo.url = watermarkedUrl;
                        photo.lastModified = new Date().toISOString();
                        photo.fileName = file.name;
                        
                        await saveData('photographyPhotos', photos);
                        renderGallery();
                        showNotification('图片已替换', 'success');
                    }
                });
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// 导航功能
function initializeNavigation() {
    // 平滑滚动
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // 导航栏滚动效果
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 248, 220, 0.98)';
        } else {
            navbar.style.background = 'rgba(255, 248, 220, 0.95)';
        }
    });
}

// 图片展示功能
function initializeGallery() {
    renderGallery();
    
    // 分类筛选
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮状态
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 更新当前分类
            const category = this.getAttribute('data-category');
            currentCategory = category;
            
            // 重置为文件夹视图
            currentViewMode = 'folder';
            currentSelectedFolder = null;
            
            // 显示文件夹筛选器
            const folderFilter = document.getElementById('folderFilter');
            if (folderFilter) {
                folderFilter.style.display = 'block';
            }
            
            // 渲染视图
            renderGallery();
            
            // 更新文件夹选择下拉框（上传页面）
            updateFolderSelect();
            
            // 重置文件夹筛选
            const folderFilterSelect = document.getElementById('folderFilterSelect');
            if (folderFilterSelect) {
                folderFilterSelect.value = '';
            }
        });
    });
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshGalleryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            try {
                // 显示加载状态
                this.innerHTML = '&#128260; 刷新中...';
                this.disabled = true;
                
                // 强制刷新照片数据
                if (window.dataManager && window.dataManager.forceRefreshData) {
                    await window.dataManager.forceRefreshData('photos');
                    photos = await window.dataManager.getPhotos();
                } else {
                    // 降级处理：清除缓存并重新加载
                    if (window.dataManager && window.dataManager.clearCacheByType) {
                        window.dataManager.clearCacheByType('photos');
                    }
                    photos = await window.dataManager.getPhotos();
                }
                
                // 重新渲染画廊
                renderGallery();
                
                // 显示成功提示
                showNotification('图片数据已刷新', 'success');
                
            } catch (error) {
                console.error('刷新数据失败:', error);
                showNotification('刷新失败，请稍后重试', 'error');
            } finally {
                // 恢复按钮状态
                this.innerHTML = '&#128260; 刷新';
                this.disabled = false;
            }
        });
    }
    
    // 文件夹筛选（这个现在只在文件夹视图中使用，用于快速筛选）
    const folderFilterSelect = document.getElementById('folderFilterSelect');
    if (folderFilterSelect) {
        folderFilterSelect.addEventListener('change', function() {
            const folderId = this.value;
            if (folderId) {
                // 直接打开选中的文件夹
                openFolder(folderId);
            } else {
                // 返回文件夹视图
                backToFolders();
            }
        });
    }
}

// 渲染图片展示
function renderGallery(filteredPhotos = null) {
    if (currentViewMode === 'folder') {
        renderFolderView();
    } else {
        renderPhotoView(filteredPhotos);
    }
}

// 渲染文件夹视图
function renderFolderView() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) {
        console.error('galleryGrid element not found');
        return;
    }
    
    // 获取当前分类下的文件夹
    let categoryFolders = folders.filter(folder => {
        if (currentCategory === 'all') {
            return true;
        }
        return folder.category === currentCategory;
    });
    
    // 如果不是管理员，过滤掉恋爱空间分类的文件夹
    if (!isAdmin) {
        categoryFolders = categoryFolders.filter(folder => folder.category !== 'love');
    }
    
    // 不再支持默认文件夹，所有图片都必须有文件夹
    
    if (categoryFolders.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">&#128193;</div>
                <div class="empty-state-text">该分类下还没有文件夹</div>
                <div class="empty-state-subtext">上传图片时可以创建新文件夹</div>
            </div>
        `;
        return;
    }
    
    galleryGrid.innerHTML = categoryFolders.map(folder => {
        // 计算文件夹内的图片数量
        const photoCount = photos.filter(photo => {
            const matchesCategory = currentCategory === 'all' || photo.category === currentCategory;
            const matchesFolder = photo.folder === folder.id;
            const isVisible = isAdmin || (photo.category !== 'love' && 
                (!photo.category.startsWith('custom_') || 
                 customCategories.find(cat => cat.id === photo.category)?.guestVisible !== false));
            return matchesCategory && matchesFolder && isVisible;
        }).length;
        
        return `
            <div class="gallery-item folder-item" data-folder-id="${folder.id}" onclick="openFolder('${folder.id}')">
                ${isAdmin ? `
                    <div class="folder-actions">
                        <button class="action-btn delete-folder-btn" onclick="event.stopPropagation(); deleteFolder('${folder.id}')" title="删除文件夹">&#128465;</button>
                    </div>
                ` : ''}
                <div class="folder-icon">
                    <div class="folder-icon-bg">&#128193;</div>
                    <div class="folder-photo-count">${photoCount}</div>
                </div>
                <div class="gallery-item-info">
                    <h3 class="gallery-item-title">${folder.name}</h3>
                    <p class="gallery-item-description">${photoCount} 张图片</p>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染图片视图
function renderPhotoView(filteredPhotos = null) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) {
        console.error('galleryGrid element not found');
        return;
    }
    let photosToShow = filteredPhotos || photos;
    
    // 如果指定了文件夹，只显示该文件夹下的图片
    if (currentSelectedFolder !== null) {
        photosToShow = photosToShow.filter(photo => photo.folder === currentSelectedFolder);
    }
    
    // 如果不是管理员，过滤掉恋爱空间分类和不可见的自定义分类图片
    if (!isAdmin) {
        photosToShow = photosToShow.filter(photo => {
            if (photo.category === 'love') {
                return false;
            }
            
            // 检查自定义分类的可见性
            if (photo.category.startsWith('custom_')) {
                const customCategory = customCategories.find(cat => cat.id === photo.category);
                return customCategory ? customCategory.guestVisible !== false : true;
            }
            
            return true;
        });
    }
    
    if (photosToShow.length === 0) {
        const folderName = currentSelectedFolder ? getFolderDisplayName(currentSelectedFolder) : '';
        galleryGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">&#128247;</div>
                <div class="empty-state-text">${folderName ? `${folderName}中` : ''}还没有上传任何作品</div>
                <div class="empty-state-subtext">点击上传按钮开始分享你的摄影作品吧！</div>
                ${currentSelectedFolder !== null ? `<button class="back-to-folders-btn" onclick="backToFolders()">← 返回文件夹视图</button>` : ''}
            </div>
        `;
        return;
    }
    
    galleryGrid.innerHTML = photosToShow.map(photo => {
        // 根据用户身份选择显示的图片版本
        const imageUrl = getImageUrlForUser(photo);
        
        // 获取文件夹名称
        const folderName = getFolderDisplayName(photo.folder);
        
        return `
            <div class="gallery-item" data-photo-id="${photo.id}" onclick="openImageModal('${photo.id}')">
                ${isAdmin ? `
                    <input type="checkbox" class="photo-checkbox" onclick="event.stopPropagation(); togglePhotoSelection('${photo.id}')">
                    <div class="photo-actions">
                        <button class="action-btn replace-btn" onclick="event.stopPropagation(); replacePhoto('${photo.id}')" title="替换图片">&#128260;</button>
                        <button class="action-btn delete-single-btn" onclick="event.stopPropagation(); deletePhoto('${photo.id}')" title="删除图片">&#128465;</button>
                    </div>
                ` : ''}
                <img src="${imageUrl}" alt="${photo.title}" loading="lazy">
                <div class="gallery-item-info">
                    <h3 class="gallery-item-title">${photo.title}</h3>
                    <p class="gallery-item-description">${photo.description}</p>
                    <div class="gallery-item-meta">
                        <span class="gallery-item-category">${getCategoryDisplayName(photo.category)}</span>
                        ${folderName ? `<span class="gallery-item-folder">&#128193; ${folderName}</span>` : ''}
                    </div>
                </div>
                ${currentSelectedFolder !== null ? `<div class="back-to-folders"><button class="back-to-folders-btn" onclick="backToFolders()">← 返回文件夹</button></div>` : ''}
            </div>
        `;
    }).join('');
    
    // 如果是在文件夹视图中，添加返回按钮
    if (currentSelectedFolder !== null) {
        const backButton = document.createElement('div');
        backButton.className = 'back-to-folders-container';
        backButton.innerHTML = `<button class="back-to-folders-btn" onclick="backToFolders()">← 返回文件夹视图</button>`;
        galleryGrid.insertBefore(backButton, galleryGrid.firstChild);
    }
}

// 根据用户身份获取图片URL
function getImageUrlForUser(photo) {
    let url;
    
    // 兼容旧数据格式
    if (photo.url && !photo.originalUrl && !photo.watermarkedUrl) {
        url = photo.url;
    } else {
        // 新数据格式：管理员看原图，游客看水印图
        if (isAdmin) {
            url = photo.originalUrl || photo.url;
        } else {
            url = photo.watermarkedUrl || photo.url;
        }
    }
    
    // 如果URL包含中文字符且不是data:或http://localhost开头，需要进行URL编码处理
    if (url && !url.startsWith('data:') && !url.startsWith('http://localhost') && !url.startsWith('https://localhost')) {
        // 检查URL是否包含中文字符或其他需要编码的字符
        if (/[\u4e00-\u9fa5]/.test(url) || /[^\x00-\x7F]/.test(url)) {
            // 分割URL，只对路径部分进行编码，保留协议和域名
            const urlParts = url.split('/');
            if (urlParts.length > 3) {
                // 对路径部分进行编码（跳过协议和域名部分）
                for (let i = 3; i < urlParts.length; i++) {
                    if (urlParts[i] && !urlParts[i].includes('%')) { // 避免重复编码
                        urlParts[i] = encodeURIComponent(urlParts[i]);
                    }
                }
                url = urlParts.join('/');
            }
        }
    }
    
    return url;
}

// 筛选图片
function filterGallery(category, folderId = null) {
    let filtered = photos;
    
    // 按分类筛选
    if (category !== 'all') {
        filtered = filtered.filter(photo => photo.category === category);
    }
    
    // 按文件夹筛选
    if (folderId) {
        filtered = filtered.filter(photo => photo.folder === folderId);
    }
    // 注意：不再支持默认文件夹，所有图片都必须有文件夹
    
    renderGallery(filtered);
}

// 按文件夹筛选图片
function filterByFolder(folderId) {
    const currentCategory = getCurrentActiveCategory();
    filterGallery(currentCategory, folderId);
}

// 打开文件夹
function openFolder(folderId) {
    currentViewMode = 'photo';
    currentSelectedFolder = folderId;
    
    // 隐藏文件夹筛选器，因为现在在单个文件夹视图中
    const folderFilter = document.getElementById('folderFilter');
    if (folderFilter) {
        folderFilter.style.display = 'none';
    }
    
    renderGallery();
}

// 返回文件夹视图
function backToFolders() {
    currentViewMode = 'folder';
    currentSelectedFolder = null;
    
    // 显示文件夹筛选器
    const folderFilter = document.getElementById('folderFilter');
    if (folderFilter) {
        folderFilter.style.display = 'block';
    }
    
    renderGallery();
}

// 获取分类显示名称
function getCategoryDisplayName(category) {
    const categoryNames = {
        'portrait': '人像',
        'nature': '自然景观',
        'social': '社会景观',
        'love': '恋爱空间',
        'custom': '自定义'
    };
    
    // 如果是自定义分类，查找自定义分类名称
    if (category.startsWith('custom_')) {
        const customCategory = customCategories.find(cat => cat.id === category);
        return customCategory ? customCategory.name : '自定义';
    }
    
    return categoryNames[category] || category;
}

// 获取文件夹显示名称
function getFolderDisplayName(folderId) {
    if (!folderId) {
        return '未知文件夹'; // 所有图片都应该有文件夹
    }
    
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : '未知文件夹';
}

// 更新分类按钮
function updateCategoryButtons() {
    const categoryFilter = document.querySelector('.category-filter');
    
    // 移除所有自定义分类容器（包括按钮和删除按钮）
    const customContainers = categoryFilter.querySelectorAll('.custom-category-container');
    customContainers.forEach(container => container.remove());
    
    // 也移除可能残留的自定义分类按钮（兼容性处理）
    const customButtons = categoryFilter.querySelectorAll('.custom-category-btn');
    customButtons.forEach(btn => btn.remove());
    
    // 添加自定义分类按钮
    customCategories.forEach(category => {
        // 检查是否应该显示此分类按钮
        const shouldShow = isAdmin || category.guestVisible !== false;
        
        if (shouldShow) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'custom-category-container';
            buttonContainer.style.cssText = `
                display: inline-block;
                position: relative;
                margin: 0 5px 5px 0;
            `;
            
            const button = document.createElement('button');
            button.className = 'filter-btn custom-category-btn';
            button.setAttribute('data-category', category.id);
            button.textContent = category.name;
            button.style.cssText = `
                position: relative;
                padding: 8px 16px;
                margin: 0;
            `;
            
            // 添加点击事件
            button.addEventListener('click', function() {
                // 更新按钮状态
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // 更新当前分类
                const categoryId = this.getAttribute('data-category');
                currentCategory = categoryId;
                
                // 重置为文件夹视图
                currentViewMode = 'folder';
                currentSelectedFolder = null;
                
                // 显示文件夹筛选器
                const folderFilter = document.getElementById('folderFilter');
                if (folderFilter) {
                    folderFilter.style.display = 'block';
                }
                
                // 渲染视图
                renderGallery();
                
                // 更新文件夹选择下拉框（上传页面）
                updateFolderSelect();
                
                // 重置文件夹筛选
                const folderFilterSelect = document.getElementById('folderFilterSelect');
                if (folderFilterSelect) {
                    folderFilterSelect.value = '';
                }
            });
            
            buttonContainer.appendChild(button);
            
            // 只有管理员才能看到和使用删除按钮
            if (isAdmin) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-category-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = '删除分类';
                deleteBtn.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #ff4757;
                    color: white;
                    border: none;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    line-height: 1;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
                
                // 防止删除按钮触发分类筛选
                deleteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteCustomCategory(category.id).catch(error => {
                        console.error('删除分类时出错:', error);
                        showNotification('删除分类失败，请重试', 'error');
                    });
                });
                
                // 鼠标悬停效果
                deleteBtn.addEventListener('mouseenter', function() {
                    this.style.background = '#ff3742';
                    this.style.transform = 'scale(1.1)';
                });
                
                deleteBtn.addEventListener('mouseleave', function() {
                    this.style.background = '#ff4757';
                    this.style.transform = 'scale(1)';
                });
                
                buttonContainer.appendChild(deleteBtn);
            }
            
            categoryFilter.appendChild(buttonContainer);
        }
    });
}

// 删除自定义分类
async function deleteCustomCategory(categoryId) {
    // 确认删除
    const categoryToDelete = customCategories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) {
        return;
    }
    
    const confirmDelete = confirm(`确定要删除分类"${categoryToDelete.name}"吗？\n\n注意：删除分类后，该分类下的所有图片将被移动到"自定义"分类。`);
    
    if (!confirmDelete) {
        return;
    }
    
    // 将该分类下的图片移动到默认的custom分类
    photos.forEach(photo => {
        if (photo.category === categoryId) {
            photo.category = 'custom';
        }
    });
    
    // 从自定义分类数组中移除
    const categoryIndex = customCategories.findIndex(cat => cat.id === categoryId);
    if (categoryIndex > -1) {
        customCategories.splice(categoryIndex, 1);
    }
    
    // 保存到云端
    await saveData('photographyPhotos', photos);
    await saveData('customCategories', customCategories);
    
    // 更新界面
    updateCategoryButtons();
    renderGallery();
    
    // 显示成功消息
    showNotification(`分类"${categoryToDelete.name}"已删除`, 'success');
}

// 上传功能
function initializeUpload() {
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadBtn = document.getElementById('uploadBtn');
    const categorySelect = document.getElementById('imageCategory');
    const customCategoryGroup = document.getElementById('customCategoryGroup');
    
    // 点击上传区域触发文件选择
    if (uploadArea && imageInput) {
        uploadArea.addEventListener('click', () => {
            imageInput.click();
        });
    }
    
    // 拖拽上传
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            handleFileUpload(files);
        });
    }
    
    // 文件选择
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
        });
    }
    
    // 分类选择变化
    if (categorySelect && customCategoryGroup) {
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customCategoryGroup.style.display = 'block';
            } else {
                customCategoryGroup.style.display = 'none';
            }
            // 更新文件夹选项
            updateFolderSelect();
        });
    }
    
    // 上传按钮
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadImages);
    }
}

// 处理文件上传
function handleFileUpload(files) {
    const uploadArea = document.getElementById('uploadArea');
    const fileCountDiv = document.getElementById('fileCount');
    const fileCount = files.length;
    
    // 检查文件数量限制
    if (fileCount > 10) {
        alert('最多只能同时上传10张图片，请重新选择');
        return;
    }
    
    // 检查文件类型
    const validFiles = Array.from(files).filter(file => {
        return file.type.startsWith('image/');
    });
    
    if (validFiles.length !== fileCount) {
        alert('只能上传图片文件，请重新选择');
        return;
    }
    
    if (fileCount > 0) {
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-content">
                    <div class="upload-icon">✅</div>
                    <p>已选择 ${fileCount} 个文件</p>
                </div>
            `;
        }
        
        // 显示文件计数
        if (fileCountDiv) {
            fileCountDiv.style.display = 'block';
            fileCountDiv.textContent = `已选择 ${fileCount} 张图片 ${fileCount > 1 ? '(批量上传)' : ''}`;
        }
    }
    
    // 存储文件到全局变量
    window.selectedFiles = validFiles;
}

// 添加水印到图片
function addWatermarkToImage(imageSrc, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        try {
            // 设置画布尺寸
            canvas.width = img.width;
            canvas.height = img.height;
            
            // 绘制原图
            ctx.drawImage(img, 0, 0);
            
            // 设置水印样式 - 对角线覆盖
            const fontSize = Math.max(img.width * 0.06, 40); // 适中的字体大小
            ctx.font = `600 ${fontSize}px 'Arial', 'Noto Sans SC', sans-serif`;
            
            // 计算对角线角度
            const angle = Math.atan2(img.height, img.width);
            
            // 保存当前状态
            ctx.save();
            
            // 移动到图片中心
            ctx.translate(img.width / 2, img.height / 2);
            
            // 旋转到对角线角度
            ctx.rotate(angle);
            
            // 设置文本对齐
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 计算对角线长度
            const diagonalLength = Math.sqrt(img.width * img.width + img.height * img.height);
            
            // 沿对角线重复绘制水印文字
            const watermarkText = '嗷呜一口';
            const textWidth = ctx.measureText(watermarkText).width;
            const spacing = textWidth + 100; // 文字间距
            const repeatCount = Math.ceil(diagonalLength / spacing) + 2;
            
            // 设置半透明浅灰色
            ctx.fillStyle = 'rgba(160, 160, 160, 0.25)';
            
            // 沿对角线绘制多个水印
            for (let i = -repeatCount; i <= repeatCount; i++) {
                const x = i * spacing;
                ctx.fillText(watermarkText, x, 0);
            }
            
            // 恢复状态
            ctx.restore();
            
            // 转换为数据URL并回调
            const watermarkedImage = canvas.toDataURL('image/jpeg', 0.9);
            callback(watermarkedImage);
        } catch (error) {
            console.error('添加水印时出错:', error);
            // 如果添加水印失败，返回原图
            callback(imageSrc);
        }
    };
    
    img.onerror = function(error) {
        console.error('图片加载失败:', error);
        // 如果图片加载失败，返回原图
        callback(imageSrc);
    };
    
    // 设置超时处理
    setTimeout(() => {
        if (!img.complete) {
            console.warn('图片加载超时，使用原图');
            callback(imageSrc);
        }
    }, 10000); // 10秒超时
    
    img.src = imageSrc;
}

// 显示GitHub配置对话框
function showGitHubConfigDialog() {
    // 打开GitHub配置页面
    window.open('github-config.html', '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
}

// 上传图片
async function uploadImages() {
    if (!isAdmin) {
        alert('只有管理员可以上传图片');
        return;
    }
    
    // 检查必要的管理器是否已初始化
    if (!window.dataManager) {
        showNotification('数据管理器未初始化，请刷新页面重试', 'error');
        return;
    }
    
    if (!window.dataManager.isInitialized) {
        showNotification('数据管理器正在初始化中，请稍后重试', 'warning');
        return;
    }
    
    // 检查必要的函数是否存在
    if (typeof window.dataManager.uploadImageToGitHub !== 'function') {
        showNotification('上传功能不可用，请检查配置', 'error');
        return;
    }
    
    if (typeof window.dataManager.forceRefreshData !== 'function') {
        showNotification('数据刷新功能不可用，请检查配置', 'error');
        return;
    }
    
    // 设置全局上传超时
    window.uploadTimeout = setTimeout(() => {
        console.error('上传超时，强制完成');
        showNotification('上传超时，请检查网络连接后重试', 'error');
        // 重置上传按钮
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.innerHTML = '上传作品';
            uploadBtn.disabled = false;
        }
        window.uploadTimeout = null;
    }, 120000); // 2分钟超时
    
    // 检查GitHub配置
    if (!window.githubManager || !window.githubManager.isConfigured()) {
        const configure = confirm('检测到GitHub配置未完成，是否现在配置？\n配置后可实现真正的云端同步功能。');
        if (configure) {
            showGitHubConfigDialog();
            return; // 打开配置页面后停止上传，用户配置完成后可重新上传
        } else {
            const continueLocal = confirm('未配置GitHub，将只能本地保存，其他设备无法看到。\n是否继续？');
            if (!continueLocal) {
                return;
            }
        }
    }
    
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        alert('请先选择要上传的图片！');
        return;
    }
    
    const titleElement = document.getElementById('imageTitle');
     const title = titleElement ? titleElement.value.trim() : '';
     
     const descriptionElement = document.getElementById('imageDescription');
     const description = descriptionElement ? descriptionElement.value.trim() : '';
     
     const categoryElement = document.getElementById('imageCategory');
     const category = categoryElement ? categoryElement.value : 'portrait';
     
     const customCategoryElement = document.getElementById('customCategory');
     const customCategory = customCategoryElement ? customCategoryElement.value.trim() : '';
     
     const guestVisibleElement = document.getElementById('guestVisible');
     const guestVisible = guestVisibleElement ? guestVisibleElement.checked : true;
     
     const folderSelectElement = document.getElementById('folderSelect');
     const selectedFolder = folderSelectElement ? folderSelectElement.value : '';
    
    if (!title) {
        alert('请输入作品标题！');
        return;
    }
    
    if (!selectedFolder) {
        alert('请选择一个文件夹或新建文件夹！');
        return;
    }
    
    let finalCategory = category;
    let categoryDisplayName = getCategoryDisplayName(category);
    
    // 处理自定义分类
    if (category === 'custom') {
        if (!customCategory) {
            alert('请输入自定义分类名称！');
            return;
        }
        
        // 创建新的自定义分类ID
        const customCategoryId = 'custom_' + Date.now();
        finalCategory = customCategoryId;
        categoryDisplayName = customCategory;
        
        // 保存自定义分类
        const existingCategory = customCategories.find(cat => cat.name === customCategory);
        if (!existingCategory) {
            customCategories.push({
                id: customCategoryId,
                name: customCategory,
                guestVisible: guestVisible
            });
            await saveData('customCategories', customCategories);
            
            // 更新分类按钮
            updateCategoryButtons();
        } else {
            finalCategory = existingCategory.id;
        }
    }
    
    // 显示上传进度
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.innerHTML = '<span class="loading"></span> 上传中...';
        uploadBtn.disabled = true;
    }
    
    let processedCount = 0;
    
    // 处理每个文件
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        
        try {
            // 更新进度显示
            if (uploadBtn) {
                uploadBtn.innerHTML = `<span class="loading"></span> 上传中... (${index + 1}/${files.length})`;
            }
            
            // 读取文件
            const originalUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                const timeout = setTimeout(() => {
                    reader.abort();
                    reject(new Error('文件读取超时'));
                }, 30000);
                
                reader.onload = (e) => {
                    clearTimeout(timeout);
                    resolve(e.target.result);
                };
                
                reader.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(new Error('文件读取失败: ' + error.message));
                };
                
                reader.readAsDataURL(file);
            });
            
            // 添加水印
            const watermarkedUrl = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('水印处理超时'));
                }, 30000);
                
                try {
                    addWatermarkToImage(originalUrl, (result) => {
                        clearTimeout(timeout);
                        resolve(result);
                    });
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
            
            let originalCloudUrl = originalUrl;
            let watermarkedCloudUrl = watermarkedUrl;
            let isCloudSynced = false;
            
            // 如果配置了GitHub，尝试上传到云端
            if (window.githubManager && window.githubManager.isConfigured()) {
                try {
                    // 生成唯一的时间戳，避免并发冲突
                    const timestamp = Date.now() + Math.random().toString(36).substr(2, 9);
                    const safeFileName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
                    const originalFileName = `original_${timestamp}_${index}_${safeFileName}`;
                    const watermarkedFileName = `watermarked_${timestamp}_${index}_${safeFileName}`;
                    
                    // 处理中文字符，确保GitHub API和Pages都能正确访问
                    const categoryDisplayName = getCategoryDisplayName(finalCategory);
                    // 只保留字母、数字、中文和下划线，不进行URL编码（GitHub API不需要）
                    const categoryPath = categoryDisplayName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
                    const folderPath = selectedFolder.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
                    
                    const originalPath = `images/${categoryPath}/${folderPath}/original/${originalFileName}`;
                    const watermarkedPath = `images/${categoryPath}/${folderPath}/watermarked/${watermarkedFileName}`;
                    
                    console.log(`开始上传图片 ${index + 1}/${files.length} 到云端...`);
                    
                    // 添加延迟以避免并发冲突
                    if (index > 0) {
                        await new Promise(resolve => setTimeout(resolve, 500 * index));
                    }
                    
                    // 上传原始图片
                    console.log(`正在上传原始图片 ${index + 1}/${files.length}...`);
                    const originalUploadResult = await window.dataManager.uploadImageToGitHub(file, originalPath);
                    if (originalUploadResult.success) {
                        originalCloudUrl = originalUploadResult.url;
                        console.log(`原始图片 ${index + 1} 上传成功`);
                    } else {
                        throw new Error('原始图片上传失败');
                    }
                    
                    // 将水印图片转换为文件并上传
                    console.log(`正在上传水印图片 ${index + 1}/${files.length}...`);
                    const watermarkedBlob = await fetch(watermarkedUrl).then(r => r.blob());
                    const watermarkedFile = new File([watermarkedBlob], watermarkedFileName, { type: 'image/jpeg' });
                    const watermarkedUploadResult = await window.dataManager.uploadImageToGitHub(watermarkedFile, watermarkedPath);
                    if (watermarkedUploadResult.success) {
                        watermarkedCloudUrl = watermarkedUploadResult.url;
                        console.log(`水印图片 ${index + 1} 上传成功`);
                    } else {
                        throw new Error('水印图片上传失败');
                    }
                    
                    isCloudSynced = originalUploadResult.success && watermarkedUploadResult.success;
                    if (isCloudSynced) {
                        console.log(`图片 ${index + 1} 已成功上传到GitHub云端`);
                    }
                } catch (error) {
                    console.error(`GitHub上传失败 (${index + 1}/${files.length}):`, error);
                    
                    // 根据错误类型提供不同的提示
                    let errorMessage = `图片 ${index + 1} 云端上传失败，将保存到本地`;
                    if (error.message.includes('timeout') || error.message.includes('网络')) {
                        errorMessage += ': 网络连接超时，请检查网络状态';
                    } else if (error.message.includes('409')) {
                        errorMessage += ': 文件冲突，请稍后重试';
                    } else if (error.message.includes('403')) {
                        errorMessage += ': 权限不足，请检查GitHub配置';
                    } else {
                        errorMessage += `: ${error.message}`;
                    }
                    
                    showNotification(errorMessage, 'warning');
                    // 继续使用本地URL
                }
            }
            
            const photo = {
                id: 'photo_' + Date.now() + '_' + index,
                title: files.length > 1 ? `${title} (${index + 1})` : title,
                description: description,
                category: finalCategory,
                folder: selectedFolder, // 添加文件夹信息
                originalUrl: originalCloudUrl, // 存储原始图片URL（优先云端）
                watermarkedUrl: watermarkedCloudUrl, // 存储水印图片URL（优先云端）
                uploadDate: new Date().toISOString(),
                fileName: file.name,
                isCloudSynced: isCloudSynced // 标记是否已云端同步
            };
            
            photos.unshift(photo); // 添加到数组开头
            console.log(`图片 ${index + 1}/${files.length} 处理完成`);
            
        } catch (error) {
            console.error(`处理图片 ${index + 1} 时出错:`, error);
            showNotification(`图片 ${index + 1} 处理失败: ${error.message}`, 'error');
            // 继续处理下一张图片
        }
    }
    
    // 所有文件处理完成
    await completeUpload();
}

// 完成上传
async function completeUpload() {
    try {
        // 清除上传超时定时器
        if (window.uploadTimeout) {
            clearTimeout(window.uploadTimeout);
            window.uploadTimeout = null;
        }
        
        console.log('开始完成上传流程...');
        
        // 更新上传按钮状态
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.innerHTML = '<span class="loading"></span> 保存中...';
        }
        
        // 使用DataManager保存数据（包含本地存储和云端同步）
        console.log('保存照片数据...');
        if (uploadBtn) {
            uploadBtn.innerHTML = '<span class="loading"></span> 保存中...';
        }
        
        try {
            // 使用DataManager的savePhotos方法，它会自动处理本地存储和云端同步
            await window.dataManager.savePhotos(photos);
            
            if (window.githubManager && window.githubManager.isConfigured()) {
                console.log('照片数据已保存并同步到云端');
                showNotification('作品上传并同步到云端成功！', 'success');
            } else {
                console.log('照片数据已保存到本地');
                showNotification('作品上传成功！（仅保存到本地）', 'success');
            }
        } catch (error) {
            console.error('保存照片数据失败:', error);
            
            // 检查是否是GitHub Actions部署取消的错误
            const errorMessage = error.message || '';
            if (errorMessage.includes('Canceling since a higher priority waiting request for pages exists') ||
                errorMessage.includes('higher priority waiting request')) {
                // GitHub Actions部署取消，这是正常现象
                console.log('GitHub Actions部署被取消（正常现象）');
                try {
                    localStorage.setItem('photographyPhotos', JSON.stringify(photos));
                    showNotification('作品上传成功！GitHub正在部署中，稍后将自动同步', 'success');
                } catch (localError) {
                    console.error('本地存储失败:', localError);
                    showNotification(`本地保存失败: ${localError.message}`, 'error');
                    throw localError;
                }
            } else {
                // 其他错误，降级到直接保存本地存储
                try {
                    localStorage.setItem('photographyPhotos', JSON.stringify(photos));
                    console.log('已降级保存到本地存储');
                    showNotification(`云端同步失败: ${error.message}，但图片已保存到本地`, 'warning');
                } catch (localError) {
                    console.error('本地存储也失败:', localError);
                    showNotification(`保存失败: ${localError.message}`, 'error');
                    throw localError;
                }
            }
        }
        
        // 强制刷新数据并重新渲染
        console.log('强制刷新数据并重新渲染图片展示...');
        
        // 使用强制刷新机制确保获取最新数据
        if (window.dataManager && typeof window.dataManager.forceRefreshData === 'function') {
            try {
                console.log('使用强制刷新机制重新加载数据...');
                const freshPhotos = await window.dataManager.forceRefreshData('photos');
                photos = freshPhotos;
                console.log(`强制刷新完成，加载了 ${photos.length} 张照片`);
            } catch (error) {
                console.error('强制刷新数据失败:', error);
                // 降级到清除缓存后重新加载
                try {
                    if (window.dataManager.clearCacheByType) {
                        window.dataManager.clearCacheByType('photos');
                    }
                    const fallbackPhotos = await window.dataManager.getPhotos();
                    photos = fallbackPhotos;
                    console.log('降级刷新成功');
                } catch (fallbackError) {
                    console.error('降级刷新也失败:', fallbackError);
                    // 最后降级到本地存储
                    const savedPhotos = JSON.parse(localStorage.getItem('photographyPhotos') || '[]');
                    photos = savedPhotos;
                    console.log('已从本地存储重新加载照片数据');
                }
            }
        } else {
            // 兼容旧版本的清除缓存方式
            if (window.dataManager) {
                try {
                    if (typeof window.dataManager.clearCacheByType === 'function') {
                        window.dataManager.clearCacheByType('photos');
                    } else if (window.dataManager.cache) {
                        window.dataManager.cache.photos = null;
                        if (window.dataManager.cacheTimestamps) {
                            delete window.dataManager.cacheTimestamps.photos;
                        }
                    }
                    const freshPhotos = await window.dataManager.getPhotos();
                    photos = freshPhotos;
                    console.log('已重新加载照片数据');
                } catch (error) {
                    console.error('重新加载数据失败:', error);
                    const savedPhotos = JSON.parse(localStorage.getItem('photographyPhotos') || '[]');
                    photos = savedPhotos;
                    console.log('已从本地存储重新加载照片数据');
                }
            } else {
                // 直接从本地存储重新加载
                const savedPhotos = JSON.parse(localStorage.getItem('photographyPhotos') || '[]');
                photos = savedPhotos;
                console.log('已从本地存储重新加载照片数据');
            }
        }
        
        // 重新渲染图片展示
        renderGallery();
        
        // 重置表单
        const imageTitle = document.getElementById('imageTitle');
         if (imageTitle) imageTitle.value = '';
         
         const imageDescription = document.getElementById('imageDescription');
         if (imageDescription) imageDescription.value = '';
         
         const imageCategory = document.getElementById('imageCategory');
         if (imageCategory) imageCategory.value = 'portrait';
         
         const customCategory = document.getElementById('customCategory');
         if (customCategory) customCategory.value = '';
        const customCategoryGroup = document.getElementById('customCategoryGroup');
        if (customCategoryGroup) {
            customCategoryGroup.style.display = 'none';
        }
        
        const folderSelect = document.getElementById('folderSelect');
        if (folderSelect) {
            folderSelect.value = '';
        }
        
        const newFolderGroup = document.getElementById('newFolderGroup');
        if (newFolderGroup) {
            newFolderGroup.style.display = 'none';
        }
        const newFolderName = document.getElementById('newFolderName');
         if (newFolderName) {
             newFolderName.value = '';
         }
        
        // 隐藏文件计数
        const fileCountDiv = document.getElementById('fileCount');
        if (fileCountDiv) {
            fileCountDiv.style.display = 'none';
            fileCountDiv.textContent = '';
        }
        
        // 重置上传区域
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-content">
                    <div class="upload-icon">&#128247;</div>
                    <p>点击或拖拽图片到这里上传</p>
                </div>
            `;
        }
        
        // 重置按钮
        if (uploadBtn) {
            uploadBtn.innerHTML = '上传作品';
            uploadBtn.disabled = false;
        }
        
        // 清除选中的文件
        window.selectedFiles = null;
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.value = '';
        }
        
        console.log('上传流程完成');
        
    } catch (error) {
        console.error('完成上传时出错:', error);
        
        // 重置上传按钮
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.innerHTML = '上传作品';
            uploadBtn.disabled = false;
        }
        
        // 显示错误消息
        showNotification(`上传完成时出错: ${error.message}`, 'error');
        
        // 尝试重新渲染以显示可能已保存的图片
        try {
            renderGallery();
        } catch (renderError) {
            console.error('重新渲染时出错:', renderError);
        }
    }
}

// 记事本功能
async function initializeNotebook() {
    renderNotesList();
    
    // 新建记录按钮
    const newNoteBtn = document.getElementById('newNoteBtn');
    if (newNoteBtn) {
        newNoteBtn.addEventListener('click', createNewNote);
    }
    
    // 保存按钮
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', saveCurrentNote);
    }
    
    // 导出按钮
    const exportNoteBtn = document.getElementById('exportNoteBtn');
    if (exportNoteBtn) {
        exportNoteBtn.addEventListener('click', exportCurrentNote);
    }
    
    // 删除按钮
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    }
    
    // 内容变化监听
    const noteContent = document.getElementById('noteContent');
    const noteTitle = document.getElementById('noteTitle');
    
    if (noteContent) {
        noteContent.addEventListener('input', updateWordCount);
        noteContent.addEventListener('input', updateNotePreview);
    }
    if (noteTitle) {
        noteTitle.addEventListener('input', updateNotePreview);
    }
    
    // 如果有记录，加载第一个
    if (notes.length > 0) {
        loadNote(notes[0].id);
    } else {
        // 创建欢迎记录
        await createWelcomeNote();
    }
}

// 渲染记录列表
function renderNotesList() {
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    if (notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">&#128221;</div>
                <div class="empty-state-text">还没有任何记录</div>
                <div class="empty-state-subtext">点击新建记录开始记录你的成长路径</div>
            </div>
        `;
        return;
    }
    
    notesList.innerHTML = notes.map(note => `
        <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" onclick="loadNote('${note.id}')">
            <div class="note-item-title">${note.title || '无标题'}</div>
            <div class="note-item-date">${formatDate(note.lastModified)}</div>
            <div class="note-item-preview">${getContentPreview(note.content)}</div>
        </div>
    `).join('');
}

// 创建新记录
async function createNewNote() {
    if (!isAdmin) {
        alert('只有管理员可以使用记事本功能');
        return;
    }
    
    const newNote = {
        id: 'note_' + Date.now(),
        title: '',
        content: '',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    notes.unshift(newNote);
    await saveData('photographyNotes', notes);
    
    loadNote(newNote.id);
    renderNotesList();
    
    // 聚焦到标题输入框
    const noteTitle = document.getElementById('noteTitle');
        if (noteTitle) {
            noteTitle.focus();
        }
}

// 加载记录
function loadNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    
    const noteTitle = document.getElementById('noteTitle');
        if (noteTitle) {
            noteTitle.value = note.title || '';
        }
        
        const noteContent = document.getElementById('noteContent');
        if (noteContent) {
            noteContent.value = note.content || '';
        }
        
        const noteDate = document.getElementById('noteDate');
        if (noteDate) {
            noteDate.textContent = `创建于 ${formatDate(note.createdAt)} | 最后修改 ${formatDate(note.lastModified)}`;
        }
    
    updateWordCount();
    renderNotesList();
}

// 保存当前记录
async function saveCurrentNote() {
    if (!isAdmin) {
        alert('只有管理员可以保存记录');
        return;
    }
    
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    const noteTitleElement = document.getElementById('noteTitle');
    const noteContentElement = document.getElementById('noteContent');
    
    note.title = noteTitleElement ? (noteTitleElement.value.trim() || '无标题') : '无标题';
    note.content = noteContentElement ? noteContentElement.value : '';
    note.lastModified = new Date().toISOString();
    
    await saveData('photographyNotes', notes);
    
    renderNotesList();
    loadNote(currentNoteId); // 重新加载以更新日期显示
    
    showNotification('记录保存成功！', 'success');
}

// 导出当前记录
function exportCurrentNote() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    const content = `${note.title}\n\n${note.content}\n\n创建时间：${formatDate(note.createdAt)}\n最后修改：${formatDate(note.lastModified)}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || '记录'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    showNotification('记录导出成功！', 'success');
}

// 删除当前记录
async function deleteCurrentNote() {
    if (!isAdmin) {
        alert('只有管理员可以删除记录');
        return;
    }
    
    if (!currentNoteId) return;
    
    if (!confirm('确定要删除这条记录吗？此操作无法撤销。')) {
        return;
    }
    
    notes = notes.filter(n => n.id !== currentNoteId);
    await saveData('photographyNotes', notes);
    
    // 加载下一个记录或清空编辑器
    if (notes.length > 0) {
        loadNote(notes[0].id);
    } else {
        currentNoteId = null;
        const noteTitle = document.getElementById('noteTitle');
    if (noteTitle) {
        noteTitle.value = '';
    }
    
    const noteContent = document.getElementById('noteContent');
    if (noteContent) {
        noteContent.value = '';
    }
    
    const noteDate = document.getElementById('noteDate');
    if (noteDate) {
        noteDate.textContent = '';
    }
        updateWordCount();
    }
    
    renderNotesList();
    showNotification('记录删除成功！', 'success');
}

// 更新字数统计
function updateWordCount() {
    const noteContentElement = document.getElementById('noteContent');
    const content = noteContentElement ? noteContentElement.value : '';
    const wordCount = content.length;
    
    const wordCountElement = document.getElementById('wordCount');
    if (wordCountElement) {
        wordCountElement.textContent = `${wordCount} 字`;
    }
}

// 更新记录预览
function updateNotePreview() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    const noteTitleElement = document.getElementById('noteTitle');
    const noteContentElement = document.getElementById('noteContent');
    
    note.title = noteTitleElement ? (noteTitleElement.value.trim() || '无标题') : '无标题';
    note.content = noteContentElement ? noteContentElement.value : '';
    
    renderNotesList();
}

// 获取内容预览
function getContentPreview(content) {
    if (!content) return '暂无内容';
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
}

// 创建欢迎记录
async function createWelcomeNote() {
    const welcomeNote = {
        id: 'note_welcome',
        title: '欢迎来到我的摄影世界',
        content: `今天开始了我的摄影记录之旅！\n\n在这里，我将记录：\n• 摄影技巧的学习心得\n• 每次拍摄的感悟和收获\n• 创作灵感和想法\n• 成长路径上的重要时刻\n\n希望通过镜头，我能捕捉到更多生活中的美好瞬间，也希望通过文字，记录下这段美妙的摄影旅程。\n\n让我们开始吧！&#128247;&#10024;`,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    notes.push(welcomeNote);
    await saveData('photographyNotes', notes);
    
    loadNote(welcomeNote.id);
    renderNotesList();
}

// 模态框功能
function initializeModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.getElementById('closeModal');
    
    // 关闭模态框
    if (closeBtn) {
        closeBtn.addEventListener('click', closeImageModal);
    }
    
    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeImageModal();
            }
        });
    }
    
    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeImageModal();
        }
    });
}

// 打开图片模态框
function openImageModal(photoId) {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalCategory = document.getElementById('modalCategory');
    
    // 根据用户身份显示对应版本的图片
    const imageUrl = getImageUrlForUser(photo);
    
    if (modalImage) {
        modalImage.src = imageUrl;
        modalImage.alt = photo.title;
    }
    if (modalTitle) {
        modalTitle.textContent = photo.title;
    }
    if (modalDescription) {
        modalDescription.textContent = photo.description;
    }
    if (modalCategory) {
        modalCategory.textContent = getCategoryDisplayName(photo.category);
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
}

// 关闭图片模态框
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
}

// 工具函数
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}



// ==================== 关于我模块功能 ====================

// 初始化关于我模块
function initializeAboutSection() {
    loadAboutInfo();
}

// 加载关于我信息
function loadAboutInfo() {
    // 更新姓名
    const nameElement = document.getElementById('aboutName');
    if (nameElement && window.setUTF8Content) {
        window.setUTF8Content(nameElement, aboutInfo.name);
    } else if (nameElement) {
        nameElement.textContent = aboutInfo.name;
    }
    
    // 更新描述
    const descriptionElement = document.getElementById('aboutDescription');
    if (descriptionElement && window.setUTF8Content) {
        window.setUTF8Content(descriptionElement, aboutInfo.description);
    } else if (descriptionElement) {
        descriptionElement.innerHTML = aboutInfo.description;
    }
    
    // 更新联系信息
    updateContactInfo();
}

// 更新联系信息显示
function updateContactInfo() {
    const wechatElement = document.getElementById('wechatContact');
    const qqElement = document.getElementById('qqContact');
    const emailElement = document.getElementById('emailContact');
    
    if (wechatElement) {
        const wechatText = window.ensureUTF8 ? window.ensureUTF8(aboutInfo.contacts.wechat) : aboutInfo.contacts.wechat;
        if (window.setUTF8Content) {
            window.setUTF8Content(wechatElement, wechatText);
        } else {
            wechatElement.textContent = wechatText;
        }
    }
    
    if (qqElement) {
        const qqText = window.ensureUTF8 ? window.ensureUTF8(aboutInfo.contacts.qq) : aboutInfo.contacts.qq;
        if (window.setUTF8Content) {
            window.setUTF8Content(qqElement, qqText);
        } else {
            qqElement.textContent = qqText;
        }
    }
    
    if (emailElement) {
        const emailText = window.ensureUTF8 ? window.ensureUTF8(aboutInfo.contacts.email) : aboutInfo.contacts.email;
        if (window.setUTF8Content) {
            window.setUTF8Content(emailElement, emailText);
        } else {
            emailElement.textContent = emailText;
        }
    }
}

// 编辑联系信息
function editContact(type) {
    const currentValue = aboutInfo.contacts[type];
    const labels = {
        wechat: '微信号',
        qq: 'QQ号',
        email: '邮箱地址'
    };
    
    const newValue = prompt(`请输入新的${labels[type]}:`, currentValue);
    
    if (newValue !== null && newValue.trim() !== '') {
        aboutInfo.contacts[type] = newValue.trim();
        saveAboutInfo();
        updateContactInfo();
        showNotification(`${labels[type]}已更新！`, 'success');
    }
}

// 切换编辑模式
function toggleEditMode() {
    const editPanel = document.querySelector('.admin-edit-panel');
    const editBtn = document.querySelector('.edit-about-btn');
    
    if (editPanel && (editPanel.style.display === 'none' || !editPanel.style.display)) {
        // 显示编辑面板
        editPanel.style.display = 'block';
        if (editBtn) {
            editBtn.textContent = '取消编辑';
        }
        
        // 填充当前信息到编辑表单
        const editNameElement = document.getElementById('editName');
        if (editNameElement) {
            editNameElement.value = aboutInfo.name;
        }
        
        const editDescriptionElement = document.getElementById('editDescription');
        if (editDescriptionElement) {
            editDescriptionElement.value = aboutInfo.description.replace(/<p>/g, '').replace(/<\/p>/g, '\n').trim();
        }
    } else if (editPanel) {
        // 隐藏编辑面板
        editPanel.style.display = 'none';
        if (editBtn) {
            editBtn.textContent = '编辑个人信息';
        }
    }
}

// 保存关于我信息
async function saveAboutInfo() {
    const nameInput = document.getElementById('editName');
    const descriptionInput = document.getElementById('editDescription');
    
    if (nameInput && descriptionInput) {
        // 更新信息
        aboutInfo.name = nameInput.value.trim();
        
        // 将文本转换为HTML段落
        const descriptionText = descriptionInput.value.trim();
        const paragraphs = descriptionText.split('\n').filter(p => p.trim() !== '');
        aboutInfo.description = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
        
        // 保存到本地存储和云端
        await saveData('aboutInfo', aboutInfo);
        
        // 更新显示
        loadAboutInfo();
        
        // 隐藏编辑面板
        toggleEditMode();
        
        showNotification('个人信息已保存！', 'success');
    }
}

// 取消编辑
function cancelEdit() {
    toggleEditMode();
}

// 保存关于我信息到本地存储
async function saveAboutInfoToStorage() {
    await saveData('aboutInfo', aboutInfo);
}

// 加载示例数据
async function loadSampleData() {
    const samplePhotos = [
        {
            id: 'sample_1',
            title: '夕阳下的剪影',
            description: '在海边捕捉到的美丽夕阳剪影，温暖的光线勾勒出人物的轮廓。',
            category: 'portrait',
            url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
                    <defs>
                        <linearGradient id="sunset" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#ff7675;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#fdcb6e;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#ffeaa7;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect width="400" height="300" fill="url(#sunset)"/>
                    <circle cx="320" cy="80" r="40" fill="#fd79a8" opacity="0.8"/>
                    <ellipse cx="200" cy="250" rx="60" ry="80" fill="#2d3436" opacity="0.9"/>
                    <text x="200" y="280" text-anchor="middle" fill="white" font-family="Arial" font-size="12">夕阳剪影</text>
                    <text x="330" y="260" text-anchor="middle" fill="rgba(128,128,128,0.3)" font-family="Arial Black" font-size="16" font-weight="900" stroke="rgba(96,96,96,0.2)" stroke-width="1">嗷呜一口</text>
                </svg>
            `),
            uploadDate: new Date(Date.now() - 86400000).toISOString(),
            fileName: 'sunset_silhouette.jpg'
        },
        {
            id: 'sample_2',
            title: '山间晨雾',
            description: '清晨的山谷中，薄雾缭绕，阳光透过云层洒向大地。',
            category: 'nature',
            url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
                    <defs>
                        <linearGradient id="morning" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#74b9ff;stop-opacity:1" />
                            <stop offset="70%" style="stop-color:#a29bfe;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#6c5ce7;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect width="400" height="300" fill="url(#morning)"/>
                    <polygon points="0,200 100,150 200,180 300,120 400,160 400,300 0,300" fill="#00b894" opacity="0.8"/>
                    <ellipse cx="200" cy="180" rx="150" ry="30" fill="white" opacity="0.3"/>
                    <ellipse cx="300" cy="140" rx="100" ry="20" fill="white" opacity="0.4"/>
                    <text x="200" y="280" text-anchor="middle" fill="white" font-family="Arial" font-size="12">山间晨雾</text>
                    <text x="330" y="260" text-anchor="middle" fill="rgba(128,128,128,0.3)" font-family="Arial Black" font-size="16" font-weight="900" stroke="rgba(96,96,96,0.2)" stroke-width="1">嗷呜一口</text>
                </svg>
            `),
            uploadDate: new Date(Date.now() - 172800000).toISOString(),
            fileName: 'mountain_mist.jpg'
        },
        {
            id: 'sample_3',
            title: '城市夜景',
            description: '繁华都市的夜晚，霓虹灯光交织成美丽的光影世界。',
            category: 'social',
            url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
                    <rect width="400" height="300" fill="#2d3436"/>
                    <rect x="50" y="100" width="40" height="150" fill="#636e72"/>
                    <rect x="120" y="80" width="35" height="170" fill="#636e72"/>
                    <rect x="180" y="60" width="45" height="190" fill="#636e72"/>
                    <rect x="250" y="90" width="38" height="160" fill="#636e72"/>
                    <rect x="310" y="110" width="42" height="140" fill="#636e72"/>
                    <rect x="55" y="105" width="8" height="8" fill="#fdcb6e"/>
                    <rect x="75" y="120" width="8" height="8" fill="#fd79a8"/>
                    <rect x="125" y="90" width="6" height="6" fill="#00cec9"/>
                    <rect x="140" y="110" width="6" height="6" fill="#fdcb6e"/>
                    <rect x="185" y="70" width="8" height="8" fill="#fd79a8"/>
                    <rect x="205" y="100" width="8" height="8" fill="#00cec9"/>
                    <rect x="255" y="100" width="6" height="6" fill="#fdcb6e"/>
                    <rect x="270" y="130" width="6" height="6" fill="#fd79a8"/>
                    <rect x="315" y="120" width="8" height="8" fill="#00cec9"/>
                    <rect x="335" y="140" width="8" height="8" fill="#fdcb6e"/>
                    <text x="200" y="280" text-anchor="middle" fill="white" font-family="Arial" font-size="12">城市夜景</text>
                    <text x="330" y="260" text-anchor="middle" fill="rgba(128,128,128,0.3)" font-family="Arial Black" font-size="16" font-weight="900" stroke="rgba(96,96,96,0.2)" stroke-width="1">嗷呜一口</text>
                </svg>
            `),
            uploadDate: new Date(Date.now() - 259200000).toISOString(),
            fileName: 'city_night.jpg'
        }
    ];
    
    // 为示例数据添加水印版本和原始版本
    samplePhotos.forEach(photo => {
        // 示例数据已经包含水印，所以水印版本就是当前URL
        photo.watermarkedUrl = photo.url;
        // 创建一个没有水印的原始版本（简化处理）
        photo.originalUrl = photo.url.replace(
            /<text x="330"[^>]*>嗷呜一口<\/text>/g, 
            ''
        );
    });
    
    photos.push(...samplePhotos);
    await saveData('photographyPhotos', photos);
    renderGallery();
}

// 为现有数据添加水印版本（兼容性处理）
async function upgradeExistingPhotos() {
    let needsUpgrade = false;
    
    photos.forEach(photo => {
        // 如果照片没有原始版本和水印版本，需要升级
        if (!photo.originalUrl && !photo.watermarkedUrl && photo.url) {
            // 假设现有的URL是原始版本
            photo.originalUrl = photo.url;
            
            // 为现有图片添加水印（异步处理）
            addWatermarkToImage(photo.url, async (watermarkedUrl) => {
                photo.watermarkedUrl = watermarkedUrl;
                await saveData('photographyPhotos', photos);
            });
            
            needsUpgrade = true;
        }
    });
    
    if (needsUpgrade) {
        await saveData('photographyPhotos', photos);
    }
}

// 为HTML调用创建包装函数
function handleSaveAboutInfo() {
    saveAboutInfo().catch(error => {
        console.error('保存关于信息时出错:', error);
        showNotification('保存失败，请重试', 'error');
    });
}

// 导出全局函数供HTML调用
window.openImageModal = openImageModal;
window.loadNote = loadNote;
window.togglePhotoSelection = togglePhotoSelection;
window.deletePhoto = deletePhoto;
window.replacePhoto = replacePhoto;
window.openFolder = openFolder;
window.backToFolders = backToFolders;
window.handleSaveAboutInfo = handleSaveAboutInfo;