import { app, ipcMain } from "electron";
import { PluginContext, channels } from "./shared";
import { getStore, setStore } from "./store";

/**
 * handler
 */
ipcMain.handle(channels.start, async () => {
  const { appOptions, plugin } = getStore();
  console.log(appOptions, plugin);
  if (!appOptions.isSecure) {
    throw new Error(
      "Custom code signing certificates are required to use this plugin."
    );
  }

  // todo, run correct executable
});

/**
 * entrypoint
 */
export default (context: PluginContext) => {
  setStore(context);
};
