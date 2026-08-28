package com.omaju.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 카카오 로컬 REST — CapacitorHttp가 Authorization 헤더를 빠뜨려 401이 나는
 * 기기에서 네이티브 HttpURLConnection으로 KakaoAK 인증을 보장한다.
 */
@CapacitorPlugin(name = "OmajuKakao")
public class OmajuKakaoPlugin extends Plugin {
    private static final String TAG = "OmajuKakao";
    private static final String BASE = "https://dapi.kakao.com";
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PluginMethod
    public void localGet(PluginCall call) {
        final String path = call.getString("path", "");
        final String restKey = call.getString("restKey", "");
        final JSObject params = call.getObject("params", new JSObject());

        if (path == null || path.isEmpty() || !path.startsWith("/v2/local/")) {
            call.reject("invalid_path", "INVALID_PATH");
            return;
        }
        if (restKey == null || restKey.trim().isEmpty()) {
            call.reject("missing_rest_key", "NO_KAKAO_KEY");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                StringBuilder qs = new StringBuilder();
                Iterator<String> keys = params.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    String v = params.getString(k);
                    if (v == null) continue;
                    if (qs.length() > 0) qs.append('&');
                    qs.append(URLEncoder.encode(k, StandardCharsets.UTF_8.name()))
                        .append('=')
                        .append(URLEncoder.encode(v, StandardCharsets.UTF_8.name()));
                }
                String urlStr = BASE + path + (qs.length() > 0 ? "?" + qs : "");
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(20000);
                conn.setInstanceFollowRedirects(false);
                // CapacitorHttp 우회 — 여기서 Authorization을 직접 설정
                conn.setRequestProperty("Authorization", "KakaoAK " + restKey.trim());
                conn.setRequestProperty("Accept", "application/json");

                int status = conn.getResponseCode();
                InputStream stream =
                    status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream();
                String body = readStream(stream);

                JSObject result = new JSObject();
                result.put("status", status);
                result.put("body", body == null ? "" : body);
                try {
                    result.put("data", new JSONObject(body == null || body.isEmpty() ? "{}" : body));
                } catch (Exception ignored) {
                    // non-JSON error bodies are fine — JS will use body string
                }
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "kakao_native_fail", "KAKAO_NATIVE", e);
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    private static String readStream(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        return sb.toString();
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
