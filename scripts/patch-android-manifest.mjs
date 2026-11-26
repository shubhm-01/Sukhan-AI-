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
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;
fs.writeFileSync(netSecPath, netSecXml, 'utf8');
console.log('[Sukhan APK Patch] Wrote res/xml/network_security_config.xml');

// 2. Patch AndroidManifest.xml:
//    - Place INTERNET, ACCESS_NETWORK_STATE, RECORD_AUDIO & MODIFY_AUDIO_SETTINGS directly above <application>
//    - Set android:usesCleartextTraffic="true" and android:networkSecurityConfig="@xml/network_security_config"
//    - Set android:windowSoftInputMode="adjustResize" on <activity>
let xml = fs.readFileSync(manifestPath, 'utf8');

xml = xml.replace(/\s*<!--\s*Permissions\s*-->/gi, '');
xml = xml.replace(
  /\s*<uses-permission\s+android:name="android\.permission\.(INTERNET|ACCESS_NETWORK_STATE|RECORD_AUDIO|MODIFY_AUDIO_SETTINGS)"\s*\/>/g,
  ''
);

const permissionsBlock = `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application`;

xml = xml.replace('<application', permissionsBlock);

if (!xml.includes('android:usesCleartextTraffic')) {
  xml = xml.replace(
    '<application',
    '<application\n        android:usesCleartextTraffic="true"'
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
console.log(
  '[Sukhan APK Patch] Patched AndroidManifest.xml with INTERNET, ACCESS_NETWORK_STATE, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, cleartextTraffic, and networkSecurityConfig.'
);

// 3. Patch MainActivity.java so Android WebView grants getUserMedia audio capture (PermissionRequest.RESOURCE_AUDIO_CAPTURE)
const mainActivityPath = path.join(
  rootDir,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'sukhan',
  'ai',
  'MainActivity.java'
);
if (fs.existsSync(mainActivityPath)) {
  const enhancedMainActivity = `package com.sukhan.ai;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_AUDIO_PERMISSION = 4001;
    private PermissionRequest pendingWebPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        boolean wantsAudio = false;
                        for (String res : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                                wantsAudio = true;
                                break;
                            }
                        }
                        if (!wantsAudio) {
                            super.onPermissionRequest(request);
                            return;
                        }
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                == PackageManager.PERMISSION_GRANTED) {
                            request.grant(request.getResources());
                        } else {
                            pendingWebPermissionRequest = request;
                            ActivityCompat.requestPermissions(
                                    MainActivity.this,
                                    new String[]{Manifest.permission.RECORD_AUDIO},
                                    REQUEST_AUDIO_PERMISSION
                            );
                        }
                    });
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_AUDIO_PERMISSION && pendingWebPermissionRequest != null) {
            PermissionRequest req = pendingWebPermissionRequest;
            pendingWebPermissionRequest = null;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                req.grant(req.getResources());
            } else {
                req.deny();
            }
        }
    }
}
`;
  fs.writeFileSync(mainActivityPath, enhancedMainActivity, 'utf8');
  console.log(
    '[Sukhan APK Patch] Patched MainActivity.java for Android WebView audio capture PermissionRequest.'
  );
}

// 4. Patch android/app/build.gradle: disable R8/ProGuard obfuscation (minifyEnabled false, shrinkResources false)
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
    console.log(
      '[Sukhan APK Patch] Patched android/app/build.gradle with minifyEnabled false & shrinkResources false.'
    );
  }
}

// 5. Patch android/gradle/wrapper/gradle-wrapper.properties for reliable download timeout & -bin distribution
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
  console.log(
    '[Sukhan APK Patch] Updated gradle-wrapper.properties networkTimeout=120000 and -bin.zip.'
  );
}
