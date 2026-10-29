// ============================================================================
// 动态CSS主题变量美化控制中心 (Tavern Helper Script - OopsPalette V3)
// ============================================================================

const WIDGET_ID = 'st-glass-css-theme-center';
const STYLE_TAG_ID = 'st-custom-theme-vars-override';
const GALLERY_FONT_STYLE_ID = 'st-oops-gallery-fonts-preload';
const STORAGE_KEY = 'st_custom_css_theme_center_v1';
const AUTH_SIGNATURE = '@Oopsnow 的OopsPalette';
const SCRIPT_RELEASE_URL = 'https://discord.com'; // 可在此处或设置页替换为您实际的脚本发布链接

const AUTH_HEADER_BLOCK = `/* ==================================
当前用户确认该美化原作者允许二改并允许使用@Oopsnow 的OopsPalette
后续使用与修改与@Oopsnow无关 
请尊重所有美化原作者的产出，遵循作者的规定和要求不做无授权二改二传以及任何商业化行为
================================== */`;

// 常规文本转义函数（用于 /echo 提示）
const escapeForST = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/(\\+)?([|{}])/g, (match, slashes, char) => {
        const s = slashes || '';
        return s + s + '\\' + char;
    });
};

// 发送酒馆 Toast 提示
const notifyToast = (msg, severity = 'info') => {
    if (typeof triggerSlash === 'function') {
        triggerSlash(`/echo severity=${severity} ${escapeForST(msg)}`);
    } else {
        console.log(`[ThemeCenter - ${severity}]: ${msg}`);
    }
};

// 初始默认变量与雪库均置空，由用户在对应美化主题下自由添加、嗅探或导入
const DEFAULT_VARIABLES = [];
const DEFAULT_GALLERY = [];

// 常用预设字体快捷选项
const COMMON_FONT_OPTIONS = [
    { label: '跟随系统默认字体', value: 'inherit' },
    { label: '霞鹜文楷 (LXGW WenKai)', value: "'LXGW WenKai', sans-serif" },
    { label: '思源宋体 (Noto Serif SC)', value: "'Noto Serif SC', serif" },
    { label: '思源黑体 (Noto Sans SC)', value: "'Noto Sans SC', sans-serif" },
    { label: '苹方 / 微软雅黑', value: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
    { label: 'JetBrains Mono 等宽体', value: "'JetBrains Mono', 'Consolas', monospace" }
];

(function initThemeCenter() {
    // 1. 宿主环境检测与降级
    let targetWindow = window;
    let targetDocument = document;
    try {
        if (window.parent && window.parent.document) {
            targetWindow = window.parent;
            targetDocument = window.parent.document;
        }
    } catch (e) {
        console.warn('[美化控制中心] 跨域受限，已降级至当前窗口环境。');
    }

    // 清理可能残留的旧实例
    const existingWidget = targetDocument.getElementById(WIDGET_ID);
    if (existingWidget) existingWidget.remove();

    // 2. 配置与状态定义
    const CONFIG = {
        Z_INDEX: 5500,
        SAFE_MARGIN: 16,
        CLICK_DIST_THRESHOLD: 4,
        MIN_WIDTH: 360,
        MIN_HEIGHT: 480
    };

    const STATES = {
        IDLE: 'IDLE',
        BALL_DRAGGING: 'BALL_DRAGGING',
        SNAPPING: 'SNAPPING',
        PANEL_OPEN: 'PANEL_OPEN',
        PANEL_DRAGGING: 'PANEL_DRAGGING'
    };

    let currentState = STATES.IDLE;
    let isWidgetVisible = true;
    let activeTab = 'editor'; // 'editor' | 'gallery' | 'presets' | 'settings'
    let activeGallerySubTab = 'image'; // 'image' | 'color' | 'font'
    let gallerySearchQuery = ''; // 雪库搜索关键词
    let galleryCategoryFilter = 'ALL'; // 雪库当前子库分类筛选
    let isGalleryShareCollapsed = false; // 雪库收藏夹独立分享区块折叠状态
    let isGalleryAddCollapsed = false; // 添加素材到雪库区块折叠状态
    let customFontPreviewText = '❄ 雪落于冬 星沉入海 Snow falls softly · 0123456789 ☃️'; // 字库可自定义的实时预览文字
    let activeFilterGroup = 'ALL';
    let pickingTargetVarId = null; // 当前正在从雪库挑选素材的变量ID（支持 url / color / font）
    let isCurrentThemeAuthorized = false; // 当前绑定美化是否包含授权字段

    // 核心持久化数据结构（支持按当前识别到的酒馆美化主题独立隔离存储变量与预设，以及脚本自身美化管理）
    let appData = {
        globalEnabled: true,
        useImportant: true,
        darkModePanel: false,
        disclaimerAccepted: false,
        releaseUrl: SCRIPT_RELEASE_URL,
        currentThemeId: '默认酒馆主题',
        activePresetName: '默认方案',
        variables: [],
        gallery: [],
        colorGallery: [],
        fontGallery: [],
        presets: {
            '默认方案': []
        },
        charBindings: {}, // 结构: { [charName]: presetName } 当前美化主题下的角色卡预设绑定
        themeProfiles: {}, // 结构: { [themeId]: { activePresetName, variables, presets, charBindings } }
        ballConfig: {
            visible: true,
            dockToEdge: true,
            dockSide: 'right',
            size: 54,
            opacity: 1,
            icon: 'fa-palette',
            bgImageUrl: '',
            customStyle: ''
        },
        panelSkin: {
            activeSkinPreset: '默认冰透原色',
            customCss: '/* 仅覆盖强调色变量，保留默认 iOS 高透毛玻璃底色并支持原生昼夜切换 */',
            presets: {
                '默认冰透原色': '/* 默认 iOS 高透毛玻璃（支持昼夜切换） */',
                '冰雪蓝银': '.control-panel, .float-ball { --gl-accent-primary: #65b9e8; --gl-accent-gradient: linear-gradient(135deg, #a8def7, #67b9e7); --gl-accent-soft: rgba(101, 185, 232, 0.18); --gl-border-focus: rgba(101, 185, 232, 0.62); }',
                '樱雾柔粉': '.control-panel, .float-ball { --gl-accent-primary: #e887a6; --gl-accent-gradient: linear-gradient(135deg, #fbc2d4, #e887a6); --gl-accent-soft: rgba(232, 135, 166, 0.18); --gl-border-focus: rgba(232, 135, 166, 0.62); }',
                '薄荷冰青': '.control-panel, .float-ball { --gl-accent-primary: #4eb89f; --gl-accent-gradient: linear-gradient(135deg, #a2eeda, #4eb89f); --gl-accent-soft: rgba(78, 184, 159, 0.18); --gl-border-focus: rgba(78, 184, 159, 0.62); }',
                '星黛浅紫': '.control-panel, .float-ball { --gl-accent-primary: #9b82e8; --gl-accent-gradient: linear-gradient(135deg, #cbb8ff, #9b82e8); --gl-accent-soft: rgba(155, 130, 232, 0.18); --gl-border-focus: rgba(155, 130, 232, 0.62); }',
                '蜜桃暖杏': '.control-panel, .float-ball { --gl-accent-primary: #e8986b; --gl-accent-gradient: linear-gradient(135deg, #ffd1b3, #e8986b); --gl-accent-soft: rgba(232, 152, 107, 0.18); --gl-border-focus: rgba(232, 152, 107, 0.62); }',
                '极光青柠': '.control-panel, .float-ball { --gl-accent-primary: #56b8cc; --gl-accent-gradient: linear-gradient(135deg, #b8f2e6, #56b8cc); --gl-accent-soft: rgba(86, 184, 204, 0.18); --gl-border-focus: rgba(86, 184, 204, 0.62); }',
                '透透': '.control-panel{--gl-accent-primary:#8ecdf1;--gl-text-primary:#eaf7ff;--gl-text-secondary:#a7c6d9;--gl-bg-input:#ffffff12;--gl-border:#ffffff35;background:linear-gradient(145deg,#dff4ff35,#8fbfe52b)!important;backdrop-filter:blur(28px) saturate(160%)!important;-webkit-backdrop-filter:blur(28px) saturate(160%)!important;border:1px solid #ffffff65!important;border-radius:24px!important;box-shadow:0 16px 48px #478fc52b,inset 0 1px #ffffff85!important}.section-box{background:#ffffff20!important;border:1px solid #ffffff45!important;border-radius:18px!important;box-shadow:inset 0 1px #ffffff65,0 5px 16px #6fa9d00c!important;backdrop-filter:blur(16px)!important}.section-title{color:#dff5ff!important;text-shadow:0 1px 8px #7fc8f655}.btn{background:#ffffff24!important;color:#eaf8ff!important;border:1px solid #ffffff50!important;border-radius:13px!important;box-shadow:inset 0 1px #ffffff40!important;transition:background .2s,transform .2s}.btn:hover{background:#ffffff42!important;transform:translateY(-1px)}.btn.primary{background:linear-gradient(135deg,#a6e0ffbb,#83bdf0bb)!important;color:#173f5b!important;border-color:#d9f4ff!important}.code-textarea,.select-input,.text-input{background:#ffffff20!important;color:inherit!important;border:1px solid #ffffff45!important;border-radius:12px!important;backdrop-filter:blur(12px)!important}',
                '粉粉': '.control-panel{--gl-accent-primary:#e98da9;--gl-text-primary:#725565;--gl-text-secondary:#b18b9b;--gl-bg-input:#fff7fa;--gl-border:#f3d5e0;background:#fff9fb!important;border:2px solid #f2ccda!important;border-radius:24px!important;box-shadow:0 12px 35px #bd82952e!important}.section-box{background:#fffdfd!important;border:1px dashed #eac1d0!important;border-radius:18px!important;box-shadow:2px 3px 0 #f7e6ec!important}.section-title{color:#c87594!important;letter-spacing:.5px}.btn{border-radius:14px!important;border:1px solid #f0c8d8!important;background:#fff0f5!important;color:#a9617d!important;box-shadow:0 2px 0 #e9c3d1!important;transition:transform .2s,box-shadow .2s}.btn:hover{transform:translateY(-2px);box-shadow:0 4px 0 #e9c3d1!important}.btn.primary{background:linear-gradient(135deg,#f8c9d9,#fce7c8)!important;color:#87566c!important}.code-textarea,.select-input,.text-input{border-radius:12px!important;border:1px solid #efd3df!important;background:#fffafd!important}.float-ball{border:2px solid #fff!important;box-shadow:0 5px 20px #df9dbb70!important}'
            }
        }
    };

    // 检测当前酒馆运用的美化CSS中是否包含“@Oopsnow 的OopsPalette”授权字段
    function checkThemeAuthorization() {
        try {
            const customCssTextarea = targetDocument.querySelector('#customCSS');
            if (customCssTextarea && typeof customCssTextarea.value === 'string' && customCssTextarea.value.includes(AUTH_SIGNATURE)) {
                isCurrentThemeAuthorized = true;
                return true;
            }
            const customStyleEl = targetDocument.querySelector('#custom-style');
            if (customStyleEl && typeof customStyleEl.textContent === 'string' && customStyleEl.textContent.includes(AUTH_SIGNATURE)) {
                isCurrentThemeAuthorized = true;
                return true;
            }
            const allStyles = targetDocument.querySelectorAll('style');
            for (let i = 0; i < allStyles.length; i++) {
                const st = allStyles[i];
                if (st.id === STYLE_TAG_ID || st.id === GALLERY_FONT_STYLE_ID) continue;
                if (st.textContent && st.textContent.includes(AUTH_SIGNATURE)) {
                    isCurrentThemeAuthorized = true;
                    return true;
                }
            }
        } catch (e) {}
        isCurrentThemeAuthorized = false;
        return false;
    }

    // 自动探测当前 SillyTavern 正在运用的美化主题名称
    function detectActiveTavernTheme() {
        try {
            // 1. 优先读取酒馆顶部或设置面板中的 #themes 下拉选择器
            const themeSelect = targetDocument.querySelector('#themes');
            if (themeSelect && themeSelect.value && String(themeSelect.value).trim()) {
                return String(themeSelect.value).trim();
            }
            // 2. 尝试读取全局 power_user.theme 对象
            if (targetWindow.power_user && targetWindow.power_user.theme) {
                return String(targetWindow.power_user.theme).trim();
            }
            // 3. 尝试从自定义CSS文本首行注释提取美化名称 (例如 /* 某某美化 */)
            const customCssEl = targetDocument.querySelector('#customCSS');
            if (customCssEl && customCssEl.value) {
                const match = customCssEl.value.match(/\/\*\s*([^\n*]{2,24})\s*\*\//);
                if (match && match[1]) return `自定义美化：${match[1].trim()}`;
            }
        } catch (e) {}
        return appData.currentThemeId || '默认酒馆主题';
    }

    // 自动探测当前正在交互的角色卡名称
    function detectCurrentCharacterName() {
        try {
            if (targetWindow.SillyTavern && typeof targetWindow.SillyTavern.getContext === 'function') {
                const ctx = targetWindow.SillyTavern.getContext();
                if (ctx) {
                    if (ctx.characterId !== undefined && ctx.characterId !== null && Array.isArray(ctx.characters) && ctx.characters[ctx.characterId]) {
                        const cName = ctx.characters[ctx.characterId].name;
                        if (cName && String(cName).trim()) return String(cName).trim();
                    }
                    if (ctx.name2 && String(ctx.name2).trim() && ctx.name2 !== 'SillyTavern System') {
                        return String(ctx.name2).trim();
                    }
                }
            }
            if (typeof substitudeMacros === 'function') {
                const macroName = substitudeMacros('{{char}}');
                if (macroName && macroName !== '{{char}}' && macroName.trim()) return macroName.trim();
            }
        } catch (e) {}
        return '';
    }

    // 检查当前角色卡是否绑定了当前美化下的专属预设方案，若有则自动激活应用
    function checkAndApplyCharacterBoundPreset(silent = false) {
        const charName = detectCurrentCharacterName();
        if (!charName) return false;
        const bindings = appData.charBindings || {};
        const boundPreset = bindings[charName];
        if (boundPreset && appData.presets && appData.presets[boundPreset]) {
            if (appData.activePresetName !== boundPreset) {
                appData.activePresetName = boundPreset;
                appData.variables = JSON.parse(JSON.stringify(appData.presets[boundPreset]));
                saveStorage(false);
                if (!silent) {
                    showInternalBanner(`已根据角色「${charName}」自动切换预设：「${boundPreset}」`);
                    notifyToast(`角色「${charName}」已自动运用绑定预设：${boundPreset}`, 'info');
                }
                return true;
            }
        }
        return false;
    }

    // 确保指定美化主题拥有初始化档案
    function ensureThemeProfile(themeId) {
        if (!appData.themeProfiles[themeId]) {
            appData.themeProfiles[themeId] = {
                activePresetName: '默认方案',
                variables: [],
                presets: {
                    '默认方案': []
                },
                charBindings: {}
            };
        }
        if (!appData.themeProfiles[themeId].charBindings || typeof appData.themeProfiles[themeId].charBindings !== 'object') {
            appData.themeProfiles[themeId].charBindings = {};
        }
        return appData.themeProfiles[themeId];
    }

    // 切换当前绑定的酒馆美化主题档案（更换美化后管理列表与预设随之联动变化）
    function switchActiveThemeProfile(newThemeId, silent = false) {
        if (!newThemeId) return;
        // 先将旧主题当前正在修改的变量同步回旧档案
        if (appData.currentThemeId && appData.themeProfiles[appData.currentThemeId]) {
            const oldProf = appData.themeProfiles[appData.currentThemeId];
            oldProf.activePresetName = appData.activePresetName;
            oldProf.variables = JSON.parse(JSON.stringify(appData.variables));
            oldProf.presets = JSON.parse(JSON.stringify(appData.presets));
            oldProf.charBindings = JSON.parse(JSON.stringify(appData.charBindings || {}));
        }

        appData.currentThemeId = newThemeId;
        const targetProf = ensureThemeProfile(newThemeId);
        appData.activePresetName = targetProf.activePresetName || '默认方案';
        appData.variables = JSON.parse(JSON.stringify(targetProf.variables || []));
        appData.presets = JSON.parse(JSON.stringify(targetProf.presets || { '默认方案': [] }));
        appData.charBindings = JSON.parse(JSON.stringify(targetProf.charBindings || {}));
        activeFilterGroup = 'ALL';

        // 若当前角色在新美化下有绑定预设，优先切换为角色绑定的预设
        checkAndApplyCharacterBoundPreset(true);

        saveStorage(false);
        if (!silent) {
            notifyToast(`已识别并切换至美化主题「${newThemeId}」的专属变量配置`, 'info');
        }
    }

    // 从宿主页面当前生效的美化样式顶部 :root 中嗅探提取自定义CSS变量 (--xxx)
    function sniffCurrentThemeCssVariables() {
        const discovered = new Map();
        const tryExtractTopRoot = (cssText) => {
            if (!cssText) return false;
            // 仅匹配并提取最顶部的第一个 :root { ... } 块内容
            const rootMatch = cssText.match(/:root\s*{((?:[^{}]|\/\*[\s\S]*?\*\/)*)}/i);
            if (!rootMatch || !rootMatch[1]) return false;

            const rootBody = rootMatch[1];
            const regex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+);?(?:\s*\/\*\s*([\s\S]*?)\s*\*\/)?/g;
            let m;
            let foundAny = false;
            while ((m = regex.exec(rootBody)) !== null) {
                const key = m[1].trim();
                if (key.startsWith('--gl-') || key.startsWith('--SmartTheme')) continue;
                const val = m[2].replace(/!important/gi, '').trim();
                const comment = (m[3] || '').replace(/^[╰┈➤\s*-]+/, '').trim();
                if (!discovered.has(key) || comment) {
                    discovered.set(key, { val, comment });
                    foundAny = true;
                }
            }
            return foundAny;
        };

        try {
            // 1. 优先扫描酒馆当前美化主题的 #customCSS 文本框顶部 :root
            const customCssTextarea = targetDocument.querySelector('#customCSS');
            let extracted = false;
            if (customCssTextarea && customCssTextarea.value) {
                extracted = tryExtractTopRoot(customCssTextarea.value);
            }
            // 2. 若未从文本框提取到，则扫描 #custom-style 或页面顶部含 :root 的样式表
            if (!extracted) {
                const customStyleEl = targetDocument.querySelector('#custom-style');
                if (customStyleEl && customStyleEl.textContent) {
                    extracted = tryExtractTopRoot(customStyleEl.textContent);
                }
            }
            if (!extracted) {
                targetDocument.querySelectorAll('style').forEach(st => {
                    if (extracted || st.id === STYLE_TAG_ID || st.id === GALLERY_FONT_STYLE_ID) return;
                    extracted = tryExtractTopRoot(st.textContent || '');
                });
            }
        } catch (e) {}

        let addedCount = 0;
        discovered.forEach((info, key) => {
            if (appData.variables.some(v => v.key === key)) return;
            const rawVal = info.val;
            let type = 'raw';
            let group = '其他变量';
            if (/^url\(/i.test(rawVal) || /\.(png|jpg|jpeg|gif|webp|svg)/i.test(rawVal)) {
                type = 'url';
                group = '图片素材';
            } else if (/^(#|rgb|hsl)/i.test(rawVal)) {
                type = 'color';
                group = key.includes('bg') ? '背景颜色' : '字体与强调颜色';
            } else if (/font|family/i.test(key)) {
                type = 'font';
                group = '字体';
            }
            appData.variables.push({
                id: 'var_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                key,
                label: info.comment || key,
                desc: info.comment ? `美化原注释: ${info.comment}` : `源自美化「${appData.currentThemeId}」`,
                group,
                type,
                value: rawVal,
                defaultValue: rawVal,
                fontUrl: '',
                enabled: true
            });
            addedCount++;
        });
        return addedCount;
    }

    // 读取本地存储
    function loadStorage() {
        const detectedTheme = detectActiveTavernTheme();
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    appData.globalEnabled = parsed.globalEnabled ?? true;
                    appData.useImportant = parsed.useImportant ?? true;
                    appData.darkModePanel = parsed.darkModePanel ?? false;
                    if (Array.isArray(parsed.gallery)) {
                        appData.gallery = parsed.gallery;
                    }
                    if (Array.isArray(parsed.colorGallery)) {
                        appData.colorGallery = parsed.colorGallery;
                    } else {
                        appData.colorGallery = [];
                    }
                    if (Array.isArray(parsed.fontGallery)) {
                        appData.fontGallery = parsed.fontGallery;
                    } else {
                        appData.fontGallery = [];
                    }
                    if (parsed.themeProfiles && typeof parsed.themeProfiles === 'object') {
                        appData.themeProfiles = parsed.themeProfiles;
                    }
                    appData.disclaimerAccepted = parsed.disclaimerAccepted ?? false;
                    if (parsed.releaseUrl) appData.releaseUrl = parsed.releaseUrl;
                    if (parsed.ballConfig && typeof parsed.ballConfig === 'object') {
                        appData.ballConfig = { ...appData.ballConfig, ...parsed.ballConfig };
                        isWidgetVisible = appData.ballConfig.visible !== false;
                    }
                    if (parsed.panelSkin && typeof parsed.panelSkin === 'object') {
                        appData.panelSkin = {
                            ...appData.panelSkin,
                            ...parsed.panelSkin,
                            presets: { ...appData.panelSkin.presets, ...(parsed.panelSkin.presets || {}) }
                        };
                    }
                }
            }
        } catch (err) {
            console.error('[美化控制中心] 读取本地配置失败:', err);
        }
        appData.currentThemeId = detectedTheme;
        const prof = ensureThemeProfile(detectedTheme);
        appData.activePresetName = prof.activePresetName || '默认方案';
        appData.variables = JSON.parse(JSON.stringify(prof.variables || []));
        appData.presets = JSON.parse(JSON.stringify(prof.presets || { '默认方案': [] }));
        appData.charBindings = JSON.parse(JSON.stringify(prof.charBindings || {}));
        checkAndApplyCharacterBoundPreset(true);
        checkThemeAuthorization();
    }

    // 保存到本地存储并同步写入当前美化主题档案与DOM样式
    function saveStorage(syncPreset = true) {
        try {
            if (syncPreset && appData.activePresetName) {
                appData.presets[appData.activePresetName] = JSON.parse(JSON.stringify(appData.variables));
            }
            if (appData.currentThemeId) {
                appData.themeProfiles[appData.currentThemeId] = {
                    activePresetName: appData.activePresetName,
                    variables: JSON.parse(JSON.stringify(appData.variables)),
                    presets: JSON.parse(JSON.stringify(appData.presets)),
                    charBindings: JSON.parse(JSON.stringify(appData.charBindings || {}))
                };
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        } catch (err) {
            console.error('[美化控制中心] 保存配置失败:', err);
        }
        applyThemeStylesToDOM();
        syncGalleryFontsPreload();
    }

    // 3. 颜色与URL工具解析函数库
    const ColorUtils = {
        // 将任意合法颜色字符串解析为 { r, g, b, a, hex, isRgba }
        parseColor(str) {
            const clean = (str || '').trim();
            // 匹配 rgba / rgb
            const rgbMatch = clean.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i);
            if (rgbMatch) {
                const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
                const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
                const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
                const a = rgbMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbMatch[4]))) : 1;
                return {
                    r, g, b, a,
                    hex: this.rgbToHex(r, g, b),
                    isRgba: rgbMatch[4] !== undefined || a < 1
                };
            }
            // 匹配 6位 HEX (#rrggbb) 或 8位 HEX (#rrggbbaa)
            const hex6Match = clean.match(/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})?$/);
            if (hex6Match) {
                const r = parseInt(hex6Match[1], 16);
                const g = parseInt(hex6Match[2], 16);
                const b = parseInt(hex6Match[3], 16);
                const a = hex6Match[4] ? +(parseInt(hex6Match[4], 16) / 255).toFixed(2) : 1;
                return {
                    r, g, b, a,
                    hex: `#${hex6Match[1]}${hex6Match[2]}${hex6Match[3]}`.toLowerCase(),
                    isRgba: !!hex6Match[4]
                };
            }
            // 匹配 3位 HEX (#rgb)
            const hex3Match = clean.match(/^#?([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
            if (hex3Match) {
                const r = parseInt(hex3Match[1] + hex3Match[1], 16);
                const g = parseInt(hex3Match[2] + hex3Match[2], 16);
                const b = parseInt(hex3Match[3] + hex3Match[3], 16);
                return {
                    r, g, b, a: 1,
                    hex: this.rgbToHex(r, g, b),
                    isRgba: false
                };
            }
            // 降级默认色
            return { r: 138, g: 180, b: 248, a: 1, hex: '#8ab4f8', isRgba: false };
        },
        rgbToHex(r, g, b) {
            const toHex = (n) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
        },
        formatOutput(r, g, b, a, preferHexWhenOpaque = true) {
            const cleanA = Math.round(a * 100) / 100;
            if (cleanA >= 1 && preferHexWhenOpaque) {
                return this.rgbToHex(r, g, b);
            }
            return `rgba(${r}, ${g}, ${b}, ${cleanA})`;
        }
    };

    const UrlUtils = {
        // 提取 url("...") 内部的纯链接或文本
        extractRawUrl(val) {
            if (!val) return '';
            const trimmed = val.trim();
            const match = trimmed.match(/^url\(\s*['"]?(.*?)['"]?\s*\)$/i);
            return match ? match[1] : trimmed;
        },
        // 封装为标准 url("...") CSS格式
        wrapCssUrl(raw) {
            const clean = (raw || '').trim();
            if (!clean) return 'none';
            if (/^url\(/i.test(clean)) return clean;
            return `url("${clean.replace(/"/g, '\\"')}")`;
        },
        // 判断是否为可预览的网络或Data图片链接
        isPreviewableUrl(rawUrl) {
            return /^(https?:\/\/|data:image\/|\/)/i.test((rawUrl || '').trim());
        }
    };

    // 4. 动态CSS样式注入引擎（支持 @font-face / @import 外部字体挂载）
    function buildCssString() {
        if (!appData.globalEnabled) return '/* 美化控制中心已暂停生效 */';
        const imp = appData.useImportant ? ' !important' : '';
        const fontImports = [];
        const fontFaces = [];
        const lines = [];

        appData.variables.forEach((item, idx) => {
            if (!item.enabled || !item.key) return;
            const k = item.key.trim().startsWith('--') ? item.key.trim() : `--${item.key.trim()}`;
            let v = (item.value || '').trim();

            if (item.type === 'url') {
                v = UrlUtils.wrapCssUrl(UrlUtils.extractRawUrl(v));
            } else if (item.type === 'font') {
                const fUrl = UrlUtils.extractRawUrl(item.fontUrl || '');
                if (fUrl) {
                    if (/\.css(\?|$)/i.test(fUrl) || /fonts\.googleapis\.com/i.test(fUrl)) {
                        fontImports.push(`@import url("${fUrl}");`);
                    } else {
                        const autoFamily = `ST_CustomFont_${idx}`;
                        fontFaces.push(`@font-face {\n    font-family: '${autoFamily}';\n    src: url("${fUrl}");\n    font-display: swap;\n}`);
                        if (!v || v === 'inherit') {
                            v = `'${autoFamily}', sans-serif`;
                        } else if (!v.includes(autoFamily)) {
                            v = `'${autoFamily}', ${v}`;
                        }
                    }
                }
            }

            const comment = item.label ? ` /* ${item.label} */` : '';
            lines.push(`    ${k}: ${v}${imp};${comment}`);
        });

        const headerBlocks = [...fontImports, ...fontFaces].join('\n');
        return `${headerBlocks ? headerBlocks + '\n\n' : ''}:root, body {\n${lines.join('\n')}\n}`;
    }

    function applyThemeStylesToDOM() {
        checkThemeAuthorization();
        let styleEl = targetDocument.getElementById(STYLE_TAG_ID);
        if (!appData.globalEnabled || !isCurrentThemeAuthorized) {
            if (styleEl) styleEl.textContent = '';
            return;
        }
        if (!styleEl) {
            styleEl = targetDocument.createElement('style');
            styleEl.id = STYLE_TAG_ID;
            styleEl.type = 'text/css';
            targetDocument.head.appendChild(styleEl);
        }
        styleEl.textContent = buildCssString();
    }

    // 为雪库字库及当前变量中的外部字体构建预加载样式（确保面板卡片内预览也能呈现真实字形）
    let shadowFontStyleNode = null;
    function buildGalleryFontsCss(tempUrl = '', tempFamily = 'ST_TempPreviewFont') {
        const imports = new Set();
        const faces = [];

        const registerFontResource = (rawUrl, aliasFamily, userFamilyStr = '') => {
            const cleanUrl = UrlUtils.extractRawUrl(rawUrl || '');
            if (!cleanUrl) return;
            if (/\.css(\?|$)/i.test(cleanUrl) || /fonts\.googleapis\.com/i.test(cleanUrl)) {
                imports.add(`@import url("${cleanUrl}");`);
            } else {
                if (aliasFamily) {
                    faces.push(`@font-face {\n    font-family: '${aliasFamily}';\n    src: url("${cleanUrl}");\n    font-display: swap;\n}`);
                }
                const firstUserFam = (userFamilyStr || '').split(',')[0].replace(/['"]/g, '').trim();
                if (firstUserFam && firstUserFam !== 'inherit' && firstUserFam !== 'sans-serif' && firstUserFam !== 'serif' && firstUserFam !== 'monospace' && firstUserFam !== aliasFamily) {
                    faces.push(`@font-face {\n    font-family: '${firstUserFam}';\n    src: url("${cleanUrl}");\n    font-display: swap;\n}`);
                }
            }
        };

        (appData.fontGallery || []).forEach((fnt, idx) => {
            if (fnt.fontUrl) {
                registerFontResource(fnt.fontUrl, `ST_GalFont_${fnt.id || idx}`, fnt.fontFamily);
            }
        });

        (appData.variables || []).forEach((v, idx) => {
            if (v.type === 'font' && v.fontUrl) {
                registerFontResource(v.fontUrl, `ST_CustomFont_${idx}`);
            }
        });

        if (tempUrl) {
            registerFontResource(tempUrl, tempFamily);
        }

        return [...Array.from(imports), ...faces].join('\n');
    }

    function syncGalleryFontsPreload(tempUrl = '', tempFamily = 'ST_TempPreviewFont') {
        const cssText = buildGalleryFontsCss(tempUrl, tempFamily);
        let hostStyle = targetDocument.getElementById(GALLERY_FONT_STYLE_ID);
        if (!hostStyle) {
            hostStyle = targetDocument.createElement('style');
            hostStyle.id = GALLERY_FONT_STYLE_ID;
            hostStyle.type = 'text/css';
            targetDocument.head.appendChild(hostStyle);
        }
        hostStyle.textContent = cssText;
        if (shadowFontStyleNode) {
            shadowFontStyleNode.textContent = cssText;
        }
    }

    // 计算字体项用于预览的实际 font-family 字符串
    function getEffectivePreviewFontFamily(fontFamilyStr, fontUrlStr, aliasName) {
        const base = (fontFamilyStr || '').trim();
        const cleanUrl = UrlUtils.extractRawUrl(fontUrlStr || '');
        if (cleanUrl && !(/\.css(\?|$)/i.test(cleanUrl) || /fonts\.googleapis\.com/i.test(cleanUrl))) {
            if (!base || base === 'inherit') return `'${aliasName}', sans-serif`;
            if (!base.includes(aliasName)) return `'${aliasName}', ${base}`;
        }
        return base || 'inherit';
    }

    // 初始化加载数据并立即应用样式
    loadStorage();
    applyThemeStylesToDOM();

    // 5. 构建宿主容器与 Shadow DOM
    const hostContainer = targetDocument.createElement('div');
    hostContainer.id = WIDGET_ID;
    hostContainer.style.position = 'fixed';
    hostContainer.style.top = '0';
    hostContainer.style.left = '0';
    hostContainer.style.width = '0';
    hostContainer.style.height = '0';
    hostContainer.style.overflow = 'visible';
    hostContainer.style.pointerEvents = 'none';
    hostContainer.style.zIndex = String(CONFIG.Z_INDEX);
    targetDocument.body.appendChild(hostContainer);

    const shadow = hostContainer.attachShadow({ mode: 'open' });

    // 引入图标库
    const faLink = targetDocument.createElement('link');
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    shadow.appendChild(faLink);

    // 6. Shadow DOM 内部样式定义（严格遵循CSS变量化与流式布局）
    const styleNode = targetDocument.createElement('style');
    styleNode.textContent = `
        :host {
            /* 颜色系统 - iOS 高透毛玻璃底座 (默认浅色系) */
            --gl-bg-main: rgba(236, 248, 255, 0.36);
            --gl-bg-secondary: rgba(255, 255, 255, 0.22);
            --gl-bg-card: rgba(255, 255, 255, 0.28);
            --gl-bg-card-hover: rgba(255, 255, 255, 0.46);
            --gl-bg-input: rgba(255, 255, 255, 0.30);
            --gl-border-light: rgba(255, 255, 255, 0.68);
            --gl-border-subtle: rgba(255, 255, 255, 0.36);
            --gl-border-focus: rgba(87, 177, 226, 0.68);

            --gl-text-primary: #1e3648;
            --gl-text-secondary: #4a677c;
            --gl-text-muted: #7a97ab;

            --gl-accent-primary: #58aee0;
            --gl-accent-secondary: #b8d7ed;
            --gl-accent-gradient: linear-gradient(135deg, #a9dff7 0%, #76bfe8 48%, #e5f4ff 100%);
            --gl-accent-soft: rgba(103, 190, 235, 0.18);
            --gl-success: #48ad9a;
            --gl-danger: #d96f83;
            --gl-warning: #d5a65d;

            /* 排版与字号阶梯 */
            --gl-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            --gl-font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            --gl-fs-xs: clamp(11px, 1.8cqw, 12px);
            --gl-fs-sm: clamp(12px, 2cqw, 13px);
            --gl-fs-base: clamp(13px, 2.2cqw, 14px);
            --gl-fs-lg: clamp(15px, 2.6cqw, 16px);

            /* 间距、圆角、阴影与动画 */
            --gl-space-xs: 6px;
            --gl-space-sm: 10px;
            --gl-space-md: 14px;
            --gl-space-lg: 20px;

            --gl-radius-sm: 8px;
            --gl-radius-md: 12px;
            --gl-radius-lg: 18px;
            --gl-radius-xl: 24px;
            --gl-radius-full: 9999px;

            --gl-shadow-panel: 0 22px 60px rgba(42, 89, 119, 0.18), 0 6px 20px rgba(106, 183, 224, 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.90);
            --gl-shadow-card: 0 6px 18px rgba(59, 112, 145, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.76);
            --gl-shadow-ball: 0 10px 30px rgba(84, 166, 211, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.95);
            --gl-backdrop: blur(32px) saturate(190%);
            --transition-base: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);

            all: initial;
        }

        /* 暗夜星云 iOS 高透毛玻璃主题变量覆盖 */
        .theme-root.dark-glass {
            --gl-bg-main: rgba(18, 31, 45, 0.50);
            --gl-bg-secondary: rgba(26, 44, 60, 0.38);
            --gl-bg-card: rgba(32, 54, 72, 0.42);
            --gl-bg-card-hover: rgba(44, 72, 95, 0.58);
            --gl-bg-input: rgba(15, 28, 41, 0.48);
            --gl-border-light: rgba(255, 255, 255, 0.22);
            --gl-border-subtle: rgba(255, 255, 255, 0.14);
            --gl-border-focus: rgba(116, 199, 240, 0.72);

            --gl-text-primary: #f1f5f9;
            --gl-text-secondary: #cbd5e1;
            --gl-text-muted: #64748b;

            --gl-accent-primary: #8bd3f4;
            --gl-accent-soft: rgba(116, 199, 240, 0.18);
            --gl-shadow-panel: 0 24px 64px rgba(0, 0, 0, 0.48), 0 0 28px rgba(100, 190, 232, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.18);
            --gl-shadow-card: 0 6px 18px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.09);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: var(--gl-font-sans);
            -webkit-tap-highlight-color: transparent;
        }

        .force-hide {
            display: none !important;
        }

        /* --- 灵动毛玻璃悬浮球 --- */
        .float-ball {
            position: absolute;
            width: 54px;
            height: 54px;
            border-radius: var(--gl-radius-full);
            background: var(--gl-bg-main);
            backdrop-filter: var(--gl-backdrop);
            -webkit-backdrop-filter: var(--gl-backdrop);
            border: 1.5px solid var(--gl-border-light);
            box-shadow: var(--gl-shadow-ball);
            cursor: grab;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            transition: var(--transition-base);
            z-index: 10;
        }
        .float-ball::after {
            content: '';
            position: absolute;
            inset: 3px;
            border-radius: var(--gl-radius-full);
            background: var(--gl-accent-gradient);
            opacity: 0.16;
            pointer-events: none;
            transition: var(--transition-base);
        }
        .float-ball i {
            font-size: 22px;
            background: var(--gl-accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.25));
            transition: var(--transition-base);
        }
        .float-ball:hover {
            transform: scale(1.08) translateY(-2px);
            box-shadow: 0 12px 32px rgba(236, 72, 153, 0.38), inset 0 1px 2px rgba(255, 255, 255, 0.95);
        }
        .float-ball:hover i {
            transform: rotate(25deg) scale(1.1);
        }
        .float-ball:active {
            cursor: grabbing;
            transform: scale(0.95);
        }
        .float-ball.docked-left {
            transform: translateX(-64%);
            opacity: 0.58 !important;
        }
        .float-ball.docked-right {
            transform: translateX(64%);
            opacity: 0.58 !important;
        }
        .float-ball.docked-left:hover,
        .float-ball.docked-right:hover {
            transform: translateX(0) scale(1.06);
            opacity: 1 !important;
        }
        .float-ball.dragging {
            transition: none;
            transform: scale(1.12) !important;
            opacity: 1 !important;
        }
        .float-ball.hidden {
            transform: scale(0) !important;
            opacity: 0 !important;
            pointer-events: none;
        }

        /* --- 主控制面板 --- */
        .control-panel {
            position: absolute;
            width: 520px;
            height: 660px;
            max-width: calc(100vw - 24px);
            max-height: calc(100vh - 24px);
            container-type: inline-size;
            background: var(--gl-bg-main);
            backdrop-filter: var(--gl-backdrop);
            -webkit-backdrop-filter: var(--gl-backdrop);
            border: 1.5px solid var(--gl-border-light);
            border-radius: var(--gl-radius-xl);
            box-shadow: var(--gl-shadow-panel);
            display: flex;
            flex-direction: column;
            opacity: 0;
            transform: scale(0.92) translateY(16px);
            pointer-events: none;
            transition: var(--transition-base);
            z-index: 20;
            overflow: hidden;
            color: var(--gl-text-primary);
        }
        .control-panel.show {
            opacity: 1;
            transform: scale(1) translateY(0);
            pointer-events: auto;
        }
        .control-panel.dragging {
            transition: none;
            user-select: none;
        }

        /* 缩放手柄 */
        .resize-handle {
            position: absolute;
            z-index: 40;
            touch-action: none;
        }
        .resize-handle.r { right: -4px; top: 16px; bottom: 20px; width: 10px; cursor: ew-resize; }
        .resize-handle.b { left: 16px; bottom: -4px; right: 20px; height: 10px; cursor: ns-resize; }
        .resize-handle.br {
            right: 0; bottom: 0; width: 22px; height: 22px; cursor: nwse-resize;
            display: flex; align-items: flex-end; justify-content: flex-end; padding: 5px;
            color: var(--gl-text-muted); font-size: 10px; opacity: 0.6;
        }

        /* 顶部标题栏 (紧凑窄版) */
        .panel-header {
            padding: 7px 14px;
            background: var(--gl-bg-secondary);
            border-bottom: 1px solid var(--gl-border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        }
        .brand-group {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
        }
        .brand-logo {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            background: var(--gl-accent-gradient);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            box-shadow: 0 3px 10px rgba(99, 102, 241, 0.24);
            flex-shrink: 0;
        }
        .brand-titles {
            display: flex;
            flex-direction: column;
            min-width: 0;
            line-height: 1.2;
        }
        .brand-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--gl-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            letter-spacing: 0.2px;
        }
        .brand-subtitle {
            font-size: 10px;
            color: var(--gl-text-secondary);
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: var(--gl-radius-full);
            background: var(--gl-success);
            box-shadow: 0 0 6px var(--gl-success);
        }
        .status-dot.paused {
            background: var(--gl-text-muted);
            box-shadow: none;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
        }
        .icon-btn {
            width: 27px;
            height: 27px;
            border-radius: 7px;
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-card);
            color: var(--gl-text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            transition: var(--transition-base);
        }
        .icon-btn:hover {
            background: var(--gl-bg-card-hover);
            color: var(--gl-accent-primary);
            border-color: var(--gl-border-focus);
            transform: translateY(-1px);
        }
        .icon-btn:active {
            transform: scale(0.94);
        }
        .icon-btn.active-toggle {
            background: var(--gl-accent-soft);
            color: var(--gl-accent-primary);
            border-color: var(--gl-border-focus);
        }
        .icon-btn.danger-hover:hover {
            color: var(--gl-danger);
            border-color: rgba(239, 68, 68, 0.4);
        }

        /* 导航标签栏 (紧凑窄版) */
        .nav-tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 5px 14px;
            background: var(--gl-bg-secondary);
            border-bottom: 1px solid var(--gl-border-subtle);
            flex-shrink: 0;
        }
        .nav-tab {
            flex: 1 1 auto;
            min-width: 76px;
            padding: 5px 8px;
            border-radius: var(--gl-radius-sm);
            border: 1px solid transparent;
            background: transparent;
            color: var(--gl-text-secondary);
            font-size: var(--gl-fs-xs);
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            transition: var(--transition-base);
        }
        .nav-tab:hover {
            background: var(--gl-bg-card);
            color: var(--gl-text-primary);
        }
        .nav-tab.active {
            background: var(--gl-bg-card-hover);
            color: var(--gl-accent-primary);
            border-color: var(--gl-border-subtle);
            box-shadow: var(--gl-shadow-card);
        }

        /* 顶部快捷状态条与消息反馈 */
        .toast-banner {
            padding: 8px var(--gl-space-lg);
            background: var(--gl-accent-gradient);
            color: #ffffff;
            font-size: var(--gl-fs-xs);
            font-weight: 500;
            display: none;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        .toast-banner.show {
            display: flex;
        }

        /* 主内容滚动视图容器 */
        .panel-body {
            flex: 1;
            overflow-y: auto;
            padding: var(--gl-space-md) var(--gl-space-lg);
            display: flex;
            flex-direction: column;
            gap: var(--gl-space-md);
        }
        .panel-body::-webkit-scrollbar {
            width: 5px;
        }
        .panel-body::-webkit-scrollbar-track {
            background: transparent;
        }
        .panel-body::-webkit-scrollbar-thumb {
            background: var(--gl-border-subtle);
            border-radius: var(--gl-radius-full);
        }
        .panel-body::-webkit-scrollbar-thumb:hover {
            background: var(--gl-accent-primary);
        }

        /* 分类筛选胶囊栏 & 雪库子标签栏 */
        .filter-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }
        .filter-chip {
            padding: 6px 13px;
            border-radius: var(--gl-radius-full);
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-card);
            color: var(--gl-text-secondary);
            font-size: var(--gl-fs-xs);
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: var(--transition-base);
        }
        .filter-chip:hover {
            border-color: var(--gl-border-focus);
            color: var(--gl-text-primary);
        }
        .filter-chip.active {
            background: var(--gl-accent-gradient);
            color: #173e56;
            border-color: transparent;
            box-shadow: 0 2px 10px rgba(88, 174, 224, 0.28);
        }

        /* 分组标题样式 (Left Border + Tag Style) */
        .group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px;
            background: var(--gl-accent-soft);
            border-left: 3.5px solid var(--gl-accent-primary);
            border-radius: 0 var(--gl-radius-sm) var(--gl-radius-sm) 0;
        }
        .group-header-title {
            font-size: var(--gl-fs-sm);
            font-weight: 700;
            color: var(--gl-accent-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .group-badge {
            font-size: 11px;
            padding: 1px 7px;
            border-radius: var(--gl-radius-full);
            background: var(--gl-bg-card);
            color: var(--gl-text-secondary);
        }

        /* 流式卡片网格 */
        .var-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
            gap: var(--gl-space-sm);
        }
        .var-grid.single-col {
            grid-template-columns: 1fr;
        }

        /* 变量控制卡片 */
        .var-card {
            background: var(--gl-bg-card);
            border: 1px solid var(--gl-border-light);
            border-radius: var(--gl-radius-md);
            padding: var(--gl-space-md);
            box-shadow: var(--gl-shadow-card);
            display: flex;
            flex-direction: column;
            gap: var(--gl-space-sm);
            transition: var(--transition-base);
        }
        .var-card:hover {
            background: var(--gl-bg-card-hover);
            border-color: var(--gl-border-focus);
        }
        .var-card.disabled-card {
            opacity: 0.55;
        }

        .var-card-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
        }
        .var-meta {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .var-label {
            font-size: var(--gl-fs-base);
            font-weight: 700;
            color: var(--gl-text-primary);
            word-break: break-word;
        }
        .var-key-tag {
            font-family: var(--gl-font-mono);
            font-size: var(--gl-fs-xs);
            color: var(--gl-accent-primary);
            background: var(--gl-accent-soft);
            padding: 1px 6px;
            border-radius: 4px;
            width: fit-content;
            word-break: break-all;
        }
        .var-desc {
            font-size: var(--gl-fs-xs);
            color: var(--gl-text-muted);
        }

        .var-actions-mini {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }
        .mini-btn {
            width: 26px;
            height: 26px;
            border-radius: 6px;
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-input);
            color: var(--gl-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            transition: var(--transition-base);
        }
        .mini-btn:hover {
            color: var(--gl-accent-primary);
            border-color: var(--gl-border-focus);
            transform: translateY(-1px);
        }
        .mini-btn:active {
            transform: scale(0.92);
        }
        .mini-btn.danger:hover {
            color: var(--gl-danger);
            border-color: var(--gl-danger);
        }

        /* --- 三合一颜色调节器样式 --- */
        .color-editor-box {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .color-main-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        /* 透明棋盘格预览色块 + 原生取色器 */
        .color-swatch-wrap {
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: var(--gl-radius-sm);
            border: 1.5px solid var(--gl-border-subtle);
            overflow: hidden;
            flex-shrink: 0;
            cursor: pointer;
            background-image:
                linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
                linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
                linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
            background-size: 10px 10px;
            background-position: 0 0, 0 5px, 5px -5px, -5px 0;
            box-shadow: inset 0 0 4px rgba(0,0,0,0.12);
        }
        .color-swatch-fill {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        .native-color-input {
            position: absolute;
            inset: -6px;
            width: 54px;
            height: 54px;
            opacity: 0;
            cursor: pointer;
        }

        .text-input {
            flex: 1;
            min-width: 0;
            height: 36px;
            padding: 0 10px;
            border-radius: var(--gl-radius-sm);
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-input);
            color: var(--gl-text-primary);
            font-size: var(--gl-fs-sm);
            font-family: var(--gl-font-mono);
            outline: none;
            transition: var(--transition-base);
        }
        .text-input:focus {
            border-color: var(--gl-border-focus);
            box-shadow: 0 0 0 3px var(--gl-accent-soft);
        }

        .alpha-slider-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: var(--gl-fs-xs);
            color: var(--gl-text-secondary);
        }
        .alpha-label {
            width: 68px;
            flex-shrink: 0;
            font-family: var(--gl-font-mono);
        }
        .alpha-range {
            flex: 1;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            border-radius: var(--gl-radius-full);
            background: linear-gradient(to right, rgba(99, 102, 241, 0.1), var(--gl-accent-primary));
            outline: none;
            cursor: pointer;
        }
        .alpha-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            border: 2px solid var(--gl-accent-primary);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: var(--transition-base);
        }
        .alpha-range::-webkit-slider-thumb:hover {
            transform: scale(1.15);
        }

        /* --- URL与图片预览编辑器样式 --- */
        .url-editor-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .url-thumb-box {
            width: 48px;
            height: 48px;
            border-radius: var(--gl-radius-sm);
            border: 1px dashed var(--gl-border-subtle);
            background: var(--gl-bg-input);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
            position: relative;
        }
        .url-thumb-box img {
            max-width: 100%;
            height: auto;
            max-height: 100%;
            object-fit: contain;
        }
        .url-thumb-fallback {
            font-size: 16px;
            color: var(--gl-text-muted);
        }
        .url-controls-col {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .url-btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        /* 通用按钮样式 */
        .btn {
            padding: 7px 12px;
            border-radius: var(--gl-radius-sm);
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-card);
            color: var(--gl-text-primary);
            font-size: var(--gl-fs-xs);
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: var(--transition-base);
        }
        .btn:hover {
            background: var(--gl-bg-card-hover);
            border-color: var(--gl-border-focus);
            color: var(--gl-accent-primary);
            transform: translateY(-1px);
        }
        .btn:active {
            transform: scale(0.96);
        }
        .btn.primary {
            background: var(--gl-accent-gradient);
            color: #ffffff;
            border-color: transparent;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }
        .btn.primary:hover {
            color: #ffffff;
            filter: brightness(1.06);
            box-shadow: 0 6px 16px rgba(236, 72, 153, 0.35);
        }
        .btn.danger {
            color: var(--gl-danger);
            border-color: rgba(239, 68, 68, 0.3);
        }
        .btn.danger:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: var(--gl-danger);
        }

        /* --- 素材收藏库网格样式（图片 / 颜色 / 字体） --- */
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
            gap: var(--gl-space-sm);
        }
        .gallery-grid.font-grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 215px), 1fr));
        }
        .gallery-card {
            background: var(--gl-bg-card);
            border: 1px solid var(--gl-border-light);
            border-radius: var(--gl-radius-md);
            padding: var(--gl-space-sm);
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: var(--gl-shadow-card);
            transition: var(--transition-base);
        }
        .gallery-card:hover {
            transform: translateY(-2px);
            border-color: var(--gl-border-focus);
        }
        .gallery-preview {
            width: 100%;
            height: 90px;
            border-radius: var(--gl-radius-sm);
            background: var(--gl-bg-input);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            cursor: default;
            background-image:
                linear-gradient(45deg, rgba(148,163,184,0.16) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(148,163,184,0.16) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.16) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.16) 75%);
            background-size: 12px 12px;
            background-position: 0 0, 0 6px, 6px -6px, -6px 0;
        }
        .gallery-preview img {
            max-width: 100%;
            height: auto;
            max-height: 100%;
            object-fit: contain;
        }
        .color-code-pill {
            position: absolute;
            bottom: 6px;
            left: 6px;
            right: 6px;
            padding: 3px 6px;
            border-radius: 6px;
            background: rgba(15, 23, 42, 0.62);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            color: #ffffff;
            font-family: var(--gl-font-mono);
            font-size: 10px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
        }
        .font-card-preview {
            background-image: none;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            padding: 8px 12px;
            gap: 4px;
            border: 1px dashed var(--gl-border-subtle);
            cursor: text;
        }
        .font-card-preview,
        .font-card-preview *,
        .font-preview-bar,
        .font-preview-bar * {
            font-family: inherit;
        }
        .font-sample-main {
            font-size: var(--gl-fs-base);
            color: var(--gl-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            outline: none;
        }
        .font-sample-sub {
            font-size: var(--gl-fs-xs);
            color: var(--gl-text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            outline: none;
        }
        .gallery-title {
            font-size: var(--gl-fs-xs);
            font-weight: 600;
            color: var(--gl-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .gallery-tag {
            font-size: 10px;
            color: var(--gl-accent-primary);
            background: var(--gl-accent-soft);
            padding: 1px 6px;
            border-radius: 4px;
            width: fit-content;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* --- 表单与代码框区域 --- */
        .section-box {
            background: var(--gl-bg-card);
            border: 1px solid var(--gl-border-light);
            border-radius: var(--gl-radius-md);
            padding: var(--gl-space-md);
            display: flex;
            flex-direction: column;
            gap: var(--gl-space-sm);
            box-shadow: var(--gl-shadow-card);
        }
        .section-title {
            font-size: var(--gl-fs-base);
            font-weight: 700;
            color: var(--gl-text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--gl-border-subtle);
        }
        .section-title i {
            color: var(--gl-accent-primary);
        }
        .collapsible-title {
            cursor: pointer;
            user-select: none;
            justify-content: space-between;
            transition: var(--transition-base);
        }
        .collapsible-title:hover {
            color: var(--gl-accent-primary);
        }
        .collapsible-title.collapsed {
            padding-bottom: 0;
            border-bottom-color: transparent;
        }
        .collapse-chevron {
            font-size: 12px;
            color: var(--gl-text-muted);
            transition: transform 0.22s ease;
        }
        .collapsible-title.collapsed .collapse-chevron {
            transform: rotate(-90deg);
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
            gap: var(--gl-space-sm);
        }
        .form-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .form-field label {
            font-size: var(--gl-fs-xs);
            font-weight: 600;
            color: var(--gl-text-secondary);
        }
        .select-input {
            height: 36px;
            padding: 0 10px;
            border-radius: var(--gl-radius-sm);
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-input);
            color: var(--gl-text-primary);
            font-size: var(--gl-fs-sm);
            outline: none;
        }
        .code-textarea {
            width: 100%;
            min-height: 110px;
            padding: 10px;
            border-radius: var(--gl-radius-sm);
            border: 1px solid var(--gl-border-subtle);
            background: var(--gl-bg-input);
            color: var(--gl-text-primary);
            font-family: var(--gl-font-mono);
            font-size: var(--gl-fs-xs);
            line-height: 1.5;
            resize: vertical;
            outline: none;
        }
        .code-textarea:focus {
            border-color: var(--gl-border-focus);
        }

        /* 底部状态栏 (紧凑窄版) */
        .panel-footer {
            padding: 6px 14px;
            background: var(--gl-bg-secondary);
            border-top: 1px solid var(--gl-border-subtle);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            font-size: 11px;
            color: var(--gl-text-secondary);
            flex-shrink: 0;
        }
        .switch-label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            user-select: none;
        }
        .switch-label input {
            accent-color: var(--gl-accent-primary);
            cursor: pointer;
        }

        /* --- 免责声明弹窗与未授权提示卡片 --- */
        .modal-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: center;
            padding: var(--gl-space-lg);
            z-index: 60;
        }
        .modal-backdrop.show {
            display: flex;
        }
        .modal-card {
            width: 100%;
            max-width: 420px;
            background: var(--gl-bg-main);
            border: 1.5px solid var(--gl-border-light);
            border-radius: var(--gl-radius-lg);
            box-shadow: var(--gl-shadow-panel);
            padding: var(--gl-space-lg);
            display: flex;
            flex-direction: column;
            gap: var(--gl-space-md);
            color: var(--gl-text-primary);
        }
        .modal-title {
            font-size: var(--gl-fs-lg);
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--gl-accent-primary);
        }
        .modal-content {
            font-size: var(--gl-fs-sm);
            color: var(--gl-text-secondary);
            line-height: 1.65;
            max-height: 280px;
            overflow-y: auto;
            padding: var(--gl-space-sm);
            border-radius: var(--gl-radius-sm);
            background: var(--gl-bg-input);
            border: 1px solid var(--gl-border-subtle);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .unauth-banner {
            background: rgba(239, 111, 131, 0.08);
            border: 1.5px dashed rgba(217, 111, 131, 0.42);
            border-radius: var(--gl-radius-md);
            padding: 24px 16px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        /* 雪境 iOS 高透毛玻璃底座：保留通透玻璃底色并自动响应强调色变量与昼夜切换 */
        .control-panel {
            border-radius: 26px;
            background-image: linear-gradient(145deg, rgba(255,255,255,0.22), rgba(185,220,242,0.05));
            box-shadow: var(--gl-shadow-panel);
        }
        .panel-header, .panel-footer {
            backdrop-filter: blur(26px) saturate(185%);
            -webkit-backdrop-filter: blur(26px) saturate(185%);
        }
        .brand-logo {
            color: #f7fcff;
            font-size: 16px;
            text-shadow: 0 1px 5px rgba(49, 117, 157, 0.28);
            background: var(--gl-accent-gradient);
            border: 1px solid rgba(255,255,255,0.82);
            box-shadow: 0 4px 12px rgba(87, 168, 210, 0.22), inset 0 1px 0 rgba(255,255,255,0.95);
        }
        .section-box, .var-card, .modal-card {
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-color: var(--gl-border-light);
            box-shadow: var(--gl-shadow-card);
        }
        .btn, .icon-btn, .nav-tab {
            transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        .btn, .icon-btn {
            border-color: var(--gl-border-light);
            box-shadow: 0 2px 8px rgba(54, 113, 148, 0.06), inset 0 1px 0 rgba(255,255,255,0.65);
        }
        .btn.primary {
            background: var(--gl-accent-gradient);
            color: #173e56;
            border-color: rgba(255,255,255,0.76);
        }
        .btn:hover, .icon-btn:hover, .nav-tab:hover {
            box-shadow: 0 5px 14px rgba(77, 159, 204, 0.14), inset 0 1px 0 rgba(255,255,255,0.72);
        }
        .float-ball {
            background-color: rgba(237, 249, 255, 0.68);
            border-color: rgba(255,255,255,0.92);
            box-shadow: 0 12px 32px rgba(73, 158, 205, 0.30), inset 0 1px 2px rgba(255,255,255,0.98);
        }
        .float-ball::after {
            background: linear-gradient(145deg, rgba(255,255,255,0.9), rgba(126,203,239,0.55));
            opacity: 0.22;
        }
        .float-ball-emoji {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            font-family: system-ui, sans-serif;
            font-size: 29px;
            line-height: 1;
            background: none;
            -webkit-text-fill-color: initial;
            filter: drop-shadow(0 2px 3px rgba(70, 130, 165, 0.18));
        }
        .text-input:focus, .select-input:focus, .code-textarea:focus {
            box-shadow: 0 0 0 3px rgba(105, 190, 232, 0.16);
        }
    `;
    shadow.appendChild(styleNode);

    // Shadow DOM 内部字体预加载样式节点（使雪库字体卡片在 Shadow DOM 内也能渲染外部字体）
    shadowFontStyleNode = targetDocument.createElement('style');
    shadowFontStyleNode.id = 'oops-shadow-gallery-fonts';
    shadow.appendChild(shadowFontStyleNode);
    syncGalleryFontsPreload();

    // 额外注入用于自定义面板与悬浮球外观的动态样式节点
    const customPanelSkinStyleNode = targetDocument.createElement('style');
    customPanelSkinStyleNode.id = 'oops-panel-custom-skin';
    shadow.appendChild(customPanelSkinStyleNode);

    // 7. 构建根容器与 DOM 结构
    const rootWrap = targetDocument.createElement('div');
    rootWrap.className = `theme-root ${appData.darkModePanel ? 'dark-glass' : ''}`;
    shadow.appendChild(rootWrap);

    // 7.1 悬浮球
    const floatBall = targetDocument.createElement('div');
    floatBall.className = 'float-ball';
    floatBall.title = '点击打开OopsPalette';
    floatBall.innerHTML = '<i class="fas fa-palette"></i>';
    floatBall.style.left = (targetWindow.innerWidth - 54 - CONFIG.SAFE_MARGIN) + 'px';
    floatBall.style.top = Math.max(CONFIG.SAFE_MARGIN, Math.round(targetWindow.innerHeight * 0.25)) + 'px';
    rootWrap.appendChild(floatBall);

    // 7.2 主控制面板
    const panel = targetDocument.createElement('div');
    panel.className = 'control-panel';
    panel.innerHTML = `
        <div class="resize-handle r"></div>
        <div class="resize-handle b"></div>
        <div class="resize-handle br"><i class="fas fa-caret-right" style="transform: rotate(45deg);"></i></div>

        <div class="panel-header" id="panel-drag-header">
            <div class="brand-group">
                <div class="brand-logo" aria-label="雪人">☃</div>
                <div class="brand-titles">
                    <div class="brand-title">❄OopsPalette꙳❅⋆｡˚</div>
                    <div class="brand-subtitle">
                        <span class="status-dot" id="header-status-dot"></span>
                        <span id="header-preset-label">当前预设：默认美化方案</span>
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <button class="icon-btn" id="btn-open-settings-top" title="打开设置页面">
                    <i class="fas fa-gear"></i>
                </button>
                <button class="icon-btn" id="btn-toggle-dark" title="切换昼夜外观">
                    <i class="fas fa-moon"></i>
                </button>
                <button class="icon-btn" id="btn-reset-current" title="将所有变量恢复为默认值">
                    <i class="fas fa-rotate-left"></i>
                </button>
                <button class="icon-btn danger-hover" id="btn-close-panel" title="收起面板返回悬浮球">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        </div>

        <div class="nav-tabs">
            <button class="nav-tab active" data-tab="editor"><i class="fas fa-sliders"></i> 变量</button>
            <button class="nav-tab" data-tab="gallery"><i class="fas fa-images"></i> 雪库</button>
            <button class="nav-tab" data-tab="presets"><i class="fas fa-file-export"></i> 预设</button>
        </div>

        <div class="toast-banner" id="internal-toast">
            <span id="internal-toast-text">操作成功</span>
            <i class="fas fa-check-circle"></i>
        </div>

        <div class="panel-body" id="panel-body-container"></div>

        <div class="panel-footer">
            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                <label class="switch-label" title="开启或暂停所有自定义CSS变量注入">
                    <input type="checkbox" id="chk-global-enable" checked>
                    <span>启用美化覆盖</span>
                </label>
                <label class="switch-label" title="为所有CSS变量附加 !important 最高优先级">
                    <input type="checkbox" id="chk-use-important" checked>
                    <span>强制优先级 (!important)</span>
                </label>
            </div>
            <span id="footer-var-count">等待识别美化授权</span>
        </div>

        <!-- 首次打开与说明免责声明弹窗 -->
        <div class="modal-backdrop" id="disclaimer-modal">
            <div class="modal-card">
                <div class="modal-title">
                    <i class="fas fa-shield-heart"></i>
                    <span>OopsPalette 使用说明与免责声明</span>
                </div>
                <div class="modal-content">
                    <p>欢迎使用由 @Oopsnow 创作的 OopsPalette ！在使用前，请仔细阅读以下内容：</p>
                    <p>对于Oops 系美化：雪人制作的 Oops 系美化可直接载入并使用本脚本进行自用二改。</p>
                    <p>其他作者的美化：将 OopsPalette 运用于其他作者的美化前，请务必确认原作者允许二次修改，并严格遵守原作者的使用规定。</p>
                    <p>后续修改：使用者自行进行的修改、适配及由此产生的问题，均由使用者自行负责，与脚本作者雪人无关。</p>
                    <p><strong>使用限制与免责申明</strong></p>
                    <p>严禁<em><u>商业化</u></em>使用：请勿将本脚本用于任何商业化美化项目，包括但不限于商业美化的制作者，以及商业美化的使用者。雪人坚决反对酒馆的商业化行为。</p>
                    <p>禁止二次传播：本脚本免费发布于 DC 社区，未经雪人许可，请勿擅自转载、二次分发或以其他形式重新发布。</p>
                    <p>禁止<em><u>任何商业化</u></em>行为：请勿出售、付费分享、变相收费或以其他方式利用本脚本谋取商业利益。</p>
                    <p>尊重原作者规定：将脚本用于其他作者的美化时，请事先确认获得相应许可。因违反原作者规定而产生的纠纷，由使用者自行承担。</p>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn primary" id="btn-accept-disclaimer" style="width:100%;"><i class="fas fa-check"></i> 我已阅读并同意上述声明！</button>
                </div>
            </div>
        </div>

        <!-- 粘贴CSS自动识别字体弹窗 -->
        <div class="modal-backdrop" id="font-css-parse-modal">
            <div class="modal-card">
                <div class="modal-title">
                    <i class="fas fa-wand-magic-sparkles"></i>
                    <span>粘贴 CSS 自动识别字体</span>
                </div>
                <div class="var-desc">
                    请将字体网站提供的 WebFont CSS 代码（支持 <code>@import</code> 或 <code>@font-face</code> 及 <code>font-family</code>）粘贴到下方，点击识别即可自动提取并填入：
                </div>
                <textarea class="code-textarea" id="txt-parse-font-css" style="min-height:130px;" placeholder='@import url("https://fontsapi.zeoseven.com/637/main/result.css");\n\nbody {\n  font-family: "x12y16pxMaruMonica";\n  font-weight: normal;\n}'></textarea>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn" id="btn-cancel-font-css">取消</button>
                    <button class="btn primary" id="btn-confirm-font-css"><i class="fas fa-bolt"></i> 识别并填入</button>
                </div>
            </div>
        </div>
    `;
    rootWrap.appendChild(panel);

    // 阻止面板内非释放事件冒泡穿透至SillyTavern宿主（保留 mouseup / touchend 正常流转以确保拖拽松开立即停止）
    ['mousedown', 'click', 'dblclick', 'keydown', 'keyup', 'wheel', 'touchstart'].forEach(evtName => {
        panel.addEventListener(evtName, (e) => {
            e.stopPropagation();
        });
    });

    // DOM 引用
    const bodyContainer = panel.querySelector('#panel-body-container');
    const internalToast = panel.querySelector('#internal-toast');
    const internalToastText = panel.querySelector('#internal-toast-text');
    const statusDot = panel.querySelector('#header-status-dot');
    const presetLabel = panel.querySelector('#header-preset-label');
    const footerVarCount = panel.querySelector('#footer-var-count');
    const chkGlobalEnable = panel.querySelector('#chk-global-enable');
    const chkUseImportant = panel.querySelector('#chk-use-important');
    const btnToggleDark = panel.querySelector('#btn-toggle-dark');

    let toastTimer = null;
    function showInternalBanner(text) {
        internalToastText.textContent = text;
        internalToast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            internalToast.classList.remove('show');
        }, 2600);
    }

    const disclaimerModal = panel.querySelector('#disclaimer-modal');
    const fontCssParseModal = panel.querySelector('#font-css-parse-modal');
    const txtParseFontCss = panel.querySelector('#txt-parse-font-css');

    function openDisclaimerModal() {
        disclaimerModal.classList.add('show');
    }

    panel.querySelector('#btn-cancel-font-css').onclick = () => {
        fontCssParseModal.classList.remove('show');
    };

    panel.querySelector('#btn-confirm-font-css').onclick = () => {
        const rawCss = (txtParseFontCss.value || '').trim();
        if (!rawCss) {
            notifyToast('请先粘贴包含字体信息的 CSS 代码', 'warning');
            return;
        }

        // 1. 提取 @import url(...) 或 @import "..." 或 src: url(...)
        let extractedUrl = '';
        const importMatch = rawCss.match(/@import\s+(?:url\(\s*['"]?([^'")\s]+)['"]?\s*\)|['"]([^'"]+)['"])/i);
        if (importMatch) {
            extractedUrl = (importMatch[1] || importMatch[2] || '').trim();
        } else {
            const srcUrlMatch = rawCss.match(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
            if (srcUrlMatch) {
                extractedUrl = (srcUrlMatch[1] || '').trim();
            }
        }

        // 2. 提取 font-family: ...
        let extractedFamily = '';
        const familyMatches = [...rawCss.matchAll(/font-family\s*:\s*([^;}\n]+)/gi)];
        if (familyMatches.length > 0) {
            // 优先取最后一个（通常是 body { font-family: ... } 调用处）或第一个有效值
            const rawFam = familyMatches[familyMatches.length - 1][1].replace(/!important/gi, '').trim();
            extractedFamily = rawFam;
        }

        if (!extractedUrl && !extractedFamily) {
            notifyToast('未能从代码中识别出 font-family 或 url，请检查粘贴内容', 'warning');
            return;
        }

        // 展开冻存字体折叠面板并填入字段
        isGalleryAddCollapsed = false;
        const fntAddHdr = bodyContainer.querySelector('#hdr-toggle-fnt-add');
        const fntAddBody = bodyContainer.querySelector('#body-fnt-add');
        if (fntAddHdr && fntAddBody) {
            fntAddHdr.classList.remove('collapsed');
            fntAddBody.style.display = 'flex';
        }

        const nameInp = bodyContainer.querySelector('#fnt-new-name');
        const familyInp = bodyContainer.querySelector('#fnt-new-family');
        const urlInp = bodyContainer.querySelector('#fnt-new-url');

        if (familyInp && extractedFamily) {
            familyInp.value = extractedFamily;
            if (nameInp && !nameInp.value.trim()) {
                const cleanName = extractedFamily.split(',')[0].replace(/['"]/g, '').trim();
                if (cleanName) nameInp.value = cleanName;
            }
        }
        if (urlInp && extractedUrl) {
            urlInp.value = extractedUrl;
        }

        if (familyInp) familyInp.dispatchEvent(new Event('input'));
        if (urlInp) urlInp.dispatchEvent(new Event('change'));

        fontCssParseModal.classList.remove('show');
        showInternalBanner('已成功识别 CSS 字体代码并自动填入！');
    };

    panel.querySelector('#btn-accept-disclaimer').onclick = () => {
        appData.disclaimerAccepted = true;
        disclaimerModal.classList.remove('show');
        saveStorage(false);
    };

    const btnOpenSettingsTop = panel.querySelector('#btn-open-settings-top');
    let lastNonSettingsTab = 'editor';
    btnOpenSettingsTop.onclick = () => {
        if (activeTab === 'settings') {
            activeTab = lastNonSettingsTab || 'editor';
        } else {
            lastNonSettingsTab = activeTab;
            activeTab = 'settings';
        }
        renderCurrentTab();
    };

    // 应用悬浮球外观与脚本面板自定义皮肤CSS
    function applySelfWidgetAppearance() {
        const bc = appData.ballConfig || {};
        isWidgetVisible = bc.visible !== false;
        const bSize = Math.max(36, Math.min(90, Number(bc.size) || 54));
        const bOpacity = Math.max(0.15, Math.min(1, Number(bc.opacity) ?? 1));

        floatBall.style.width = bSize + 'px';
        floatBall.style.height = bSize + 'px';
        floatBall.style.opacity = String(bOpacity);

        if (bc.bgImageUrl && bc.bgImageUrl.trim()) {
            const imageOrEmoji = bc.bgImageUrl.trim();
            // 非网址且包含 Emoji 时，作为悬浮球文字图案显示；图片 URL 行为保持不变。
            let isEmoji = false;
            try {
                isEmoji = !/^https?:\/\//i.test(imageOrEmoji) && /\p{Extended_Pictographic}/u.test(imageOrEmoji);
            } catch (e) {
                isEmoji = !/^https?:\/\//i.test(imageOrEmoji) && /[☀-➿🌀-🫿]/u.test(imageOrEmoji);
            }
            if (isEmoji) {
                floatBall.style.backgroundImage = '';
                floatBall.innerHTML = '';
                const emojiNode = targetDocument.createElement('span');
                emojiNode.className = 'float-ball-emoji';
                emojiNode.textContent = imageOrEmoji;
                floatBall.appendChild(emojiNode);
            } else {
                const rawImg = UrlUtils.extractRawUrl(imageOrEmoji);
                floatBall.style.backgroundImage = `url("${rawImg}")`;
                floatBall.style.backgroundSize = 'cover';
                floatBall.style.backgroundPosition = 'center';
                floatBall.innerHTML = '';
            }
        } else {
            floatBall.style.backgroundImage = '';
            const iconClass = (bc.icon || 'fa-palette').trim();
            floatBall.innerHTML = `<i class="fas ${iconClass}"></i>`;
        }

        if (!isWidgetVisible) {
            floatBall.classList.add('force-hide');
        } else {
            floatBall.classList.remove('force-hide');
        }

        floatBall.classList.remove('docked-left', 'docked-right');
        if (bc.dockToEdge !== false && (bc.dockSide === 'left' || bc.dockSide === 'right')) {
            floatBall.classList.add(bc.dockSide === 'left' ? 'docked-left' : 'docked-right');
        }

        // 注入面板自身美化CSS
        const skinCss = (appData.panelSkin && appData.panelSkin.customCss) ? appData.panelSkin.customCss : '';
        const ballExtraCss = bc.customStyle ? `\n.float-ball { ${bc.customStyle} }` : '';
        customPanelSkinStyleNode.textContent = `${skinCss}${ballExtraCss}`;
    }

    applySelfWidgetAppearance();

    function updateHeaderAndFooterStatus() {
        checkThemeAuthorization();
        chkGlobalEnable.checked = appData.globalEnabled;
        chkUseImportant.checked = appData.useImportant;
        statusDot.className = `status-dot ${(appData.globalEnabled && isCurrentThemeAuthorized) ? '' : 'paused'}`;
        presetLabel.textContent = isCurrentThemeAuthorized
            ? `美化：${appData.currentThemeId} | ${appData.activePresetName}${pickingTargetVarId ? ' (挑选素材中...)' : ''}`
            : `美化：${appData.currentThemeId} (未授权使用OopsPalette)`;
        const activeCount = appData.variables.filter(v => v.enabled).length;
        footerVarCount.textContent = !isCurrentThemeAuthorized
            ? '未授权使用OopsPalette'
            : (appData.globalEnabled ? `当前美化共 ${activeCount} / ${appData.variables.length} 项变量生效` : '美化已暂停');
        btnToggleDark.innerHTML = appData.darkModePanel ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    // 向当前酒馆美化的 CSS 头部插入二改确认声明注释块
    function injectAuthorizationHeaderToCurrentTheme() {
        let injected = false;
        try {
            const customCssTextarea = targetDocument.querySelector('#customCSS');
            if (customCssTextarea && typeof customCssTextarea.value === 'string') {
                if (!customCssTextarea.value.includes(AUTH_SIGNATURE)) {
                    customCssTextarea.value = `${AUTH_HEADER_BLOCK}\n${customCssTextarea.value}`;
                }
                customCssTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                customCssTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                injected = true;
            }

            const customStyleEl = targetDocument.querySelector('#custom-style');
            if (customStyleEl && typeof customStyleEl.textContent === 'string') {
                if (!customStyleEl.textContent.includes(AUTH_SIGNATURE)) {
                    customStyleEl.textContent = `${AUTH_HEADER_BLOCK}\n${customStyleEl.textContent}`;
                }
                injected = true;
            }

            if (!injected) {
                const allStyles = targetDocument.querySelectorAll('style');
                for (let i = 0; i < allStyles.length; i++) {
                    const st = allStyles[i];
                    if (st.id === STYLE_TAG_ID || st.id === GALLERY_FONT_STYLE_ID) continue;
                    st.textContent = `${AUTH_HEADER_BLOCK}\n${st.textContent || ''}`;
                    injected = true;
                    break;
                }
            }

            if (!injected) {
                const fallbackStyle = targetDocument.createElement('style');
                fallbackStyle.id = 'custom-style';
                fallbackStyle.textContent = `${AUTH_HEADER_BLOCK}\n`;
                targetDocument.head.appendChild(fallbackStyle);
                injected = true;
            }
        } catch (e) {
            console.error('[美化控制中心] 注入授权声明注释失败:', e);
        }
        return injected;
    }

    // 创建未授权锁定提示与二改口令确认卡片
    function createUnauthorizedLockCard() {
        const lockBox = targetDocument.createElement('div');
        lockBox.className = 'unauth-banner';
        lockBox.innerHTML = `
            <div style="font-size:34px; color:var(--gl-danger);"><i class="fas fa-lock"></i></div>
            <div style="font-size:var(--gl-fs-lg); font-weight:700; color:var(--gl-danger);">未授权使用OopsPalette</div>
            <div class="var-desc" style="max-width:400px; line-height:1.7; color:var(--gl-text-primary);">
                当前绑定的酒馆美化「${appData.currentThemeId}」未检测到授权标识<br>
                如需要继续使用请确认该美化作者允许进行二改<br>
                在下方输入框输入："我已确认该美化作者允许二改"
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:360px; margin-top:4px;">
                <input type="text" class="text-input" id="inp-confirm-remod" placeholder="请输入确认口令" style="text-align:center; font-family:var(--gl-font-sans);">
                <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                    <button class="btn primary" id="btn-confirm-remod" style="flex:1;"><i class="fas fa-check-double"></i> 我已知晓</button>
                    <button class="btn" id="btn-recheck-auth" title="重新扫描美化CSS是否已含标识"><i class="fas fa-rotate"></i> 重新检测</button>
                </div>
            </div>
        `;

        const inpConfirm = lockBox.querySelector('#inp-confirm-remod');
        const handleConfirm = () => {
            const rawVal = (inpConfirm.value || '').trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
            if (rawVal === '我已确认该美化作者允许二改' || rawVal === '我已确认该美化允许二改') {
                injectAuthorizationHeaderToCurrentTheme();
                checkThemeAuthorization();
                applyThemeStylesToDOM();
                renderCurrentTab();
                showInternalBanner('已确认二改授权，OopsPalette 已解冻！');
                notifyToast('已确认二改授权，OopsPalette 已解冻！', 'success');
            } else {
                showInternalBanner('口令输入不正确，请输入：我已确认该美化作者允许二改');
                notifyToast('确认口令不匹配，请准确输入：我已确认该美化作者允许二改', 'warning');
            }
        };

        lockBox.querySelector('#btn-confirm-remod').onclick = handleConfirm;
        inpConfirm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleConfirm();
        });

        lockBox.querySelector('#btn-recheck-auth').onclick = () => {
            const ok = checkThemeAuthorization();
            applyThemeStylesToDOM();
            renderCurrentTab();
            if (ok) {
                showInternalBanner('授权校验通过！已解锁当前美化修改权限');
                notifyToast('已检测到 OopsPalette 授权标识，解锁成功！', 'success');
            } else {
                showInternalBanner('仍未检测到授权字段：@Oopsnow 的OopsPalette');
                notifyToast('未授权使用OopsPalette', 'warning');
            }
        };
        return lockBox;
    }

    // 8. 四大核心业务视图渲染逻辑
    function renderCurrentTab() {
        updateHeaderAndFooterStatus();
        bodyContainer.innerHTML = '';

        // 同步导航Tab与顶部设置按钮高亮
        panel.querySelectorAll('.nav-tab').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
        });
        if (btnOpenSettingsTop) {
            btnOpenSettingsTop.classList.toggle('active-toggle', activeTab === 'settings');
        }

        if (activeTab === 'editor') {
            renderEditorView();
        } else if (activeTab === 'gallery') {
            renderGalleryView();
        } else if (activeTab === 'presets') {
            renderPresetsView();
        } else if (activeTab === 'settings') {
            renderSettingsView();
        }
    }

    // ========================================================================
    // 视图一：调色与素材实时配置器 (三合一调色 + URL预览与选图 + 字体选择与收藏)
    // ========================================================================
    function renderEditorView() {
        // 提取所有分组
        const groups = ['ALL'];
        appData.variables.forEach(v => {
            const g = v.group || '未分类变量';
            if (!groups.includes(g)) groups.push(g);
        });
        if (!groups.includes(activeFilterGroup)) activeFilterGroup = 'ALL';

        // 顶部筛选栏
        const filterBar = targetDocument.createElement('div');
        filterBar.className = 'filter-bar';
        groups.forEach(gName => {
            const chip = targetDocument.createElement('button');
            chip.className = `filter-chip ${activeFilterGroup === gName ? 'active' : ''}`;
            chip.textContent = gName === 'ALL' ? '全部变量' : gName;
            chip.onclick = () => {
                activeFilterGroup = gName;
                renderEditorView();
            };
            filterBar.appendChild(chip);
        });
        bodyContainer.innerHTML = '';

        // 顶部当前美化主题识别状态栏（支持切换或重新嗅探当前美化）
        const themeBar = targetDocument.createElement('div');
        themeBar.className = 'section-box';
        themeBar.style.padding = '10px 12px';
        const knownThemes = Array.from(new Set([appData.currentThemeId, detectActiveTavernTheme(), ...Object.keys(appData.themeProfiles)]));
        themeBar.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:stretch; gap:8px;">
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-width:0;">
                    <i class="fas fa-paint-roller" style="color:var(--gl-accent-primary);"></i>
                    <span>当前美化：</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:180px;">
                    <select class="select-input" id="editor-theme-select" style="flex:1 1 100%; min-width:0; height:30px; font-size:12px; padding:0 8px;">
                        ${knownThemes.map(t => `<option value="${t}" ${t === appData.currentThemeId ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                    <button class="btn" id="btn-detect-theme" title="重新识别当前酒馆运用的美化主题"><i class="fas fa-arrows-rotate"></i> 识别</button>
                    <button class="btn primary" id="btn-sniff-vars" title="自动扫描提取当前美化中的CSS变量"><i class="fas fa-magnifying-glass-plus"></i> 嗅探</button>
                </div>
            </div>
        `;
        themeBar.querySelector('#editor-theme-select').onchange = (e) => {
            switchActiveThemeProfile(e.target.value);
            renderCurrentTab();
        };
        themeBar.querySelector('#btn-detect-theme').onclick = () => {
            const latest = detectActiveTavernTheme();
            switchActiveThemeProfile(latest);
            renderCurrentTab();
            showInternalBanner(`已同步至当前酒馆美化：${latest}`);
        };
        themeBar.querySelector('#btn-sniff-vars').onclick = () => {
            if (!checkThemeAuthorization()) {
                renderCurrentTab();
                notifyToast('未授权使用OopsPalette', 'error');
                return;
            }
            const added = sniffCurrentThemeCssVariables();
            saveStorage();
            renderCurrentTab();
            if (added > 0) {
                showInternalBanner(`已从当前美化中嗅探并导入 ${added} 项变量！`);
            } else {
                showInternalBanner('未在当前美化顶部 :root 中发现新的未添加CSS变量');
            }
        };
        bodyContainer.appendChild(themeBar);

        // 若当前绑定美化未包含授权字段，直接展示“未授权使用OopsPalette”并阻止修改
        if (!isCurrentThemeAuthorized) {
            bodyContainer.appendChild(createUnauthorizedLockCard());
            return;
        }

        // 当该美化主题下还没有任何变量时，展示空状态引导卡片
        if (appData.variables.length === 0) {
            const emptyBox = targetDocument.createElement('div');
            emptyBox.className = 'section-box';
            emptyBox.style.textAlign = 'center';
            emptyBox.style.padding = '28px 16px';
            emptyBox.innerHTML = `
                <div style="font-size:32px; color:var(--gl-accent-primary); margin-bottom:6px;"><i class="fas fa-wand-magic-sparkles"></i></div>
                <div style="font-size:var(--gl-fs-base); font-weight:700; color:var(--gl-text-primary);">当前美化「${appData.currentThemeId}」暂无配置变量</div>
                <div class="var-desc" style="max-width:360px; margin:4px auto 12px;">
                    <p style="text-align:center;">点击嗅探雪人帮你提取当前美化的变量</p>
                    <p style="text-align:center;">或直接导入JSON预设方案</p>
                </div>
                <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                    <button class="btn primary" id="empty-run-sniff"><i class="fas fa-magnifying-glass-plus"></i> 嗅探当前美化变量</button>
                    <button class="btn" id="empty-go-presets"><i class="fas fa-file-import"></i> 导入变量预设方案</button>
                </div>
            `;
            emptyBox.querySelector('#empty-run-sniff').onclick = () => {
                const added = sniffCurrentThemeCssVariables();
                saveStorage();
                renderCurrentTab();
                if (added > 0) {
                    showInternalBanner(`已从当前美化中嗅探并导入 ${added} 项变量！`);
                } else {
                    showInternalBanner('未在当前美化顶部 :root 中发现可提取的CSS变量');
                }
            };
            emptyBox.querySelector('#empty-go-presets').onclick = () => {
                activeTab = 'presets';
                renderCurrentTab();
            };
            bodyContainer.appendChild(emptyBox);
            return;
        }

        bodyContainer.appendChild(filterBar);

        // 按分组聚合渲染
        const groupedMap = {};
        appData.variables.forEach(v => {
            const g = v.group || '未分类变量';
            if (activeFilterGroup !== 'ALL' && g !== activeFilterGroup) return;
            if (!groupedMap[g]) groupedMap[g] = [];
            groupedMap[g].push(v);
        });

        Object.keys(groupedMap).forEach(groupName => {
            const items = groupedMap[groupName];
            const groupHeader = targetDocument.createElement('div');
            groupHeader.className = 'group-header';
            groupHeader.innerHTML = `
                <div class="group-header-title">
                    <i class="fas fa-layer-group"></i>
                    <span>${groupName}</span>
                </div>
                <span class="group-badge">${items.length} 项</span>
            `;
            bodyContainer.appendChild(groupHeader);

            const grid = targetDocument.createElement('div');
            // URL项与Font字体项信息较长采用单列展示，颜色项采用自适应网格
            const hasWideItem = items.some(i => i.type === 'url' || i.type === 'font');
            grid.className = `var-grid ${hasWideItem ? 'single-col' : ''}`;

            items.forEach(item => {
                const card = createVariableEditorCard(item);
                grid.appendChild(card);
            });
            bodyContainer.appendChild(grid);
        });
    }

    function createVariableEditorCard(item) {
        const card = targetDocument.createElement('div');
        card.className = `var-card ${item.enabled ? '' : 'disabled-card'}`;

        // 卡片头部：名称、CSS变量名、启用开关、单步重置
        const topRow = targetDocument.createElement('div');
        topRow.className = 'var-card-top';
        topRow.innerHTML = `
            <div class="var-meta">
                <div class="var-label">${item.label || item.key}</div>
                <span class="var-key-tag">${item.key}</span>
                ${item.desc ? `<div class="var-desc">${item.desc}</div>` : ''}
            </div>
            <div class="var-actions-mini">
                <button class="mini-btn" data-act="toggle" title="${item.enabled ? '点击禁用该变量' : '点击启用该变量'}">
                    <i class="fas ${item.enabled ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
                <button class="mini-btn" data-act="reset" title="恢复此项默认值 (${item.defaultValue})">
                    <i class="fas fa-undo"></i>
                </button>
            </div>
        `;

        topRow.querySelector('[data-act="toggle"]').onclick = () => {
            item.enabled = !item.enabled;
            saveStorage();
            renderCurrentTab();
        };
        topRow.querySelector('[data-act="reset"]').onclick = () => {
            item.value = item.defaultValue;
            saveStorage();
            renderCurrentTab();
            showInternalBanner(`已恢复 ${item.label} 的默认值`);
        };
        card.appendChild(topRow);

        // 根据类型渲染专用控制器
        if (item.type === 'color') {
            const parsed = ColorUtils.parseColor(item.value);
            const colorBox = targetDocument.createElement('div');
            colorBox.className = 'color-editor-box';
            colorBox.innerHTML = `
                <div class="color-main-row">
                    <div class="color-swatch-wrap" title="点击打开取色器">
                        <div class="color-swatch-fill"></div>
                        <input type="color" class="native-color-input" value="${parsed.hex}">
                    </div>
                    <input type="text" class="text-input" value="${item.value}" placeholder="#HEX 或 rgba(r,g,b,a)">
                </div>
                <div class="alpha-slider-row">
                    <span class="alpha-label">透明度: ${Math.round(parsed.a * 100)}%</span>
                    <input type="range" class="alpha-range" min="0" max="1" step="0.01" value="${parsed.a}">
                </div>
                <div class="url-btn-group">
                    <button class="btn" data-color-act="pick"><i class="fas fa-swatchbook"></i> 从雪库选择</button>
                    <button class="btn" data-color-act="fav"><i class="fas fa-star"></i> 收藏到雪库</button>
                </div>
            `;

            const swatchFill = colorBox.querySelector('.color-swatch-fill');
            const colorPicker = colorBox.querySelector('.native-color-input');
            const textInput = colorBox.querySelector('.text-input');
            const alphaSlider = colorBox.querySelector('.alpha-range');
            const alphaLabel = colorBox.querySelector('.alpha-label');

            swatchFill.style.backgroundColor = item.value;

            // 1. 原生取色器变动 -> 保留当前Alpha，更新RGB
            colorPicker.addEventListener('input', () => {
                const newRgb = ColorUtils.parseColor(colorPicker.value);
                const curAlpha = parseFloat(alphaSlider.value);
                const preferHex = curAlpha >= 1 && !item.value.trim().toLowerCase().startsWith('rgba');
                const formatted = ColorUtils.formatOutput(newRgb.r, newRgb.g, newRgb.b, curAlpha, preferHex);
                item.value = formatted;
                textInput.value = formatted;
                swatchFill.style.backgroundColor = formatted;
                saveStorage();
            });

            // 2. Alpha透明度滑块变动 -> 实时转为RGBA或HEX
            alphaSlider.addEventListener('input', () => {
                const curParsed = ColorUtils.parseColor(textInput.value);
                const newAlpha = parseFloat(alphaSlider.value);
                alphaLabel.textContent = `透明度: ${Math.round(newAlpha * 100)}%`;
                const formatted = ColorUtils.formatOutput(curParsed.r, curParsed.g, curParsed.b, newAlpha, false);
                item.value = formatted;
                textInput.value = formatted;
                swatchFill.style.backgroundColor = formatted;
                saveStorage();
            });

            // 3. 文本输入框直接粘贴色值 -> 反向同步取色器与滑块
            const syncFromText = () => {
                const rawVal = textInput.value.trim();
                if (!rawVal) return;
                const p = ColorUtils.parseColor(rawVal);
                item.value = rawVal;
                colorPicker.value = p.hex;
                alphaSlider.value = String(p.a);
                alphaLabel.textContent = `透明度: ${Math.round(p.a * 100)}%`;
                swatchFill.style.backgroundColor = rawVal;
                saveStorage();
            };
            textInput.addEventListener('change', syncFromText);
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') syncFromText();
            });

            // 4. 从雪库色卡选择
            colorBox.querySelector('[data-color-act="pick"]').onclick = () => {
                pickingTargetVarId = item.id;
                activeTab = 'gallery';
                activeGallerySubTab = 'color';
                renderCurrentTab();
                showInternalBanner(`请点击下方任意颜色卡片，一键应用至「${item.label}」`);
            };

            // 5. 收藏当前颜色到雪库色卡
            colorBox.querySelector('[data-color-act="fav"]').onclick = () => {
                const curVal = (textInput.value || item.value || '').trim();
                if (!curVal) {
                    notifyToast('当前颜色值为空，无法冻藏', 'warning');
                    return;
                }
                const normVal = curVal.replace(/\s+/g, '').toLowerCase();
                if (appData.colorGallery.some(c => (c.value || '').replace(/\s+/g, '').toLowerCase() === normVal)) {
                    showInternalBanner('该颜色已在雪库色卡中');
                    return;
                }
                appData.colorGallery.unshift({
                    id: 'col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                    name: `${item.label}_${appData.colorGallery.length + 1}`,
                    category: item.group || '常用颜色',
                    value: curVal
                });
                saveStorage(false);
                showInternalBanner('雪人已送藏');
            };

            card.appendChild(colorBox);

        } else if (item.type === 'url') {
            const rawUrl = UrlUtils.extractRawUrl(item.value);
            const canPreview = UrlUtils.isPreviewableUrl(rawUrl);

            const urlRow = targetDocument.createElement('div');
            urlRow.className = 'url-editor-row';
            urlRow.innerHTML = `
                <div class="url-thumb-box" title="图片实时预览">
                    ${canPreview
                        ? `<img src="${rawUrl}" alt="preview" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
                           <i class="fas fa-image url-thumb-fallback" style="display:none;"></i>`
                        : `<i class="fas fa-link url-thumb-fallback"></i>`
                    }
                </div>
                <div class="url-controls-col">
                    <input type="text" class="text-input" value="${rawUrl}" placeholder="粘贴图片直链 或 url(&quot;...&quot;)">
                    <div class="url-btn-group">
                        <button class="btn" data-url-act="pick"><i class="fas fa-swatchbook"></i> 从雪库选择</button>
                        <button class="btn" data-url-act="fav"><i class="fas fa-star"></i> 冻藏到雪库</button>
                    </div>
                </div>
            `;

            const urlInput = urlRow.querySelector('.text-input');
            const thumbBox = urlRow.querySelector('.url-thumb-box');

            const updateUrlValue = () => {
                const extracted = UrlUtils.extractRawUrl(urlInput.value);
                item.value = UrlUtils.wrapCssUrl(extracted);
                urlInput.value = extracted;
                saveStorage();
                // 刷新缩略图
                if (UrlUtils.isPreviewableUrl(extracted)) {
                    thumbBox.innerHTML = `
                        <img src="${extracted}" alt="preview" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
                        <i class="fas fa-image url-thumb-fallback" style="display:none;"></i>
                    `;
                } else {
                    thumbBox.innerHTML = `<i class="fas fa-link url-thumb-fallback"></i>`;
                }
            };

            urlInput.addEventListener('change', updateUrlValue);
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') updateUrlValue();
            });

            // 打开雪库相册挑选
            urlRow.querySelector('[data-url-act="pick"]').onclick = () => {
                pickingTargetVarId = item.id;
                activeTab = 'gallery';
                activeGallerySubTab = 'image';
                renderCurrentTab();
                showInternalBanner(`请点击下方任意图片卡片，一键应用至「${item.label}」`);
            };

            // 收藏当前链接到雪库
            urlRow.querySelector('[data-url-act="fav"]').onclick = () => {
                const cleanUrl = UrlUtils.extractRawUrl(urlInput.value);
                if (!cleanUrl) {
                    notifyToast('当前链接为空，无法冻藏', 'warning');
                    return;
                }
                if (appData.gallery.some(g => g.url === cleanUrl)) {
                    showInternalBanner('该链接已在雪库相册中');
                    return;
                }
                appData.gallery.unshift({
                    id: 'gal_' + Date.now(),
                    name: `${item.label}_${appData.gallery.length + 1}`,
                    category: item.label.includes('头像框') ? '头像框' : '头像素材',
                    url: cleanUrl
                });
                saveStorage(false);
                showInternalBanner('雪人已送藏');
            };

            card.appendChild(urlRow);

        } else if (item.type === 'font') {
            // Font 字体变量专用调节器（支持常用字体选择、自定义字体族名称、外部字体URL自动挂载、实时预览与雪库调用/收藏）
            const varIdx = appData.variables.findIndex(v => v.id === item.id);
            const previewFamily = getEffectivePreviewFontFamily(item.value, item.fontUrl, `ST_CustomFont_${varIdx >= 0 ? varIdx : 0}`);

            const fontBox = targetDocument.createElement('div');
            fontBox.style.display = 'flex';
            fontBox.style.flexDirection = 'column';
            fontBox.style.gap = '8px';

            fontBox.innerHTML = `
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <select class="select-input font-preset-sel" style="width:145px; flex-shrink:0;" title="快速选择常用字体">
                        <option value="">常用字体快选</option>
                        ${COMMON_FONT_OPTIONS.map(o => `<option value="${o.value}" ${item.value === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                    <input type="text" class="text-input font-family-input" value="${item.value}" placeholder="字体名称 | font-family">
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <input type="text" class="text-input font-url-input" value="${item.fontUrl || ''}" placeholder="粘贴外部字体直链 (.woff2/.ttf/.css) 自动加载">
                </div>
                <div class="font-preview-bar" style="padding:8px 10px; border-radius:var(--gl-radius-sm); background:var(--gl-bg-input); border:1px dashed var(--gl-border-subtle); font-size:var(--gl-fs-sm); color:var(--gl-text-primary);">
                    ❄ 雪落于冬 星沉入海 Snow falls softly · 0123456789 ❄
                </div>
                <div class="url-btn-group">
                    <button class="btn" data-font-act="pick"><i class="fas fa-swatchbook"></i> 从雪库选字体</button>
                    <button class="btn" data-font-act="fav"><i class="fas fa-star"></i> 冻藏到雪库</button>
                </div>
            `;

            const presetSel = fontBox.querySelector('.font-preset-sel');
            const familyInput = fontBox.querySelector('.font-family-input');
            const fontUrlInput = fontBox.querySelector('.font-url-input');
            const previewBar = fontBox.querySelector('.font-preview-bar');
            previewBar.style.fontFamily = previewFamily;

            const refreshPreviewBar = () => {
                previewBar.style.fontFamily = getEffectivePreviewFontFamily(item.value, item.fontUrl, `ST_CustomFont_${varIdx >= 0 ? varIdx : 0}`);
            };

            presetSel.onchange = () => {
                if (!presetSel.value) return;
                item.value = presetSel.value;
                familyInput.value = presetSel.value;
                saveStorage();
                refreshPreviewBar();
            };

            familyInput.onchange = () => {
                item.value = familyInput.value.trim() || 'inherit';
                saveStorage();
                refreshPreviewBar();
            };

            fontUrlInput.onchange = () => {
                item.fontUrl = fontUrlInput.value.trim();
                saveStorage();
                refreshPreviewBar();
                showInternalBanner(item.fontUrl ? '已挂载外部字体链接并注入样式表' : '已清除外部字体链接');
            };

            // 从雪库选字体
            fontBox.querySelector('[data-font-act="pick"]').onclick = () => {
                pickingTargetVarId = item.id;
                activeTab = 'gallery';
                activeGallerySubTab = 'font';
                renderCurrentTab();
                showInternalBanner(`请点击下方任意字体卡片，一键应用至「${item.label}」`);
            };

            // 收藏当前字体到雪库字库
            fontBox.querySelector('[data-font-act="fav"]').onclick = () => {
                const curFamily = (familyInput.value || item.value || '').trim();
                const curUrl = UrlUtils.extractRawUrl(fontUrlInput.value || item.fontUrl || '');
                if ((!curFamily || curFamily === 'inherit') && !curUrl) {
                    notifyToast('当前未配置有效字体族或外部字体链接，无法收藏', 'warning');
                    return;
                }
                if (appData.fontGallery.some(f => f.fontFamily === (curFamily || 'inherit') && (f.fontUrl || '') === curUrl)) {
                    showInternalBanner('该字体配置已在雪库字库中');
                    return;
                }
                appData.fontGallery.unshift({
                    id: 'fnt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                    name: `${item.label}_${appData.fontGallery.length + 1}`,
                    category: item.group || '常用字体',
                    fontFamily: curFamily || 'inherit',
                    fontUrl: curUrl
                });
                saveStorage(false);
                showInternalBanner('雪人已送藏');
            };

            card.appendChild(fontBox);

        } else {
            // Raw 通用CSS属性编辑器（如圆角、字号、阴影、模糊度等）
            const rawInput = targetDocument.createElement('input');
            rawInput.type = 'text';
            rawInput.className = 'text-input';
            rawInput.value = item.value;
            rawInput.placeholder = '输入CSS属性值，例如 12px / blur(10px)';
            rawInput.addEventListener('change', () => {
                item.value = rawInput.value.trim();
                saveStorage();
            });
            card.appendChild(rawInput);
        }

        return card;
    }

    // ========================================================================
    // 视图二：雪库三合一收藏中心（相册 / 色卡 / 字库）
    // ========================================================================
    function renderGalleryView() {
        syncGalleryFontsPreload();

        // 1. 如果处于“正在为某变量挑选素材”状态，顶部展示提示条
        if (pickingTargetVarId) {
            const targetVar = appData.variables.find(v => v.id === pickingTargetVarId);
            const typeNameMap = { url: '图片素材', color: '常用颜色', font: '常用字体' };
            const targetTypeLabel = targetVar ? (typeNameMap[targetVar.type] || '素材') : '素材';

            const pickBanner = targetDocument.createElement('div');
            pickBanner.className = 'section-box';
            pickBanner.style.borderColor = 'var(--gl-accent-primary)';
            pickBanner.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:var(--gl-fs-sm); font-weight:700; color:var(--gl-accent-primary);">
                        <i class="fas fa-hand-pointer"></i> 正在为「${targetVar ? targetVar.label : ''}」挑选${targetTypeLabel}（点击下方卡片即可一键应用）
                    </span>
                    <button class="btn" id="btn-cancel-pick">取消挑选返回</button>
                </div>
            `;
            pickBanner.querySelector('#btn-cancel-pick').onclick = () => {
                pickingTargetVarId = null;
                activeTab = 'editor';
                renderCurrentTab();
            };
            bodyContainer.appendChild(pickBanner);
        }

        // 2. 顶部子标签页切换栏（相册 / 色卡 / 字库）
        const subTabBar = targetDocument.createElement('div');
        subTabBar.className = 'filter-bar';
        const subTabs = [
            { key: 'image', icon: 'fa-images', label: `相册 (${appData.gallery.length})` },
            { key: 'color', icon: 'fa-palette', label: `色卡 (${appData.colorGallery.length})` },
            { key: 'font', icon: 'fa-font', label: `字库 (${appData.fontGallery.length})` }
        ];
        subTabs.forEach(st => {
            const btn = targetDocument.createElement('button');
            btn.className = `filter-chip ${activeGallerySubTab === st.key ? 'active' : ''}`;
            btn.innerHTML = `<i class="fas ${st.icon}"></i> <span>${st.label}</span>`;
            btn.onclick = () => {
                activeGallerySubTab = st.key;
                galleryCategoryFilter = 'ALL';
                renderCurrentTab();
            };
            subTabBar.appendChild(btn);
        });
        bodyContainer.appendChild(subTabBar);

        // 2.5 雪库独立导出/导入与搜索分类过滤工具栏
        const toolsBox = targetDocument.createElement('div');
        toolsBox.className = 'section-box';
        toolsBox.style.padding = '10px 12px';

        // 提取当前子标签下的所有可用分类标签
        const currentCategories = ['ALL'];
        if (activeGallerySubTab === 'image') {
            appData.gallery.forEach(g => {
                const c = (g.category || '素材').trim();
                if (!currentCategories.includes(c)) currentCategories.push(c);
            });
        } else if (activeGallerySubTab === 'color') {
            appData.colorGallery.forEach(col => {
                const c = (col.category || '常用配色').trim();
                if (!currentCategories.includes(c)) currentCategories.push(c);
            });
        } else if (activeGallerySubTab === 'font') {
            appData.fontGallery.forEach(fnt => {
                const c = (fnt.category || (fnt.fontUrl ? '外部直链字体' : '常用字体')).trim();
                if (!currentCategories.includes(c)) currentCategories.push(c);
            });
        }
        if (!currentCategories.includes(galleryCategoryFilter)) {
            galleryCategoryFilter = 'ALL';
        }

        toolsBox.innerHTML = `
            <div class="section-title collapsible-title ${isGalleryShareCollapsed ? 'collapsed' : ''}" id="hdr-toggle-gal-share">
                <span style="display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-box-archive"></i> 雪库独立分享
                </span>
                <i class="fas fa-chevron-down collapse-chevron"></i>
            </div>
            <div id="body-gal-share" style="display:${isGalleryShareCollapsed ? 'none' : 'flex'}; flex-direction:column; gap:8px; padding-bottom:6px; border-bottom:1px solid var(--gl-border-subtle);">
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn" id="btn-gal-copy-json" title="复制仅包含图片、颜色、字体收藏的JSON"><i class="fas fa-copy"></i> 复制雪库JSON</button>
                    <button class="btn primary" id="btn-gal-export-file" title="单独导出雪库 (.json)"><i class="fas fa-download"></i> 导出雪库.json</button>
                    <label class="btn" style="cursor:pointer;" title="导入并合并外部雪库 (.json)">
                        <i class="fas fa-upload"></i> 导入雪库.json
                        <input type="file" id="inp-gal-import-file" accept=".json,application/json" style="display:none;">
                    </label>
                </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:2px;">
                <div style="position:relative; flex:1; min-width:160px; display:flex; align-items:center;">
                    <i class="fas fa-magnifying-glass" style="position:absolute; left:10px; font-size:12px; color:var(--gl-text-muted); pointer-events:none;"></i>
                    <input type="text" class="text-input" id="inp-gal-search" value="${gallerySearchQuery}" placeholder="搜索备注名称或分类标签..." style="padding-left:30px; width:100%; height:32px; font-size:var(--gl-fs-xs); font-family:var(--gl-font-sans);">
                </div>
                ${gallerySearchQuery ? `<button class="btn" id="btn-gal-clear-search" style="height:32px;"><i class="fas fa-xmark"></i> 清空</button>` : ''}
            </div>
            <div class="filter-bar" id="gal-cat-chip-bar" style="margin-top:2px;"></div>
        `;

        const shareHdr = toolsBox.querySelector('#hdr-toggle-gal-share');
        const shareBody = toolsBox.querySelector('#body-gal-share');
        shareHdr.onclick = () => {
            isGalleryShareCollapsed = !isGalleryShareCollapsed;
            shareHdr.classList.toggle('collapsed', isGalleryShareCollapsed);
            shareBody.style.display = isGalleryShareCollapsed ? 'none' : 'flex';
        };

        // 渲染分类胶囊
        const chipBar = toolsBox.querySelector('#gal-cat-chip-bar');
        currentCategories.forEach(cat => {
            const chip = targetDocument.createElement('button');
            chip.className = `filter-chip ${galleryCategoryFilter === cat ? 'active' : ''}`;
            chip.style.padding = '4px 10px';
            chip.textContent = cat === 'ALL' ? '全部分类' : cat;
            chip.onclick = () => {
                galleryCategoryFilter = cat;
                renderCurrentTab();
            };
            chipBar.appendChild(chip);
        });

        // 绑定搜索输入事件（支持中文IME输入法合成，局部刷新列表不销毁输入框）
        const searchInp = toolsBox.querySelector('#inp-gal-search');
        let isImeComposing = false;
        const applySearchFilterOnly = () => {
            gallerySearchQuery = searchInp.value;
            renderActiveGallerySubContent();
        };
        searchInp.addEventListener('compositionstart', () => {
            isImeComposing = true;
        });
        searchInp.addEventListener('compositionend', () => {
            isImeComposing = false;
            applySearchFilterOnly();
        });
        searchInp.addEventListener('input', (e) => {
            if (isImeComposing || e.isComposing) return;
            applySearchFilterOnly();
        });

        const clearSearchBtn = toolsBox.querySelector('#btn-gal-clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.onclick = () => {
                gallerySearchQuery = '';
                renderCurrentTab();
            };
        }

        // 构建仅包含雪库三类收藏的导出数据对象
        const buildGalleryExportPayload = () => JSON.stringify({
            oopsGalleryCollection: true,
            exportedAt: new Date().toISOString(),
            gallery: appData.gallery || [],
            colorGallery: appData.colorGallery || [],
            fontGallery: appData.fontGallery || []
        }, null, 2);

        toolsBox.querySelector('#btn-gal-copy-json').onclick = () => {
            navigator.clipboard?.writeText(buildGalleryExportPayload());
            showInternalBanner('已复制雪库 JSON 到剪贴板');
            notifyToast('雪库 JSON 已复制，可直接分享给好友！', 'success');
        };

        toolsBox.querySelector('#btn-gal-export-file').onclick = () => {
            const blob = new Blob([buildGalleryExportPayload()], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = targetDocument.createElement('a');
            a.href = url;
            a.download = `OopsPalette_Gallery_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showInternalBanner('已触发雪库 .json 文件下载');
        };

        toolsBox.querySelector('#inp-gal-import-file').onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(String(ev.target?.result || ''));
                    if (!parsed || typeof parsed !== 'object') {
                        notifyToast('导入失败：无效的 JSON 文件', 'error');
                        return;
                    }
                    let imgAdded = 0, colAdded = 0, fntAdded = 0;

                    if (Array.isArray(parsed.gallery)) {
                        parsed.gallery.forEach(item => {
                            if (item && item.url && !appData.gallery.some(g => g.url === item.url)) {
                                appData.gallery.push({
                                    id: item.id || ('gal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)),
                                    name: item.name || '导入图片',
                                    category: item.category || '常用素材',
                                    url: item.url
                                });
                                imgAdded++;
                            }
                        });
                    }

                    if (Array.isArray(parsed.colorGallery)) {
                        parsed.colorGallery.forEach(item => {
                            const norm = (item?.value || '').replace(/\s+/g, '').toLowerCase();
                            if (norm && !appData.colorGallery.some(c => (c.value || '').replace(/\s+/g, '').toLowerCase() === norm)) {
                                appData.colorGallery.push({
                                    id: item.id || ('col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)),
                                    name: item.name || '导入颜色',
                                    category: item.category || '常用配色',
                                    value: item.value.trim()
                                });
                                colAdded++;
                            }
                        });
                    }

                    if (Array.isArray(parsed.fontGallery)) {
                        parsed.fontGallery.forEach(item => {
                            if (item && (item.fontFamily || item.fontUrl)) {
                                const fam = item.fontFamily || 'inherit';
                                const url = item.fontUrl || '';
                                if (!appData.fontGallery.some(f => f.fontFamily === fam && (f.fontUrl || '') === url)) {
                                    appData.fontGallery.push({
                                        id: item.id || ('fnt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)),
                                        name: item.name || '导入字体',
                                        category: item.category || '常用字体',
                                        fontFamily: fam,
                                        fontUrl: url
                                    });
                                    fntAdded++;
                                }
                            }
                        });
                    }

                    saveStorage(false);
                    renderCurrentTab();
                    const summary = `成功导入雪库：新增图片 ${imgAdded} 项、颜色 ${colAdded} 项、字体 ${fntAdded} 项`;
                    showInternalBanner(summary);
                    notifyToast(summary, 'success');
                } catch (err) {
                    notifyToast('雪库 JSON 解析失败，请检查文件格式', 'error');
                }
            };
            reader.readAsText(file);
        };

        bodyContainer.appendChild(toolsBox);

        // 3. 创建子视图独立挂载容器（保证搜索过滤时仅更新此容器，不打断搜索框输入状态）
        const subViewHost = targetDocument.createElement('div');
        subViewHost.id = 'gallery-subview-container';
        subViewHost.style.display = 'flex';
        subViewHost.style.flexDirection = 'column';
        subViewHost.style.gap = 'var(--gl-space-md)';
        bodyContainer.appendChild(subViewHost);

        renderActiveGallerySubContent();
    }

    function renderActiveGallerySubContent() {
        const subHost = bodyContainer.querySelector('#gallery-subview-container') || bodyContainer;
        if (subHost !== bodyContainer) subHost.innerHTML = '';
        if (activeGallerySubTab === 'image') {
            renderImageGallerySubView(subHost);
        } else if (activeGallerySubTab === 'color') {
            renderColorGallerySubView(subHost);
        } else if (activeGallerySubTab === 'font') {
            renderFontGallerySubView(subHost);
        }
    }

    // --- 2.1 雪库子视图：相册 ---
    function renderImageGallerySubView(targetHost = bodyContainer) {
        const addSection = targetDocument.createElement('div');
        addSection.className = 'section-box';
        addSection.innerHTML = `
            <div class="section-title collapsible-title ${isGalleryAddCollapsed ? 'collapsed' : ''}" id="hdr-toggle-gal-add">
                <span style="display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-folder-plus"></i> 冻存图片
                </span>
                <i class="fas fa-chevron-down collapse-chevron"></i>
            </div>
            <div id="body-gal-add" style="display:${isGalleryAddCollapsed ? 'none' : 'flex'}; flex-direction:column; gap:var(--gl-space-sm);">
                <div class="form-grid">
                    <div class="form-field">
                        <label>素材备注名称</label>
                        <input type="text" class="text-input" id="gal-new-name" placeholder=" " >
                    </div>
                    <div class="form-field">
                        <label>分类标签</label>
                        <input type="text" class="text-input" id="gal-new-cat" placeholder="  " >
                    </div>
                </div>
                <div class="form-field">
                    <label>图片直链 URL</label>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <input type="text" class="text-input" id="gal-new-url" placeholder="https://...">
                        <button class="btn primary" id="btn-add-gallery"><i class="fas fa-plus"></i> 冻入雪库</button>
                    </div>
                </div>
            </div>
        `;

        const addHdr = addSection.querySelector('#hdr-toggle-gal-add');
        const addBody = addSection.querySelector('#body-gal-add');
        addHdr.onclick = () => {
            isGalleryAddCollapsed = !isGalleryAddCollapsed;
            addHdr.classList.toggle('collapsed', isGalleryAddCollapsed);
            addBody.style.display = isGalleryAddCollapsed ? 'none' : 'flex';
        };

        addSection.querySelector('#btn-add-gallery').onclick = () => {
            const nameVal = addSection.querySelector('#gal-new-name').value.trim() || `未命名图片_${appData.gallery.length + 1}`;
            const catVal = addSection.querySelector('#gal-new-cat').value.trim() || '常用素材';
            const rawUrl = UrlUtils.extractRawUrl(addSection.querySelector('#gal-new-url').value);
            if (!rawUrl) {
                notifyToast('请填写有效的图片URL链接', 'warning');
                return;
            }
            appData.gallery.unshift({
                id: 'gal_' + Date.now(),
                name: nameVal,
                category: catVal,
                url: rawUrl
            });
            saveStorage(false);
            renderCurrentTab();
            showInternalBanner(`已冻存图片素材「${nameVal}」`);
        };
        targetHost.appendChild(addSection);

        const listSection = targetDocument.createElement('div');
        listSection.className = 'section-box';
        listSection.innerHTML = `
            <div class="section-title"><i class="fas fa-photo-film"></i> 已冻藏图片 (${appData.gallery.length})</div>
        `;

        if (appData.gallery.length === 0) {
            const emptyHint = targetDocument.createElement('div');
            emptyHint.className = 'var-desc';
            emptyHint.style.textAlign = 'center';
            emptyHint.style.padding = '16px 0';
            emptyHint.textContent = '相册暂无收藏，可在上方添加图片直链或在变量页点击「冻藏到雪库」。';
            listSection.appendChild(emptyHint);
            targetHost.appendChild(listSection);
            return;
        }

        const kw = gallerySearchQuery.trim().toLowerCase();
        const filteredGallery = appData.gallery.filter(gal => {
            const cat = (gal.category || '素材').trim();
            if (galleryCategoryFilter !== 'ALL' && cat !== galleryCategoryFilter) return false;
            if (!kw) return true;
            return (gal.name || '').toLowerCase().includes(kw) ||
                   cat.toLowerCase().includes(kw);
        });

        listSection.querySelector('.section-title').innerHTML = `<i class="fas fa-photo-film"></i> 已冻藏图片 (${filteredGallery.length} / ${appData.gallery.length})`;

        if (filteredGallery.length === 0) {
            const noMatch = targetDocument.createElement('div');
            noMatch.className = 'var-desc';
            noMatch.style.textAlign = 'center';
            noMatch.style.padding = '14px 0';
            noMatch.textContent = '未找到匹配当前筛选条件的图片收藏。';
            listSection.appendChild(noMatch);
            targetHost.appendChild(listSection);
            return;
        }

        const galGrid = targetDocument.createElement('div');
        galGrid.className = 'gallery-grid';
        const urlVars = appData.variables.filter(v => v.type === 'url');

        filteredGallery.forEach(gal => {
            const gCard = targetDocument.createElement('div');
            gCard.className = 'gallery-card';
            const isImg = UrlUtils.isPreviewableUrl(gal.url);
            gCard.innerHTML = `
                <div class="gallery-preview" title="${gal.url}">
                    ${isImg
                        ? `<img src="${gal.url}" alt="${gal.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
                           <i class="fas fa-image url-thumb-fallback" style="display:none;"></i>`
                        : `<i class="fas fa-link url-thumb-fallback"></i>`
                    }
                </div>
                <div class="gallery-title" title="${gal.name}">${gal.name}</div>
                <span class="gallery-tag">${gal.category || '素材'}</span>
                <div style="display:flex; flex-direction:column; gap:5px; margin-top:auto;">
                    <select class="select-input" style="height:28px; font-size:11px; padding:0 6px;">
                        ${urlVars.length > 0
                            ? urlVars.map(uv => `<option value="${uv.id}" ${pickingTargetVarId === uv.id ? 'selected' : ''}>应用至: ${uv.label}</option>`).join('')
                            : '<option value="">当前美化无图片变量</option>'
                        }
                    </select>
                    <div style="display:flex; gap:4px;">
                        <button class="btn primary" style="flex:1; padding:4px 6px;" data-gal-act="apply"><i class="fas fa-check"></i> 一键换上</button>
                        <button class="mini-btn" data-gal-act="copy" title="复制直链"><i class="fas fa-copy"></i></button>
                        <button class="mini-btn danger" data-gal-act="del" title="删除此素材"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;

            const targetSelect = gCard.querySelector('select');
            const applyImageToTarget = () => {
                const chosenVarId = (pickingTargetVarId && urlVars.some(u => u.id === pickingTargetVarId))
                    ? pickingTargetVarId
                    : targetSelect.value;
                const targetVar = appData.variables.find(v => v.id === chosenVarId);
                if (!targetVar) {
                    notifyToast('当前没有可应用的图片类型变量', 'warning');
                    return;
                }
                targetVar.value = UrlUtils.wrapCssUrl(gal.url);
                const wasPicking = !!pickingTargetVarId;
                pickingTargetVarId = null;
                saveStorage();
                if (wasPicking) {
                    activeTab = 'editor';
                    renderCurrentTab();
                }
                showInternalBanner(`已将「${gal.name}」应用到「${targetVar.label}」`);
                notifyToast(`已更换 ${targetVar.label} 为：${gal.name}`, 'success');
            };

            gCard.querySelector('[data-gal-act="apply"]').onclick = applyImageToTarget;

            gCard.querySelector('[data-gal-act="copy"]').onclick = () => {
                navigator.clipboard?.writeText(gal.url);
                showInternalBanner('已复制素材图片直链');
            };

            gCard.querySelector('[data-gal-act="del"]').onclick = () => {
                appData.gallery = appData.gallery.filter(item => item.id !== gal.id);
                saveStorage(false);
                renderCurrentTab();
                showInternalBanner('已删除该图片素材');
            };

            galGrid.appendChild(gCard);
        });

        listSection.appendChild(galGrid);
        targetHost.appendChild(listSection);
    }

    // --- 2.2 雪库子视图：色卡（复用三合一取色器 + 大图色块预览） ---
    function renderColorGallerySubView(targetHost = bodyContainer) {
        const defaultColorStr = '#8ecdf1';
        const initParsed = ColorUtils.parseColor(defaultColorStr);

        const addSection = targetDocument.createElement('div');
        addSection.className = 'section-box';
        addSection.innerHTML = `
            <div class="section-title collapsible-title ${isGalleryAddCollapsed ? 'collapsed' : ''}" id="hdr-toggle-col-add">
                <span style="display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-palette"></i> 冻存颜色
                </span>
                <i class="fas fa-chevron-down collapse-chevron"></i>
            </div>
            <div id="body-col-add" style="display:${isGalleryAddCollapsed ? 'none' : 'flex'}; flex-direction:column; gap:var(--gl-space-sm);">
                <div class="form-grid">
                    <div class="form-field">
                        <label>颜色备注名称</label>
                        <input type="text" class="text-input" id="col-new-name" placeholder=" " >
                    </div>
                    <div class="form-field">
                        <label>分类标签</label>
                        <input type="text" class="text-input" id="col-new-cat" placeholder=" " >
                    </div>
                </div>
                <div class="color-editor-box" style="margin-top:2px;">
                    <div class="color-main-row">
                        <div class="color-swatch-wrap" title="点击打开取色器">
                            <div class="color-swatch-fill" id="col-new-swatch-fill" style="background-color:${defaultColorStr};"></div>
                            <input type="color" class="native-color-input" id="col-new-picker" value="${initParsed.hex}">
                        </div>
                        <input type="text" class="text-input" id="col-new-val" value="${defaultColorStr}" placeholder="#HEX 或 rgba(r,g,b,a)">
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                        <div class="alpha-slider-row" style="flex:1; min-width:170px;">
                            <span class="alpha-label" id="col-new-alpha-lbl">透明度: 100%</span>
                            <input type="range" class="alpha-range" id="col-new-alpha" min="0" max="1" step="0.01" value="1">
                        </div>
                        <button class="btn primary" id="btn-add-color-gallery"><i class="fas fa-plus"></i> 冻入雪库</button>
                    </div>
                </div>
            </div>
        `;

        const colAddHdr = addSection.querySelector('#hdr-toggle-col-add');
        const colAddBody = addSection.querySelector('#body-col-add');
        colAddHdr.onclick = () => {
            isGalleryAddCollapsed = !isGalleryAddCollapsed;
            colAddHdr.classList.toggle('collapsed', isGalleryAddCollapsed);
            colAddBody.style.display = isGalleryAddCollapsed ? 'none' : 'flex';
        };

        const swatchFill = addSection.querySelector('#col-new-swatch-fill');
        const colorPicker = addSection.querySelector('#col-new-picker');
        const textInput = addSection.querySelector('#col-new-val');
        const alphaSlider = addSection.querySelector('#col-new-alpha');
        const alphaLabel = addSection.querySelector('#col-new-alpha-lbl');

        colorPicker.addEventListener('input', () => {
            const newRgb = ColorUtils.parseColor(colorPicker.value);
            const curAlpha = parseFloat(alphaSlider.value);
            const preferHex = curAlpha >= 1 && !textInput.value.trim().toLowerCase().startsWith('rgba');
            const formatted = ColorUtils.formatOutput(newRgb.r, newRgb.g, newRgb.b, curAlpha, preferHex);
            textInput.value = formatted;
            swatchFill.style.backgroundColor = formatted;
        });

        alphaSlider.addEventListener('input', () => {
            const curParsed = ColorUtils.parseColor(textInput.value);
            const newAlpha = parseFloat(alphaSlider.value);
            alphaLabel.textContent = `透明度: ${Math.round(newAlpha * 100)}%`;
            const formatted = ColorUtils.formatOutput(curParsed.r, curParsed.g, curParsed.b, newAlpha, false);
            textInput.value = formatted;
            swatchFill.style.backgroundColor = formatted;
        });

        const syncNewColorFromText = () => {
            const rawVal = textInput.value.trim();
            if (!rawVal) return;
            const p = ColorUtils.parseColor(rawVal);
            colorPicker.value = p.hex;
            alphaSlider.value = String(p.a);
            alphaLabel.textContent = `透明度: ${Math.round(p.a * 100)}%`;
            swatchFill.style.backgroundColor = rawVal;
        };
        textInput.addEventListener('input', syncNewColorFromText);
        textInput.addEventListener('change', syncNewColorFromText);

        addSection.querySelector('#btn-add-color-gallery').onclick = () => {
            const nameVal = addSection.querySelector('#col-new-name').value.trim() || `常用颜色_${appData.colorGallery.length + 1}`;
            const catVal = addSection.querySelector('#col-new-cat').value.trim() || '常用配色';
            const colorVal = textInput.value.trim();
            if (!colorVal) {
                notifyToast('请填写或选择有效的颜色代码', 'warning');
                return;
            }
            appData.colorGallery.unshift({
                id: 'col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                name: nameVal,
                category: catVal,
                value: colorVal
            });
            saveStorage(false);
            renderCurrentTab();
            showInternalBanner(`已将颜色「${nameVal}」冻入雪库`);
        };
        targetHost.appendChild(addSection);

        const listSection = targetDocument.createElement('div');
        listSection.className = 'section-box';
        listSection.innerHTML = `
            <div class="section-title"><i class="fas fa-swatchbook"></i> 已冻藏颜色 (${appData.colorGallery.length})</div>
        `;

        if (appData.colorGallery.length === 0) {
            const emptyHint = targetDocument.createElement('div');
            emptyHint.className = 'var-desc';
            emptyHint.style.textAlign = 'center';
            emptyHint.style.padding = '16px 0';
            emptyHint.textContent = '色卡暂无收藏，可使用上方三合一取色器添加或在变量页点击「冻藏到雪库」。';
            listSection.appendChild(emptyHint);
            targetHost.appendChild(listSection);
            return;
        }

        const kw = gallerySearchQuery.trim().toLowerCase();
        const filteredColors = appData.colorGallery.filter(col => {
            const cat = (col.category || '常用配色').trim();
            if (galleryCategoryFilter !== 'ALL' && cat !== galleryCategoryFilter) return false;
            if (!kw) return true;
            return (col.name || '').toLowerCase().includes(kw) ||
                   cat.toLowerCase().includes(kw);
        });

        listSection.querySelector('.section-title').innerHTML = `<i class="fas fa-swatchbook"></i> 已冻藏颜色 (${filteredColors.length} / ${appData.colorGallery.length})`;

        if (filteredColors.length === 0) {
            const noMatch = targetDocument.createElement('div');
            noMatch.className = 'var-desc';
            noMatch.style.textAlign = 'center';
            noMatch.style.padding = '14px 0';
            noMatch.textContent = '未找到匹配当前筛选条件常用颜色。';
            listSection.appendChild(noMatch);
            targetHost.appendChild(listSection);
            return;
        }

        const colGrid = targetDocument.createElement('div');
        colGrid.className = 'gallery-grid';
        const colorVars = appData.variables.filter(v => v.type === 'color');

        filteredColors.forEach(col => {
            const cCard = targetDocument.createElement('div');
            cCard.className = 'gallery-card';
            cCard.innerHTML = `
                <div class="gallery-preview" title="${col.value}">
                    <div style="position:absolute; inset:0; background:${col.value};"></div>
                    <span class="color-code-pill">${col.value}</span>
                </div>
                <div class="gallery-title" title="${col.name}">${col.name}</div>
                <span class="gallery-tag">${col.category || '常用配色'}</span>
                <div style="display:flex; flex-direction:column; gap:5px; margin-top:auto;">
                    <select class="select-input" style="height:28px; font-size:11px; padding:0 6px;">
                        ${colorVars.length > 0
                            ? colorVars.map(cv => `<option value="${cv.id}" ${pickingTargetVarId === cv.id ? 'selected' : ''}>应用至: ${cv.label}</option>`).join('')
                            : '<option value="">当前美化无颜色变量</option>'
                        }
                    </select>
                    <div style="display:flex; gap:4px;">
                        <button class="btn primary" style="flex:1; padding:4px 6px;" data-col-act="apply"><i class="fas fa-check"></i> 一键换上</button>
                        <button class="mini-btn" data-col-act="copy" title="复制色值代码"><i class="fas fa-copy"></i></button>
                        <button class="mini-btn danger" data-col-act="del" title="删除此颜色"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;

            const targetSelect = cCard.querySelector('select');
            const applyColorToTarget = () => {
                const chosenVarId = (pickingTargetVarId && colorVars.some(c => c.id === pickingTargetVarId))
                    ? pickingTargetVarId
                    : targetSelect.value;
                const targetVar = appData.variables.find(v => v.id === chosenVarId);
                if (!targetVar) {
                    notifyToast('当前没有可应用的颜色类型变量', 'warning');
                    return;
                }
                targetVar.value = col.value;
                const wasPicking = !!pickingTargetVarId;
                pickingTargetVarId = null;
                saveStorage();
                if (wasPicking) {
                    activeTab = 'editor';
                    renderCurrentTab();
                }
                showInternalBanner(`已将颜色「${col.name}」应用到「${targetVar.label}」`);
                notifyToast(`已更换 ${targetVar.label} 为：${col.value}`, 'success');
            };

            cCard.querySelector('[data-col-act="apply"]').onclick = applyColorToTarget;

            cCard.querySelector('[data-col-act="copy"]').onclick = () => {
                navigator.clipboard?.writeText(col.value);
                showInternalBanner(`已复制色值代码：${col.value}`);
            };

            cCard.querySelector('[data-col-act="del"]').onclick = () => {
                appData.colorGallery = appData.colorGallery.filter(item => item.id !== col.id);
                saveStorage(false);
                renderCurrentTab();
                showInternalBanner('已删除该常用颜色');
            };

            colGrid.appendChild(cCard);
        });

        listSection.appendChild(colGrid);
        targetHost.appendChild(listSection);
    }

    // --- 2.3 雪库子视图：字库（支持备注名 + 分类标签 + font-family + 外部直链 URL + 可编辑实时预览） ---
    function renderFontGallerySubView(targetHost = bodyContainer) {
        const addSection = targetDocument.createElement('div');
        addSection.className = 'section-box';
        addSection.innerHTML = `
            <div class="section-title collapsible-title ${isGalleryAddCollapsed ? 'collapsed' : ''}" id="hdr-toggle-fnt-add">
                <span style="display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-font"></i> 冻存字体
                </span>
                <i class="fas fa-chevron-down collapse-chevron"></i>
            </div>
            <div id="body-fnt-add" style="display:${isGalleryAddCollapsed ? 'none' : 'flex'}; flex-direction:column; gap:var(--gl-space-sm);">
                <div class="form-grid">
                    <div class="form-field">
                        <label>字体备注名称</label>
                        <input type="text" class="text-input" id="fnt-new-name" placeholder=" ">
                    </div>
                    <div class="form-field">
                        <label>分类标签</label>
                        <input type="text" class="text-input" id="fnt-new-cat" placeholder=" ">
                    </div>
                </div>
                <div class="form-field">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                        <label>字体族名称 (font-family)</label>
                        <button type="button" class="btn" id="btn-open-css-font-modal" style="padding:3px 8px; font-size:11px;" title="粘贴 @import 与 font-family 代码自动识别填写">
                            <i class="fas fa-code"></i> 粘贴CSS自动识别
                        </button>
                    </div>
                    <input type="text" class="text-input" id="fnt-new-family" placeholder="例如：'LXGW WenKai', sans-serif">
                </div>
                <div class="form-field">
                    <label>外部字体直链 URL（可选，支持 .woff2 / .ttf / .css 自动加载）</label>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <input type="text" class="text-input" id="fnt-new-url" placeholder="https://...">
                        <button class="btn primary" id="btn-add-font-gallery"><i class="fas fa-plus"></i> 冻入雪库</button>
                    </div>
                </div>
                <div class="form-field">
                    <label>实时预览文字（可直接点击下方输入框键入修改预览词）</label>
                    <input type="text" class="text-input" id="fnt-new-preview" value="${customFontPreviewText}" placeholder="输入自定义测试文字以实时预览字体效果..." style="border-style:dashed; font-size:var(--gl-fs-sm); font-family:inherit;">
                </div>
            </div>
        `;

        const fntAddHdr = addSection.querySelector('#hdr-toggle-fnt-add');
        const fntAddBody = addSection.querySelector('#body-fnt-add');
        fntAddHdr.onclick = () => {
            isGalleryAddCollapsed = !isGalleryAddCollapsed;
            fntAddHdr.classList.toggle('collapsed', isGalleryAddCollapsed);
            fntAddBody.style.display = isGalleryAddCollapsed ? 'none' : 'flex';
        };

        addSection.querySelector('#btn-open-css-font-modal').onclick = () => {
            txtParseFontCss.value = '';
            fontCssParseModal.classList.add('show');
            setTimeout(() => txtParseFontCss.focus(), 50);
        };

        const nameInp = addSection.querySelector('#fnt-new-name');
        const catInp = addSection.querySelector('#fnt-new-cat');
        const familyInp = addSection.querySelector('#fnt-new-family');
        const urlInp = addSection.querySelector('#fnt-new-url');
        const previewBox = addSection.querySelector('#fnt-new-preview');

        const updateNewFontPreview = () => {
            const fam = familyInp.value.trim();
            const rawUrl = UrlUtils.extractRawUrl(urlInp.value);
            syncGalleryFontsPreload(rawUrl, 'ST_TempPreviewFont');
            previewBox.style.fontFamily = getEffectivePreviewFontFamily(fam, rawUrl, 'ST_TempPreviewFont');
        };

        // 键入修改实时预览文字时，同步更新下方所有已冻藏字体卡片的预览文本
        previewBox.addEventListener('input', () => {
            customFontPreviewText = previewBox.value || '❄ 雪落于冬 星沉入海 Snow falls softly · 0123456789 ☃️';
            bodyContainer.querySelectorAll('.font-sample-main').forEach(el => {
                el.textContent = customFontPreviewText;
            });
        });

        familyInp.addEventListener('input', updateNewFontPreview);
        urlInp.addEventListener('input', updateNewFontPreview);
        urlInp.addEventListener('change', updateNewFontPreview);

        addSection.querySelector('#btn-add-font-gallery').onclick = () => {
            const nameVal = nameInp.value.trim() || `常用字体_${appData.fontGallery.length + 1}`;
            const catVal = catInp.value.trim() || '常用字体';
            const famVal = familyInp.value.trim() || 'inherit';
            const rawUrl = UrlUtils.extractRawUrl(urlInp.value);

            if ((famVal === 'inherit' || !famVal) && !rawUrl) {
                notifyToast('请至少填写字体族名称 (font-family) 或外部字体直链 URL', 'warning');
                return;
            }

            appData.fontGallery.unshift({
                id: 'fnt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                name: nameVal,
                category: catVal,
                fontFamily: famVal,
                fontUrl: rawUrl
            });
            saveStorage(false);
            renderCurrentTab();
            showInternalBanner(`已将字体「${nameVal}」冻入雪库`);
        };
        targetHost.appendChild(addSection);

        const listSection = targetDocument.createElement('div');
        listSection.className = 'section-box';
        listSection.innerHTML = `
            <div class="section-title"><i class="fas fa-book-font"></i> 已冻藏字体 (${appData.fontGallery.length})</div>
        `;

        if (appData.fontGallery.length === 0) {
            const emptyHint = targetDocument.createElement('div');
            emptyHint.className = 'var-desc';
            emptyHint.style.textAlign = 'center';
            emptyHint.style.padding = '16px 0';
            emptyHint.textContent = '字库暂无收藏，可在上方录入字体族与外部直链，或在变量页点击「冻藏到雪库」。';
            listSection.appendChild(emptyHint);
            targetHost.appendChild(listSection);
            return;
        }

        const kw = gallerySearchQuery.trim().toLowerCase();
        const filteredFonts = appData.fontGallery.filter(fnt => {
            const cat = (fnt.category || (fnt.fontUrl ? '外部直链字体' : '常用字体')).trim();
            if (galleryCategoryFilter !== 'ALL' && cat !== galleryCategoryFilter) return false;
            if (!kw) return true;
            return (fnt.name || '').toLowerCase().includes(kw) ||
                   cat.toLowerCase().includes(kw);
        });

        listSection.querySelector('.section-title').innerHTML = `<i class="fas fa-book-font"></i> 已冻藏字体 (${filteredFonts.length} / ${appData.fontGallery.length})`;

        if (filteredFonts.length === 0) {
            const noMatch = targetDocument.createElement('div');
            noMatch.className = 'var-desc';
            noMatch.style.textAlign = 'center';
            noMatch.style.padding = '14px 0';
            noMatch.textContent = '未找到匹配当前筛选条件的常用字体。';
            listSection.appendChild(noMatch);
            targetHost.appendChild(listSection);
            return;
        }

        const fntGrid = targetDocument.createElement('div');
        fntGrid.className = 'gallery-grid font-grid';
        const fontVars = appData.variables.filter(v => v.type === 'font');

        filteredFonts.forEach((fnt, idx) => {
            const aliasFamily = `ST_GalFont_${fnt.id || idx}`;
            const effectiveFamily = getEffectivePreviewFontFamily(fnt.fontFamily, fnt.fontUrl, aliasFamily);
            const catLabel = (fnt.category || (fnt.fontUrl ? '外部直链字体' : '常用字体')).trim();

            const fCard = targetDocument.createElement('div');
            fCard.className = 'gallery-card';
            fCard.innerHTML = `
                <div class="gallery-preview font-card-preview" title="可直接点击文字键入修改预览内容">
                    <div class="font-sample-main" contenteditable="true" spellcheck="false">${customFontPreviewText}</div>
                    <div class="font-sample-sub" contenteditable="true" spellcheck="false">Snow falls · 0123456789 ☃️</div>
                </div>
                <div class="gallery-title" title="${fnt.name}">${fnt.name}</div>
                <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                    <span class="gallery-tag">${catLabel}</span>
                    <span class="var-key-tag" title="字体族 font-family">${fnt.fontFamily || 'inherit'}</span>
                    ${fnt.fontUrl ? `<span class="gallery-tag" title="${fnt.fontUrl}"><i class="fas fa-link"></i> 外部直链</span>` : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:5px; margin-top:auto;">
                    <select class="select-input" style="height:28px; font-size:11px; padding:0 6px;">
                        ${fontVars.length > 0
                            ? fontVars.map(fv => `<option value="${fv.id}" ${pickingTargetVarId === fv.id ? 'selected' : ''}>应用至: ${fv.label}</option>`).join('')
                            : '<option value="">当前美化无字体变量</option>'
                        }
                    </select>
                    <div style="display:flex; gap:4px;">
                        <button class="btn primary" style="flex:1; padding:4px 6px;" data-fnt-act="apply"><i class="fas fa-check"></i> 一键换上</button>
                        <button class="mini-btn" data-fnt-act="copy" title="复制字体族与直链配置"><i class="fas fa-copy"></i></button>
                        <button class="mini-btn danger" data-fnt-act="del" title="删除此字体"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;

            // 通过 JS 直接设置预览容器与子元素的 fontFamily，避免引号属性截断并确保覆盖全局字体重置
            const cardPreviewEl = fCard.querySelector('.font-card-preview');
            const mainSampleEl = fCard.querySelector('.font-sample-main');
            const subSampleEl = fCard.querySelector('.font-sample-sub');
            cardPreviewEl.style.fontFamily = effectiveFamily;
            mainSampleEl.style.fontFamily = effectiveFamily;
            subSampleEl.style.fontFamily = effectiveFamily;

            const targetSelect = fCard.querySelector('select');
            const applyFontToTarget = () => {
                const chosenVarId = (pickingTargetVarId && fontVars.some(f => f.id === pickingTargetVarId))
                    ? pickingTargetVarId
                    : targetSelect.value;
                const targetVar = appData.variables.find(v => v.id === chosenVarId);
                if (!targetVar) {
                    notifyToast('当前没有可应用的字体类型变量', 'warning');
                    return;
                }
                targetVar.value = fnt.fontFamily || 'inherit';
                targetVar.fontUrl = fnt.fontUrl || '';
                const wasPicking = !!pickingTargetVarId;
                pickingTargetVarId = null;
                saveStorage();
                if (wasPicking) {
                    activeTab = 'editor';
                    renderCurrentTab();
                }
                showInternalBanner(`已将字体「${fnt.name}」应用到「${targetVar.label}」`);
                notifyToast(`已更换 ${targetVar.label} 字体为：${fnt.name}`, 'success');
            };

            fCard.querySelector('[data-fnt-act="apply"]').onclick = applyFontToTarget;

            fCard.querySelector('[data-fnt-act="copy"]').onclick = () => {
                const copyStr = fnt.fontUrl
                    ? `font-family: ${fnt.fontFamily || 'inherit'}; /* URL: ${fnt.fontUrl} */`
                    : (fnt.fontFamily || 'inherit');
                navigator.clipboard?.writeText(copyStr);
                showInternalBanner('已复制字体配置信息到剪贴板');
            };

            fCard.querySelector('[data-fnt-act="del"]').onclick = () => {
                appData.fontGallery = appData.fontGallery.filter(item => item.id !== fnt.id);
                saveStorage(false);
                renderCurrentTab();
                showInternalBanner('已删除该常用字体');
            };

            fntGrid.appendChild(fCard);
        });

        listSection.appendChild(fntGrid);
        targetHost.appendChild(listSection);
    }

    // ========================================================================
    // 视图三：多套预设方案切换与 JSON / CSS 导入导出
    // ========================================================================
    function renderPresetsView() {
        // 1. 多预设槽位管理与角色卡绑定（方案保存在当前识别的美化主题档案下）
        const presetBox = targetDocument.createElement('div');
        presetBox.className = 'section-box';
        const presetNames = Object.keys(appData.presets);
        const currentCharName = detectCurrentCharacterName();
        const bindings = appData.charBindings || {};
        const currentCharBoundPreset = currentCharName ? bindings[currentCharName] : null;
        const boundEntries = Object.entries(bindings);

        presetBox.innerHTML = `
            <div class="section-title"><i class="fas fa-bookmark"></i> 美化「${appData.currentThemeId}」的专属预设方案</div>
            <div class="var-desc">此处的预设方案与变量列表会自动保存在当前选中的美化「${appData.currentThemeId}」之下，支持将指定预设方案绑定至角色卡，切换角色卡时将自动运用对应的绑定预设。</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <select class="select-input" id="preset-selector" style="flex:1; min-width:160px;">
                    ${presetNames.map(name => `<option value="${name}" ${name === appData.activePresetName ? 'selected' : ''}>${name}</option>`).join('')}
                </select>
                <button class="btn primary" id="btn-load-preset"><i class="fas fa-play"></i> 切换此方案</button>
                <button class="btn danger" id="btn-del-preset"><i class="fas fa-trash"></i> 删除方案</button>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
                <input type="text" class="text-input" id="new-preset-name" placeholder="输入新方案名称 ">
                <button class="btn" id="btn-save-as-preset"><i class="fas fa-floppy-disk"></i> 将当前配置另存为新方案</button>
            </div>

            <div style="margin-top:6px; padding-top:10px; border-top:1px dashed var(--gl-border-subtle); display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:var(--gl-fs-xs); font-weight:700; color:var(--gl-text-primary); display:flex; align-items:center; gap:6px;">
                        <i class="fas fa-user-tag" style="color:var(--gl-accent-primary);"></i>
                        当前角色卡：${currentCharName ? `<span class="var-key-tag">${currentCharName}</span>` : '<span style="color:var(--gl-text-muted);">未检测到聊天角色卡</span>'}
                        ${currentCharBoundPreset ? `<span class="gallery-tag">已绑定：${currentCharBoundPreset}</span>` : ''}
                    </span>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="btn primary" id="btn-bind-char-preset" ${!currentCharName ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="将上方下拉框选中的预设方案绑定到当前角色卡">
                            <i class="fas fa-link"></i> 绑定所选方案至当前角色
                        </button>
                        ${currentCharBoundPreset ? `
                            <button class="btn danger" id="btn-unbind-char-preset" title="解除当前角色卡的预设方案绑定">
                                <i class="fas fa-link-slash"></i> 解除当前角色绑定
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${boundEntries.length > 0 ? `
                    <div style="display:flex; flex-direction:column; gap:5px; background:var(--gl-bg-input); padding:8px 10px; border-radius:var(--gl-radius-sm); border:1px solid var(--gl-border-subtle);">
                        <div style="font-size:11px; font-weight:600; color:var(--gl-text-secondary);">当前美化已绑定的角色卡方案 (${boundEntries.length})：</div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;" id="char-binding-list"></div>
                    </div>
                ` : ''}
            </div>
        `;

        // 渲染已绑定的角色胶囊列表，支持单独点击解绑
        const bindingListEl = presetBox.querySelector('#char-binding-list');
        if (bindingListEl) {
            boundEntries.forEach(([cName, pName]) => {
                const chip = targetDocument.createElement('div');
                chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; padding:3px 8px; border-radius:999px; background:var(--gl-bg-card); border:1px solid var(--gl-border-subtle); font-size:11px; color:var(--gl-text-primary);';
                chip.innerHTML = `
                    <span><i class="fas fa-user" style="color:var(--gl-accent-primary); font-size:10px;"></i> ${cName} <i class="fas fa-arrow-right" style="font-size:9px; color:var(--gl-text-muted);"></i> <b>${pName}</b></span>
                    <button class="mini-btn danger" style="width:18px; height:18px; border:none; background:transparent;" title="解除「${cName}」的绑定"><i class="fas fa-xmark"></i></button>
                `;
                chip.querySelector('button').onclick = () => {
                    delete appData.charBindings[cName];
                    saveStorage(false);
                    renderCurrentTab();
                    showInternalBanner(`已解除角色「${cName}」的预设方案绑定`);
                    notifyToast(`已解除角色「${cName}」的预设绑定`, 'info');
                };
                bindingListEl.appendChild(chip);
            });
        }

        // 绑定所选预设至当前角色卡
        const btnBindChar = presetBox.querySelector('#btn-bind-char-preset');
        if (btnBindChar && currentCharName) {
            btnBindChar.onclick = () => {
                const chosenPreset = presetBox.querySelector('#preset-selector').value;
                if (!chosenPreset || !appData.presets[chosenPreset]) return;
                if (!appData.charBindings) appData.charBindings = {};
                appData.charBindings[currentCharName] = chosenPreset;

                // 若当前尚未激活该方案，同步激活并运用
                appData.activePresetName = chosenPreset;
                appData.variables = JSON.parse(JSON.stringify(appData.presets[chosenPreset]));
                saveStorage(false);
                renderCurrentTab();
                showInternalBanner(`已将方案「${chosenPreset}」绑定至角色「${currentCharName}」并立即生效！`);
                notifyToast(`角色「${currentCharName}」已绑定预设方案：${chosenPreset}`, 'success');
            };
        }

        // 解除当前角色卡的绑定
        const btnUnbindChar = presetBox.querySelector('#btn-unbind-char-preset');
        if (btnUnbindChar && currentCharName) {
            btnUnbindChar.onclick = () => {
                if (appData.charBindings && appData.charBindings[currentCharName]) {
                    delete appData.charBindings[currentCharName];
                    saveStorage(false);
                    renderCurrentTab();
                    showInternalBanner(`已解除角色「${currentCharName}」的预设绑定`);
                    notifyToast(`已解除角色「${currentCharName}」的预设绑定`, 'info');
                }
            };
        }

        presetBox.querySelector('#btn-load-preset').onclick = () => {
            const chosen = presetBox.querySelector('#preset-selector').value;
            if (appData.presets[chosen]) {
                appData.activePresetName = chosen;
                appData.variables = JSON.parse(JSON.stringify(appData.presets[chosen]));
                saveStorage(false);
                renderCurrentTab();
                showInternalBanner(`已切换至美化方案「${chosen}」`);
                notifyToast(`已激活美化预设：${chosen}`, 'success');
            }
        };

        presetBox.querySelector('#btn-save-as-preset').onclick = () => {
            const newName = presetBox.querySelector('#new-preset-name').value.trim();
            if (!newName) {
                notifyToast('请输入新预设方案的名称', 'warning');
                return;
            }
            appData.activePresetName = newName;
            appData.presets[newName] = JSON.parse(JSON.stringify(appData.variables));
            saveStorage(true);
            renderCurrentTab();
            showInternalBanner(`已保存新预设方案「${newName}」`);
        };

        presetBox.querySelector('#btn-del-preset').onclick = () => {
            const chosen = presetBox.querySelector('#preset-selector').value;
            if (Object.keys(appData.presets).length <= 1) {
                notifyToast('至少需要保留一套预设方案', 'warning');
                return;
            }
            delete appData.presets[chosen];
            // 同步清理绑定了该已删除方案的角色记录
            if (appData.charBindings) {
                Object.keys(appData.charBindings).forEach(k => {
                    if (appData.charBindings[k] === chosen) {
                        delete appData.charBindings[k];
                    }
                });
            }
            const remaining = Object.keys(appData.presets)[0];
            appData.activePresetName = remaining;
            appData.variables = JSON.parse(JSON.stringify(appData.presets[remaining]));
            saveStorage(false);
            renderCurrentTab();
            showInternalBanner(`已删除方案「${chosen}」`);
        };
        bodyContainer.appendChild(presetBox);

        // 2. JSON配置一键导出与导入（分享与备份）
        const jsonBox = targetDocument.createElement('div');
        jsonBox.className = 'section-box';
        const exportPayload = JSON.stringify(appData, null, 2);
        jsonBox.innerHTML = `
            <div class="section-title"><i class="fas fa-share-nodes"></i> JSON 配置代码导出与导入</div>
            <textarea class="code-textarea" id="json-config-textarea"></textarea>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn primary" id="btn-copy-json"><i class="fas fa-copy"></i> 复制 JSON 配置代码</button>
                <button class="btn" id="btn-download-json"><i class="fas fa-download"></i> 下载 .json 文件</button>
                <button class="btn" id="btn-import-json-text"><i class="fas fa-file-import"></i> 从上方文本框导入配置</button>
                <label class="btn" style="cursor:pointer;">
                    <i class="fas fa-upload"></i> 上传 .json 文件导入
                    <input type="file" id="file-upload-json" accept=".json,application/json" style="display:none;">
                </label>
            </div>
        `;
        const jsonArea = jsonBox.querySelector('#json-config-textarea');
        jsonArea.value = exportPayload;

        jsonBox.querySelector('#btn-copy-json').onclick = () => {
            navigator.clipboard?.writeText(jsonArea.value);
            showInternalBanner('已复制完整 JSON 配置代码到剪贴板');
            notifyToast('JSON 美化配置代码已复制，可直接分享！', 'success');
        };

        jsonBox.querySelector('#btn-download-json').onclick = () => {
            const blob = new Blob([jsonArea.value], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = targetDocument.createElement('a');
            a.href = url;
            a.download = `SillyTavern_ThemeConfig_${appData.activePresetName}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showInternalBanner('已触发 JSON 配置文件下载');
        };

        const applyImportedJson = (rawText) => {
            try {
                const parsed = JSON.parse(rawText);
                if (!parsed || !Array.isArray(parsed.variables)) {
                    notifyToast('JSON 格式校验失败：缺少 variables 数组字段', 'error');
                    return;
                }
                appData.globalEnabled = parsed.globalEnabled ?? true;
                appData.useImportant = parsed.useImportant ?? true;
                appData.darkModePanel = parsed.darkModePanel ?? appData.darkModePanel;
                appData.activePresetName = parsed.activePresetName || '导入的美化方案';
                appData.variables = parsed.variables;
                if (Array.isArray(parsed.gallery)) appData.gallery = parsed.gallery;
                if (Array.isArray(parsed.colorGallery)) appData.colorGallery = parsed.colorGallery;
                if (Array.isArray(parsed.fontGallery)) appData.fontGallery = parsed.fontGallery;
                if (parsed.presets && typeof parsed.presets === 'object') {
                    appData.presets = parsed.presets;
                } else {
                    appData.presets[appData.activePresetName] = JSON.parse(JSON.stringify(parsed.variables));
                }
                if (parsed.charBindings && typeof parsed.charBindings === 'object') {
                    appData.charBindings = parsed.charBindings;
                }
                rootWrap.className = `theme-root ${appData.darkModePanel ? 'dark-glass' : ''}`;
                saveStorage(true);
                renderCurrentTab();
                showInternalBanner('成功导入并应用 JSON 美化配置！');
                notifyToast('JSON 美化配置导入成功！', 'success');
            } catch (e) {
                notifyToast('JSON 解析错误，请检查代码是否完整', 'error');
            }
        };

        jsonBox.querySelector('#btn-import-json-text').onclick = () => {
            applyImportedJson(jsonArea.value);
        };

        jsonBox.querySelector('#file-upload-json').onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const content = String(ev.target?.result || '');
                jsonArea.value = content;
                applyImportedJson(content);
            };
            reader.readAsText(file);
        };
        bodyContainer.appendChild(jsonBox);

        // 3. 纯CSS代码一键生成与复制
        const cssOutBox = targetDocument.createElement('div');
        cssOutBox.className = 'section-box';
        const pureCss = buildCssString();
        cssOutBox.innerHTML = `
            <div class="section-title"><i class="fas fa-file-code"></i> 生成的纯 CSS 样式代码预览</div>
            <textarea class="code-textarea" readonly id="pure-css-output"></textarea>
            <div>
                <button class="btn primary" id="btn-copy-pure-css"><i class="fas fa-copy"></i> 一键复制生成的 :root CSS 代码</button>
            </div>
        `;
        cssOutBox.querySelector('#pure-css-output').value = pureCss;
        cssOutBox.querySelector('#btn-copy-pure-css').onclick = () => {
            navigator.clipboard?.writeText(pureCss);
            showInternalBanner('已复制纯 CSS 变量覆盖代码');
            notifyToast('已复制 :root CSS 代码到剪贴板', 'info');
        };
        bodyContainer.appendChild(cssOutBox);
    }

    // ========================================================================
    // 视图四：设置与脚本自身美化管理 (悬浮球样式、面板CSS预设、发布链接与说明弹窗)
    // ========================================================================
    function renderSettingsView() {
        const bc = appData.ballConfig;
        const ps = appData.panelSkin;

        // 1. 关于、发布链接与免责声明入口
        const infoBox = targetDocument.createElement('div');
        infoBox.className = 'section-box';
        infoBox.innerHTML = `
            <div class="section-title"><i class="fas fa-compass"></i> 脚本信息与说明导航</div>
            <div class="form-field">
                <label>脚本发布页链接</label>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <input type="text" class="text-input" id="set-release-url" value="${appData.releaseUrl || SCRIPT_RELEASE_URL}" placeholder="https://...">
                    <button class="btn primary" id="btn-jump-release"><i class="fas fa-arrow-up-right-from-square"></i> 跳转DC发布链接</button>
                    <button class="btn" id="btn-reopen-disclaimer"><i class="fas fa-book-open"></i> 使用说明</button>
                </div>
            </div>
        `;
        infoBox.querySelector('#set-release-url').onchange = (e) => {
            appData.releaseUrl = e.target.value.trim() || SCRIPT_RELEASE_URL;
            saveStorage(false);
        };
        infoBox.querySelector('#btn-jump-release').onclick = () => {
            const targetUrl = infoBox.querySelector('#set-release-url').value.trim() || SCRIPT_RELEASE_URL;
            appData.releaseUrl = targetUrl;
            saveStorage(false);
            try {
                targetWindow.open(targetUrl, '_blank', 'noopener,noreferrer');
            } catch (e) {
                window.open(targetUrl, '_blank');
            }
            showInternalBanner('正在为您打开脚本发布页面...');
        };
        infoBox.querySelector('#btn-reopen-disclaimer').onclick = () => {
            openDisclaimerModal();
        };
        bodyContainer.appendChild(infoBox);

        // 2. 悬浮球显隐与个性化样式设置
        const ballBox = targetDocument.createElement('div');
        ballBox.className = 'section-box';
        ballBox.innerHTML = `
            <div class="section-title"><i class="fas fa-circle-dot"></i> 悬浮球显隐与样式设置</div>
            <div style="display:flex; align-items:center; justify-content:flex-start; flex-wrap:wrap; gap:16px;">
                <label class="switch-label">
                    <input type="checkbox" id="chk-ball-visible" ${bc.visible !== false ? 'checked' : ''}>
                    <span>悬浮球显隐</span>
                </label>
                <label class="switch-label" title="开启后悬浮球吸附在屏幕边缘时将自动半隐收起，鼠标悬停时探出">
                    <input type="checkbox" id="chk-ball-dock" ${bc.dockToEdge !== false ? 'checked' : ''}>
                    <span>靠边半隐收起</span>
                </label>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label>悬浮球尺寸: <span id="lbl-ball-size">${bc.size || 54}px</span></label>
                    <input type="range" class="alpha-range" id="rng-ball-size" min="36" max="84" step="2" value="${bc.size || 54}">
                </div>
                <div class="form-field">
                    <label>悬浮球不透明度: <span id="lbl-ball-op">${Math.round((bc.opacity ?? 1) * 100)}%</span></label>
                    <input type="range" class="alpha-range" id="rng-ball-op" min="0.2" max="1" step="0.05" value="${bc.opacity ?? 1}">
                </div>
                <div class="form-field">
                    <label>FontAwesome 图标类名</label>
                    <input type="text" class="text-input" id="inp-ball-icon" value="${bc.icon || 'fa-palette'}" placeholder="如 fa-palette / fa-star">
                </div>
                <div class="form-field">
                    <label>自定义图片 / 表情</label>
                    <input type="text" class="text-input" id="inp-ball-img" value="${bc.bgImageUrl || ''}" placeholder="图片url或表情符号">
                </div>
            </div>
            <div class="form-field">
                <label>悬浮球附加内联 CSS</label>
                <input type="text" class="text-input" id="inp-ball-css" value="${bc.customStyle || ''}" placeholder="例如：border: 2px solid #ffb0d6; box-shadow: 0 0 15px #ffb0d6;">
            </div>
        `;

        const chkBallVis = ballBox.querySelector('#chk-ball-visible');
        const chkBallDock = ballBox.querySelector('#chk-ball-dock');
        const rngSize = ballBox.querySelector('#rng-ball-size');
        const lblSize = ballBox.querySelector('#lbl-ball-size');
        const rngOp = ballBox.querySelector('#rng-ball-op');
        const lblOp = ballBox.querySelector('#lbl-ball-op');
        const inpIcon = ballBox.querySelector('#inp-ball-icon');
        const inpImg = ballBox.querySelector('#inp-ball-img');
        const inpBallCss = ballBox.querySelector('#inp-ball-css');

        chkBallVis.onchange = () => {
            bc.visible = chkBallVis.checked;
            applySelfWidgetAppearance();
            saveStorage(false);
            showInternalBanner(bc.visible ? '已开启悬浮球' : '已隐藏悬浮球');
        };
        chkBallDock.onchange = () => {
            bc.dockToEdge = chkBallDock.checked;
            applySelfWidgetAppearance();
            enforceBounds(floatBall, true);
            saveStorage(false);
            showInternalBanner(bc.dockToEdge ? '已开启悬浮球靠边半隐收起' : '已关闭悬浮球靠边半隐收起');
        };
        rngSize.oninput = () => {
            bc.size = Number(rngSize.value);
            lblSize.textContent = `${bc.size}px`;
            applySelfWidgetAppearance();
            saveStorage(false);
        };
        rngOp.oninput = () => {
            bc.opacity = Number(rngOp.value);
            lblOp.textContent = `${Math.round(bc.opacity * 100)}%`;
            applySelfWidgetAppearance();
            saveStorage(false);
        };
        inpIcon.onchange = () => {
            bc.icon = inpIcon.value.trim() || 'fa-palette';
            applySelfWidgetAppearance();
            saveStorage(false);
        };
        inpImg.onchange = () => {
            bc.bgImageUrl = inpImg.value.trim();
            applySelfWidgetAppearance();
            saveStorage(false);
        };
        inpBallCss.onchange = () => {
            bc.customStyle = inpBallCss.value.trim();
            applySelfWidgetAppearance();
            saveStorage(false);
        };
        bodyContainer.appendChild(ballBox);

        // 3. 脚本面板自身美化 CSS 管理与预设保存、删除、导入导出
        const skinBox = targetDocument.createElement('div');
        skinBox.className = 'section-box';
        const skinPresetNames = Object.keys(ps.presets || {});
        skinBox.innerHTML = `
            <div class="section-title"><i class="fas fa-paintbrush"></i> 脚本面板美化 CSS 管理与预设</div>
            <div class="var-desc">在此处编写或切换的 CSS 仅作用于 OopsPalette 控制面板与悬浮球自身，可定制面板背景、圆角、字体与配色。</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <select class="select-input" id="sel-skin-preset" style="flex:1; min-width:150px;">
                    ${skinPresetNames.map(n => `<option value="${n}" ${n === ps.activeSkinPreset ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
                <button class="btn primary" id="btn-apply-skin-preset"><i class="fas fa-check"></i> 加载此预设</button>
                <button class="btn danger" id="btn-del-skin-preset"><i class="fas fa-trash"></i> 删除预设</button>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <input type="text" class="text-input" id="inp-new-skin-name" placeholder="输入预设名">
                <button class="btn" id="btn-save-skin-preset"><i class="fas fa-floppy-disk"></i> 保存为预设</button>
            </div>
            <div class="form-field">
                <label>美化 CSS 代码编辑器</label>
                <textarea class="code-textarea" id="txt-panel-skin-css" placeholder=".control-panel { ... }"></textarea>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn primary" id="btn-apply-skin-css"><i class="fas fa-bolt"></i> 立即应用</button>
                <button class="btn" id="btn-export-skin-json"><i class="fas fa-copy"></i> 导出复制脚本美化JSON</button>
                <button class="btn" id="btn-download-skin-json"><i class="fas fa-download"></i> 下载美化.json</button>
                <label class="btn" style="cursor:pointer;">
                    <i class="fas fa-upload"></i> 导入美化.json
                    <input type="file" id="file-import-skin-json" accept=".json,application/json" style="display:none;">
                </label>
            </div>
        `;

        const txtSkinCss = skinBox.querySelector('#txt-panel-skin-css');
        txtSkinCss.value = ps.customCss || '';

        skinBox.querySelector('#btn-apply-skin-css').onclick = () => {
            ps.customCss = txtSkinCss.value;
            if (ps.activeSkinPreset) {
                ps.presets[ps.activeSkinPreset] = ps.customCss;
            }
            applySelfWidgetAppearance();
            saveStorage(false);
            showInternalBanner('已更新并应用脚本面板美化CSS！');
        };

        skinBox.querySelector('#btn-apply-skin-preset').onclick = () => {
            const chosen = skinBox.querySelector('#sel-skin-preset').value;
            if (ps.presets[chosen] !== undefined) {
                ps.activeSkinPreset = chosen;
                ps.customCss = ps.presets[chosen];
                txtSkinCss.value = ps.customCss;
                applySelfWidgetAppearance();
                saveStorage(false);
                renderCurrentTab();
                showInternalBanner(`已切换脚本面板美化预设：「${chosen}」`);
            }
        };

        skinBox.querySelector('#btn-save-skin-preset').onclick = () => {
            const name = skinBox.querySelector('#inp-new-skin-name').value.trim();
            if (!name) {
                notifyToast('请输入脚本美化预设名称', 'warning');
                return;
            }
            ps.customCss = txtSkinCss.value;
            ps.activeSkinPreset = name;
            ps.presets[name] = ps.customCss;
            applySelfWidgetAppearance();
            saveStorage(false);
            renderCurrentTab();
            showInternalBanner(`已保存脚本面板美化预设：「${name}」`);
        };

        skinBox.querySelector('#btn-del-skin-preset').onclick = () => {
            const chosen = skinBox.querySelector('#sel-skin-preset').value;
            if (Object.keys(ps.presets).length <= 1) {
                notifyToast('至少需要保留一套脚本面板美化预设', 'warning');
                return;
            }
            delete ps.presets[chosen];
            const firstKey = Object.keys(ps.presets)[0];
            ps.activeSkinPreset = firstKey;
            ps.customCss = ps.presets[firstKey];
            applySelfWidgetAppearance();
            saveStorage(false);
            renderCurrentTab();
            showInternalBanner(`已删除面板美化预设：「${chosen}」`);
        };

        // 导出与导入脚本自身美化配置（含悬浮球样式与面板CSS预设）
        const getSelfSkinExportString = () => JSON.stringify({
            ballConfig: appData.ballConfig,
            panelSkin: appData.panelSkin
        }, null, 2);

        skinBox.querySelector('#btn-export-skin-json').onclick = () => {
            navigator.clipboard?.writeText(getSelfSkinExportString());
            showInternalBanner('已复制脚本美化配置 JSON 到剪贴板');
            notifyToast('脚本面板与悬浮球美化JSON已复制！', 'success');
        };

        skinBox.querySelector('#btn-download-skin-json').onclick = () => {
            const blob = new Blob([getSelfSkinExportString()], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = targetDocument.createElement('a');
            a.href = url;
            a.download = `OopsPalette_SelfSkin_${ps.activeSkinPreset || 'config'}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showInternalBanner('已下载脚本美化配置 .json 文件');
        };

        skinBox.querySelector('#file-import-skin-json').onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(String(ev.target?.result || ''));
                    if (parsed.ballConfig) appData.ballConfig = { ...appData.ballConfig, ...parsed.ballConfig };
                    if (parsed.panelSkin) {
                        appData.panelSkin = {
                            ...appData.panelSkin,
                            ...parsed.panelSkin,
                            presets: { ...appData.panelSkin.presets, ...(parsed.panelSkin.presets || {}) }
                        };
                    }
                    applySelfWidgetAppearance();
                    saveStorage(false);
                    renderCurrentTab();
                    showInternalBanner('成功导入脚本面板与悬浮球美化配置！');
                    notifyToast('脚本自身美化配置导入成功！', 'success');
                } catch (err) {
                    notifyToast('导入失败：JSON文件格式有误', 'error');
                }
            };
            reader.readAsText(file);
        };

        bodyContainer.appendChild(skinBox);

        // 4. 当前脚本本地缓存管理（只清除 OopsPalette 自己的存储项）
        const cacheBox = targetDocument.createElement('div');
        cacheBox.className = 'section-box';
        cacheBox.innerHTML = `
            <div class="section-title"><i class="fas fa-database"></i> 本地缓存管理</div>
            <div class="var-desc">清除当前脚本保存在本地的使用配置缓存。此操作会重置本脚本的变量、预设、素材收藏、悬浮球和面板外观设置；不会清理浏览器缓存或酒馆的其他数据。</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button class="btn danger" id="btn-clear-current-cache"><i class="fas fa-broom"></i> 清除当前使用缓存</button>
            </div>
        `;
        cacheBox.querySelector('#btn-clear-current-cache').onclick = () => {
            const confirmed = targetWindow.confirm('确定清除 OopsPalette 当前使用缓存吗？\n\n这会重置本脚本保存的变量、预设、素材收藏、悬浮球与面板外观配置。建议先在「预设」或「设置」中导出需要保留的配置。');
            if (!confirmed) return;
            try {
                targetWindow.localStorage.removeItem(STORAGE_KEY);
                const injectedStyle = targetDocument.getElementById(STYLE_TAG_ID);
                if (injectedStyle) injectedStyle.remove();
                const preloadFontStyle = targetDocument.getElementById(GALLERY_FONT_STYLE_ID);
                if (preloadFontStyle) preloadFontStyle.remove();
                showInternalBanner('已清除 OopsPalette 本地配置缓存，正在重新载入…');
                targetWindow.location.reload();
            } catch (err) {
                console.error('[美化控制中心] 清除本地配置缓存失败:', err);
                notifyToast('清除缓存失败，请检查当前页面的本地存储权限', 'error');
            }
        };
        bodyContainer.appendChild(cacheBox);
    }

    // 9. 顶部与底部固定控件事件绑定
    panel.querySelectorAll('.nav-tab').forEach(tabBtn => {
        tabBtn.onclick = () => {
            activeTab = tabBtn.getAttribute('data-tab');
            lastNonSettingsTab = activeTab;
            renderCurrentTab();
        };
    });

    btnToggleDark.onclick = () => {
        appData.darkModePanel = !appData.darkModePanel;
        rootWrap.className = `theme-root ${appData.darkModePanel ? 'dark-glass' : ''}`;
        saveStorage(false);
        updateHeaderAndFooterStatus();
    };

    panel.querySelector('#btn-reset-current').onclick = () => {
        appData.variables.forEach(v => {
            v.value = v.defaultValue;
        });
        saveStorage();
        renderCurrentTab();
        showInternalBanner('已将当前方案所有变量重置为默认值');
        notifyToast('已恢复所有变量的默认值', 'info');
    };

    chkGlobalEnable.onchange = () => {
        appData.globalEnabled = chkGlobalEnable.checked;
        saveStorage(false);
        updateHeaderAndFooterStatus();
        showInternalBanner(appData.globalEnabled ? '已开启主题美化覆盖' : '已暂停主题美化覆盖');
    };

    chkUseImportant.onchange = () => {
        appData.useImportant = chkUseImportant.checked;
        saveStorage(false);
        showInternalBanner(appData.useImportant ? '已开启 !important 强制权重' : '已关闭 !important 强制权重');
    };

    // 10. 窗口打开、收起、边界碰撞检测、拖拽与缩放引擎
    function enforceBounds(el, isBall) {
        const w = el.offsetWidth || (isBall ? 54 : 520);
        const h = el.offsetHeight || (isBall ? 54 : 660);
        let left = parseFloat(el.style.left) || CONFIG.SAFE_MARGIN;
        let top = parseFloat(el.style.top) || CONFIG.SAFE_MARGIN;

        const maxLeft = Math.max(CONFIG.SAFE_MARGIN, targetWindow.innerWidth - w - CONFIG.SAFE_MARGIN);
        const maxTop = isBall
            ? Math.max(CONFIG.SAFE_MARGIN, targetWindow.innerHeight - h - CONFIG.SAFE_MARGIN)
            : Math.max(CONFIG.SAFE_MARGIN, targetWindow.innerHeight - 60);

        const EDGE_DOCK_THRESHOLD = 28;
        const nearLeft = left <= EDGE_DOCK_THRESHOLD;
        const nearRight = (left + w) >= (targetWindow.innerWidth - EDGE_DOCK_THRESHOLD);

        if (isBall && appData.ballConfig && appData.ballConfig.dockToEdge !== false && (nearLeft || nearRight)) {
            const isLeft = nearLeft;
            appData.ballConfig.dockSide = isLeft ? 'left' : 'right';
            el.style.left = (isLeft ? 0 : Math.max(0, targetWindow.innerWidth - w)) + 'px';
            el.classList.toggle('docked-left', isLeft);
            el.classList.toggle('docked-right', !isLeft);
        } else {
            if (isBall && appData.ballConfig) appData.ballConfig.dockSide = 'free';
            el.style.left = Math.max(CONFIG.SAFE_MARGIN, Math.min(left, maxLeft)) + 'px';
            if (isBall) el.classList.remove('docked-left', 'docked-right');
        }
        el.style.top = Math.max(CONFIG.SAFE_MARGIN, Math.min(top, maxTop)) + 'px';
    }

    function openPanel() {
        panel.classList.remove('force-hide');
        currentState = STATES.PANEL_OPEN;
        floatBall.classList.add('hidden');
        panel.classList.add('show');

        // 若首次打开未定位，居中放置
        if (!panel.style.left) {
            const pW = Math.min(520, targetWindow.innerWidth - 32);
            const pH = Math.min(660, targetWindow.innerHeight - 32);
            panel.style.width = pW + 'px';
            panel.style.height = pH + 'px';
            panel.style.left = Math.max(CONFIG.SAFE_MARGIN, Math.round((targetWindow.innerWidth - pW) / 2)) + 'px';
            panel.style.top = Math.max(CONFIG.SAFE_MARGIN, Math.round((targetWindow.innerHeight - pH) / 2)) + 'px';
        } else {
            enforceBounds(panel, false);
        }

        // 首次打开管理器时自动弹出免责声明弹窗
        if (!appData.disclaimerAccepted) {
            openDisclaimerModal();
        }

        renderCurrentTab();
    }

    function closePanel() {
        currentState = STATES.IDLE;
        panel.classList.remove('show');
        floatBall.classList.remove('hidden');
        if (isWidgetVisible) enforceBounds(floatBall, true);
    }

    panel.querySelector('#btn-close-panel').onclick = closePanel;

    // 拖拽实现（严格校验鼠标左键按住状态，松开时立即停止移动）
    function bindDraggable(element, handleEl, isBall) {
        let startX = 0, startY = 0, initLeft = 0, initTop = 0;
        let isPointerPressed = false;
        let isDragging = false;
        let rafId = null;

        const onPointerDown = (e) => {
            // 仅响应鼠标左键或触摸操作
            if (e.type === 'mousedown' && e.button !== 0) return;
            if (!isBall && e.target.closest('button, input, select, label')) return;

            const pt = e.touches ? e.touches[0] : e;
            startX = pt.clientX;
            startY = pt.clientY;
            const rect = element.getBoundingClientRect();
            initLeft = rect.left;
            initTop = rect.top;
            isPointerPressed = true;
            isDragging = false;

            targetDocument.addEventListener('mousemove', onPointerMove, { passive: false });
            targetDocument.addEventListener('touchmove', onPointerMove, { passive: false });
            targetDocument.addEventListener('mouseup', onPointerUp, true);
            targetDocument.addEventListener('touchend', onPointerUp, true);
            targetWindow.addEventListener('mouseup', onPointerUp, true);
            targetWindow.addEventListener('blur', onPointerUp);
        };

        const onPointerMove = (e) => {
            // 核心防护：一旦检测到鼠标按键已松开 (e.buttons === 0)，立即强制终止拖拽
            if (!isPointerPressed || (e.type === 'mousemove' && e.buttons === 0)) {
                onPointerUp();
                return;
            }

            const pt = e.touches ? e.touches[0] : e;
            const dx = pt.clientX - startX;
            const dy = pt.clientY - startY;

            if (!isDragging) {
                if (Math.hypot(dx, dy) > CONFIG.CLICK_DIST_THRESHOLD) {
                    isDragging = true;
                    element.classList.add('dragging');
                    if (isBall) element.classList.remove('docked-left', 'docked-right');
                    currentState = isBall ? STATES.BALL_DRAGGING : STATES.PANEL_DRAGGING;
                } else {
                    return;
                }
            }
            if (e.cancelable) e.preventDefault();

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (!isPointerPressed) return;
                const elW = element.offsetWidth;
                const elH = element.offsetHeight;
                const maxL = Math.max(CONFIG.SAFE_MARGIN, targetWindow.innerWidth - elW - CONFIG.SAFE_MARGIN);
                const maxT = isBall
                    ? Math.max(CONFIG.SAFE_MARGIN, targetWindow.innerHeight - elH - CONFIG.SAFE_MARGIN)
                    : Math.max(CONFIG.SAFE_MARGIN, targetWindow.innerHeight - 56);

                element.style.left = Math.max(CONFIG.SAFE_MARGIN, Math.min(initLeft + dx, maxL)) + 'px';
                element.style.top = Math.max(CONFIG.SAFE_MARGIN, Math.min(initTop + dy, maxT)) + 'px';
            });
        };

        const onPointerUp = () => {
            if (!isPointerPressed) return;
            isPointerPressed = false;

            targetDocument.removeEventListener('mousemove', onPointerMove);
            targetDocument.removeEventListener('touchmove', onPointerMove);
            targetDocument.removeEventListener('mouseup', onPointerUp, true);
            targetDocument.removeEventListener('touchend', onPointerUp, true);
            targetWindow.removeEventListener('mouseup', onPointerUp, true);
            targetWindow.removeEventListener('blur', onPointerUp);
            if (rafId) cancelAnimationFrame(rafId);

            element.classList.remove('dragging');
            if (!isDragging) {
                if (isBall) openPanel();
            } else {
                if (isBall) {
                    currentState = STATES.IDLE;
                    enforceBounds(floatBall, true);
                    saveStorage(false);
                } else {
                    currentState = STATES.PANEL_OPEN;
                    enforceBounds(panel, false);
                }
            }
            isDragging = false;
        };

        handleEl.addEventListener('mousedown', onPointerDown);
        handleEl.addEventListener('touchstart', onPointerDown, { passive: true });
    }

    // 面板尺寸缩放实现（同样严格校验鼠标按住状态）
    function bindResizable() {
        const handles = panel.querySelectorAll('.resize-handle');
        let startX = 0, startY = 0, startW = 0, startH = 0;
        let activeHandle = null;
        let isResizing = false;

        const onDown = (e) => {
            if (e.type === 'mousedown' && e.button !== 0) return;
            const pt = e.touches ? e.touches[0] : e;
            startX = pt.clientX;
            startY = pt.clientY;
            startW = panel.offsetWidth;
            startH = panel.offsetHeight;
            activeHandle = e.currentTarget;
            isResizing = true;
            panel.style.transition = 'none';

            targetDocument.addEventListener('mousemove', onMove, { passive: false });
            targetDocument.addEventListener('touchmove', onMove, { passive: false });
            targetDocument.addEventListener('mouseup', onUp, true);
            targetDocument.addEventListener('touchend', onUp, true);
            targetWindow.addEventListener('mouseup', onUp, true);
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        };

        const onMove = (e) => {
            if (!isResizing || (e.type === 'mousemove' && e.buttons === 0)) {
                onUp();
                return;
            }
            const pt = e.touches ? e.touches[0] : e;
            const dx = pt.clientX - startX;
            const dy = pt.clientY - startY;

            requestAnimationFrame(() => {
                if (!isResizing || !activeHandle) return;
                const curLeft = parseFloat(panel.style.left) || CONFIG.SAFE_MARGIN;
                const curTop = parseFloat(panel.style.top) || CONFIG.SAFE_MARGIN;

                if (activeHandle.classList.contains('r') || activeHandle.classList.contains('br')) {
                    const maxW = targetWindow.innerWidth - curLeft - CONFIG.SAFE_MARGIN;
                    panel.style.width = Math.max(CONFIG.MIN_WIDTH, Math.min(startW + dx, maxW)) + 'px';
                }
                if (activeHandle.classList.contains('b') || activeHandle.classList.contains('br')) {
                    const maxH = targetWindow.innerHeight - curTop - CONFIG.SAFE_MARGIN;
                    panel.style.height = Math.max(CONFIG.MIN_HEIGHT, Math.min(startH + dy, maxH)) + 'px';
                }
            });
        };

        const onUp = () => {
            if (!isResizing) return;
            isResizing = false;
            activeHandle = null;
            targetDocument.removeEventListener('mousemove', onMove);
            targetDocument.removeEventListener('touchmove', onMove);
            targetDocument.removeEventListener('mouseup', onUp, true);
            targetDocument.removeEventListener('touchend', onUp, true);
            targetWindow.removeEventListener('mouseup', onUp, true);
            panel.style.transition = '';
            enforceBounds(panel, false);
        };

        handles.forEach(h => {
            h.addEventListener('mousedown', onDown);
            h.addEventListener('touchstart', onDown, { passive: false });
        });
    }

    bindDraggable(floatBall, floatBall, true);
    bindDraggable(panel, panel.querySelector('#panel-drag-header'), false);
    bindResizable();
    enforceBounds(floatBall, true);

    const onWindowResize = () => {
        if (!isWidgetVisible) return;
        if (currentState === STATES.PANEL_OPEN) enforceBounds(panel, false);
        if (currentState === STATES.IDLE) enforceBounds(floatBall, true);
    };
    targetWindow.addEventListener('resize', onWindowResize);

    // 11. 注册并监听酒馆助手脚本按钮
    if (typeof appendInexistentScriptButtons === 'function') {
        appendInexistentScriptButtons([
            { name: 'Oops面板', visible: true },
            { name: '显隐Oops', visible: true }
        ]);
    }

    if (typeof eventOn === 'function' && typeof getButtonEvent === 'function') {
        eventOn(getButtonEvent('Oops面板'), () => {
            openPanel();
        });
        eventOn(getButtonEvent('Oops'), () => {
            openPanel();
        });

        eventOn(getButtonEvent('显隐Oops'), () => {
            isWidgetVisible = !isWidgetVisible;
            appData.ballConfig.visible = isWidgetVisible;
            saveStorage(false);
            if (isWidgetVisible) {
                floatBall.classList.remove('force-hide');
                panel.classList.remove('force-hide');
                notifyToast('已显示 OopsPalette 悬浮球', 'info');
            } else {
                floatBall.classList.add('force-hide');
                panel.classList.add('force-hide');
                notifyToast('已隐藏 OopsPalette 悬浮球（样式依然生效）', 'info');
            }
            if (currentState === STATES.PANEL_OPEN && activeTab === 'settings') {
                renderCurrentTab();
            }
        });
    }

    // 监听角色卡/聊天切换事件，自动识别角色并运用绑定的专属预设方案
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
        const onChatOrCharSwitched = () => {
            setTimeout(() => {
                const switched = checkAndApplyCharacterBoundPreset(false);
                if (currentState === STATES.PANEL_OPEN && (switched || activeTab === 'presets')) {
                    renderCurrentTab();
                }
            }, 120);
        };
        if (tavern_events.CHAT_CHANGED) eventOn(tavern_events.CHAT_CHANGED, onChatOrCharSwitched);
        if (tavern_events.CHAT_CREATED) eventOn(tavern_events.CHAT_CREATED, onChatOrCharSwitched);
    }

    // 监听酒馆美化主题切换，自动切换对应的变量列表与预设方案
    const stThemeSelectEl = targetDocument.querySelector('#themes');
    const onStThemeChange = () => {
        setTimeout(() => {
            const detected = detectActiveTavernTheme();
            if (detected && detected !== appData.currentThemeId) {
                switchActiveThemeProfile(detected);
                if (currentState === STATES.PANEL_OPEN) renderCurrentTab();
            }
        }, 150);
    };
    if (stThemeSelectEl) {
        stThemeSelectEl.addEventListener('change', onStThemeChange);
    }

    // 12. 脚本关闭或页面卸载时彻底清理宿主节点与事件监听
    $(window).on('pagehide', () => {
        targetWindow.removeEventListener('resize', onWindowResize);
        if (stThemeSelectEl) stThemeSelectEl.removeEventListener('change', onStThemeChange);
        const orphanWidget = targetDocument.getElementById(WIDGET_ID);
        if (orphanWidget) orphanWidget.remove();
        const orphanStyle = targetDocument.getElementById(STYLE_TAG_ID);
        if (orphanStyle) orphanStyle.remove();
        const orphanFontStyle = targetDocument.getElementById(GALLERY_FONT_STYLE_ID);
        if (orphanFontStyle) orphanFontStyle.remove();
    });
})();