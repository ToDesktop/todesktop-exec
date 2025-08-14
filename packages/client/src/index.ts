import {
  execute as _execute,
  terminateAllProcesses as _terminateAllProcesses,
  subscribe as _subscribe,
} from "./generated/preload";

export const execute: typeof _execute = (...args) =>
  window.todesktop.exec.execute(...args);

export const terminateAllProcesses: typeof _terminateAllProcesses = () =>
  window.todesktop.exec.terminateAllProcesses();

export const subscribe: typeof _subscribe = (onMessage) => {
  return window.todesktop.exec.subscribe(onMessage);
};
