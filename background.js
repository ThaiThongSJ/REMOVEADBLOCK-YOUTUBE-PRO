// Bắt sự kiện người dùng vừa cài đặt xong Extension thành công
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        // Khởi tạo cấu hình ngôn ngữ mặc định là tiếng Anh vào bộ nhớ nếu chưa tồn tại
        const storage = await chrome.storage.local.get(["appLanguage"]);
        if (!storage.appLanguage) {
            await chrome.storage.local.set({ appLanguage: "en" });
        }

        // Tự động mở tab mới chạy giao diện TT.html của tác giả Thái Thông
        chrome.tabs.create({
            url: chrome.runtime.getURL("TT.html")
        });
    }
});

// Sử dụng link CDN mạng lưới jsDelivr nhằm tối ưu tốc độ và giảm tải trực tiếp cho GitHub
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ThaiThongSJ/REMOVEADBLOCK-YOUTUBE-PRO/refs/heads/main/version.json";
const CURRENT_VERSION = chrome.runtime.getManifest().version;

// Cấu hình chống spam request: 6 tiếng mới cho phép fetch 1 lần (6 * 60 * 60 * 1000)
const MIN_CHECK_INTERVAL = 21600000; 

async function checkForUpdates() {
  const now = Date.now();
  const CURRENT_VERSION = chrome.runtime.getManifest().version;

  try {
    const storage = await chrome.storage.local.get(["lastCheckTime"]);
    const lastCheckTime = storage.lastCheckTime || 0;

    if (lastCheckTime > 0 && (now - lastCheckTime < MIN_CHECK_INTERVAL)) {
      console.log(`[Update] Đang trong thời gian giãn cách.`);
      return;
    }

    // BỎ hoàn toàn đối tượng `headers` để tránh kích hoạt CORS Preflight (OPTIONS) của GitHub
    const response = await fetch(VERSION_CHECK_URL + "?t=" + now, {
      cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("⚠️ Hệ thống phản hồi 429 - Tự động hoãn kiểm tra thêm 1 tiếng.");
        await chrome.storage.local.set({ lastCheckTime: now - MIN_CHECK_INTERVAL + 3600000 });
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    await chrome.storage.local.set({ lastCheckTime: now });
    console.log("[Update] Dữ liệu từ máy chủ GitHub mới:", data); 

    if (data.latest_version && data.latest_version !== CURRENT_VERSION) {
      await chrome.storage.local.set({ updateInfo: data });
      console.log(`%c[Update] ✅ ĐÃ CÓ BẢN MỚI: ${data.latest_version}`, "color:lime;font-weight:bold");
    } else {
      await chrome.storage.local.remove(["updateInfo"]);
      console.log("[Update] Bạn đang sử dụng phiên bản mới nhất.");
    }

  } catch (e) {
    console.error("[Update] Lỗi kết nối máy chủ cập nhật:", e.message || e);
  }
}

// =========================================================================
// ĐIỀU PHỐI VÀ KHỞI ĐỘNG (ĐÚNG CHUẨN ĐỒNG BỘ MANIFEST V3)
// =========================================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("checkUpdateAlarm", { periodInMinutes: 360 });
  checkForUpdates();
});

chrome.runtime.onStartup.addListener(checkForUpdates);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkUpdateAlarm") {
    checkForUpdates();
  }
});