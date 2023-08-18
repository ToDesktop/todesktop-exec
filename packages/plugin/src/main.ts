import { spawn } from "child_process";
import { BrowserWindow, ipcMain } from "electron";
import fs from "fs/promises";
import os from "os";
import upath from "upath";
import { IpcMessage, PluginContext, channels } from "./shared";
import { getStore, setStore } from "./store";
import { app } from "electron";

ipcMain.handle(channels.execute, async () => {
  publish({ type: "output", data: `Plugin executed` });
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

  publish({ type: "output", data: `Found asset: ${!!asset}` });

  if (!asset) {
    throw new Error("'exec' plugin couldn't find local executable.");
  }

  const executablePath = await getTempExecutablePath(asset.relativeLocalPath);

  publish({ type: "output", data: `Executable path: ${executablePath}` });

  const exectuableProcess = spawn(executablePath, ["--inspect"]);
  exectuableProcess.stdout.once("data", () => {
    publish({ type: "output", data: "process started" });
  });

  exectuableProcess.stdout.on("data", (data) => {
    publish({ type: "stdout", data: data.toString("utf8") });
  });

  exectuableProcess.stderr?.on("data", (data) => {
    publish({ type: "stderr", data: data.toString("utf8") });
  });

  exectuableProcess.once("exit", (code, signal) => {
    if (code) {
      publish({ type: "error", data: `process exited with code ${code}` });
    } else if (signal) {
      console.error("Child was killed with signal", signal);
      publish({ type: "error", data: `process killed with signal ${signal}` });
    } else {
      publish({ type: "output", data: "process exited okay" });
    }
  });
};

async function getTempExecutablePath(localPath: string) {
  // Define the path to the executable inside the ASAR archive
  const asarPath = upath.join(app.getAppPath(), localPath);
  publish({ type: "output", data: `Asar path: ${asarPath}` });

  // Define a path to copy the executable outside of the ASAR
  const tempExecutablePath = upath.join(app.getPath("temp"), localPath);
  publish({
    type: "output",
    data: `Temp executable path: ${tempExecutablePath}`,
  });

  // Read the file from the ASAR archive
  const data = await fs.readFile(asarPath);
  publish({ type: "output", data: `Read asar file` });

  // Write the file outside of the ASAR archive
  const parentDir = getParentDirectory(tempExecutablePath);
  try {
    await fs.stat(parentDir);
  } catch {
    await fs.mkdir(parentDir, { recursive: true });
  }
  publish({ type: "output", data: `Wrote parent dir: ${parentDir}` });

  await fs.writeFile(tempExecutablePath, data);
  publish({ type: "output", data: `Wrote asar file` });

  // Make the file executable (This is especially needed for non-Windows platforms)
  await fs.chmod(tempExecutablePath, 0o755);
  publish({ type: "output", data: `Updated permissions of asar file` });

  return tempExecutablePath;
}

function getParentDirectory(pathname: string) {
  const parts = pathname.split(upath.posix.sep);

  // Remove the last part (the executable file)
  parts.pop();

  // Join the remaining parts to get the parent directory
  return parts.join(upath.posix.sep);
}

function publish(data: IpcMessage) {
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
