const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ThaiThongSJ/REMOVEADBLOCK-YOUTUBE-PRO/refs/heads/main/version.json";
const MIN_CHECK_INTERVAL = 21600000; 

// Hàm so sánh phiên bản thông minh (Semantic Version Comparison)
// Trả về true nếu phiên bản latest thực sự LỚN HƠN phiên bản current
function isNewerVersion(currentStr, latestStr) {
    if (!currentStr || !latestStr) return false;
    
    const currentParts = currentStr.split('.').map(Number);
    const latestParts = latestStr.split('.').map(Number);
    const maxLength = Math.max(currentParts.length, latestParts.length);
    
    for (let i = 0; i < maxLength; i++) {
        const currentNum = currentParts[i] || 0;
        const latestNum = latestParts[i] || 0;
        
        if (latestNum > currentNum) return true;  // Bản server lớn hơn -> Cần cập nhật
        if (latestNum < currentNum) return false; // Bản hiện tại lớn hơn (bản dev) -> Không cần
    }
    return false; // Hai phiên bản bằng nhau
}

chrome.runtime.onInstalled.addListener(async (details) => {
    // Sửa lỗi chính tả từ API gốc: Kiểm tra nếu cài mới hoàn toàn
    if (details.reason === "install") {
        await chrome.storage.local.remove(["lastCheckTime", "updateInfo", "isSkippedUpdate"]);
        
        const storage = await chrome.storage.local.get(["appLanguage"]);
        if (!storage.appLanguage) {
            await chrome.storage.local.set({ appLanguage: "en" });
        }

        chrome.tabs.create({
            url: chrome.runtime.getURL("TT.html")
        });
    } else {
        // Nếu chỉ là reload/update thông thường, reset bộ đếm thời gian để ép quét lại ngay
        await chrome.storage.local.remove(["lastCheckTime"]);
    }

    chrome.alarms.create("checkUpdateAlarm", { periodInMinutes: 360 });
    checkForUpdates();
});

async function checkForUpdates() {
    const now = Date.now();
    const CURRENT_VERSION = chrome.runtime.getManifest().version;

    try {
        const storage = await chrome.storage.local.get(["lastCheckTime", "isSkippedUpdate"]);
        const lastCheckTime = storage.lastCheckTime || 0;
        const isSkippedUpdate = storage.isSkippedUpdate || "";

        if (lastCheckTime > 0 && (now - lastCheckTime < MIN_CHECK_INTERVAL)) {
            return;
        }

        const response = await fetch(VERSION_CHECK_URL + "?t=" + now, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        await chrome.storage.local.set({ lastCheckTime: now });

        // NÂNG CẤP THÔNG MINH: Chỉ xử lý nếu có biến latest_version và nó thực sự LỚN HƠN bản hiện tại
        if (data.latest_version && isNewerVersion(CURRENT_VERSION, data.latest_version)) {
            
            // Nếu phiên bản mới này trùng với phiên bản người dùng đã bấm bỏ qua/tải trước đó -> Ẩn nút
            if (data.latest_version === isSkippedUpdate) {
                console.log("[Update] Bản mới trùng với bản đã bấm tải/bỏ qua trước đó. Ẩn nhảy nút.");
                await chrome.storage.local.remove(["updateInfo"]);
                return;
            }

            await chrome.storage.local.set({ updateInfo: data });
            console.log(`%c[Update] ✅ ĐÃ CÓ BẢN MỚI HƠN: ${data.latest_version} (Hiện tại: ${CURRENT_VERSION})`, "color:lime;font-weight:bold");
        } else {
            // Nếu phiên bản bằng nhau hoặc bản máy cục bộ cao hơn bản server (bản bạn đang code dở)
            await chrome.storage.local.remove(["updateInfo", "isSkippedUpdate"]);
            console.log(`[Update] Bạn đang dùng bản bằng hoặc cao hơn server (Cục bộ: ${CURRENT_VERSION} >= Server: ${data.latest_version || 'N/A'}).`);
        }

    } catch (e) {
        console.error("[Update] Lỗi kết nối máy chủ:", e);
    }
}

chrome.runtime.onStartup.addListener(checkForUpdates);
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkUpdateAlarm") checkForUpdates();
});

// LẮNG NGHE LỆNH TỪ POPUP
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "clearUpdateBadge") {
        // Đánh dấu phiên bản này đã nhấn tải để không quét nhảy lại nữa
        chrome.storage.local.set({ isSkippedUpdate: message.version }, () => {
            chrome.storage.local.remove(["updateInfo"], () => {
                console.log("[Update] Đã ghi nhận tải bản phát hành. Tắt trạng thái nhảy.");
                sendResponse({ status: "success" });
            });
        });
        return true;
    }
});