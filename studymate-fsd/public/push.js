function decodeVapidKey(key) {
  const padding = "=".repeat((4 - key.length % 4) % 4);
  const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function enablePush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Please allow notifications in Chrome settings.");
      return;
    }

    const registration = await navigator.serviceWorker.register(
      "/service-worker.js"
    );

    const response = await fetch("/api/push/public-key");
    const { publicKey } = await response.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(publicKey)
    });

    const saved = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription)
    });

    const result = await saved.json();

    if (!saved.ok) throw new Error(result.error || "Could not save subscription.");

    alert("Desktop reminders enabled successfully!");
  } catch (error) {
    console.error(error);
    alert("Setup failed: " + error.message);
  }
}

async function sendTestPush() {
  try {
    const response = await fetch("/api/push/test", { method: "POST" });
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Test failed.");

    alert(result.message);
  } catch (error) {
    alert("Test failed: " + error.message);
  }
}