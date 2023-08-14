import { ipcRenderer } from "electron";
import { channels } from "./shared";

export const execute = () => ipcRenderer.invoke(channels.execute);

declare global {
  interface Window {
    todesktop: {
      exec: {
        execute: () => Promise<void>;
      };
    };
  }
}
