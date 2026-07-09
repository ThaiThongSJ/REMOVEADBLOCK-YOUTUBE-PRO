// Sử dụng link raw trực tiếp từ GitHub mới của bạn để cập nhật tức thì
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ThaiThongSJ/REMOVEADBLOCK-YOUTUBE-PRO/refs/heads/main/version.json";
// Cấu hình chống spam request: 6 tiếng mới cho phép fetch 1 lần (6 * 60 * 60 * 1000)
const MIN_CHECK_INTERVAL = 21600000; 

// GỘP CHUNG 1 SỰ KIỆN DUY NHẤT: Bắt sự kiện người dùng vừa cài đặt xong hoặc Reload Extension
chrome.runtime.onInstalled.addListener(async (details) => {
    // QUAN TRỌNG: Ép buộc xóa sạch lịch sử kiểm tra cũ để hệ thống luôn fetch mới khi bạn tải lại để test
    await chrome.storage.local.remove(["lastCheckTime", "updateInfo"]);

    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        // Khởi tạo cấu hình ngôn ngữ mặc định là tiếng Anh nếu chưa tồn tại
        const storage = await chrome.storage.local.get(["appLanguage"]);
        if (!storage.appLanguage) {
            await chrome.storage.local.set({ appLanguage: "en" });
        }

        // Tự động mở tab mới chạy giao diện TT.html
        chrome.tabs.create({
            url: chrome.runtime.getURL("TT.html")
        });
    }

    // Đăng ký lịch chạy ngầm định kỳ 6 tiếng một lần
    chrome.alarms.create("checkUpdateAlarm", { periodInMinutes: 360 });
    
    // Thực hiện kiểm tra bản mới ngay tức khắc
    checkForUpdates();
});

async function checkForUpdates() {
  const now = Date.now();
  const CURRENT_VERSION = chrome.runtime.getManifest().version;

  try {
    const storage = await chrome.storage.local.get(["lastCheckTime"]);
    const lastCheckTime = storage.lastCheckTime || 0;

    // Chỉ chặn giãn cách khi chạy ngầm tự động, không chặn khi vừa reload extension để test
    if (lastCheckTime > 0 && (now - lastCheckTime < MIN_CHECK_INTERVAL)) {
      console.log(`[Update] Đang trong thời gian giãn cách.`);
      return;
    }

    // Gửi request kèm số t ngẫu nhiên phá vỡ cache trình duyệt
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

    // Kiểm tra so sánh phiên bản
    if (data.latest_version && data.latest_version !== CURRENT_VERSION) {
      await chrome.storage.local.set({ updateInfo: data });
      console.log(`%c[Update] ✅ ĐÃ CÓ BẢN MỚI: ${data.latest_version} (Bản hiện tại trong máy: ${CURRENT_VERSION})`, "color:lime;font-weight:bold");
    } else {
      await chrome.storage.local.remove(["updateInfo"]);
      console.log("[Update] Bạn đang sử dụng phiên bản mới nhất.");
    }

  } catch (e) {
    console.error("[Update] Lỗi kết nối máy chủ cập nhật:", e.message || e);
  }
}

// Chạy kiểm tra mỗi lần khởi động lại trình duyệt Chrome
chrome.runtime.onStartup.addListener(checkForUpdates);

// Lắng nghe chu kỳ Alarm để kiểm tra tự động
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkUpdateAlarm") {
    checkForUpdates();
  }
});