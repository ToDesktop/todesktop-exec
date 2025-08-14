import { spawn } from "child_process";
import path from "path";
import { terminateProcesses, executeProcess, activeProcesses } from "./process-manager";

describe("Process Manager", () => {
  afterEach(async () => {
    // Clean up any remaining processes after each test
    if (activeProcesses.length > 0) {
      await terminateProcesses([...activeProcesses], 1000);
    }
  });

  describe("terminateProcesses", () => {
    test("should successfully terminate a simple process", async () => {
      // Spawn a simple Node.js process that sleeps
      const process = spawn("node", ["-e", "setTimeout(() => {}, 60000)"]);
      
      // Add to activeProcesses to track it
      activeProcesses.push(process);
      
      // Terminate the process
      const result = await terminateProcesses([process], 1000);
      
      // Verify results
      expect(result.terminated).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      
      // Verify process is removed from activeProcesses
      expect(activeProcesses).not.toContain(process);
    }, 10000);

    test("should terminate multiple processes", async () => {
      // Spawn 3 different Node.js processes
      const process1 = spawn("node", ["-e", "setTimeout(() => {}, 60000)"]);
      const process2 = spawn("node", ["-e", "process.on('SIGTERM', () => process.exit(0)); setTimeout(() => {}, 60000)"]);
      const process3 = spawn("node", ["-e", "setTimeout(() => {}, 60000)"]);
      
      // Add all to activeProcesses
      activeProcesses.push(process1, process2, process3);
      
      // Terminate all processes
      const result = await terminateProcesses([process1, process2, process3], 1000);
      
      // Verify results
      expect(result.terminated).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      
      // Verify all processes are removed from activeProcesses
      expect(activeProcesses).not.toContain(process1);
      expect(activeProcesses).not.toContain(process2);
      expect(activeProcesses).not.toContain(process3);
    }, 10000);
  });

  describe("executeProcess", () => {
    test("should spawn process and track it in activeProcesses", async () => {
      const testScriptPath = path.join(__dirname, "../test-fixtures/test-script.js");
      
      // Track stdout/stderr output
      let stdoutData = "";
      let stderrData = "";
      const mockPublish = (message: { type: string; data: string }) => {
        if (message.type === "stdout") {
          stdoutData += message.data;
        } else if (message.type === "stderr") {
          stderrData += message.data;
        }
      };
      
      // Execute the test script
      const process = await executeProcess(testScriptPath, [], {}, mockPublish);
      
      // Verify process is tracked
      expect(activeProcesses).toContain(process);
      
      // Wait a bit for output
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify we got some output
      expect(stdoutData).toContain("Test script started");
      expect(stderrData).toContain("Test error output");
      
      // Terminate the process
      const result = await terminateProcesses([process], 1000);
      
      // Verify successful termination
      expect(result.terminated).toBe(1);
      expect(result.failed).toBe(0);
      
      // Verify process is removed from tracking
      expect(activeProcesses).not.toContain(process);
    }, 10000);
  });
});