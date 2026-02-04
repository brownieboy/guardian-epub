type ProgressUpdate = {
  current: number;
  total: number;
  message?: string;
};

declare global {
  interface Window {
    guardianApi: {
      loadSettings: () => Promise<any>;
      saveSettings: (data: any) => Promise<boolean>;
      resetSettings: () => Promise<boolean>;
      fetchSections: (apiKey: string) => Promise<string[]>;
      run: (options: { apiKey: string; sections: string[] }) => Promise<any>;
      openPath: (targetPath: string) => Promise<void>;
      onPhase: (handler: (phase: string) => void) => void;
      onProgress: (handler: (progress: ProgressUpdate) => void) => void;
      onLog: (handler: (message: string) => void) => void;
      onError: (handler: (message: string) => void) => void;
      onOpenApiDialog: (handler: () => void) => void;
      onRefreshSections: (handler: () => void) => void;
      onResetSettings: (handler: () => void) => void;
    };
  }
}

export {};
