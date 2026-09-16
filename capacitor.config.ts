import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.edu.alliance.attendance.predictor",
  appName: "AU75",
  webDir: "out",
  server: {
    // For development with live reload — comment out for production builds
    // url: "http://192.168.1.x:3000",
    // cleartext: true,
  },
  plugins: {
    // Capacitor Preferences (secure key-value store)
    // Used for credential storage on mobile
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
