// ==UserScript==
// @name         Jungle Diamond 14.9.16 - Adaptive Stealth Architecture Ultra
// @namespace    https://github.com/
// @version      14.9.17
// @description  Hệ thống cải tiến tối hậu: Giữ nguyên 100% cấu trúc gốc 14.9.5 mượt mà, đắp thêm lớp khiên chống bóp băng thông 2026 và đồng bộ hóa phiên.
// @author       Thai Thong + VN + Gemini
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
const LANG_MAP = {
    'vi': "Hệ thống đang tăng tốc bỏ qua quảng cáo...",
    'en': "System accelerating, skipping ads...",
    'de': "System beschleunigt, überspringe Werbung...",
    'fr': "Système en accélération, passage des publicités...",
    'es': "Sistema acelerando, saltando anuncios...",
    'zh': "系统正在加速，跳过广告...",
    'bo': "འཕྲུལ་འཁོར་མགྱོགས་སུ་གཏོང་བཞིན་པ། བརྡ་ខྱབ་བརྒལ་བཞིན་པ།",
    'th': "ระบบกำลังเร่งความเร็ว ข้ามโฆษณา...",
    'ms': "Sistem memecut, melangkau iklan...",
    'id': "Sistem mempercepat, melewati iklan...",
    'lo': "ລະບົບກຳລັງເລັ່ງ, ข้ามโຄສະນາ...",
    'km': "ប្រព័ន្ធកំពុងបង្កើនល្បឿន ដោយរំលងការផ្សាយពាណិជ្ជកម្ម...",
    'hi': "सिस्टम तेज हो रहा है, विज्ञापन छोड़े जा रहे हैं...",
    'no': "Systemet akselererer, hopper over annonser...",
    'da': "Systemet accelererer, springer reklamer over...",
    'ja': "システムを加速中、広告をスキップしています...",
    'ko': "시스템 가속 중, 광고 건ner뛰기...",
    'it': "Sistema in accelerazione, salto pubblicità..."
};

// Khởi tạo và lưu trữ ngôn ngữ ngay lập tức (Chạy duy nhất 1 lần khi load trang)
const USER_LOCALE_TEXT = (() => {
    try {
        const lang = navigator.language || navigator.userLanguage || 'en';
        const shortLang = lang.split('-')[0].toLowerCase(); // Thêm toLowerCase phòng hờ trình duyệt trả về VI/EN viết hoa
        return LANG_MAP[shortLang] || LANG_MAP['en'];
    } catch (e) {
        return LANG_MAP['en']; // Dự phòng tuyệt đối nếu có lỗi lạ xảy ra
    }
})();

(function() {
    'use strict';

    // ==================== KHỞI TẠO BIẾN TOÀN CỤC & SEED PHIÊN NHẤT QUÁN ====================
    if (!sessionStorage.getItem('JD_SESSION_SEED')) {
        sessionStorage.setItem('JD_SESSION_SEED', Math.random().toString());
    }
    const SESSION_SEED = parseFloat(sessionStorage.getItem('JD_SESSION_SEED'));
    
    const GPU_POOL = [
        { renderer: "ANGLE (Apple, Apple M1, OpenGL 4.1)", vendor: "Apple Inc." },
        { renderer: "ANGLE (Apple, Apple M2, OpenGL 4.1)", vendor: "Apple Inc." },
        { renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, OpenGL 4.1)", vendor: "Intel Inc." },
        { renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060/PCIe/SSE2, OpenGL 4.5)", vendor: "NVIDIA Corporation" }
    ];
    const SELECTED_GPU = GPU_POOL[Math.floor(SESSION_SEED * GPU_POOL.length)];
    const PERSISTENT_CPU_OFFSET = SESSION_SEED > 0.66 ? 2 : (SESSION_SEED > 0.33 ? -2 : 0);
    const PERSISTENT_RAM_SPOOF = SESSION_SEED > 0.5 ? 8 : 16;

    let isUserReadingComments = false;
    let lastStallCheckTime = Date.now();
    let lastVideoPosition = 0;
    let currentCommentObserver = null;
	// ==================== BIẾN MÀN CHE LOGO CSS THÔNG MINH ====================
    let logoShieldDiv = null;
    let shieldResizeObserver = null;

    // ==================== CÁC BIẾN KHỞI TẠO GỐC (GIỮ NGUYÊN BẢO TOÀN) ====================
    let lastPhysicalInteraction = 0;
    let isUserIntentionallyPaused = false;
    const INTERACTION_WINDOW = 2000;

    // Biến kiểm soát chu kỳ dọn dẹp tài nguyên thông minh
    let lastStorageCleanTime = 0;
    let lastBiometricTime = 0;

    // ==================== ANTI-BANNER & ENFORCEMENT CSS ====================
    const injectCSS = () => {
      const css = `
            square-image-layout-view-model, ad-image-view-model,
            feed-ad-metadata-view-model, ad-button-view-model,
            ytd-ad-slot-renderer, ytm-promoted-sparkles-web-renderer,
            .ytwSquareImageLayoutViewModelHost, .ytp-ad-module, .ytp-ad-overlay-container,
            #player-ads, ytd-enforcement-message-view-model,
            tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
            .yt-playability-error-supported-renderers,
            ytd-engagement-panel-title-header-renderer > #banner,
            #ads-info-button.style-scope.ytd-engagement-panel-title-header-renderer,
            ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
            ytd-engagement-panel-section-list-renderer:has(panel-ad-header-image-lockup-view-model),
            panel-ad-header-image-lockup-view-model,
            ad-avatar-lockup-view-model,
            ad-image-view-model.ytwAdImageViewModelHostIsClickableAdComponent {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                pointer-events: none !important;
            }
        `;
      const style = document.createElement('style');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    };

    injectCSS();
    window.addEventListener('load', injectCSS, {
      once: true
    });

    // ==================== GIÁM SÁT THAO TÁC PHẦN CỨNG BẢO VỆ STREAM ====================
    const registerHardwareTracker = () => {
      window.addEventListener('click', (e) => {
        if (e.isTrusted) {
          lastPhysicalInteraction = Date.now();
          const path = e.composedPath();
          const isPlayerAction = path.some(el => {
            if (!el || !el.classList) return false;
            return el.id === 'movie_player' || el.id === 'video-id' ||
              (typeof el.className === 'string' && (
                el.className.includes('ytp-play-button') || el.className.includes('html5-video-container')
              ));
          });
          if (isPlayerAction) {
            const video = document.querySelector('.html5-main-video');
            if (video) isUserIntentionallyPaused = !video.paused;
          }
        }
      }, true);

      window.addEventListener('keydown', (e) => {
        if (e.isTrusted && (e.keyCode === 32 || e.key === ' ' || e.key === 'k' || e.key === 'K')) {
          lastPhysicalInteraction = Date.now();
          const video = document.querySelector('.html5-main-video');
          if (video) isUserIntentionallyPaused = !video.paused;
        }
      }, true);
    };
    registerHardwareTracker();

    // ==================== FINGERPRINT SHIELD NHẤT QUÁN THEO PHIÊN ====================
    const advancedShieldFingerprinting = () => {
        try {
            const originalHardwareConcurrency = navigator.hardwareConcurrency;
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => originalHardwareConcurrency > 2 ? originalHardwareConcurrency + PERSISTENT_CPU_OFFSET : originalHardwareConcurrency
            });
            if (navigator.deviceMemory) {
                Object.defineProperty(navigator, 'deviceMemory', { get: () => PERSISTENT_RAM_SPOOF });
            }
            const nativeGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function() {
                const buffer = nativeGetChannelData.apply(this, arguments);
                if (buffer && buffer.length > 0) {
                    buffer[0] += (SESSION_SEED - 0.5) * 1e-7;
                }
                return buffer;
            };
            const maskWebGL = (ctx) => {
                if (!ctx) return;
                const nativeGetParameter = ctx.prototype.getParameter;
                ctx.prototype.getParameter = function(p) {
                    if (p === 35660) return SELECTED_GPU.renderer;
                    if (p === 35661) return SELECTED_GPU.vendor;
                    return nativeGetParameter.apply(this, arguments);
                };
            };
            if (window.WebGLRenderingContext) maskWebGL(WebGLRenderingContext);
            if (window.WebGL2RenderingContext) maskWebGL(WebGL2RenderingContext);

            const nativeGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function() {
                const res = nativeGetImageData.apply(this, arguments);
                if (res && res.data && res.data.length > 0) {
                    res.data[0] = res.data[0] ^ (SESSION_SEED > 0.5 ? 1 : 0);
                }
                return res;
            };

            const defineIfConfigurable = (obj, prop, descriptor) => {
                const desc = Object.getOwnPropertyDescriptor(obj, prop);
                if (!desc || desc.configurable) {
                    Object.defineProperty(obj, prop, descriptor);
                }
            };

            defineIfConfigurable(navigator, 'webdriver', { get: () => false, configurable: true });
            defineIfConfigurable(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
            defineIfConfigurable(navigator, 'plugins', {
                get: () => [{ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }],
                configurable: true
            });
            defineIfConfigurable(navigator, 'mimeTypes', {
                get: () => [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }],
                configurable: true
            });

            if (navigator.permissions && navigator.permissions.query) {
                const nativePermissionsQuery = navigator.permissions.query.bind(navigator.permissions);
                navigator.permissions.query = (parameters) => {
                    if (parameters && parameters.name === 'notifications') {
                        return Promise.resolve({ state: Notification.permission });
                    }
                    return nativePermissionsQuery(parameters);
                };
            }
        } catch (e) {}
    };
    advancedShieldFingerprinting();

    // ==================== THAO TÚNG DỮ LIỆU BÓC LỘT SÂU TÀNG HÌNH ====================
    const manipulatePlayerResponse = (obj) => {
      if (!obj) return;

      if (obj.playabilityStatus) {
        if (obj.playabilityStatus.status === "UNPLAYABLE" || obj.playabilityStatus.errorScreen || obj.playabilityStatus.status === "LOGIN_REQUIRED" || obj.playabilityStatus.messages) {
          obj.playabilityStatus.status = "OK";
          delete obj.playabilityStatus.errorScreen;
          delete obj.playabilityStatus.messages;

          if (!obj.playabilityStatus.playableInEmbed) {
            obj.playabilityStatus.playableInEmbed = true;
          }
          console.log("[Jungle Proxy] Ép trạng thái luồng gốc & Bỏ lỗi màn hình đen thành công!");
        }
      }

      if (obj.adPlacements) obj.adPlacements = [];
      if (obj.playerAds) delete obj.playerAds;
      if (obj.playerConfig) delete obj.playerConfig;

      if (obj.streamingData && obj.streamingData.adaptiveFormats) {
        obj.streamingData.adaptiveFormats = obj.streamingData.adaptiveFormats.filter(fmt => !fmt.signatureCipher);
      }

      if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers && obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel) {
        delete obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel;
        console.log("[Jungle Proxy] Đã triệt tiêu tận gốc auxiliary Enforcement JSON!");
      }

      if (obj.adBreakServiceConfig) delete obj.adBreakServiceConfig;

      if (obj.playerResponse) manipulatePlayerResponse(obj.playerResponse);
    };

    try {
      const nativeParse = JSON.parse;
      JSON.parse = function() {
        const res = nativeParse.apply(this, arguments);
        if (res && typeof res === 'object') manipulatePlayerResponse(res);
        return res;
      };
    } catch (e) {}

    // ==================== PROXY YTPLAYER GLOBAL CONFIG ====================
    const proxyPlayerConfig = () => {
      if (window.ytplayer && window.ytplayer.config) {
        let currentConfig = window.ytplayer.config;
        window.ytplayer.config = new Proxy(currentConfig, {
          set: function(target, prop, value) {
            if (prop === 'args' || prop === 'playerResponse') {
              if (value && typeof value === 'object') {
                manipulatePlayerResponse(value);
              } else if (value && typeof value === 'string') {
                try {
                  let parsed = JSON.parse(value);
                  manipulatePlayerResponse(parsed);
                  value = JSON.stringify(parsed);
                } catch (e) {}
              }
            }
            target[prop] = value;
            return true;
          }
        });
        if (window.ytplayer.config.args) manipulatePlayerResponse(window.ytplayer.config.args);
        if (window.ytplayer.config.playerResponse) manipulatePlayerResponse(window.ytplayer.config.playerResponse);
      }
    };
    const configInterval = setInterval(() => {
      if (window.ytplayer) {
        proxyPlayerConfig();
        clearInterval(configInterval);
      }
    }, 10);
    setTimeout(() => clearInterval(configInterval), 5000);

    // ==================== ĐÁNH CHẶN YTCFG CHỐNG HONEY BADGER QUÉT NGẦM ====================
    const interceptYtcfg = () => {
        const sanitizeConfig = (obj) => {
            if (obj && typeof obj === 'object') {
                if (obj.EXPERIMENTS_FOR_HONEY_BADGER) obj.EXPERIMENTS_FOR_HONEY_BADGER = [];
                if (obj.FeaturesUnderDeploy && obj.FeaturesUnderDeploy.control_flow_enforcement) obj.FeaturesUnderDeploy.control_flow_enforcement = false;
                if (obj.wv_control_flow_enforcement_enabled) obj.wv_control_flow_enforcement_enabled = false;
                if (obj.disable_adblock_detection === false) obj.disable_adblock_detection = true;
            }
        };
        if (window.ytcfg && window.ytcfg.set && !window.ytcfg.set.isProxied) {
            const nativeSet = window.ytcfg.set;
            window.ytcfg.set = function(first) {
                if (first && typeof first === 'object') sanitizeConfig(first);
                return nativeSet.apply(this, arguments);
            };
            window.ytcfg.set.isProxied = true;
            if (window.ytcfg.data_) sanitizeConfig(window.ytcfg.data_);
        }
    };
    interceptYtcfg();

    // ==================== STEALTH REPORTING INTERCEPTOR ====================
	const TRACKING_KEYWORDS = /ptracking|ad_status|conversion|bat\.bing|pagead|activeview|stats\/ads|doubleclick|pagead2|googlesyndication|google-analytics|analytics|player_204|ad_impression|log_event|youtubei\/v1\/ad|ad_break|report_ad|partnerwide|innertube|playback|attestation|signal|ytcfg|enforcement|adblock/;    
    const shouldBlockTrackingRequest = (url) => {
      return TRACKING_KEYWORDS.test((url || '').toString().toLowerCase());
    };

    const nativeSendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
    if (nativeSendBeacon) {
      navigator.sendBeacon = function(url, data) {
        if (shouldBlockTrackingRequest(url)) return true;
        return nativeSendBeacon(url, data);
      };
    }

    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__jd_url = url;
      if (shouldBlockTrackingRequest(url)) {
        if (navigator.sendBeacon) navigator.sendBeacon(url);
        Object.defineProperties(this, {
          status: { value: 200 },
          statusText: { value: 'OK' },
          readyState: { value: 4 },
          responseText: { value: '{}' }
        });
        this.send = function() {
          setTimeout(() => {
            if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
            if (typeof this.onload === 'function') this.onload();
          }, 1);
        };
        return;
      }
      return nativeOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      if (shouldBlockTrackingRequest(this.__jd_url)) {
        if (navigator.sendBeacon) navigator.sendBeacon(this.__jd_url, body);
        if (typeof this.onreadystatechange === 'function') setTimeout(this.onreadystatechange, 1);
        if (typeof this.onload === 'function') setTimeout(this.onload, 1);
        return;
      }
      return nativeSend.apply(this, arguments);
    };

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
      } else if (input && input.url) {
        url = input.url;
      }

      if (shouldBlockTrackingRequest(url)) {
        if (navigator.sendBeacon) navigator.sendBeacon(url);
        return new Response('{}', {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return nativeFetch(input, init);
    };
        // ==================== HỆ THỐNG MÀN CHE LOGO THÔNG MINH (ADAPTIVE CSS LOGO SHIELD) ====================
    const createLogoShield = (parent) => {
        if (logoShieldDiv && logoShieldDiv.parentNode === parent) return logoShieldDiv;
        if (logoShieldDiv && logoShieldDiv.parentNode !== parent) {
            logoShieldDiv.remove();
            if (shieldResizeObserver) {
                shieldResizeObserver.disconnect();
                shieldResizeObserver = null;
            }
        }

        logoShieldDiv = document.createElement('div');
        logoShieldDiv.id = "jungle-logo-shield";
        logoShieldDiv.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(180deg, #121212 0%, #070707 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease-in-out, visibility 0.25s;
            visibility: hidden;
            font-family: "Roboto", "YouTube Sans", Arial, sans-serif;
            user-select: none;
            box-sizing: border-box;
            padding: 20px;
        `;

        const centerContainer = document.createElement('div');
        centerContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transform: scale(min(1, var(--shield-scale, 1)));
            transition: transform 0.2s ease-out;
        `;

        const playButton = document.createElement('div');
        playButton.style.cssText = `
            width: clamp(70px, 10vw, 100px);
            height: clamp(70px, 10vw, 100px);
            background: rgba(244, 67, 54, 0.08);
            border: 2px solid #ff1744;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 30px rgba(255, 23, 68, 0.35);
            animation: pulse-glow-red 2s infinite ease-in-out;
            position: relative;
        `;

        const playTriangle = document.createElement('div');
        playTriangle.style.cssText = `
            width: 0; height: 0;
            border-top: clamp(14px, 2vw, 20px) solid transparent;
            border-bottom: clamp(14px, 2vw, 20px) solid transparent;
            border-left: clamp(24px, 3.5vw, 32px) solid #ff1744;
            margin-left: clamp(5px, 0.8vw, 8px);
        `;
        playButton.appendChild(playTriangle);

        const titleText = document.createElement('div');
        titleText.textContent = "YT PREMIUM ULTRA";
        titleText.style.cssText = `
            color: #ffffff;
            font-size: clamp(16px, 2.5vw, 24px);
            font-weight: 900;
            letter-spacing: 4px;
            margin-top: 24px;
            text-align: center;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        `;

        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = `margin-top: 16px; display: flex; align-items: center; gap: 8px;`;

        const pulseDot = document.createElement('div');
        pulseDot.style.cssText = `
            width: 8px; height: 8px; background-color: #00e676; border-radius: 50%;
            box-shadow: 0 0 8px #00e676; animation: pulse-green 1.5s infinite;
        `;

        const statusText = document.createElement('div');
       statusText.textContent = USER_LOCALE_TEXT; // Lấy trực tiếp hằng số đã lưu, tốc độ bàn thờ
       statusText.style.cssText = `
       color: rgba(255, 255, 255, 0.6);
       font-size: clamp(11px, 1.5vw, 13px);
       font-weight: 500;
       `;

        statusContainer.appendChild(pulseDot);
        statusContainer.appendChild(statusText);

        centerContainer.appendChild(playButton);
        centerContainer.appendChild(titleText);
        centerContainer.appendChild(statusContainer);

        const footerText = document.createElement('div');
        footerText.textContent = "Developer: ThaiThongSj@gmail.com";
        footerText.style.cssText = `
            position: absolute; bottom: clamp(15px, 4vw, 30px);
            color: rgba(255, 255, 255, 0.3); font-size: clamp(9px, 1.2vw, 11px);
        `;

        if (!document.getElementById("jungle-shield-styles")) {
            const styleSheet = document.createElement("style");
            styleSheet.id = "jungle-shield-styles";
            styleSheet.textContent = `
                @keyframes pulse-glow-red { 0% { transform: scale(1); box-shadow: 0 0 30px rgba(255,23,68,0.35); } 50% { transform: scale(1.05); box-shadow: 0 0 45px rgba(255,23,68,0.6); } 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255,23,68,0.35); } }
                @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,230,118,0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(0,230,118,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,230,118,0); } }
            `;
            document.head.appendChild(styleSheet);
        }

        logoShieldDiv.appendChild(centerContainer);
        logoShieldDiv.appendChild(footerText);
        parent.appendChild(logoShieldDiv);

        shieldResizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                const scale = width < 400 ? 0.75 : (width < 600 ? 0.85 : 1);
                logoShieldDiv.style.setProperty('--shield-scale', scale);
            }
        });
        shieldResizeObserver.observe(parent);

        return logoShieldDiv;
    };

    const toggleLogoShield = (show) => {
        const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (!moviePlayer) return;
        const shield = createLogoShield(moviePlayer);
        if (show) {
            shield.style.visibility = "visible";
            shield.style.opacity = "1";
            shield.style.pointerEvents = "auto";
        } else {
            shield.style.opacity = "0";
            shield.style.pointerEvents = "none";
            setTimeout(() => {
                if (shield.style.opacity === "0") shield.style.visibility = "hidden";
            }, 250);
        }
    };
        // ==================== TUA GIA TỐC NGẦM ĐỘT PHÁ + HIỂN THỊ LOGO SHIELD ====================
    const executeVirtualAcceleration = (video) => {
      if (!video) return;
      const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
     
      if (!isAdShowing) {
        toggleLogoShield(false);
        return;
      }
      // Kích hoạt màn che logo
      toggleLogoShield(true);

      if (!video.muted) video.muted = true;
      video.volume = 0;
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      } else {
        video.playbackRate = 16;
      }
      document.querySelectorAll('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, button[aria-label*="Skip"], button[aria-label*="Bỏ qua"]').forEach(btn => {
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    };

    // CLEANER STORAGE (ĐIỀU TỐC THÔNG MINH - THỜI GIAN THROTTLE NỚI RỘNG LÊN 25 GIÂY)
    const cleanEnforcementStorage = () => {
      const now = Date.now();
      // ĐIỂM 3: Tăng chu kỳ dọn dẹp bộ nhớ lên 25 giây để giảm tải hoàn toàn nghẽn I/O main-thread
      if (now - lastStorageCleanTime < 25000) return;
      lastStorageCleanTime = now;

      try {
        const len = localStorage.length;
        for (let i = len - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('yt-player-enforcement') || key.includes('adblock') || key.includes('yt-ad'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {}
    };

    const cleanEnforcementDOM = () => {
      const selectors = [
        'ytd-ad-slot-renderer',
        'ytd-promoted-video-renderer',
        '.ytp-ad-module',
        '.video-ads',
        '#player-ads',
        '.ytp-ad-overlay-container',
        'tp-yt-iron-overlay-backdrop',
        'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
        'ytd-enforcement-message-view-model',
        '.ytp-ad-text-overlay',
        '.ytp-ad-preview-container'
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
    };

    // ==================== CƠ CHẾ DỰ PHÒNG: TỰ KHÔI PHỤC KHI BỊ CHẶN CỨNG ====================
    const forceEmergencyRecovery = (video) => {
      console.log("[Jungle Diamond Fallback] Kích hoạt cơ chế hồi sinh stream khẩn cấp!");
      lastStorageCleanTime = 0;
      cleanEnforcementStorage();

      const player = document.getElementById('movie_player');
      if (player && typeof player.loadVideoById === 'function') {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');
        if (videoId) {
          let currentTime = video.currentTime || 0;
          player.loadVideoById(videoId, currentTime);
        }
      }
    };

    // ==================== ĐỘNG CƠ TỰ CHỮA LÀNH LUỒNG TẢI TRÁNH BỊ BÓP BĂNG THÔNG ====================
    const runSelfHealingCore = (video) => {
        if (!video || isUserIntentionallyPaused || document.querySelector('.ad-showing, .ad-interrupting')) return;
        const now = Date.now();
        if (video.playbackRate > 0 && video.playbackRate < 1) {
            video.playbackRate = 1;
        }
        if (!video.paused) {
            if (video.currentTime === lastVideoPosition) {
                if (now - lastStallCheckTime > 2500) { 
                    lastStorageCleanTime = 0; 
                    cleanEnforcementStorage();
                    video.currentTime += 0.1; 
                    video.play().catch(() => {});
                    lastStallCheckTime = now;
                }
            } else {
                lastVideoPosition = video.currentTime;
                lastStallCheckTime = now;
            }
        }
    };

    // ==================== BIOMETRIC ENTROPY (ĐIỂM 1: CHUYỂN SANG REQUESTIDLECALLBACK TRÁNH MICRO-STUTTERING) ====================
    const runBiometricEntropy = (video) => {
        if (document.hidden || (Date.now() - lastPhysicalInteraction < 5000)) return;
        
        const player = document.getElementById('movie_player');
        if (player && video && !video.paused && !document.querySelector('.ad-showing, .ad-interrupting')) {
            if (isUserReadingComments) {
                window.scrollBy({ top: SESSION_SEED > 0.5 ? 1 : -1, behavior: 'smooth' });
            }
            const rect = player.getBoundingClientRect();
            player.dispatchEvent(new MouseEvent('mousemove', {
                clientX: rect.left + (rect.width * (0.25 + SESSION_SEED * 0.5)),
                clientY: rect.top + (rect.height * (0.25 + SESSION_SEED * 0.5)),
                bubbles: true
            }));
        }
    };

    // ==================== ENGINE 3: NONSTOP ĐỒNG BỘ - ĐIỀU PHỐI THÔNG MINH ====================
    let isHandlingNonstop = false;
    let lastExecutionTime = 0;

    window.nonstopHandler = function() {
      const now = Date.now();
      if (isHandlingNonstop || (now - lastExecutionTime < 100)) return;
      isHandlingNonstop = true;
      lastExecutionTime = now;

      try {
        const video = document.querySelector('.html5-main-video');
        if (!video) return;

        if (isUserIntentionallyPaused || (Date.now() - lastPhysicalInteraction < INTERACTION_WINDOW)) {
          return;
        }

        let needForcePlay = false;

        const dialogs = document.querySelectorAll('yt-confirm-dialog-renderer, tp-yt-paper-dialog, ytd-enforcement-message-view-model, .yt-playability-error-supported-renderers');
        dialogs.forEach(dialog => {
          if (dialog.style.display === 'none') return;
          const text = (dialog.textContent || '').toLowerCase();
          if (/video paused|continue watching|tạm dừng|tiếp tục|still watching|ad block|quảng cáo|vi phạm/.test(text)) {

            dialog.remove();
            needForcePlay = true;

            if (text.includes('ad block') || text.includes('quảng cáo') || text.includes('vi phạm')) {
              forceEmergencyRecovery(video);
            }
          }
        });

        const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
        if (backdrops.length > 0) {
          backdrops.forEach(el => el.remove());
          needForcePlay = true;
        }

        if (video.paused && (needForcePlay || !isUserIntentionallyPaused)) {
          const player = document.getElementById('movie_player');
          if (player && typeof player.playVideo === 'function') {
            player.playVideo();
          }

          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              const playBtn = document.querySelector('.ytp-play-button');
              if (playBtn) playBtn.click();
            });
          }
        }
      } catch (e) {
        console.log('[Jungle Diamond Nonstop Error]: ', e);
      } finally {
        isHandlingNonstop = false;
      }
    };

    // ==================== ĐIỂM 2: VÒNG LẶP CORE LOOP ĐIỀU PHỐI TRUNG TÂM BIẾN THIÊN THÔNG MINH ====================
    // Triệt tiêu toàn bộ các setInterval độc lập chạy 1s để giảm "CPU Wake-ups", ngăn biến video bị stale
    const startCentralCoreLoop = () => {
        const now = Date.now();
        const freshVideo = document.querySelector('.html5-main-video');

        if (freshVideo) {
            // Cảnh báo bổ sung: Luôn kiểm tra gia tốc ảo bên trong lõi điều phối để không lọt trạng thái quảng cáo
            executeVirtualAcceleration(freshVideo);

            // Kiểm tra bóp tiến trình ngầm định kỳ độc lập
            runSelfHealingCore(freshVideo);

            // Xử lý chống tạm dừng tự động
            const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting');
            if (freshVideo.paused && !isAdShowing && !isUserIntentionallyPaused && (now - lastPhysicalInteraction > INTERACTION_WINDOW)) {
                window.nonstopHandler();
            }
        }

        // Tích hợp dọn dẹp đĩa cứng tập trung (Throttled 25 giây)
        cleanEnforcementStorage();

        // Tích hợp giả lập sinh trắc học thông minh sử dụng requestIdleCallback để chạy khi CPU rảnh rỗi
        if (now - lastBiometricTime >= (4000 + (SESSION_SEED * 3000))) {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(() => {
                    runBiometricEntropy(freshVideo);
                });
            } else {
                runBiometricEntropy(freshVideo);
            }
            lastBiometricTime = now;
        }

        cleanEnforcementDOM();

        // Tối ưu hóa chu kỳ đánh thức biến thiên: Nếu video đang bị treo nạp ngầm, đẩy nhanh tần suất kiểm tra (250ms), 
        // ngược lại nếu luồng phát mượt mà, giãn chu kỳ ra 1000ms để CPU nghỉ ngơi tuyệt đối.
        let dynamicInterval = 1000;
        if (freshVideo && !freshVideo.paused && freshVideo.currentTime === lastVideoPosition) {
            dynamicInterval = 250; 
        }

        setTimeout(startCentralCoreLoop, dynamicInterval);
    };

    // ==================== KHỞI CHẠY HỆ THỐNG GIÁM SÁT REAL-TIME ====================
    const initObserver = () => {
      const player = document.getElementById('movie_player');
      const video = document.querySelector('.html5-main-video');

      if (!player || !video) {
        setTimeout(initObserver, 150);
        return;
      }

      // Kích hoạt Vòng Lặp Lõi Điều Phối Biến Thiên Trung Tâm
      startCentralCoreLoop();

      // Giám sát MutationObserver thuộc tính khung Player
      new MutationObserver(() => {
        const freshVideo = document.querySelector('.html5-main-video');
        if (freshVideo) executeVirtualAcceleration(freshVideo);
      }).observe(player, {
        attributes: true,
        attributeFilter: ['class']
      });

      // Lắng nghe sự kiện luồng video chính thống tránh lỗi stale tham chiếu cũ
      ['play', 'ratechange', 'playing'].forEach(evt => {
        video.addEventListener(evt, () => {
            const freshVideo = document.querySelector('.html5-main-video');
            if (freshVideo) {
                executeVirtualAcceleration(freshVideo);
                runSelfHealingCore(freshVideo);
            }
        });
      });

      video.addEventListener('pause', () => {
        const timeSinceLastInteraction = Date.now() - lastPhysicalInteraction;
        if (timeSinceLastInteraction > INTERACTION_WINDOW) {
          isUserIntentionallyPaused = false;
          setTimeout(window.nonstopHandler, 150);
        }
      });

      // Chống spam log rác và giảm tải CPU bằng Debounce độc lập (50ms)
      let debounceTimer = null;
      const dialogObserver = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          window.nonstopHandler();
        }, 50);
      });

      const popupContainer = document.querySelector('ytd-popup-container') || document.getElementById('content');
      if (popupContainer) {
        dialogObserver.observe(popupContainer, {
          childList: true,
          subtree: false
        });
      }

      // Quét vùng comment bằng IntersectionObserver theo chu trình SPA 
      const setupCommentObserver = () => {
          if (currentCommentObserver) currentCommentObserver.disconnect();
          const commentsSection = document.getElementById('comments');
          if (commentsSection) {
              currentCommentObserver = new IntersectionObserver((entries) => {
                  isUserReadingComments = entries.some(entry => entry.isIntersecting);
              }, { threshold: 0.01 });
              currentCommentObserver.observe(commentsSection);
          }
      };
      setupCommentObserver();
      window.addEventListener('yt-navigate-finish', () => {
          setupCommentObserver();
          // Chuyển video mới -> ép dọn dẹp bộ nhớ khẩn cấp ngay để làm sạch tài nguyên tab mới
          lastStorageCleanTime = 0;
          cleanEnforcementStorage();
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initObserver);
    } else {
      initObserver();
    }
})();