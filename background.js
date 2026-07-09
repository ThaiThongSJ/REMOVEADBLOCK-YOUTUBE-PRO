const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ThaiThongSJ/REMOVEADBLOCK-YOUTUBE-PRO/refs/heads/main/version.json";
const MIN_CHECK_INTERVAL = 21600000; 

chrome.runtime.onInstalled.addListener(async (details) => {
    // Khi người dùng cài bản cài mới cứng hoàn toàn, xóa bỏ vết skip cũ
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        await chrome.storage.local.remove(["lastCheckTime", "updateInfo", "isSkippedUpdate"]);
        
        const storage = await chrome.storage.local.get(["appLanguage"]);
        if (!storage.appLanguage) {
            await chrome.storage.local.set({ appLanguage: "en" });
        }

        chrome.tabs.create({
            url: chrome.runtime.getURL("TT.html")
        });
    } else {
        // Nếu chỉ là reload/update thông thường, giữ lịch sử để tránh nhảy lại nút ảo
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

    if (data.latest_version && data.latest_version !== CURRENT_VERSION) {
      // NÂNG CẤP: Nếu phiên bản này trùng với phiên bản người dùng đã bấm tải trước đó -> Bỏ qua không nhảy nút nữa
      if (data.latest_version === isSkippedUpdate) {
          console.log("[Update] Phiên bản này đã được bấm tải về trước đó. Ẩn nhảy nút.");
          await chrome.storage.local.remove(["updateInfo"]);
          return;
      }

      await chrome.storage.local.set({ updateInfo: data });
      console.log(`%c[Update] ✅ ĐÃ CÓ BẢN MỚI: ${data.latest_version}`, "color:lime;font-weight:bold");
    } else {
      await chrome.storage.local.remove(["updateInfo", "isSkippedUpdate"]);
      console.log("[Update] Bạn đang sử dụng phiên bản mới nhất.");
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