import type { PluginContext } from "./shared";

let store: PluginContext | undefined = undefined;
export const setStore = (input: PluginContext) => {
  store = input;
};

export const getStore = () => {
  if (!store) throw new Error("Plugin needs to be set before use");
  return store;
};
