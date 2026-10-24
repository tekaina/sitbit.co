// Public Firebase client configuration. Never add Admin or Gemini credentials.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

export const prodFirebaseConfig = Object.freeze({
  projectId: "fitdesk-prod-2026",
  appId: "1:1092151559298:web:e872d768dece11f64d609b",
  storageBucket: "fitdesk-prod-2026.firebasestorage.app",
  apiKey: "AIzaSyDlNCLG4UPBuBfOEPwOtAwYvMpsJD9sap0",
  authDomain: "fitdesk-prod-2026.firebaseapp.com",
  messagingSenderId: "1092151559298"
});

export const demoFirebaseConfig = Object.freeze({
  projectId: "demo-sitbit",
  appId: "1:demo:web:sitbit-play",
  apiKey: "demo-api-key",
  authDomain: "localhost",
  storageBucket: "demo-sitbit.appspot.com",
  messagingSenderId: "1234567890"
});

export function resolveEnvironment(location) {
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(location.hostname);
  const requested = new URLSearchParams(location.search).get("emulator") === "true";
  if (loopback) {
    if (!requested) throw new Error("Local development requires ?emulator=true; production access is blocked on loopback hosts.");
    return "emulator";
  }
  if (location.protocol !== "https:" || !["sitbit.co", "www.sitbit.co"].includes(location.hostname)) {
    throw new Error("Unrecognized deployment origin. Configure and review this origin before enabling Firebase access.");
  }
  // Query parameters on public hosts never select emulators or test privileges.
  return "production";
}

const environment = resolveEnvironment(window.location);
export const isEmulatorMode = () => environment === "emulator";
export const app = initializeApp(isEmulatorMode() ? demoFirebaseConfig : prodFirebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (isEmulatorMode()) {
  // Do not swallow connector failures and continue with a partially bound SDK.
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  console.info("[SitBit] Emulator bindings configured for demo-sitbit; service availability is not implied.");
}
