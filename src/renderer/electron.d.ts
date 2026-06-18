import { ElectronWindowAPI, ElectronDatabaseAPI } from '../preload/preload';

declare global {
  interface Window {
    electron: {
      window: ElectronWindowAPI;
      db: ElectronDatabaseAPI;
    };
  }
}
export {};
