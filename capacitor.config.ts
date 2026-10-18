import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sukhanai.app',
  appName: 'Sukhan AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
