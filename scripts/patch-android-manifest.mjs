import fs from 'fs';
import path from 'path';

const manifestPath = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

if (!fs.existsSync(manifestPath)) {
  console.warn('[Sukhan APK Patch] AndroidManifest.xml not found at:', manifestPath);
  process.exit(0);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

if (!xml.includes('android:usesCleartextTraffic')) {
  xml = xml.replace(
    '<application',
    '<application android:usesCleartextTraffic="true"'
  );
}

if (!xml.includes('android:windowSoftInputMode')) {
  xml = xml.replace(
    '<activity',
    '<activity android:windowSoftInputMode="adjustResize"'
  );
}

if (!xml.includes('android.permission.INTERNET')) {
  xml = xml.replace(
    '</manifest>',
    '    <uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n</manifest>'
  );
}

fs.writeFileSync(manifestPath, xml, 'utf8');
console.log('[Sukhan APK Patch] Patched AndroidManifest.xml with INTERNET permission, cleartext traffic, and adjustResize.');
