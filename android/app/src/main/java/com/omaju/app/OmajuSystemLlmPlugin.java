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
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.prompt.GenerateContentRequest;
import com.google.mlkit.genai.prompt.GenerateContentResponse;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.TextPart;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;
import com.google.mlkit.genai.rewriting.Rewriter;
import com.google.mlkit.genai.rewriting.RewriterOptions;
import com.google.mlkit.genai.rewriting.Rewriting;
import com.google.mlkit.genai.rewriting.RewritingRequest;
import com.google.mlkit.genai.rewriting.RewritingResult;
import com.google.mlkit.genai.rewriting.RewritingSuggestion;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 온디바이스 GenAI 멀티 capability:
 * - Prompt (S26 등) : Front/Back 자유 생성
 * - Rewriting (S25 포함 feature 기기) : 템플릿 답변 말투 다듬기
 *
 * ML Kit GenAI APIs return Guava ListenableFuture — use .get() / Futures.addCallback,
 * not com.google.android.gms.tasks.Tasks.await().
 */
@CapacitorPlugin(name = "OmajuSystemLlm")
public class OmajuSystemLlmPlugin extends Plugin {
    private static final String TAG = "OmajuSystemLlm";

    private GenerativeModelFutures promptModel;
    private Rewriter rewriter;
    private final ExecutorService bgExecutor = Executors.newCachedThreadPool();

    private GenerativeModelFutures promptModel() {
        if (promptModel == null) {
            promptModel = GenerativeModelFutures.from(Generation.INSTANCE.getClient());
        }
        return promptModel;
    }

    private Rewriter rewriter() {
        if (rewriter == null) {
            RewriterOptions options =
                RewriterOptions.builder(getContext())
                    .setOutputType(RewriterOptions.OutputType.FRIENDLY)
                    .setLanguage(RewriterOptions.Language.KOREAN)
                    .build();
            rewriter = Rewriting.getClient(options);
        }
        return rewriter;
    }

    private static String statusName(int status) {
        if (status == FeatureStatus.AVAILABLE) return "available";
        if (status == FeatureStatus.DOWNLOADABLE) return "downloadable";
        if (status == FeatureStatus.DOWNLOADING) return "downloading";
        return "unavailable";
    }

    private void notifyDownload(String kind, String state, long bytes) {
        notifyDownload(kind, state, bytes, null);
    }

    private void notifyDownload(String kind, String state, long bytes, String error) {
        JSObject data = new JSObject();
        data.put("kind", kind);
        data.put("state", state);
        data.put("bytes", bytes);
        if (error != null && !error.isEmpty()) {
            data.put("error", error);
        }
        notifyListeners("aicoreDownload", data);
    }

    private static String safeMsg(Throwable t) {
        if (t == null || t.getMessage() == null) return "unknown";
        String m = t.getMessage();
        return m.length() > 120 ? m.substring(0, 120) : m;
    }

    @PluginMethod
    public void probe(PluginCall call) {
        JSObject caps = new JSObject();
        AtomicInteger pending = new AtomicInteger(2);

        final String[] promptStatus = {"unavailable"};
        final String[] rewriteStatus = {"unavailable"};

        Runnable finish = () -> {
            boolean promptOk = "available".equals(promptStatus[0]);
            boolean rewriteOk = "available".equals(rewriteStatus[0]);
            boolean downloading =
                "downloadable".equals(promptStatus[0])
                    || "downloading".equals(promptStatus[0])
                    || "downloadable".equals(rewriteStatus[0])
                    || "downloading".equals(rewriteStatus[0]);

            JSObject ret = new JSObject();
            ret.put("available", promptOk || rewriteOk);
            ret.put("provider", "android");
            if (promptOk) ret.put("reason", "ok:prompt");
            else if (rewriteOk) ret.put("reason", "ok:rewriting");
            else if (downloading) ret.put("reason", "downloading");
            else ret.put("reason", "unavailable");
            caps.put("prompt", promptStatus[0]);
            caps.put("rewriting", rewriteStatus[0]);
            ret.put("capabilities", caps);
            call.resolve(ret);
        };

        Runnable maybeFinish = () -> {
            if (pending.decrementAndGet() == 0) finish.run();
        };

        // Prompt
        try {
            Futures.addCallback(
                promptModel().checkStatus(),
                new FutureCallback<Integer>() {
                    @Override
                    public void onSuccess(Integer status) {
                        int s = status == null ? FeatureStatus.UNAVAILABLE : status;
                        promptStatus[0] = statusName(s);
                        Log.d(TAG, "prompt status=" + promptStatus[0]);
                        if (s == FeatureStatus.AVAILABLE) {
                            // First inference latency 개선 (문서: warmup 권장)
                            try {
                                promptModel().warmup();
                            } catch (Throwable ignored) {
                                /* optional */
                            }
                        }
                        // DOWNLOADABLE 상태는 보고만 하고, 다운로드는 generate() 호출 시 시작
                        maybeFinish.run();
                    }

                    @Override
                    public void onFailure(@NonNull Throwable t) {
                        Log.d(TAG, "prompt probe: " + safeMsg(t));
                        promptStatus[0] = "unavailable";
                        maybeFinish.run();
                    }
                },
                ContextCompat.getMainExecutor(getContext())
            );
        } catch (Throwable t) {
            Log.d(TAG, "prompt init: " + safeMsg(t));
            promptStatus[0] = "unavailable";
            maybeFinish.run();
        }

        // Rewriting (S25+) — ListenableFuture.get() on background thread
        bgExecutor.execute(() -> {
            try {
                Rewriter r = rewriter();
                Integer status = r.checkFeatureStatus().get();
                int s = status == null ? FeatureStatus.UNAVAILABLE : status;
                rewriteStatus[0] = statusName(s);
                Log.d(TAG, "rewriting status=" + rewriteStatus[0]);
                // DOWNLOADABLE 상태는 보고만 — 다운로드는 rewrite() 호출 시 시작
            } catch (Throwable t) {
                Log.d(TAG, "rewriting probe: " + safeMsg(t));
                rewriteStatus[0] = "unavailable";
            }
            maybeFinish.run();
        });
    }

    private void startPromptDownload(GenerativeModelFutures model) {
        try {
            model.download(new DownloadCallback() {
                @Override public void onDownloadStarted(long bytes) { notifyDownload("prompt", "started", bytes); }
                @Override public void onDownloadProgress(long bytes) { notifyDownload("prompt", "progress", bytes); }
                @Override public void onDownloadCompleted() { notifyDownload("prompt", "completed", -1); }
                @Override public void onDownloadFailed(@NonNull GenAiException e) {
                    Log.d(TAG, "prompt download failed: " + safeMsg(e));
                    notifyDownload("prompt", "failed", -1, safeMsg(e));
                }
            });
        } catch (Exception e) {
            Log.d(TAG, "prompt download failed: " + safeMsg(e));
            notifyDownload("prompt", "failed", -1, safeMsg(e));
        }
    }

    private void startRewriteDownload(Rewriter r) {
        try {
            r.downloadFeature(new DownloadCallback() {
                @Override public void onDownloadStarted(long bytes) { notifyDownload("rewriting", "started", bytes); }
                @Override public void onDownloadProgress(long bytes) { notifyDownload("rewriting", "progress", bytes); }
                @Override public void onDownloadCompleted() { notifyDownload("rewriting", "completed", -1); }
                @Override public void onDownloadFailed(@NonNull GenAiException e) {
                    Log.d(TAG, "rewriting download failed: " + safeMsg(e));
                    notifyDownload("rewriting", "failed", -1, safeMsg(e));
                }
            });
        } catch (Exception e) {
            Log.d(TAG, "rewriting download failed: " + safeMsg(e));
            notifyDownload("rewriting", "failed", -1, safeMsg(e));
        }
    }

    private static String extractText(GenerateContentResponse response) {
        try {
            if (response != null
                && response.getCandidates() != null
                && !response.getCandidates().isEmpty()) {
                String text = response.getCandidates().get(0).getText();
                return text != null ? text.trim() : "";
            }
        } catch (Exception e) {
            Log.w(TAG, "parse response", e);
        }
        return "";
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            call.reject("prompt_required");
            return;
        }
        String purpose = call.getString("purpose", "back");
        boolean stream = Boolean.TRUE.equals(call.getBoolean("stream", false));
        float temperature = "front".equals(purpose) ? 0.2f : 0.7f;
        int maxTokens = "front".equals(purpose) ? 256 : 220;

        GenerativeModelFutures model;
        try {
            model = promptModel();
        } catch (Throwable t) {
            call.reject("model_unavailable:" + safeMsg(t));
            return;
        }

        Futures.addCallback(
            model.checkStatus(),
            new FutureCallback<Integer>() {
                @Override
                public void onSuccess(Integer featureStatus) {
                    int status = featureStatus == null ? FeatureStatus.UNAVAILABLE : featureStatus;
                    if (status != FeatureStatus.AVAILABLE) {
                        call.reject("model_unavailable:status=" + status);
                        return;
                    }

                    // Builder setters return void in this ML Kit beta — do not chain
                    GenerateContentRequest.Builder requestBuilder =
                        new GenerateContentRequest.Builder(new TextPart(prompt));
                    requestBuilder.setTemperature(temperature);
                    requestBuilder.setTopK(40);
                    requestBuilder.setCandidateCount(1);
                    requestBuilder.setMaxOutputTokens(maxTokens);
                    GenerateContentRequest request = requestBuilder.build();

                    // Streaming: long BACK replies feel faster (ML Kit GenAI docs)
                    if (stream) {
                        final StringBuilder streamed = new StringBuilder();
                        try {
                            Futures.addCallback(
                                model.generateContent(
                                    request,
                                    (String chunk) -> {
                                        if (chunk == null || chunk.isEmpty()) return;
                                        streamed.append(chunk);
                                        JSObject data = new JSObject();
                                        data.put("chunk", chunk);
                                        data.put("text", streamed.toString());
                                        data.put("purpose", purpose);
                                        notifyListeners("promptChunk", data);
                                    }
                                ),
                                new FutureCallback<GenerateContentResponse>() {
                                    @Override
                                    public void onSuccess(GenerateContentResponse response) {
                                        String text = extractText(response);
                                        if (text.isEmpty()) text = streamed.toString().trim();
                                        JSObject ret = new JSObject();
                                        ret.put("text", text);
                                        ret.put("path", "prompt");
                                        ret.put("streamed", true);
                                        call.resolve(ret);
                                    }

                                    @Override
                                    public void onFailure(@NonNull Throwable t) {
                                        Log.w(TAG, "stream generate failed, fallback", t);
                                        runNonStreamGenerate(model, request, call);
                                    }
                                },
                                ContextCompat.getMainExecutor(getContext())
                            );
                        } catch (Throwable t) {
                            Log.w(TAG, "stream API unavailable, fallback", t);
                            runNonStreamGenerate(model, request, call);
                        }
                        return;
                    }

                    runNonStreamGenerate(model, request, call);
                }

                @Override
                public void onFailure(@NonNull Throwable t) {
                    call.reject(t.getMessage() != null ? t.getMessage() : "status_failed");
                }
            },
            ContextCompat.getMainExecutor(getContext())
        );
    }

    private void runNonStreamGenerate(
        GenerativeModelFutures model,
        GenerateContentRequest request,
        PluginCall call
    ) {
        Futures.addCallback(
            model.generateContent(request),
            new FutureCallback<GenerateContentResponse>() {
                @Override
                public void onSuccess(GenerateContentResponse response) {
                    JSObject ret = new JSObject();
                    ret.put("text", extractText(response));
                    ret.put("path", "prompt");
                    ret.put("streamed", false);
                    call.resolve(ret);
                }

                @Override
                public void onFailure(@NonNull Throwable t) {
                    call.reject(t.getMessage() != null ? t.getMessage() : "generate_failed");
                }
            },
            ContextCompat.getMainExecutor(getContext())
        );
    }

    /** 템플릿 답을 온디바이스 Rewriting으로 다듬기 (S25+) */
    @PluginMethod
    public void rewrite(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) {
            call.reject("text_required");
            return;
        }
        String cleaned = text.replaceAll("[\\p{So}\\p{Cn}]", " ").replaceAll("\\s{2,}", " ").trim();
        if (cleaned.length() > 500) cleaned = cleaned.substring(0, 500);
        final String input = cleaned;

        bgExecutor.execute(() -> {
            try {
                Rewriter r = rewriter();
                Integer statusObj = r.checkFeatureStatus().get();
                int status = statusObj == null ? FeatureStatus.UNAVAILABLE : statusObj;
                if (status != FeatureStatus.AVAILABLE) {
                    call.reject("rewriter_unavailable:status=" + status);
                    return;
                }

                RewritingRequest req = RewritingRequest.builder(input).build();
                RewritingResult result = r.runInference(req).get();
                String out = input;
                try {
                    List<RewritingSuggestion> results = result != null ? result.getResults() : null;
                    if (results != null && !results.isEmpty()) {
                        String suggestion = results.get(0).getText();
                        if (suggestion != null && !suggestion.trim().isEmpty()) {
                            out = suggestion.trim();
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "parse rewrite result", e);
                }
                JSObject ret = new JSObject();
                ret.put("text", out);
                ret.put("path", "rewriting");
                call.resolve(ret);
            } catch (Throwable t) {
                Log.e(TAG, "rewrite failed", t);
                call.reject(t.getMessage() != null ? t.getMessage() : "rewrite_failed");
            }
        });
    }

    @Override
    public void handleOnDestroy() {
        if (rewriter != null) {
            try { rewriter.close(); } catch (Exception ignored) {}
            rewriter = null;
        }
        bgExecutor.shutdownNow();
        super.handleOnDestroy();
    }
}
