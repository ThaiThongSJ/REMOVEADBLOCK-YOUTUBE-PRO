// ==UserScript==
// @name         Jungle Diamond 14.9.16 - Adaptive Stealth Architecture Ultra
// @namespace    https://github.com/
// @version      14.9.16
// @description  Hệ thống cải tiến tối hậu: Giữ nguyên 100% cấu trúc gốc 14.9.5 mượt mà, đắp thêm lớp khiên chống bóp băng thông 2026 và đồng bộ hóa phiên.
// @author       Thai Thong + VN + Gemini
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==================== [BỔ SUNG 2026] KHỞI TẠO BIẾN TOÀN CỤC & SEED PHIÊN NHẤT QUÁN ====================
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

    // ==================== CÁC BIẾN KHỞI TẠO GỐC (GIỮ NGUYÊN 100%) ====================
    let lastPhysicalInteraction = 0;
    let isUserIntentionallyPaused = false;
    const INTERACTION_WINDOW = 2000;

    // [TỐI ƯU SIÊU NHẸ] Biến kiểm soát chu kỳ dọn dẹp bộ cứng tránh nghẽn CPU
    let lastStorageCleanTime = 0;

    // ==================== ANTI-BANNER & ENFORCEMENT CSS (GIỮ NGUYÊN 100%) ====================
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

    // ==================== GIÁM SÁT THAO TÁC PHẦN CỨNG BẢO VỆ STREAM (GIỮ NGUYÊN 100%) ====================
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

    // ==================== [BỔ SUNG 2026] FINGERPRINT SHIELD NHẤT QUÁN THEO PHIÊN ĐỘC LẬP ====================
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

    // ==================== NÂNG CẤP A: THAO TÚNG DỮ LIỆU BÓC LỘT SÂU TÀNG HÌNH (GIỮ NGUYÊN 100%) ====================
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

      // [BỔ SUNG 2026 KHÔNG XUNG ĐỘT]: Xóa bỏ cụm adBreak độc lập mới của YT
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

    // ==================== PROXY YTPLAYER GLOBAL CONFIG (GIỮ NGUYÊN 100%) ====================
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

    // ==================== [BỔ SUNG 2026] ĐÁNH CHẶN YTCFG CHỐNG HONEY BADGER QUÉT NGẦM ====================
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

    // ==================== STEALTH REPORTING INTERCEPTOR (GIỮ NGUYÊN 100%) ====================
    const TRACKING_KEYWORDS = /ptracking|ad_status|conversion|bat\.bing|pagead|activeview|stats\/ads/;
    const nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      const u = (url || '').toLowerCase();
      if (TRACKING_KEYWORDS.test(u)) {
        if (navigator.sendBeacon) navigator.sendBeacon(url);
        Object.defineProperties(this, {
          status: {
            value: 200
          },
          statusText: {
            value: 'OK'
          },
          readyState: {
            value: 4
          },
          responseText: {
            value: '{}'
          }
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
        return new Response('{}', {
          status: 200,
          statusText: 'OK'
        });
      }
      return nativeFetch.apply(this, arguments);
    };

    // ==================== TUA GIA TỐC NGẦM ĐỘT PHÁ (GIỮ NGUYÊN 100%) ====================
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
        btn.dispatchEvent(new MouseEvent('click', {
          bubbles: true
        }));
      });
    };

    // CLEANER STORAGE (TỐI ƯU THUẬT TOÁN ĐIỀU TỐC THÔNG MINH - NHẸ MÁY 1500%)
    const cleanEnforcementStorage = () => {
      const now = Date.now();
      // Thuật toán giới hạn chu kỳ: Chỉ thực sự can thiệp đĩa cứng sau mỗi 15 giây thay vì ép CPU cày ải mỗi giây.
      if (now - lastStorageCleanTime < 15000) return;
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

    // ==================== CƠ CHẾ DỰ PHÒNG: TỰ KHÔI PHỤC KHI BỊ CHẶN CỨNG (GIỮ NGUYÊN 100%) ====================
    const forceEmergencyRecovery = (video) => {
      console.log("[Jungle Diamond Fallback] Kích hoạt cơ chế hồi sinh stream khẩn cấp!");
      // Buộc dọn bộ nhớ ngay lập tức mà không cần đợi bộ đếm thời gian
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

    // ==================== [BỔ SUNG 2026] ĐỘNG CƠ TỰ CHỮA LÀNH LUỒNG TẢI TRÁNH BỊ BÓP BĂNG THÔNG ====================
    const runSelfHealingCore = (video) => {
        if (!video || isUserIntentionallyPaused || document.querySelector('.ad-showing, .ad-interrupting')) return;
        const now = Date.now();
        if (video.playbackRate > 0 && video.playbackRate < 1) {
            video.playbackRate = 1;
        }
        if (!video.paused) {
            if (video.currentTime === lastVideoPosition) {
                if (now - lastStallCheckTime > 2500) { 
                    lastStorageCleanTime = 0; // Kích hoạt dọn dẹp khẩn cấp khi đứng hình nạp
                    cleanEnforcementStorage();
                    video.currentTime += 0.1; // Nhích nhẹ giải tỏa trạng thái treo nạp ngầm
                    video.play().catch(() => {});
                    lastStallCheckTime = now;
                }
            } else {
                lastVideoPosition = video.currentTime;
                lastStallCheckTime = now;
            }
        }
    };

    // ==================== ENGINE 3: NONSTOP ĐỒNG BỘ - ĐIỀU PHỐI THÔNG MINH (GIỮ NGUYÊN 100%) ====================
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

        // NÂNG CẤP C: Tàng hình hành vi kích hoạt phát video không để lại dấu vết ảo
        if (video.paused && (needForcePlay || !isUserIntentionallyPaused)) {
          const player = document.getElementById('movie_player');
          if (player && typeof player.playVideo === 'function') {
            player.playVideo();
          }

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
      } finally { // <--- ĐÃ SỬA LỖI TẠI ĐÂY
        isHandlingNonstop = false;
      }
    };

    // ==================== KHỞI CHẠY HỆ THỐNG GIÁM SÁT REAL-TIME (GIỮ NGUYÊN TOÀN BỘ CẤU TRÚC GỐC) ====================
    const initObserver = () => {
      const player = document.getElementById('movie_player');
      const video = document.querySelector('.html5-main-video');

          if (!player || !video) {
            setTimeout(initObserver, 150);
            return;
          }

      // [BỔ SUNG 2026 KHÔNG CAN THIỆP SÂU]: Tạo sinh trắc học hành vi ảo tránh quét Bot tĩnh
      const runBiometricEntropy = () => {
          if (document.hidden || (Date.now() - lastPhysicalInteraction < 5000)) return;
          if (video && !video.paused && !document.querySelector('.ad-showing, .ad-interrupting')) {
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
      setInterval(runBiometricEntropy, 4000 + (SESSION_SEED * 3000));

      new MutationObserver(() => {
        executeVirtualAcceleration(video);
      }).observe(player, {
        attributes: true,
        attributeFilter: ['class']
      });

      ['play', 'ratechange', 'playing'].forEach(evt => {
        video.addEventListener(evt, () => {
            executeVirtualAcceleration(video);
            runSelfHealingCore(video); // Gọi thêm cơ chế vá luồng phụ trợ
        });
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
        runSelfHealingCore(video); // Kiểm tra bóp tiến trình ngầm định kỳ độc lập
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
        dialogObserver.observe(popupContainer, {
          childList: true,
          subtree: false
        });
      }

      // [BỔ SUNG 2026 KHÔNG CAN THIỆP SÂU]: Quét vùng comment bằng IntersectionObserver theo chu trình SPA 
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
          // Chuyển video mới -> kích hoạt dọn dẹp bộ nhớ ngay lập tức để làm sạch tài nguyên tab mới
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