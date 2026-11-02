export {};

declare global {
  interface Window {
    anonymosDesktop?: {
      getInfo(): Promise<{
        version: string;
        platform: string;
        isPackaged: boolean;
      }>;
      minimize(): Promise<boolean>;
      toggleMaximize(): Promise<boolean>;
      close(): Promise<boolean>;
    };
  }
}
