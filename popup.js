const i18n = {
    en: {
        status: "Stealth Engine Active",
        resetBtn: "Reset Engine",
        resetLoading: "Restarting core engine...",
        resetSuccess: "System updated successfully!",
        updateAvailable: "🚀 NEW UPDATE AVAILABLE! CLICK TO DOWNLOAD",
        titleFeatures: "CORE FEATURES",
        f1: "Completely blocks pre-roll, mid-roll, banners, and sponsored sidebar ads.",
        f2: "Actively defeats video freezing, background throttling, and 0.1x playback rate sabotages.",
        f3: "Emulates organic biometric mouse movements and intelligent comment viewport scrolling to defeat static bot detection.",
        f4: "Periodically flushes anti-adblock tracking tokens from local storage cache to ensure zero data telemetry leaks.",
        titleAlgo: "MULTI-LAYER ALGORITHM",
        thMechanism: "Mechanism",
        thDesc: "Protection Layer Description",
        t1: "Protects session integrity by masking AudioContext, WebGL, and hardware metadata.",
        t2: "Constantly monitors operational video states to force play and auto-recover from stalls.",
        t3: "Mimics physical cursor vectors and adaptive viewport interaction to blur automated background presence.",
        author: "Author:",
        donate: "Project Maintenance (Vietcombank)"
    },
    vi: {
        status: "Hệ thống tàng hình đang chạy",
        resetBtn: "Cập Nhật Hệ Thống",
        resetLoading: "Đang khởi động lại lõi...",
        resetSuccess: "Hệ thống đã được cập nhật!",
        updateAvailable: "🚀 CÓ BẢN CẬP NHẬT MỚI! BẤM ĐỂ TẢI VỀ",
        titleFeatures: "TÍNH NĂNG CỐT LÕI",
        f1: "Chặn triệt để pre-roll, mid-roll, banner, và quảng cáo tài trợ thanh bên.",
        f2: "Chủ động vô hiệu hóa đóng băng video, bóp băng thông chạy ngầm và hạ tốc độ phát 0.1x.",
        f3: "Giả lập dịch chuyển chuột sinh trắc học và tự động cuộn trang vùng bình luận để bẻ gãy bộ quét bot tĩnh.",
        f4: "Định kỳ dọn sạch mã độc tố theo dõi ẩn trong bộ nhớ LocalStorage giúp tối ưu hóa luồng lưu trữ lâu dài.",
        titleAlgo: "THUẬT TOÁN ĐA TẦNG",
        thMechanism: "Cơ Chế",
        thDesc: "Mô Tả Lớp Bảo Vệ",
        t1: "Bảo vệ tính nhất quán toàn phiên bằng cách ẩn dữ liệu AudioContext, WebGL và phần cứng.",
        t2: "Giám sát liên tục trạng thái video để cưỡng chế phát và tự chữa lành khi bị kẹt luồng tải.",
        t3: "Mô phỏng vectơ con trỏ vật lý và tương tác vùng nhìn thích ứng để làm mờ dấu vết tự động.",
        author: "Tác giả:",
        donate: "Duy trì dự án (Vietcombank)"
    }
};

let currentLang = 'en';
let githubDownloadUrl = "https://github.com/ThaiThongSJ/REMOVEADBLOCK-YOUTUBE-PRO"; 
let hasNewVersion = false;
let latestVersion = ""; // Biến lưu số phiên bản mới phục vụ khóa lặp

function applyLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });
    
    if (hasNewVersion) {
        document.getElementById('resetBtnText').textContent = i18n[lang].updateAvailable;
    } else {
        document.getElementById('resetBtnText').textContent = i18n[lang].resetBtn;
    }

    document.getElementById('langToggleBtn').textContent = lang === 'en' ? 'VN' : 'EN';
}

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['appLanguage', 'updateInfo'], (result) => {
        if (result.updateInfo && result.updateInfo.latest_version) {
            const currentVersion = chrome.runtime.getManifest().version;
            if (result.updateInfo.latest_version !== currentVersion) {
                hasNewVersion = true;
                latestVersion = result.updateInfo.latest_version; // Gán phiên bản đích
                const btn = document.getElementById('resetEngineBtn');
                btn.classList.add('has-update'); 
                
                if (result.updateInfo.download_url) {
                    githubDownloadUrl = result.updateInfo.download_url;
                }
            }
        }

        if (result.appLanguage) applyLanguage(result.appLanguage);
        else applyLanguage('en');
    });
} else {
    applyLanguage('en');
}

document.getElementById('langToggleBtn').addEventListener('click', () => {
    const nextLang = currentLang === 'en' ? 'vi' : 'en';
    applyLanguage(nextLang);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ appLanguage: nextLang });
    }
});

document.getElementById('resetEngineBtn').addEventListener('click', function() {
    const btn = this;
    const textSpan = document.getElementById('resetBtnText');

    if (hasNewVersion) {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: githubDownloadUrl });
        } else {
            window.open(githubDownloadUrl, '_blank');
        }

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "clearUpdateBadge", version: latestVersion }, (response) => {
                hasNewVersion = false;
                btn.classList.remove('has-update');
                textSpan.textContent = i18n[currentLang].resetBtn; 
                btn.style.background = ""; 
                btn.style.boxShadow = "";
            });
        }
    } else {
        btn.classList.add('loading');
        textSpan.textContent = i18n[currentLang].resetLoading;
        
        setTimeout(() => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
                chrome.runtime.reload();
            } else {
                textSpan.textContent = i18n[currentLang].resetSuccess;
                btn.style.background = "#10b981";
                btn.classList.remove('loading');
            }
        }, 600);
    }
});