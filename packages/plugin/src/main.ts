import path from "path";
import { packageDirectory } from "pkg-dir";
import os from "os";
import { ipcMain } from "electron";
import { PluginContext, channels } from "./shared";
import { getStore, setStore } from "./store";

/**
 * utilities
 */
const platform = os.platform();
const execute = async (
  url: string,
  appOptions: PluginContext["appOptions"]
) => {
  const asset = appOptions.fileAssetDetailsList?.find(
    (asset) => asset.url === url
  );

  if (!asset) {
    throw new Error("'exec' plugin couldn't find local executable.");
  }

  console.log("asset", asset);
  console.log("current path", path.join(__dirname, "../"));

  console.log(
    "packageDir",
    packageDirectory({ cwd: path.join(__dirname, "../") })
  );
  console.log("maybe path", path.join(__dirname, asset.relativeLocalPath));
};

/**
 * handler
 */
ipcMain.handle(channels.execute, async () => {
  const { appOptions, plugin } = getStore();
  if (!appOptions.isSecure) {
    throw new Error(
      "Custom code signing certificates are required to use the 'exec' plugin.."
    );
  }

  const [mac, windows, linux] = plugin.todesktop.preferences;
  if (platform === "darwin" && mac.spec.value) {
    await execute(mac.spec.value, appOptions);
  } else if (platform === "win32" && windows.spec.value) {
    await execute(windows.spec.value, appOptions);
  } else if (platform === "linux" && linux.spec.value) {
    await execute(linux.spec.value, appOptions);
  }
});

/**
 * entrypoint
 */
export default (context: PluginContext) => {
  setStore(context);
};
