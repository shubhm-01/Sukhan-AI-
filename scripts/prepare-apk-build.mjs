import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const pkgPath = path.join(rootDir, 'package.json');

console.log('[Sukhan APK Prep] Normalizing package.json for public npm registry...');

for (const lockFile of ['bun.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) {
  const fullLockPath = path.join(rootDir, lockFile);
  if (fs.existsSync(fullLockPath)) {
    fs.unlinkSync(fullLockPath);
    console.log(`[Sukhan APK Prep] Removed ${lockFile}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.dependencies = {
  '@radix-ui/react-dialog': '^1.1.15',
  'gsap': '^3.13.0',
  'html-to-image': '^1.11.13',
  'livekit-client': '^2.20.1',
  'livekit-server-sdk': '^2.20.1',
  '@capacitor-community/speech-recognition': '^7.0.1',
  '@capacitor-community/text-to-speech': '^6.0.0',
  '@capacitor/android': '^7.0.0',
  '@capacitor/cli': '^7.0.0',
  '@capacitor/core': '^7.0.0',
  '@fontsource/cormorant-garamond': '^5.1.0',
  '@fontsource/noto-naskh-arabic': '^5.1.0',
  '@fontsource/noto-serif-devanagari': '^5.1.0',
  '@fontsource/plus-jakarta-sans': '^5.1.0',
  '@google/genai': '^1.0.0',
  '@tailwindcss/vite': '^4.0.0',
  '@vitejs/plugin-react': '^4.3.0',
  dotenv: '^16.4.0',
  express: '^4.21.0',
  '@supabase/supabase-js': '2.119.2',
  'lucide-react': '^0.460.0',
  motion: '^12.0.0',
  react: '^19.0.0',
  'react-dom': '^19.0.0',
  vite: '^6.0.0',
};

pkg.devDependencies = {
  '@types/express': '^4.17.21',
  '@types/node': '^22.0.0',
  '@types/react': '^19.0.0',
  '@types/react-dom': '^19.0.0',
  autoprefixer: '^10.4.20',
  esbuild: '^0.24.0',
  tailwindcss: '^4.0.0',
  tsx: '^4.19.0',
  typescript: '^5.7.0',
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('[Sukhan APK Prep] package.json normalized successfully.');

