# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ToDesktop Exec is a monorepo containing an Electron plugin system that allows ToDesktop applications to bundle and execute platform-specific executables. The project consists of two main packages:

- **Plugin Package** (`packages/plugin/`): The Electron main process plugin that handles executable spawning, file extraction from ASAR archives, and IPC communication
- **Client Package** (`packages/client/`): The renderer process client library that provides the public API for web applications

## Architecture

The system uses Electron's IPC (Inter-Process Communication) to safely execute bundled executables:

1. **Client Layer** (`packages/client/src/index.ts`): Exposes `execute()`, `terminateAllProcesses()`, and `subscribe()` functions to the renderer process
2. **Preload Layer** (`packages/plugin/src/preload.ts`): Bridges renderer and main process via `window.todesktop.exec`
3. **Main Process Layer** (`packages/plugin/src/main.ts`): Handles Electron IPC and app lifecycle events
4. **Process Manager** (`packages/plugin/src/process-manager.ts`): Core business logic for process spawning, termination, and tracking
5. **Shared Types** (`packages/plugin/src/shared.ts`): Common interfaces and IPC channel definitions

### Key Components

- **Platform-specific execution**: macOS `.pkg` files use `open` command, other platforms spawn directly
- **ASAR extraction**: Executables are extracted from the app bundle to temp directory before execution
- **Command-line flag support**: Both packages support passing arguments to executables
- **Real-time logging**: Subscribe to `debug`, `stdout`, and `stderr` streams
- **Process management**: Automatic cleanup on app quit, manual termination via `terminateAllProcesses()` with proper verification

## Development Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Full build (includes rollup build + workspace builds)
npm run build

# Run tests
npm test

# Release commands
npm run release:patch
npm run release:minor
npm run release:major
```

## Build System

Uses Rollup for bundling with three separate configurations:
- `packages/plugin/src/main.ts` → `packages/plugin/dist/main.js` (CommonJS)
- `packages/plugin/src/preload.ts` → `packages/plugin/dist/preload.js` (CommonJS, browser-compatible)
- `packages/client/src/index.ts` → `packages/client/dist/index.js` (CommonJS)

## Testing

- Uses Jest with TypeScript support (`ts-jest` preset)
- Tests use real processes (not mocks) to verify actual system behavior
- Business logic extracted to `process-manager.ts` for testability
- Configuration in `jest.config.js`
- Test command: `npm test`

## Security Requirements

The plugin requires custom code signing certificates (`appOptions.isSecure` must be true) to execute bundled files, ensuring security in production ToDesktop applications.

## Platform Support

- **macOS**: `.pkg` files opened with `open` command for standard installation flow
- **Windows**: Uses shell spawning for executable compatibility
- **Linux**: Direct executable spawning with proper permissions (chmod 755)