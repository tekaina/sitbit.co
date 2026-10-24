// SitBit Firebase Client Configuration & Emulator Switching
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Production Configuration
export const prodFirebaseConfig = {
  projectId: "fitdesk-prod-2026",
  appId: "1:1092151559298:web:e872d768dece11f64d609b",
  storageBucket: "fitdesk-prod-2026.firebasestorage.app",
  apiKey: "AIzaSyDlNCLG4UPBuBfOEPwOtAwYvMpsJD9sap0",
  authDomain: "fitdesk-prod-2026.firebaseapp.com",
  messagingSenderId: "1092151559298",
  measurementId: "G-096PM97BCE"
};

export const demoFirebaseConfig = {
  projectId: "demo-sitbit",
  appId: "1:demo:web:sitbit-play",
  apiKey: "demo-api-key",
  authDomain: "localhost",
  storageBucket: "demo-sitbit.appspot.com",
  messagingSenderId: "1234567890"
};

// Check if running in local emulator test mode
export const isEmulatorMode = () => {
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  return host === 'localhost' || host === '127.0.0.1' || params.has('emulator');
};

const activeConfig = isEmulatorMode() ? demoFirebaseConfig : prodFirebaseConfig;

export const app = initializeApp(activeConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (isEmulatorMode()) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.info("[SitBit] Connected to local Firebase emulators (demo-sitbit)");
  } catch (e) {
    console.warn("[SitBit] Emulator connection warning:", e);
  }
}
