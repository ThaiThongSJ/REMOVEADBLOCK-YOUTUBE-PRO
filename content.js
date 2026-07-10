// ==UserScript==
// @name         Jungle Diamond 14.9.12 - Anti-Throttle Self-Healing & Biometric Entropy
// @namespace    https://github.com/
// @version      14.9.12
// @description  Hợp nhất cơ chế tự chữa lành chống bóp băng thông (Anti-Throttle), giả lập cung phản xạ người (Biometric Jitter) và tối ưu hóa dọn dẹp RAM tuyệt đối.
// @author       Thai Thong + VN + Gemini
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==================== PERSISTENT SESSION SEED & GPU POOL ====================
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

    // ==================== CENTRAL LIFECYCLE & MEMORY REGISTRY ====================
    const CoreRegistry = {
        observers: new Set(),
        intervals: new Set(),
        timeouts: new Set(),
        abortController: new AbortController(),

        registerObserver(observer) { this.observers.add(observer); return observer; },
        registerInterval(id) { this.intervals.add(id); return id; },
        registerTimeout(id) { this.timeouts.add(id); return id; },
        
        clearTimeout(id) { globalThis.clearTimeout(id); this.timeouts.delete(id); },

        nukeLifecycle() {
            this.observers.forEach(obs => obs.disconnect());
            this.observers.clear();
            this.intervals.forEach(id => clearInterval(id));
            this.intervals.clear();
            this.timeouts.forEach(id => globalThis.clearTimeout(id));
            this.timeouts.clear();
            this.abortController.abort();
            this.abortController = new AbortController();
        }
    };

    let lastPhysicalInteraction = Date.now();
    let isUserIntentionallyPaused = false;
    let isUserReadingComments = false;
    let accelerationTimeout = null;
    let lastStallCheckTime = Date.now();
    let lastVideoPosition = 0;
    const INTERACTION_WINDOW = 2000;

    // ==================== ANTI-BANNER & ENFORCEMENT AGGRESSIVE CSS ====================
    const injectCSS = () => {
        const css = `
            square-image-layout-view-model, ad-image-view-model,
            feed-ad-metadata-view-model, ad-button-view-model,
            ytd-ad-slot-renderer, ytm-promoted-sparkles-web-renderer,
            ytd-rich-grid-ad-slot-renderer, ytd-statement-banner-renderer,
            .ytwSquareImageLayoutViewModelHost, .ytp-ad-module, .ytp-ad-overlay-container,
            #player-ads, ytd-enforcement-message-view-model,
            tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
            .yt-playability-error-supported-renderers,
            ytd-engagement-panel-title-header-renderer > #banner,
            #ads-info-button.style-scope.ytd-engagement-panel-title-header-renderer,
            ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
            ytd-engagement-panel-section-list-renderer:has(panel-ad-header-image-lockup-view-model),
            panel-ad-header-image-lockup-view-model, ad-avatar-lockup-view-model,
            ad-image-view-model.ytwAdImageViewModelHostIsClickableAdComponent {
                display: none !important; visibility: hidden !important; opacity: 0 !important;
                height: 0 !important; width: 0 !important; margin: 0 !important; padding: 0 !important;
                pointer-events: none !important;
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    };
    injectCSS();

    // ==================== ADVANCED PERSISTENT FINGERPRINT SHIELD ====================
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
        } catch (e) {}
    };
    advancedShieldFingerprinting();

    // ==================== BIOMETRIC & KEYBOARD ENTROPY ENGINE ====================
    const initBehavioralEntropy = () => {
        const loopId = setInterval(() => {
            if (document.hidden) return; // Đóng băng tiết kiệm CPU khi tab chạy nền

            const now = Date.now();
            if (now - lastPhysicalInteraction > 5000) {
                const video = document.querySelector('.html5-main-video');
                const player = document.getElementById('movie_player');
                
                if (video && !video.paused && !document.querySelector('.ad-showing, .ad-interrupting')) {
                    // 1. Tạo Entropy Cuộn trang mượt
                    if (isUserReadingComments) {
                        window.scrollBy({ top: SESSION_SEED > 0.5 ? 1 : -1, behavior: 'smooth' });
                    }
                    
                    if (player) {
                        const rect = player.getBoundingClientRect();
                        
                        // 2. Tạo Entropy Di chuyển Chuột sinh học
                        player.dispatchEvent(new MouseEvent('mousemove', {
                            clientX: rect.left + (rect.width * (0.25 + SESSION_SEED * 0.5)),
                            clientY: rect.top + (rect.height * (0.25 + SESSION_SEED * 0.5)),
                            bubbles: true
                        }));

                        // 3. Giả lập Tương tác Bàn phím ẩn danh (Gửi tín hiệu Shift vô hại nhằm qua mặt bot tracker)
                        player.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Shift', code: 'ShiftLeft', keyCode: 16, bubbles: true
                        }));
                    }
                }
            }
        }, 4000 + (SESSION_SEED * 3000));
        CoreRegistry.registerInterval(loopId);
    };

    // ==================== INTERCEPTORS & DATA CORRECTION ====================
    const manipulatePlayerResponse = (obj) => {
        if (!obj) return;
        if (obj.playabilityStatus) {
            if (["UNPLAYABLE", "LOGIN_REQUIRED"].includes(obj.playabilityStatus.status) || obj.playabilityStatus.errorScreen || obj.playabilityStatus.messages) {
                obj.playabilityStatus.status = "OK";
                delete obj.playabilityStatus.errorScreen;
                delete obj.playabilityStatus.messages;
                obj.playabilityStatus.playableInEmbed = true;
            }
        }
        if (obj.adPlacements) obj.adPlacements = [];
        if (obj.playerAds) delete obj.playerAds;
        if (obj.playerConfig) delete obj.playerConfig;
        if (obj.adBreakServiceConfig) delete obj.adBreakServiceConfig;
        if (obj.streamingData && obj.streamingData.adaptiveFormats) {
            obj.streamingData.adaptiveFormats = obj.streamingData.adaptiveFormats.filter(fmt => !fmt.signatureCipher);
        }
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

    // ==================== ULTRA FLASH SKIP (BIOMETRIC JITTER) ====================
    const executeVirtualAcceleration = (video) => {
        if (!video) return;
        const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
        if (!isAdShowing) {
            if (accelerationTimeout) { CoreRegistry.clearTimeout(accelerationTimeout); accelerationTimeout = null; }
            return;
        }

        // Tắt tiếng Ad tức thời 0ms
        if (!video.muted) video.muted = true;
        video.volume = 0;

        // Bỏ qua thời gian chờ của quảng cáo
        if (isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration) {
            video.currentTime = video.duration;
        } else {
            video.playbackRate = 16;
        }

        if (accelerationTimeout) return;

        // GIẢ LẬP CUNG PHẢN XẠ NGƯỜI (Phản ứng võng mạc sinh học 250ms - 450ms)
        const humanReflexDelay = 260 + (SESSION_SEED * 180);
        const tid = setTimeout(() => {
            if (!document.querySelector('.ad-showing, .ad-interrupting')) { accelerationTimeout = null; return; }
            document.querySelectorAll('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, button[aria-label*="Skip"], button[aria-label*="Bỏ qua"]').forEach(btn => {
                btn.click();
                btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            });
            accelerationTimeout = null;
        }, humanReflexDelay);
        accelerationTimeout = CoreRegistry.registerTimeout(tid);
    };

    // ==================== SELF-HEALING & ANTI-THROTTLE MONITOR ====================
    const runSelfHealingCore = (video) => {
        if (!video || isUserIntentionallyPaused || document.querySelector('.ad-showing')) return;

        const now = Date.now();
        // 1. Chống bóp tốc độ phát ngầm (YT Throttle hạ playbackRate xuống 0.1x)
        if (video.playbackRate > 0 && video.playbackRate < 1) {
            console.log("[Jungle Diamond] Phát hiện phá hoại PlaybackRate ngầm. Thực hiện Self-Healing!");
            video.playbackRate = 1;
        }

        // 2. Chống Đóng băng Luồng Video (Stall Detection)
        if (!video.paused) {
            if (video.currentTime === lastVideoPosition) {
                if (now - lastStallCheckTime > 2500) { // Nếu kẹt quá 2.5 giây dù đang ở trạng thái Play
                    console.log("[Jungle Diamond] Phát hiện luồng video bị đóng băng (Stall). Kích hoạt phục hồi!");
                    video.currentTime += 0.1; // Nhích nhẹ timeline phá băng
                    video.play().catch(() => {});
                    lastStallCheckTime = now;
                }
            } else {
                lastVideoPosition = video.currentTime;
                lastStallCheckTime = now;
            }
        }
    };

    // ==================== NONSTOP ENGINE COORDINATOR ====================
    window.nonstopHandler = function() {
        try {
            const video = document.querySelector('.html5-main-video');
            if (!video || isUserIntentionallyPaused || (Date.now() - lastPhysicalInteraction < INTERACTION_WINDOW)) return;

            let needForcePlay = false;
            const dialogs = document.querySelectorAll('yt-confirm-dialog-renderer, tp-yt-paper-dialog, ytd-enforcement-message-view-model, .yt-playability-error-supported-renderers');
            
            dialogs.forEach(dialog => {
                if (dialog.style.display === 'none') return;
                const text = (dialog.textContent || '').toLowerCase();
                if (/video paused|continue watching|tạm dừng|tiếp tục|ad block|quảng cáo|vi phạm/.test(text)) {
                    dialog.remove();
                    needForcePlay = true;
                }
            });

            if (video.paused && needForcePlay) {
                video.play().catch(() => {
                    const playBtn = document.querySelector('.ytp-play-button');
                    if (playBtn) playBtn.click();
                });
            }
        } catch (e) {}
    };

    // ==================== SAFE OBSERVER REGISTRATION ====================
    const setupCommentObserver = () => {
        const commentTarget = document.querySelector('#comments, ytd-comments');
        if (commentTarget && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => { isUserReadingComments = entry.isIntersecting; });
            }, { threshold: 0.01 });
            observer.observe(commentTarget);
            CoreRegistry.registerObserver(observer);
        }
    };

    // ==================== RE-INIT LIFECYCLE ENGINE & HARDWARE LISTENERS ====================
    const registerHardwareTrackerAndLoops = () => {
        const signal = CoreRegistry.abortController.signal;

        const updateInteraction = (e) => {
            if (e.isTrusted) {
                lastPhysicalInteraction = Date.now();
                if (['click', 'keydown'].includes(e.type)) {
                    const tid = setTimeout(() => {
                        const video = document.querySelector('.html5-main-video');
                        if (video) isUserIntentionallyPaused = video.paused;
                    }, 45);
                    CoreRegistry.registerTimeout(tid);
                }
            }
        };

        window.addEventListener('click', updateInteraction, { signal, capture: true });
        window.addEventListener('keydown', updateInteraction, { signal, capture: true });
        window.addEventListener('scroll', () => { lastPhysicalInteraction = Date.now(); }, { signal, passive: true });
        window.addEventListener('mousemove', () => { lastPhysicalInteraction = Date.now(); }, { signal, passive: true });

        initBehavioralEntropy();

        const loopInterval = document.hidden ? 3000 : 1000; // Tăng tần suất kiểm tra lên 1s để Self-Healing phản ứng nhanh hơn
        const mainLoopId = setInterval(() => {
            interceptYtcfg();
            const video = document.querySelector('.html5-main-video');
            if (video) {
                runSelfHealingCore(video);
                if (video.paused && !document.querySelector('.ad-showing') && !isUserIntentionallyPaused) {
                    window.nonstopHandler();
                }
            }
            
            // Giám sát rò rỉ RAM định kỳ
            if (globalThis.performance && globalThis.performance.memory) {
                if (performance.memory.usedJSHeapSize > 350 * 1024 * 1024) { 
                    reinitSystemLifecycle();
                }
            }
        }, loopInterval);
        CoreRegistry.registerInterval(mainLoopId);
    };

    const reinitSystemLifecycle = () => {
        CoreRegistry.nukeLifecycle();
        
        const player = document.getElementById('movie_player');
        const video = document.querySelector('.html5-main-video');
        if (!player || !video) return;

        const observer = new MutationObserver(() => { executeVirtualAcceleration(video); });
        observer.observe(player, { attributes: true, attributeFilter: ['class'] });
        CoreRegistry.registerObserver(observer);

        registerHardwareTrackerAndLoops();
        setupCommentObserver();
    };

    // ==================== ENGINE OPERATIONAL RUNNER ====================
    const initEngine = () => {
        const player = document.getElementById('movie_player');
        const video = document.querySelector('.html5-main-video');

        if (!player || !video) { setTimeout(initEngine, 150); return; }

        const observer = new MutationObserver(() => { executeVirtualAcceleration(video); });
        observer.observe(player, { attributes: true, attributeFilter: ['class'] });
        CoreRegistry.registerObserver(observer);

        ['play', 'ratechange', 'playing'].forEach(evt => {
            video.addEventListener(evt, () => executeVirtualAcceleration(video));
        });

        registerHardwareTrackerAndLoops();
        setupCommentObserver();

        window.addEventListener('yt-navigate-finish', () => {
            isUserReadingComments = false;
            reinitSystemLifecycle();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEngine);
    } else {
        initEngine();
    }
})();