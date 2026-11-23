import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const manifestPath = path.join(
  rootDir,
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

// 1. Create res/xml/network_security_config.xml to permit HTTPS + cleartext traffic on Android 9-15
const xmlResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'xml');
fs.mkdirSync(xmlResDir, { recursive: true });
const netSecPath = path.join(xmlResDir, 'network_security_config.xml');
const netSecXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
                </trust-anchors>
    </base-config>
</network-security-config>
`;
fs.writeFileSync(netSecPath, netSecXml, 'utf8');
console.log('[Sukhan APK Patch] Wrote res/xml/network_security_config.xml');

// 2. Patch AndroidManifest.xml:
//    - Place INTERNET & ACCESS_NETWORK_STATE permissions directly above <application> tag
//    - Require HTTPS only with android:usesCleartextTraffic="false" and a system-trust-only network config
//    - Set android:windowSoftInputMode="adjustResize" on <activity>
let xml = fs.readFileSync(manifestPath, 'utf8');

// Remove any existing duplicate INTERNET or ACCESS_NETWORK_STATE permission lines so we place them cleanly above <application>
xml = xml.replace(/\s*<!--\s*Permissions\s*-->/gi, '');
xml = xml.replace(
  /\s*<uses-permission\s+android:name="android\.permission\.(INTERNET|ACCESS_NETWORK_STATE)"\s*\/>/g,
  ''
);

const permissionsBlock = `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application`;

xml = xml.replace('<application', permissionsBlock);

xml = xml.replace(/android:usesCleartextTraffic="true"/g, 'android:usesCleartextTraffic="false"');
if (!xml.includes('android:usesCleartextTraffic')) {
  xml = xml.replace(
    '<application',
    '<application\n        android:usesCleartextTraffic="false"'
  );
}

if (!xml.includes('android:networkSecurityConfig')) {
  xml = xml.replace(
    '<application',
    '<application\n        android:networkSecurityConfig="@xml/network_security_config"'
  );
}

if (!xml.includes('android:windowSoftInputMode')) {
  xml = xml.replace(
    '<activity',
    '<activity\n            android:windowSoftInputMode="adjustResize"'
  );
}

fs.writeFileSync(manifestPath, xml, 'utf8');
console.log('[Sukhan APK Patch] Patched AndroidManifest.xml with INTERNET, ACCESS_NETWORK_STATE, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, HTTPS-only cleartext policy, and networkSecurityConfig.');

// 3. Patch android/app/build.gradle: disable R8/ProGuard obfuscation (minifyEnabled false, shrinkResources false)
const appGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(appGradlePath)) {
  let gradle = fs.readFileSync(appGradlePath, 'utf8');
  if (!gradle.includes('shrinkResources false')) {
    gradle = gradle.replace(
      /buildTypes\s*\{\s*release\s*\{[\s\S]*?\}\s*\}/m,
      `buildTypes {
        debug {
            minifyEnabled false
            shrinkResources false
        }
        release {
            minifyEnabled false
            shrinkResources false
            signingConfig signingConfigs.debug
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }`
    );
    fs.writeFileSync(appGradlePath, gradle, 'utf8');
    console.log('[Sukhan APK Patch] Patched android/app/build.gradle with minifyEnabled false & shrinkResources false.');
  }
}

// 4. Patch android/gradle/wrapper/gradle-wrapper.properties for reliable download timeout & -bin distribution
const wrapperPropsPath = path.join(
  rootDir,
  'android',
  'gradle',
  'wrapper',
  'gradle-wrapper.properties'
);
if (fs.existsSync(wrapperPropsPath)) {
  let props = fs.readFileSync(wrapperPropsPath, 'utf8');
  props = props.replace('networkTimeout=10000', 'networkTimeout=120000');
  props = props.replace('-all.zip', '-bin.zip');
  fs.writeFileSync(wrapperPropsPath, props, 'utf8');
  console.log('[Sukhan APK Patch] Updated gradle-wrapper.properties networkTimeout=120000 and -bin.zip.');
}
