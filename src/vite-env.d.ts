// PWA 类型声明，使 TypeScript 识别 virtual:pwa-register 虚拟模块
/// <reference types="vite-plugin-pwa/client" />

// Vite Worker 导入类型声明：`./xxx?worker` 导出一个 Worker 构造函数
declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }
  export function registerSW(
    options?: RegisterSWOptions,
  ): (reloadPage?: boolean) => Promise<void>;
}
