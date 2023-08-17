import { spawn } from "child_process";
import { BrowserWindow, ipcMain } from "electron";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { IpcMessage, PluginContext, channels } from "./shared";
import { getStore, setStore } from "./store";

ipcMain.handle(channels.execute, async () => {
  console.log("plugin executed");
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

  const executablePath = path.join(
    appOptions.localContext.appDir,
    asset.relativeLocalPath
  );

  console.log("todo, config should support custom flags");
  await fs.chmod(executablePath, 0o755);
  const exectuableProcess = spawn(executablePath, ["--inspect"]);
  exectuableProcess.stdout.once("data", () => {
    console.log("process has started");
  });

  exectuableProcess.stdout.on("data", (data) => {
    console.log("stdout:", data.toString("utf8"));
  });

  exectuableProcess.stderr?.on("data", (data) => {
    console.log("stderr:", data.toString("utf8"));
  });

  exectuableProcess.once("exit", (code, signal) => {
    if (code) {
      console.error("Child exited with code", code);
    } else if (signal) {
      console.error("Child was killed with signal", signal);
    } else {
      console.log("Child exited okay");
    }
  });
};

function broadcast(data: IpcMessage) {
  const windows = BrowserWindow.getAllWindows();

  return windows.map((window) => {
    window.webContents.send(channels.message, data);

    const views = window.getBrowserViews();
    const viewsIds = views.map((view) => {
      view.webContents.send(channels.message, data);
      return view.webContents.id;
    });

    return { windowId: window.id, viewsIds };
  });
}

/**
 * entrypoint
 */
export default (context: PluginContext) => {
  setStore(context);
};
