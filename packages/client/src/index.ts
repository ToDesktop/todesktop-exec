import {
  execute as _execute,
  subscribe as _subscribe,
} from "./generated/preload";

export const execute: typeof _execute = (...args) =>
  window.todesktop.exec.execute(...args);

export const subscribe: typeof _subscribe = (onMessage) => {
  return window.todesktop.exec.subscribe(onMessage);
};
