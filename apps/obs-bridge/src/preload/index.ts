import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("smartLive", {
  platform: "electron",
  appName: "SmartLive OBS Bridge",
  version: "0.1.0",
});
