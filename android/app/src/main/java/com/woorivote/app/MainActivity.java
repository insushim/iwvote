package com.woorivote.app;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;
import android.widget.Toast;
import android.app.Activity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {

    private static final String WEB_URL = "https://english-class-e059f.web.app";
    private static final String GITHUB_RELEASES_URL =
            "https://api.github.com/repos/insushim/iwvote/releases/latest";
    private static final String CURRENT_VERSION = "1.0.0";

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccess(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://english-class-e059f.web.app")) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });

        webView.loadUrl(WEB_URL);
        checkForUpdate();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void checkForUpdate() {
        new Thread(() -> {
            try {
                URL url = new URL(GITHUB_RELEASES_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                if (conn.getResponseCode() != 200) return;

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();

                JSONObject release = new JSONObject(sb.toString());
                String latestVersion = release.getString("tag_name").replaceFirst("^v", "");

                if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                    JSONArray assets = release.getJSONArray("assets");
                    String apkUrl = null;
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.getJSONObject(i);
                        if (asset.getString("name").endsWith(".apk")) {
                            apkUrl = asset.getString("browser_download_url");
                            break;
                        }
                    }

                    final String downloadUrl = apkUrl;
                    if (downloadUrl != null) {
                        runOnUiThread(() -> showUpdateDialog(latestVersion, downloadUrl));
                    }
                }
            } catch (Exception e) {
                // Silent fail - update check is non-critical
            }
        }).start();
    }

    private boolean isNewerVersion(String latest, String current) {
        String[] l = latest.split("\\.");
        String[] c = current.split("\\.");
        for (int i = 0; i < Math.min(l.length, c.length); i++) {
            int lv = Integer.parseInt(l[i]);
            int cv = Integer.parseInt(c[i]);
            if (lv > cv) return true;
            if (lv < cv) return false;
        }
        return l.length > c.length;
    }

    private void showUpdateDialog(String version, String downloadUrl) {
        new AlertDialog.Builder(this)
                .setTitle("업데이트 알림")
                .setMessage("새로운 버전 v" + version + "이 있습니다.\n업데이트하시겠습니까?")
                .setPositiveButton("업데이트", (dialog, which) -> {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
                    startActivity(intent);
                })
                .setNegativeButton("나중에", null)
                .show();
    }
}
