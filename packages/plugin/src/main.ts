import { spawn } from "child_process";
import { BrowserWindow, ipcMain } from "electron";
import fs from "fs/promises";
import os from "os";
import upath from "upath";
import { IpcMessage, PluginContext, channels } from "./shared";
import { getStore, setStore } from "./store";
import { app } from "electron";

ipcMain.handle(channels.execute, async (event, flags: string[]) => {
  publish({ type: "debug", data: `Executing @todesktop/exec` });
  const { appOptions, plugin } = getStore();
  if (!appOptions.isSecure) {
    throw new Error(
      "Custom code signing certificates are required to use the 'exec' plugin."
    );
  }

  const [mac, windows, linux] = plugin.todesktop.preferences;
  if (platform === "darwin" && mac.spec.value) {
    await execute(mac.spec.value, appOptions, flags);
  } else if (platform === "win32" && windows.spec.value) {
    await execute(windows.spec.value, appOptions, flags);
  } else if (platform === "linux" && linux.spec.value) {
    await execute(linux.spec.value, appOptions, flags);
  } else {
    publish({ type: "debug", data: `Skipped platform execution` });
  }
});

const platform = os.platform();
const execute = async (
  url: string,
  appOptions: PluginContext["appOptions"],
  flags: string[] = []
) => {
  const asset = appOptions.fileAssetDetailsList?.find(
    (asset) => asset.url === url
  );

  if (!asset) {
    throw new Error("The 'exec' plugin couldn't find local executable.");
  }
  publish({
    type: "debug",
    data: `Retrieved reference to asset ${asset.name}`,
  });

  const executablePath = await getExecutablePath(asset.relativeLocalPath);

  publish({ type: "debug", data: `Spawning process at ${executablePath}` });
  const executableOptions: Parameters<typeof spawn>[2] = {};
  if (platform === "win32") {
    executableOptions.shell = true;
  }
  const exectuableProcess = spawn(executablePath, [], executableOptions);

  exectuableProcess.stdout?.on("data", (data) => {
    publish({ type: "stdout", data: data.toString("utf8") });
  });

  exectuableProcess.stderr?.on("data", (data) => {
    publish({ type: "stderr", data: data.toString("utf8") });
  });

  exectuableProcess.once("exit", (code, signal) => {
    if (code) {
      publish({ type: "debug", data: `Process exited with code ${code}` });
    } else if (signal) {
      publish({ type: "debug", data: `Process killed with signal ${signal}` });
    } else {
      publish({ type: "debug", data: "Process exited okay" });
    }
  });
};

async function getExecutablePath(localPath: string) {
  // Define the path to the executable inside the ASAR archive
  const asarPath = upath.join(app.getAppPath(), localPath);
  publish({ type: "debug", data: `Extracting asset from ${asarPath}` });

  // Define a path to copy the executable outside of the ASAR
  const tempExecutablePath = upath.join(app.getPath("temp"), localPath);

  // Read the file from the ASAR archive
  const data = await fs.readFile(asarPath);

  // Write the file outside of the ASAR archive
  const parentDir = getParentDirectory(tempExecutablePath);
  try {
    await fs.stat(parentDir);
  } catch {
    await fs.mkdir(parentDir, { recursive: true });
  }

  await fs.writeFile(tempExecutablePath, data);
  publish({ type: "debug", data: `Writing asset to ${tempExecutablePath}` });

  // Make the file executable (This is especially needed for non-Windows platforms)
  await fs.chmod(tempExecutablePath, 0o755);
  publish({ type: "debug", data: `Updated asset execution permissions` });

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
