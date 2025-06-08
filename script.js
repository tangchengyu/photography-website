// 全局变量
let currentNoteId = null;
let notes = JSON.parse(localStorage.getItem('photographyNotes')) || [];
let photos = JSON.parse(localStorage.getItem('photographyPhotos')) || [];
let customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
let aboutInfo = JSON.parse(localStorage.getItem('aboutInfo')) || {
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
let isAdmin = false;
const ADMIN_PASSWORD = '20231026';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    showLoginModal();
    initializeApp();
});

// 显示登录模态框
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'flex';
    
    // 绑定登录事件
    document.getElementById('loginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('guestBtn').addEventListener('click', handleGuestLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // 回车键登录
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    });
}

// 管理员登录
function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('loginModal').style.display = 'none';
        updateUserInterface();
        showSuccessMessage('管理员登录成功！');
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('adminPassword').value = '';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// 游客登录
function handleGuestLogin() {
    isAdmin = false;
    document.getElementById('loginModal').style.display = 'none';
    updateUserInterface();
    showSuccessMessage('欢迎以游客身份访问！');
}

// 退出登录
function handleLogout() {
    isAdmin = false;
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
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
    
    userStatus.textContent = isAdmin ? '管理员模式' : '游客模式';
    userStatus.style.background = isAdmin ? 'rgba(225, 112, 85, 0.2)' : 'rgba(116, 185, 255, 0.2)';
    
    // 更新分类按钮显示
    updateCategoryButtons();
    
    // 重新渲染图片（应用权限过滤）
    renderGallery();
}

// 初始化应用
function initializeApp() {
    // 初始化导航
    initializeNavigation();
    
    // 初始化图片展示
    initializeGallery();
    
    // 更新分类按钮
    updateCategoryButtons();
    
    // 初始化上传功能
    initializeUpload();
    
    // 初始化记事本
    initializeNotebook();
    
    // 初始化模态框
    initializeModal();
    
    // 初始化图片管理功能
    setupPhotoManagement();
    
    // 初始化关于我模块
    initializeAboutSection();
    
    // 加载示例数据（如果是第一次访问）
    if (photos.length === 0) {
        loadSampleData();
    } else {
        // 升级现有照片数据（添加水印版本）
        upgradeExistingPhotos();
    }
}

// 设置图片管理功能
function setupPhotoManagement() {
    // 搜索功能
    document.getElementById('searchBtn').addEventListener('click', searchPhotos);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPhotos();
        }
    });
    
    // 清除搜索
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    
    // 全选功能
    document.getElementById('selectAllBtn').addEventListener('click', toggleSelectAll);
    
    // 删除选中
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedPhotos);
}

// 全局变量：选中的图片ID数组
let selectedPhotos = [];

// 搜索图片
function searchPhotos() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
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
    showSuccessMessage(`找到 ${filteredPhotos.length} 张相关图片`);
}

// 清除搜索
function clearSearch() {
    document.getElementById('searchInput').value = '';
    renderGallery();
    showSuccessMessage('已清除搜索条件');
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
    deleteSelectedBtn.textContent = `🗑️ 删除选中 (${selectedPhotos.length})`;
    deleteSelectedBtn.disabled = selectedPhotos.length === 0;
}

// 删除选中的图片
function deleteSelectedPhotos() {
    if (selectedPhotos.length === 0) {
        alert('请先选择要删除的图片');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedPhotos.length} 张图片吗？此操作不可撤销。`)) {
        photos = photos.filter(photo => !selectedPhotos.includes(photo.id));
        localStorage.setItem('photographyPhotos', JSON.stringify(photos));
        
        selectedPhotos = [];
        renderGallery();
        updateSelectionUI();
        showSuccessMessage('选中的图片已删除');
    }
}

// 删除单张图片
function deletePhoto(photoId) {
    if (confirm('确定要删除这张图片吗？此操作不可撤销。')) {
        photos = photos.filter(photo => photo.id !== photoId);
        localStorage.setItem('photographyPhotos', JSON.stringify(photos));
        
        // 从选中列表中移除
        const index = selectedPhotos.indexOf(photoId);
        if (index > -1) {
            selectedPhotos.splice(index, 1);
        }
        
        renderGallery();
        updateSelectionUI();
        showSuccessMessage('图片已删除');
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
                addWatermarkToImage(originalUrl, (watermarkedUrl) => {
                    const photo = photos.find(p => p.id === photoId);
                    if (photo) {
                        // 更新图片数据，保存原始版本和水印版本
                        photo.originalUrl = originalUrl;
                        photo.watermarkedUrl = watermarkedUrl;
                        // 保持向后兼容
                        photo.url = watermarkedUrl;
                        photo.lastModified = new Date().toISOString();
                        photo.fileName = file.name;
                        
                        localStorage.setItem('photographyPhotos', JSON.stringify(photos));
                        renderGallery();
                        showSuccessMessage('图片已替换');
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
            
            // 筛选图片
            const category = this.getAttribute('data-category');
            filterGallery(category);
        });
    });
}

// 渲染图片展示
function renderGallery(filteredPhotos = null) {
    const galleryGrid = document.getElementById('galleryGrid');
    let photosToShow = filteredPhotos || photos;
    
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
        galleryGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📷</div>
                <div class="empty-state-text">还没有上传任何作品</div>
                <div class="empty-state-subtext">点击上传按钮开始分享你的摄影作品吧！</div>
            </div>
        `;
        return;
    }
    
    galleryGrid.innerHTML = photosToShow.map(photo => {
        // 根据用户身份选择显示的图片版本
        const imageUrl = getImageUrlForUser(photo);
        
        return `
            <div class="gallery-item" data-photo-id="${photo.id}" onclick="openImageModal('${photo.id}')">
                ${isAdmin ? `
                    <input type="checkbox" class="photo-checkbox" onclick="event.stopPropagation(); togglePhotoSelection('${photo.id}')">
                    <div class="photo-actions">
                        <button class="action-btn replace-btn" onclick="event.stopPropagation(); replacePhoto('${photo.id}')" title="替换图片">🔄</button>
                        <button class="action-btn delete-single-btn" onclick="event.stopPropagation(); deletePhoto('${photo.id}')" title="删除图片">🗑️</button>
                    </div>
                ` : ''}
                <img src="${imageUrl}" alt="${photo.title}" loading="lazy">
                <div class="gallery-item-info">
                    <h3 class="gallery-item-title">${photo.title}</h3>
                    <p class="gallery-item-description">${photo.description}</p>
                    <span class="gallery-item-category">${getCategoryDisplayName(photo.category)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 根据用户身份获取图片URL
function getImageUrlForUser(photo) {
    // 兼容旧数据格式
    if (photo.url && !photo.originalUrl && !photo.watermarkedUrl) {
        return photo.url;
    }
    
    // 新数据格式：管理员看原图，游客看水印图
    if (isAdmin) {
        return photo.originalUrl || photo.url;
    } else {
        return photo.watermarkedUrl || photo.url;
    }
}

// 筛选图片
function filterGallery(category) {
    if (category === 'all') {
        renderGallery();
    } else {
        const filtered = photos.filter(photo => photo.category === category);
        renderGallery(filtered);
    }
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
                
                // 筛选图片
                const categoryId = this.getAttribute('data-category');
                filterGallery(categoryId);
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
                    deleteCustomCategory(category.id);
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
function deleteCustomCategory(categoryId) {
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
    
    // 保存到本地存储
    localStorage.setItem('photographyPhotos', JSON.stringify(photos));
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    
    // 更新界面
    updateCategoryButtons();
    renderGallery();
    
    // 显示成功消息
    showSuccessMessage(`分类"${categoryToDelete.name}"已删除`);
}

// 上传功能
function initializeUpload() {
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadBtn = document.getElementById('uploadBtn');
    const categorySelect = document.getElementById('imageCategory');
    const customCategoryGroup = document.getElementById('customCategoryGroup');
    
    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });
    
    // 拖拽上传
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
    
    // 文件选择
    imageInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
    
    // 分类选择变化
    categorySelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customCategoryGroup.style.display = 'block';
        } else {
            customCategoryGroup.style.display = 'none';
        }
    });
    
    // 上传按钮
    uploadBtn.addEventListener('click', uploadImages);
}

// 处理文件上传
function handleFileUpload(files) {
    const uploadArea = document.getElementById('uploadArea');
    const fileCount = files.length;
    
    if (fileCount > 0) {
        uploadArea.innerHTML = `
            <div class="upload-content">
                <div class="upload-icon">✅</div>
                <p>已选择 ${fileCount} 个文件</p>
            </div>
        `;
    }
    
    // 存储文件到全局变量
    window.selectedFiles = files;
}

// 添加水印到图片
function addWatermarkToImage(imageSrc, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
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
    };
    
    img.src = imageSrc;
}

// 上传图片
function uploadImages() {
    if (!isAdmin) {
        alert('只有管理员可以上传图片');
        return;
    }
    
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        alert('请先选择要上传的图片！');
        return;
    }
    
    const title = document.getElementById('imageTitle').value.trim();
    const description = document.getElementById('imageDescription').value.trim();
    const category = document.getElementById('imageCategory').value;
    const customCategory = document.getElementById('customCategory').value.trim();
    const guestVisible = document.getElementById('guestVisible') ? document.getElementById('guestVisible').checked : true;
    
    if (!title) {
        alert('请输入作品标题！');
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
            localStorage.setItem('customCategories', JSON.stringify(customCategories));
            
            // 更新分类按钮
            updateCategoryButtons();
        } else {
            finalCategory = existingCategory.id;
        }
    }
    
    // 显示上传进度
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.innerHTML = '<span class="loading"></span> 上传中...';
    uploadBtn.disabled = true;
    
    let processedCount = 0;
    
    // 处理每个文件
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const originalUrl = e.target.result;
            
            // 为图片添加水印
            addWatermarkToImage(originalUrl, (watermarkedUrl) => {
                const photo = {
                    id: 'photo_' + Date.now() + '_' + index,
                    title: files.length > 1 ? `${title} (${index + 1})` : title,
                    description: description,
                    category: finalCategory,
                    originalUrl: originalUrl, // 存储原始图片（管理员查看）
                    watermarkedUrl: watermarkedUrl, // 存储水印图片（游客查看）
                    uploadDate: new Date().toISOString(),
                    fileName: file.name
                };
                
                photos.unshift(photo); // 添加到数组开头
                processedCount++;
                
                // 如果是最后一个文件，完成上传
                if (processedCount === files.length) {
                    completeUpload();
                }
            });
        };
        reader.readAsDataURL(file);
    });
}

// 完成上传
function completeUpload() {
    // 保存到本地存储
    localStorage.setItem('photographyPhotos', JSON.stringify(photos));
    
    // 重新渲染图片展示
    renderGallery();
    
    // 重置表单
    document.getElementById('imageTitle').value = '';
    document.getElementById('imageDescription').value = '';
    document.getElementById('imageCategory').value = 'portrait';
    document.getElementById('customCategory').value = '';
    document.getElementById('customCategoryGroup').style.display = 'none';
    
    // 重置上传区域
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <div class="upload-content">
            <div class="upload-icon">📷</div>
            <p>点击或拖拽图片到这里上传</p>
        </div>
    `;
    
    // 重置按钮
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.innerHTML = '上传作品';
    uploadBtn.disabled = false;
    
    // 显示成功消息
    showSuccessMessage('作品上传成功！');
    
    // 清除选中的文件
    window.selectedFiles = null;
    document.getElementById('imageInput').value = '';
}

// 记事本功能
function initializeNotebook() {
    renderNotesList();
    
    // 新建记录按钮
    document.getElementById('newNoteBtn').addEventListener('click', createNewNote);
    
    // 保存按钮
    document.getElementById('saveNoteBtn').addEventListener('click', saveCurrentNote);
    
    // 导出按钮
    document.getElementById('exportNoteBtn').addEventListener('click', exportCurrentNote);
    
    // 删除按钮
    document.getElementById('deleteNoteBtn').addEventListener('click', deleteCurrentNote);
    
    // 内容变化监听
    const noteContent = document.getElementById('noteContent');
    const noteTitle = document.getElementById('noteTitle');
    
    noteContent.addEventListener('input', updateWordCount);
    noteTitle.addEventListener('input', updateNotePreview);
    noteContent.addEventListener('input', updateNotePreview);
    
    // 如果有记录，加载第一个
    if (notes.length > 0) {
        loadNote(notes[0].id);
    } else {
        // 创建欢迎记录
        createWelcomeNote();
    }
}

// 渲染记录列表
function renderNotesList() {
    const notesList = document.getElementById('notesList');
    
    if (notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
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
function createNewNote() {
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
    localStorage.setItem('photographyNotes', JSON.stringify(notes));
    
    loadNote(newNote.id);
    renderNotesList();
    
    // 聚焦到标题输入框
    document.getElementById('noteTitle').focus();
}

// 加载记录
function loadNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('noteDate').textContent = `创建于 ${formatDate(note.createdAt)} | 最后修改 ${formatDate(note.lastModified)}`;
    
    updateWordCount();
    renderNotesList();
}

// 保存当前记录
function saveCurrentNote() {
    if (!isAdmin) {
        alert('只有管理员可以保存记录');
        return;
    }
    
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    note.title = document.getElementById('noteTitle').value.trim() || '无标题';
    note.content = document.getElementById('noteContent').value;
    note.lastModified = new Date().toISOString();
    
    localStorage.setItem('photographyNotes', JSON.stringify(notes));
    
    renderNotesList();
    loadNote(currentNoteId); // 重新加载以更新日期显示
    
    showSuccessMessage('记录保存成功！');
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
    
    showSuccessMessage('记录导出成功！');
}

// 删除当前记录
function deleteCurrentNote() {
    if (!isAdmin) {
        alert('只有管理员可以删除记录');
        return;
    }
    
    if (!currentNoteId) return;
    
    if (!confirm('确定要删除这条记录吗？此操作无法撤销。')) {
        return;
    }
    
    notes = notes.filter(n => n.id !== currentNoteId);
    localStorage.setItem('photographyNotes', JSON.stringify(notes));
    
    // 加载下一个记录或清空编辑器
    if (notes.length > 0) {
        loadNote(notes[0].id);
    } else {
        currentNoteId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('noteDate').textContent = '';
        updateWordCount();
    }
    
    renderNotesList();
    showSuccessMessage('记录删除成功！');
}

// 更新字数统计
function updateWordCount() {
    const content = document.getElementById('noteContent').value;
    const wordCount = content.length;
    document.getElementById('wordCount').textContent = `${wordCount} 字`;
}

// 更新记录预览
function updateNotePreview() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    note.title = document.getElementById('noteTitle').value.trim() || '无标题';
    note.content = document.getElementById('noteContent').value;
    
    renderNotesList();
}

// 获取内容预览
function getContentPreview(content) {
    if (!content) return '暂无内容';
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
}

// 创建欢迎记录
function createWelcomeNote() {
    const welcomeNote = {
        id: 'note_welcome',
        title: '欢迎来到我的摄影世界',
        content: `今天开始了我的摄影记录之旅！\n\n在这里，我将记录：\n• 摄影技巧的学习心得\n• 每次拍摄的感悟和收获\n• 创作灵感和想法\n• 成长路径上的重要时刻\n\n希望通过镜头，我能捕捉到更多生活中的美好瞬间，也希望通过文字，记录下这段美妙的摄影旅程。\n\n让我们开始吧！📷✨`,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    notes.push(welcomeNote);
    localStorage.setItem('photographyNotes', JSON.stringify(notes));
    
    loadNote(welcomeNote.id);
    renderNotesList();
}

// 模态框功能
function initializeModal() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.getElementById('closeModal');
    
    // 关闭模态框
    closeBtn.addEventListener('click', closeImageModal);
    
    // 点击模态框外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
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
    
    modalImage.src = imageUrl;
    modalImage.alt = photo.title;
    modalTitle.textContent = photo.title;
    modalDescription.textContent = photo.description;
    modalCategory.textContent = getCategoryDisplayName(photo.category);
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 关闭图片模态框
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
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

function showSuccessMessage(message) {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #00b894, #00cec9);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
    `;
    
    // 添加动画样式
    if (!document.querySelector('#successMessageStyle')) {
        const style = document.createElement('style');
        style.id = 'successMessageStyle';
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
    }
    
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
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
    if (nameElement) {
        nameElement.textContent = aboutInfo.name;
    }
    
    // 更新描述
    const descriptionElement = document.getElementById('aboutDescription');
    if (descriptionElement) {
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
    
    if (wechatElement) wechatElement.textContent = aboutInfo.contacts.wechat;
    if (qqElement) qqElement.textContent = aboutInfo.contacts.qq;
    if (emailElement) emailElement.textContent = aboutInfo.contacts.email;
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
        showSuccessMessage(`${labels[type]}已更新！`);
    }
}

// 切换编辑模式
function toggleEditMode() {
    const editPanel = document.querySelector('.admin-edit-panel');
    const editBtn = document.querySelector('.edit-about-btn');
    
    if (editPanel.style.display === 'none' || !editPanel.style.display) {
        // 显示编辑面板
        editPanel.style.display = 'block';
        editBtn.textContent = '取消编辑';
        
        // 填充当前信息到编辑表单
        document.getElementById('editName').value = aboutInfo.name;
        document.getElementById('editDescription').value = aboutInfo.description.replace(/<p>/g, '').replace(/<\/p>/g, '\n').trim();
    } else {
        // 隐藏编辑面板
        editPanel.style.display = 'none';
        editBtn.textContent = '编辑个人信息';
    }
}

// 保存关于我信息
function saveAboutInfo() {
    const nameInput = document.getElementById('editName');
    const descriptionInput = document.getElementById('editDescription');
    
    if (nameInput && descriptionInput) {
        // 更新信息
        aboutInfo.name = nameInput.value.trim();
        
        // 将文本转换为HTML段落
        const descriptionText = descriptionInput.value.trim();
        const paragraphs = descriptionText.split('\n').filter(p => p.trim() !== '');
        aboutInfo.description = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
        
        // 保存到本地存储
        localStorage.setItem('aboutInfo', JSON.stringify(aboutInfo));
        
        // 更新显示
        loadAboutInfo();
        
        // 隐藏编辑面板
        toggleEditMode();
        
        showSuccessMessage('个人信息已保存！');
    }
}

// 取消编辑
function cancelEdit() {
    toggleEditMode();
}

// 保存关于我信息到本地存储
function saveAboutInfoToStorage() {
    localStorage.setItem('aboutInfo', JSON.stringify(aboutInfo));
}

// 加载示例数据
function loadSampleData() {
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
    localStorage.setItem('photographyPhotos', JSON.stringify(photos));
    renderGallery();
}

// 为现有数据添加水印版本（兼容性处理）
function upgradeExistingPhotos() {
    let needsUpgrade = false;
    
    photos.forEach(photo => {
        // 如果照片没有原始版本和水印版本，需要升级
        if (!photo.originalUrl && !photo.watermarkedUrl && photo.url) {
            // 假设现有的URL是原始版本
            photo.originalUrl = photo.url;
            
            // 为现有图片添加水印（异步处理）
            addWatermarkToImage(photo.url, (watermarkedUrl) => {
                photo.watermarkedUrl = watermarkedUrl;
                localStorage.setItem('photographyPhotos', JSON.stringify(photos));
            });
            
            needsUpgrade = true;
        }
    });
    
    if (needsUpgrade) {
        localStorage.setItem('photographyPhotos', JSON.stringify(photos));
    }
}

// 导出全局函数供HTML调用
window.openImageModal = openImageModal;
window.loadNote = loadNote;
window.togglePhotoSelection = togglePhotoSelection;
window.deletePhoto = deletePhoto;
window.replacePhoto = replacePhoto;