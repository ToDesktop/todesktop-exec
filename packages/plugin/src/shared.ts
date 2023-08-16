export const namespace = (str: string) => `exec:${str}`;

export const channels = {
  execute: namespace("execute"),
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
  appOptions: {
    localContext: { appDir: string };
    isSecure: boolean;
    fileAssetDetailsList?: {
      url: string;
      relativeLocalPath: string;
      name: string;
    }[];
  };
}
