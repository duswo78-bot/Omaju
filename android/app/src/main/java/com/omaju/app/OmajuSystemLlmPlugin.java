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
 * AICore / Gemini Nano via ML Kit GenAI Prompt.
 * genai-prompt beta3+ 일부 기기에서 FEATURE_NOT_FOUND(648) → beta2 권장.
 */
@CapacitorPlugin(name = "OmajuSystemLlm")
public class OmajuSystemLlmPlugin extends Plugin {
    private static final String TAG = "OmajuSystemLlm";

    private GenerativeModelFutures cachedModel;

    private GenerativeModelFutures model() {
        if (cachedModel == null) {
            cachedModel = GenerativeModelFutures.from(Generation.INSTANCE.getClient());
        }
        return cachedModel;
    }

    private JSObject statusPayload(boolean available, String reason) {
        JSObject ret = new JSObject();
        ret.put("available", available);
        ret.put("reason", reason);
        ret.put("provider", "android");
        return ret;
    }

    @PluginMethod
    public void probe(PluginCall call) {
        GenerativeModelFutures generativeModel;
        try {
            generativeModel = model();
        } catch (Throwable t) {
            Log.w(TAG, "model init failed", t);
            call.resolve(statusPayload(false, "init_failed:" + safeMsg(t)));
            return;
        }

        Futures.addCallback(
            generativeModel.checkStatus(),
            new FutureCallback<Integer>() {
                @Override
                public void onSuccess(Integer featureStatus) {
                    int status = featureStatus == null ? FeatureStatus.UNAVAILABLE : featureStatus;
                    Log.i(TAG, "checkStatus=" + status);

                    if (status == FeatureStatus.AVAILABLE) {
                        call.resolve(statusPayload(true, "ok"));
                        return;
                    }
                    if (status == FeatureStatus.DOWNLOADABLE) {
                        call.resolve(statusPayload(false, "downloadable"));
                        startDownload(generativeModel);
                        return;
                    }
                    if (status == FeatureStatus.DOWNLOADING) {
                        call.resolve(statusPayload(false, "downloading"));
                        return;
                    }
                    call.resolve(statusPayload(false, "unavailable:" + status));
                }

                @Override
                public void onFailure(@NonNull Throwable t) {
                    Log.w(TAG, "probe failed", t);
                    call.resolve(statusPayload(false, "probe_failed:" + safeMsg(t)));
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
                    notifyDownload("started", 0);
                }

                @Override
                public void onDownloadProgress(long bytesDownloaded) {
                    Log.d(TAG, "Gemini Nano downloaded bytes=" + bytesDownloaded);
                    notifyDownload("progress", bytesDownloaded);
                }

                @Override
                public void onDownloadCompleted() {
                    Log.d(TAG, "Gemini Nano download complete");
                    notifyDownload("completed", -1);
                }

                @Override
                public void onDownloadFailed(@NonNull GenAiException e) {
                    Log.e(TAG, "Gemini Nano download failed: " + e.getMessage());
                    notifyDownload("failed:" + safeMsg(e), -1);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "download kickoff failed", e);
            notifyDownload("failed:" + safeMsg(e), -1);
        }
    }

    private void notifyDownload(String state, long bytes) {
        JSObject data = new JSObject();
        data.put("state", state);
        data.put("bytes", bytes);
        notifyListeners("aicoreDownload", data);
    }

    private static String safeMsg(Throwable t) {
        if (t == null || t.getMessage() == null) return "unknown";
        String m = t.getMessage();
        return m.length() > 120 ? m.substring(0, 120) : m;
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

        GenerativeModelFutures generativeModel;
        try {
            generativeModel = model();
        } catch (Throwable t) {
            call.reject("model_unavailable:" + safeMsg(t));
            return;
        }

        Futures.addCallback(
            generativeModel.checkStatus(),
            new FutureCallback<Integer>() {
                @Override
                public void onSuccess(Integer featureStatus) {
                    int status = featureStatus == null ? FeatureStatus.UNAVAILABLE : featureStatus;
                    if (status != FeatureStatus.AVAILABLE) {
                        if (status == FeatureStatus.DOWNLOADABLE) {
                            startDownload(generativeModel);
                        }
                        call.reject("model_unavailable:status=" + status);
                        return;
                    }

                    GenerateContentRequest.Builder requestBuilder =
                        new GenerateContentRequest.Builder(new TextPart(prompt));
                    requestBuilder.setTemperature(temperature);
                    requestBuilder.setTopK(40);
                    requestBuilder.setCandidateCount(1);
                    requestBuilder.setMaxOutputTokens(maxTokens);

                    Futures.addCallback(
                        generativeModel.generateContent(requestBuilder.build()),
                        new FutureCallback<GenerateContentResponse>() {
                            @Override
                            public void onSuccess(GenerateContentResponse response) {
                                String text = "";
                                try {
                                    if (response != null
                                        && response.getCandidates() != null
                                        && !response.getCandidates().isEmpty()) {
                                        text = response.getCandidates().get(0).getText();
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
