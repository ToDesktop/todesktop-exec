import { IpcRendererEvent, ipcRenderer } from "electron";
import { Execute, Subscribe, Unsubscribe, TerminateAllProcesses, channels } from "./shared";

export const execute: Execute = (...args) =>
  ipcRenderer.invoke(channels.execute, ...args);

export const terminateAllProcesses: TerminateAllProcesses = () =>
  ipcRenderer.invoke(channels.terminateAll);

export const subscribe: Subscribe = (onMessage) => {
  const subscriberId = idCount++;
  const handler = (
    e: IpcRendererEvent,
    data: Parameters<typeof onMessage>[0]
  ) => {
    return onMessage(data);
  };

  ipcRenderer.on(channels.message, handler);
  activeListeners.set(subscriberId, handler);

  return () => unsubscribe(subscriberId);
};

const unsubscribe: Unsubscribe = (subscriberId) => {
  const handler = activeListeners.get(subscriberId);

  ipcRenderer.removeListener(channels.message, handler);
  activeListeners.delete(subscriberId);
};

let idCount = 0;

const activeListeners = new Map();

declare global {
  interface Window {
    todesktop: {
      exec: {
        execute: Execute;
        terminateAllProcesses: TerminateAllProcesses;
        subscribe: Subscribe;
      };
    };
  }
}
