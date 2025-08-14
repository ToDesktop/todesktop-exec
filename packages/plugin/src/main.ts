import { BrowserWindow, ipcMain } from "electron";
import os from "os";
import { IpcMessage, PluginContext, channels } from "./shared";
import { getStore, setStore } from "./store";
import { app } from "electron";
import { activeProcesses, terminateProcesses, executeProcess, getExecutablePath } from "./process-manager";

// Track if we're already cleaning up to prevent infinite loops
let isCleaningUp = false;

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

ipcMain.handle(channels.terminateAll, async () => {
  const processCount = activeProcesses.length;
  publish({ type: "debug", data: `Terminating ${processCount} active processes` });
  
  const result = await terminateProcesses([...activeProcesses], 5000, publish);
  
  publish({ type: "debug", data: `Termination complete: ${result.terminated} terminated, ${result.failed} failed` });
  
  return result;
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

  const executablePath = await getExecutablePath(
    asset.relativeLocalPath,
    app.getAppPath(),
    app.getPath("temp"),
    publish
  );

  await executeProcess(executablePath, flags, {}, publish);
};


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

// Clean up all active processes when the app is about to quit
app.on("before-quit", (event) => {
  if (!isCleaningUp && activeProcesses.length > 0) {
    event.preventDefault();
    isCleaningUp = true;
    
    publish({ type: "debug", data: `App quitting: terminating ${activeProcesses.length} active processes` });
    
    // Use shorter timeout (2 seconds) during app quit
    terminateProcesses([...activeProcesses], 2000, publish).then((result) => {
      publish({ type: "debug", data: `Quit cleanup complete: ${result.terminated} terminated, ${result.failed} failed` });
      
      if (result.failed > 0) {
        publish({ type: "debug", data: `Failed to terminate some processes: ${result.errors.join(', ')}` });
      }
      
      // Now actually quit the app
      app.quit();
    }).catch((error) => {
      publish({ type: "debug", data: `Error during quit cleanup: ${error}` });
      // Still quit even if cleanup failed
      app.quit();
    });
  }
});

/**
 * entrypoint
 */
export default (context: PluginContext) => {
  setStore(context);
};
