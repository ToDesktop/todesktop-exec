import { execute as _execute } from "./generated/preload";

export const execute: typeof _execute = (...args) =>
  window.todesktop.exec.execute(...args);
