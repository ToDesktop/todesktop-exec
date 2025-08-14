#!/usr/bin/env node

// Simple test script that outputs to stdout/stderr and exits after a delay
console.log("Test script started");
console.error("Test error output");

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Keep the process alive for testing
setTimeout(() => {
  console.log("Test script completed");
  process.exit(0);
}, 30000); // 30 seconds timeout