package com.omaju.app;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.prompt.GenerateContentRequest;
import com.google.mlkit.genai.prompt.GenerateContentResponse;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.TextPart;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;

/**
 * Galaxy S26 등 AICore(Gemini Nano) 지원 기기에서 시스템 온디바이스 LLM 호출.
 * JS: registerPlugin('OmajuSystemLlm') → probe / generate
 */
@CapacitorPlugin(name = "OmajuSystemLlm")
public class OmajuSystemLlmPlugin extends Plugin {
    private static final String TAG = "OmajuSystemLlm";

    private GenerativeModelFutures model() {
        return GenerativeModelFutures.from(Generation.INSTANCE.getClient());
    }

    @PluginMethod
    public void probe(PluginCall call) {
        GenerativeModelFutures generativeModel = model();
        ListenableFuture<Integer> statusFuture = generativeModel.checkStatus();

        Futures.addCallback(
            statusFuture,
            new FutureCallback<Integer>() {
                @Override
                public void onSuccess(Integer featureStatus) {
                    JSObject ret = new JSObject();
                    ret.put("provider", "android");

                    if (featureStatus == null) {
                        ret.put("available", false);
                        ret.put("reason", "status_null");
                        call.resolve(ret);
                        return;
                    }

                    switch (featureStatus) {
                        case FeatureStatus.AVAILABLE:
                            ret.put("available", true);
                            ret.put("reason", "ok");
                            call.resolve(ret);
                            break;
                        case FeatureStatus.DOWNLOADABLE:
                            ret.put("available", false);
                            ret.put("reason", "downloadable");
                            call.resolve(ret);
                            // 백그라운드 다운로드 시작 (다음 세션/턴에서 AVAILABLE 기대)
                            startDownload(generativeModel);
                            break;
                        case FeatureStatus.DOWNLOADING:
                            ret.put("available", false);
                            ret.put("reason", "downloading");
                            call.resolve(ret);
                            break;
                        case FeatureStatus.UNAVAILABLE:
                        default:
                            ret.put("available", false);
                            ret.put("reason", "unavailable");
                            call.resolve(ret);
                            break;
                    }
                }

                @Override
                public void onFailure(@NonNull Throwable t) {
                    Log.w(TAG, "probe failed", t);
                    JSObject ret = new JSObject();
                    ret.put("available", false);
                    ret.put("reason", "probe_failed");
                    ret.put("provider", "android");
                    call.resolve(ret);
                }
            },
            ContextCompat.getMainExecutor(getContext())
        );
    }

    private void startDownload(GenerativeModelFutures generativeModel) {
        try {
            generativeModel.download(new DownloadCallback() {
                @Override
                public void onDownloadStarted(long bytes) {
                    Log.d(TAG, "Gemini Nano download started");
                }

                @Override
                public void onDownloadProgress(long bytesDownloaded) {
                    Log.d(TAG, "Gemini Nano downloaded bytes=" + bytesDownloaded);
                }

                @Override
                public void onDownloadCompleted() {
                    Log.d(TAG, "Gemini Nano download complete");
                }

                @Override
                public void onDownloadFailed(@NonNull GenAiException e) {
                    Log.e(TAG, "Gemini Nano download failed: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "download kickoff failed", e);
        }
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            call.reject("prompt_required");
            return;
        }

        String purpose = call.getString("purpose", "back");
        float temperature = "front".equals(purpose) ? 0.2f : 0.7f;
        int maxTokens = "front".equals(purpose) ? 256 : 220;

        GenerativeModelFutures generativeModel = model();

        // 가용 여부 확인 후 생성
        Futures.addCallback(
            generativeModel.checkStatus(),
            new FutureCallback<Integer>() {
                @Override
                public void onSuccess(Integer featureStatus) {
                    if (featureStatus == null || featureStatus != FeatureStatus.AVAILABLE) {
                        if (featureStatus != null && featureStatus == FeatureStatus.DOWNLOADABLE) {
                            startDownload(generativeModel);
                        }
                        call.reject("model_unavailable");
                        return;
                    }

                    GenerateContentRequest.Builder requestBuilder =
                        new GenerateContentRequest.Builder(new TextPart(prompt));
                    requestBuilder.setTemperature(temperature);
                    requestBuilder.setTopK(40);
                    requestBuilder.setCandidateCount(1);
                    requestBuilder.setMaxOutputTokens(maxTokens);

                    ListenableFuture<GenerateContentResponse> future =
                        generativeModel.generateContent(requestBuilder.build());

                    Futures.addCallback(
                        future,
                        new FutureCallback<GenerateContentResponse>() {
                            @Override
                            public void onSuccess(GenerateContentResponse response) {
                                String text = "";
                                try {
                                    if (response != null && response.getCandidates() != null
                                        && !response.getCandidates().isEmpty()) {
                                        text = String.valueOf(response.getCandidates().get(0).getText());
                                    }
                                } catch (Exception e) {
                                    Log.w(TAG, "parse response", e);
                                }
                                JSObject ret = new JSObject();
                                ret.put("text", text != null ? text.trim() : "");
                                call.resolve(ret);
                            }

                            @Override
                            public void onFailure(@NonNull Throwable t) {
                                Log.e(TAG, "generate failed", t);
                                call.reject(t.getMessage() != null ? t.getMessage() : "generate_failed");
                            }
                        },
                        ContextCompat.getMainExecutor(getContext())
                    );
                }

                @Override
                public void onFailure(@NonNull Throwable t) {
                    call.reject(t.getMessage() != null ? t.getMessage() : "status_failed");
                }
            },
            ContextCompat.getMainExecutor(getContext())
        );
    }
}
