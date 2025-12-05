import { spawn, ChildProcess } from "child_process";
import fs from "fs/promises";
import os from "os";
import upath from "upath";
import { TerminateResult, IpcMessage } from "./shared";

// Track all spawned processes
export const activeProcesses: ChildProcess[] = [];

export type PublishFunction = (message: IpcMessage) => void;

// Helper function to terminate processes with verification
export async function terminateProcesses(
  processes: ChildProcess[], 
  timeoutMs: number = 5000,
  publish?: PublishFunction
): Promise<TerminateResult> {
  const log = (type: "debug" | "stdout" | "stderr", data: string) => {
    if (publish) {
      publish({ type, data });
    }
  };

  if (processes.length === 0) {
    return { terminated: 0, failed: 0, errors: [] };
  }
  
  const results = await Promise.allSettled(
    processes.map(async (process, index) => {
      if (process.killed) {
        return { success: true, index };
      }
      
      return new Promise<{ success: boolean; index: number; error?: string }>((resolve) => {
        let terminated = false;
        let timeoutId: ReturnType<typeof setTimeout>;
        
        const cleanup = () => {
          terminated = true;
          clearTimeout(timeoutId);
        };
        
        // Listen for process exit
        process.once('exit', (code, signal) => {
          cleanup();
          log("debug", `Process ${index} terminated (code: ${code}, signal: ${signal})`);
          resolve({ success: true, index });
        });
        
        // Try graceful termination first (SIGTERM)
        const killed = process.kill('SIGTERM');
        if (!killed) {
          cleanup();
          resolve({ success: false, index, error: 'Failed to send SIGTERM signal' });
          return;
        }
        
        // Set timeout for graceful termination
        timeoutId = setTimeout(() => {
          if (!terminated) {
            log("debug", `Process ${index} didn't terminate gracefully, forcing with SIGKILL`);
            
            try {
              // Force kill with SIGKILL
              const forceKilled = process.kill('SIGKILL');
              if (!forceKilled) {
                cleanup();
                resolve({ success: false, index, error: 'Failed to force kill with SIGKILL' });
              }
              // Wait another 2 seconds for forced termination
              setTimeout(() => {
                if (!terminated) {
                  cleanup();
                  resolve({ success: false, index, error: 'Process could not be terminated' });
                }
              }, 2000);
            } catch (err) {
              cleanup();
              resolve({ success: false, index, error: `Kill error: ${err}` });
            }
          }
        }, timeoutMs);
      });
    })
  );
  
  let terminated = 0;
  let failed = 0;
  const errors: string[] = [];
  const successfulIndexes: number[] = [];
  
  results.forEach((result: PromiseSettledResult<{ success: boolean; index: number; error?: string }>) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        terminated++;
        successfulIndexes.push(result.value.index);
      } else {
        failed++;
        if (result.value.error) {
          errors.push(`Process ${result.value.index}: ${result.value.error}`);
        }
      }
    } else {
      failed++;
      errors.push(`Process termination promise rejected: ${result.reason}`);
    }
  });
  
  // Remove successfully terminated processes from the array (in reverse order to maintain indexes)
  successfulIndexes.sort((a, b) => b - a).forEach(index => {
    const processIndex = processes.indexOf(processes[index]);
    if (processIndex > -1) {
      activeProcesses.splice(activeProcesses.indexOf(processes[index]), 1);
    }
  });
  
  return { terminated, failed, errors };
}

// Execute a process and track it
export async function executeProcess(
  executablePath: string,
  flags: string[] = [],
  options: any = {},
  publish?: PublishFunction
): Promise<ChildProcess> {
  const platform = os.platform();
  const log = (type: "debug" | "stdout" | "stderr", data: string) => {
    if (publish) {
      publish({ type, data });
    }
  };

  log("debug", `Spawning process at ${executablePath}`);
  
  const executableOptions: Parameters<typeof spawn>[2] = {};
  if (platform === "win32") {
    executableOptions.shell = true;
  }
  
  log("debug", `Executing with flags: ${flags.join(" ")}`);

  let executableProcess: ChildProcess;

  if (platform === "darwin" && executablePath.endsWith(".pkg")) {
    log("debug", `Spawning .pkg with open command`);
    executableProcess = spawn("open", [executablePath]);
  } else {
    executableProcess = spawn(executablePath, flags, { ...executableOptions, ...options });
  }

  // Track the process for cleanup
  activeProcesses.push(executableProcess);

  executableProcess.stdout?.on("data", (data) => {
    log("stdout", data.toString("utf8"));
  });

  executableProcess.stderr?.on("data", (data) => {
    log("stderr", data.toString("utf8"));
  });

  executableProcess.once("exit", (code, signal) => {
    if (code) {
      log("debug", `Process exited with code ${code}`);
    } else if (signal) {
      log("debug", `Process killed with signal ${signal}`);
    } else {
      log("debug", "Process exited okay");
    }

    // Publish exit event with structured data
    if (publish) {
      publish({ type: "exit", code, signal: signal ?? null });
    }

    // Remove from active processes list
    const index = activeProcesses.indexOf(executableProcess);
    if (index > -1) {
      activeProcesses.splice(index, 1);
    }
  });

  return executableProcess;
}

export async function getExecutablePath(localPath: string, appPath: string, tempPath: string, publish?: PublishFunction): Promise<string> {
  const log = (type: "debug" | "stdout" | "stderr", data: string) => {
    if (publish) {
      publish({ type, data });
    }
  };

  const asarPath = upath.join(appPath, localPath);
  let sourcePath = asarPath;

  const electronProcess = process as NodeJS.Process & { resourcesPath?: string };
  if (electronProcess.resourcesPath) {
    const unpackedPath = upath.join(electronProcess.resourcesPath, "app.asar.unpacked", localPath);

    try {
      const stats = await fs.stat(unpackedPath);
      if (stats.isFile()) {
        sourcePath = unpackedPath;
        log("debug", `Using unpacked asset from ${sourcePath}`);
      } else {
        log("debug", `Unpacked asset at ${unpackedPath} is not a file, falling back to ASAR`);
      }
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (!typedError?.code || typedError.code !== "ENOENT") {
        const message = typedError instanceof Error ? typedError.message : String(typedError);
        log("debug", `Unable to access unpacked asset at ${unpackedPath}: ${message}`);
      }
    }
  }

  if (sourcePath === asarPath) {
    log("debug", `Extracting asset from ${sourcePath}`);
  }

  // Define a path to copy the executable outside of the ASAR
  const tempExecutablePath = upath.join(tempPath, localPath);

  // Read the file from the resolved source path (ASAR or unpacked directory)
  const data = await fs.readFile(sourcePath);

  // Write the file outside of the ASAR archive
  const parentDir = getParentDirectory(tempExecutablePath);
  try {
    await fs.stat(parentDir);
  } catch {
    await fs.mkdir(parentDir, { recursive: true });
  }

  await fs.writeFile(tempExecutablePath, data);
  log("debug", `Writing asset to ${tempExecutablePath}`);

  // Make the file executable (This is especially needed for non-Windows platforms)
  await fs.chmod(tempExecutablePath, 0o755);
  log("debug", `Updated asset execution permissions`);

  return tempExecutablePath;
}

function getParentDirectory(pathname: string) {
  const parts = pathname.split(upath.posix.sep);
  
  // Remove the last part (the executable file)
  parts.pop();
  
  // Join the remaining parts to get the parent directory
  return parts.join(upath.posix.sep);
}
