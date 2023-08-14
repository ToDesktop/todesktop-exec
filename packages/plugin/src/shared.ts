export const namespace = (str: string) => `exec:${str}`;

export const channels = {
  start: namespace("start"),
};

export interface PluginContext {
  plugin: {
    todesktop: {
      preferences: [
        {
          id: "macExecutable";
          name: string;
          description: string;
          type: "file-selector";
          spec: { value: string };
        },
        {
          id: "windowsExecutable";
          name: string;
          description: string;
          type: "file-selector";
          spec: { value: string };
        },
        {
          id: "linuxExecutable";
          name: string;
          description: string;
          type: "file-selector";
          spec: { value: string };
        }
      ];
    };
  };
  appOptions: { isSecure: boolean };
}

declare global {
  interface Window {
    todesktop: {
      fs: {
        // this is currently injected by TD Builder.
        meta: PluginContext;
      };
    };
  }
}
