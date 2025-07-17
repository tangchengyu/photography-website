/**
 * 字符编码处理工具函数
 * 解决跨浏览器中文字符显示问题
 */

// 强制UTF-8编码的fetch函数
window.fetchUTF8 = async function(url, options = {}) {
    try {
        // 设置强制UTF-8编码的headers
        const defaultHeaders = {
            'Accept': 'application/json; charset=utf-8',
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Charset': 'utf-8'
        };
        
        const fetchOptions = {
            method: 'GET',
            cache: 'no-cache',
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };
        
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 使用ArrayBuffer和TextDecoder强制UTF-8解码
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arrayBuffer);
        
        // 如果是JSON，解析并返回
        if (response.headers.get('content-type')?.includes('json')) {
            return JSON.parse(text);
        }
        
        return text;
    } catch (error) {
        console.error('fetchUTF8 error:', error);
        throw error;
    }
};

// 字符串UTF-8编码验证和修复
window.ensureUTF8 = function(str) {
    if (typeof str !== 'string') {
        return str;
    }
    
    try {
        // 检查字符串是否已经是正确的UTF-8编码
        const encoded = encodeURIComponent(str);
        const decoded = decodeURIComponent(encoded);
        
        if (decoded === str) {
            return str;
        }
        
        // 如果不匹配，尝试修复
        return decoded;
    } catch (error) {
        console.warn('UTF-8 encoding check failed:', error);
        return str;
    }
};

// DOM内容UTF-8安全设置
window.setUTF8Content = function(element, content) {
    if (!element) return;
    
    try {
        // 确保内容是UTF-8编码
        const safeContent = ensureUTF8(content);
        
        // 使用innerHTML而不是textContent来支持HTML标签
        if (content.includes('<') && content.includes('>')) {
            element.innerHTML = safeContent;
        } else {
            element.textContent = safeContent;
        }
    } catch (error) {
        console.error('setUTF8Content error:', error);
        element.textContent = content; // 降级处理
    }
};

// 浏览器兼容性检测
window.detectBrowserEncoding = function() {
    const testString = '测试中文字符';
    const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        charset: document.characterSet || document.charset,
        testString: testString,
        encodedLength: new Blob([testString]).size
    };
    
    console.log('Browser encoding info:', info);
    return info;
};

// 强制UTF-8编码的JSON解析函数
window.parseUTF8JSON = function(jsonString) {
    try {
        // 确保字符串是UTF-8编码
        const safeString = ensureUTF8(jsonString);
        return JSON.parse(safeString);
    } catch (error) {
        console.error('parseUTF8JSON error:', error);
        throw error;
    }
};

// 批量处理对象中的所有字符串字段
window.sanitizeObjectUTF8 = function(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return ensureUTF8(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObjectUTF8(item));
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[ensureUTF8(key)] = sanitizeObjectUTF8(value);
        }
        return sanitized;
    }
    
    return obj;
};

// 检测字符串是否包含乱码
window.detectGarbledText = function(text) {
    if (typeof text !== 'string') {
        return false;
    }
    
    // 检测常见的乱码模式
    const garbledPatterns = [
        /[\uFFFD]/g,  // 替换字符
        /\?{2,}/g,    // 连续问号
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,  // 控制字符
    ];
    
    return garbledPatterns.some(pattern => pattern.test(text));
};

// 修复乱码文本
window.fixGarbledText = function(text) {
    if (typeof text !== 'string') {
        return text;
    }
    
    try {
        // 尝试不同的解码方式
        let fixed = text;
        
        // 移除替换字符
        fixed = fixed.replace(/[\uFFFD]/g, '');
        
        // 尝试URL解码
        try {
            const urlDecoded = decodeURIComponent(escape(fixed));
            if (!detectGarbledText(urlDecoded)) {
                fixed = urlDecoded;
            }
        } catch (e) {
            // 忽略解码错误
        }
        
        return ensureUTF8(fixed);
    } catch (error) {
        console.warn('fixGarbledText failed:', error);
        return text;
    }
};

// 安全的localStorage存储（确保UTF-8编码）
window.setUTF8Storage = function(key, value) {
    try {
        const sanitizedKey = ensureUTF8(key);
        const sanitizedValue = typeof value === 'string' ? 
            ensureUTF8(value) : 
            JSON.stringify(sanitizeObjectUTF8(value));
        
        localStorage.setItem(sanitizedKey, sanitizedValue);
        return true;
    } catch (error) {
        console.error('setUTF8Storage error:', error);
        return false;
    }
};

// 安全的localStorage读取（确保UTF-8编码）
window.getUTF8Storage = function(key, defaultValue = null) {
    try {
        const sanitizedKey = ensureUTF8(key);
        const value = localStorage.getItem(sanitizedKey);
        
        if (value === null) {
            return defaultValue;
        }
        
        const safeValue = ensureUTF8(value);
        
        // 尝试解析为JSON
        try {
            return parseUTF8JSON(safeValue);
        } catch (e) {
            // 如果不是JSON，返回字符串
            return safeValue;
        }
    } catch (error) {
        console.error('getUTF8Storage error:', error);
        return defaultValue;
    }
};

// 创建UTF-8安全的XMLHttpRequest
window.createUTF8XHR = function() {
    const xhr = new XMLHttpRequest();
    
    // 重写responseText getter以确保UTF-8解码
    const originalResponseText = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    
    Object.defineProperty(xhr, 'responseText', {
        get: function() {
            const text = originalResponseText.get.call(this);
            return ensureUTF8(text);
        }
    });
    
    return xhr;
};

// 浏览器特定的编码修复
window.applyBrowserSpecificFixes = function() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Safari特定修复
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        // Safari有时在处理UTF-8时有问题
        document.addEventListener('DOMContentLoaded', function() {
            const metaCharset = document.querySelector('meta[charset]');
            if (metaCharset) {
                metaCharset.setAttribute('charset', 'UTF-8');
            }
        });
    }
    
    // Edge特定修复
    if (userAgent.includes('edge')) {
        // Edge可能需要强制设置文档编码
        if (document.characterSet !== 'UTF-8') {
            console.warn('Document charset is not UTF-8:', document.characterSet);
        }
    }
    
    // 旧版IE修复（如果需要支持）
    if (userAgent.includes('msie') || userAgent.includes('trident')) {
        // 为旧版IE添加UTF-8支持
        document.charset = 'UTF-8';
    }
};

// 全局错误处理器，捕获编码相关错误
window.setupEncodingErrorHandler = function() {
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message) {
            const message = event.error.message;
            if (message.includes('encoding') || message.includes('charset') || message.includes('UTF-8')) {
                console.error('Encoding related error detected:', event.error);
                // 可以在这里添加自动修复逻辑
            }
        }
    });
};

// 页面加载完成后的初始化
function initializeEncodingUtils() {
    detectBrowserEncoding();
    applyBrowserSpecificFixes();
    setupEncodingErrorHandler();
    
    console.log('Encoding utils initialized successfully');
}

// 页面加载完成后检测编码并初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEncodingUtils);
} else {
    initializeEncodingUtils();
}