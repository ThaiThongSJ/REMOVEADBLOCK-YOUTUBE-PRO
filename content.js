// ==UserScript==
// @name         Jungle Diamond 14.9.5 - Adaptive Stealth Architecture
// @namespace    https://github.com/
// @version      14.9.6
// @description  Hệ thống Proxy tàng hình, gia tăng cơ chế dự phòng tự phục hồi stream khi dính Flag.
// @author       Thai Thong + VN
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let lastPhysicalInteraction = 0;
    let isUserIntentionallyPaused = false;
    const INTERACTION_WINDOW = 2000;

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
    window.addEventListener('load', injectCSS, { once: true });

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

    // ==================== NÂNG CẤP A: THAO TÚNG DỮ LIỆU BÓC LỘT SÂU TÀNG HÌNH ====================
    const manipulatePlayerResponse = (obj) => {
        if (!obj) return;
        
        // 1. Phá vỡ cấu trúc Enforcement và lấp đầy khoảng trống dữ liệu để tránh treo stream
        if (obj.playabilityStatus) {
            if (obj.playabilityStatus.status === "UNPLAYABLE" || obj.playabilityStatus.errorScreen || obj.playabilityStatus.status === "LOGIN_REQUIRED" || obj.playabilityStatus.messages) {
                obj.playabilityStatus.status = "OK";
                delete obj.playabilityStatus.errorScreen;
                delete obj.playabilityStatus.messages;
                
                // Đảm bảo trình phát không đứng im bằng cách mở khóa chế độ nhúng luồng ngầm
                if (!obj.playabilityStatus.playableInEmbed) {
                    obj.playabilityStatus.playableInEmbed = true;
                }
                console.log("[Jungle Proxy] Ép trạng thái luồng gốc & Bỏ lỗi màn hình đen thành công!");
            }
        }
        
        // 2. Triệt tiêu mọi ngóc ngách quảng cáo trong gói dữ liệu JSON
        if (obj.adPlacements) obj.adPlacements = [];
        if (obj.playerAds) delete obj.playerAds;
        if (obj.playerConfig) delete obj.playerConfig;
        
        // Loại bỏ phân đoạn luồng chứa mã mồi điều hướng quảng cáo ngầm ẩn để chống khựng video
        if (obj.streamingData && obj.streamingData.adaptiveFormats) {
            obj.streamingData.adaptiveFormats = obj.streamingData.adaptiveFormats.filter(fmt => !fmt.signatureCipher);
        }
        
        // Xóa bảng chặn nằm sâu trong cấu trúc UI phụ trợ
        if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers && obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel) {
            delete obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel;
            console.log("[Jungle Proxy] Đã triệt tiêu tận gốc auxiliary Enforcement JSON!");
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
        if (window.ytplayer) { proxyPlayerConfig(); clearInterval(configInterval); }
    }, 10);
    setTimeout(() => clearInterval(configInterval), 5000);

    // ==================== STEALTH REPORTING INTERCEPTOR ====================
    const TRACKING_KEYWORDS = /ptracking|ad_status|conversion|bat\.bing|pagead|activeview|stats\/ads/;
    const nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        const u = (url || '').toLowerCase();
        if (TRACKING_KEYWORDS.test(u)) {
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

    const nativeFetch = window.fetch;
    window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';
        if (TRACKING_KEYWORDS.test(url.toLowerCase())) {
            if (navigator.sendBeacon) navigator.sendBeacon(url);
            return new Response('{}', { status: 200, statusText: 'OK' });
        }
        return nativeFetch.apply(this, arguments);
    };

    // ==================== TUA GIA TỐC NGẦM ĐỘT PHÁ ====================
    const executeVirtualAcceleration = (video) => {
        if (!video) return;
        const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
        if (!isAdShowing) return;

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

    // CLEANER STORAGE
    const cleanEnforcementStorage = () => {
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

    // ==================== CƠ CHẾ DỰ PHÒNG: TỰ KHÔI PHỤC KHI BỊ CHẶN CỨNG ====================
    const forceEmergencyRecovery = (video) => {
        console.log("[Jungle Diamond Fallback] Kích hoạt cơ chế hồi sinh stream khẩn cấp!");
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
            if (backdrops.length > 0) { backdrops.forEach(el => el.remove()); needForcePlay = true; }

            // NÂNG CẤP C: Tàng hình hành vi kích hoạt phát video không để lại dấu vết ảo
            if (video.paused && (needForcePlay || !isUserIntentionallyPaused)) {
                const player = document.getElementById('movie_player');
                if (player && typeof player.playVideo === 'function') { player.playVideo(); }
                
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Nếu trình duyệt chặn auto-play lập tức bấm nút UI gốc thay vì gửi phím ảo
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

    // ==================== KHỞI CHẠY HỆ THỐNG GIÁM SÁT REAL-TIME ====================
    const initObserver = () => {
        const player = document.getElementById('movie_player');
        const video = document.querySelector('.html5-main-video');

        if (!player || !video) { setTimeout(initObserver, 150); return; }

        new MutationObserver(() => { executeVirtualAcceleration(video); }).observe(player, {
            attributes: true, attributeFilter: ['class']
        });

        ['play', 'ratechange', 'playing'].forEach(evt => {
            video.addEventListener(evt, () => executeVirtualAcceleration(video));
        });

        video.addEventListener('pause', () => {
            const timeSinceLastInteraction = Date.now() - lastPhysicalInteraction;
            if (timeSinceLastInteraction > INTERACTION_WINDOW) {
                isUserIntentionallyPaused = false;
                setTimeout(window.nonstopHandler, 150);
            }
        });

        setInterval(() => {
            const isAdShowing = document.querySelector('.ad-showing, .ad-interrupting');
            if (video.paused && !isAdShowing && !isUserIntentionallyPaused && (Date.now() - lastPhysicalInteraction > INTERACTION_WINDOW)) {
                window.nonstopHandler();
            }
            cleanEnforcementStorage();
        }, 1000);

        // NÂNG CẤP B: Chống spam log rác và giảm tải CPU bằng Debounce độc lập (50ms)
        let debounceTimer = null;
        const dialogObserver = new MutationObserver(() => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                window.nonstopHandler();
            }, 50);
        });

        const popupContainer = document.querySelector('ytd-popup-container') || document.getElementById('content');
        if (popupContainer) {
            dialogObserver.observe(popupContainer, { childList: true, subtree: false });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initObserver);
    } else {
        initObserver();
    }
})();
