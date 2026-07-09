const i18n = {
    en: {
        status: "Stealth Engine Active",
        resetBtn: "Reset Engine",
        resetLoading: "Restarting core engine...",
        resetSuccess: "System updated successfully!",
        updateAvailable: "🚀 NEW UPDATE AVAILABLE! CLICK TO DOWNLOAD",
        titleFeatures: "CORE FEATURES",
        f1: "Completely blocks pre-roll, mid-roll, banners, and sponsored sidebar ads.",
        f2: "Eliminates 'Continue watching' dialogs and adblock detection warnings.",
        f3: "Auto-forwards and safely skips ads instantly in milliseconds.",
        f4: "Filters physical interactions (Click, Space, K) to prevent emulation scanning.",
        titleAlgo: "MULTI-LAYER ALGORITHM",
        thMechanism: "Mechanism",
        thDesc: "Protection Layer Description",
        t1: "Injects core logic directly into the website context.",
        t2: "Manipulates real-time playerResponse data structures.",
        t3: "Bypasses the latest adblock scanning firewalls.",
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
        f1: "Chặn triệt để pre-roll, mid-roll, banner, quảng cáo tài trợ thanh bên.",
        f2: "Xóa sổ hộp thoại 'Continue watching' và cảnh báo phát hiện chặn quảng cáo.",
        f3: "Tự động tua nhanh, bỏ qua quảng cáo an toàn trong tích tắc.",
        f4: "Lọc hành vi tương tác vật lý (Click, Space, K) tránh quét giả lập.",
        titleAlgo: "THUẬT TOÁN ĐA TẦNG",
        thMechanism: "Cơ Chế",
        thDesc: "Mô Tả Lớp Bảo Vệ",
        t1: "Nhúng trực tiếp lõi xử lý sâu vào ngữ cảnh trang web.",
        t2: "Thao túng cấu trúc dữ liệu playerResponse thời gian thực.",
        t3: "Vượt qua tường lửa quét adblock cập nhật mới nhất.",
        author: "Tác giả:",
        donate: "Duy trì dự án (Vietcombank)"
    }
};

let currentLang = 'en';
let githubDownloadUrl = "https://github.com/ThaiThongSJ/Pitch-Shifter-Daimon"; 
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

        // NÂNG CẤP: Truyền kèm thông tin số phiên bản để khóa không cho nhảy lại bản này
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