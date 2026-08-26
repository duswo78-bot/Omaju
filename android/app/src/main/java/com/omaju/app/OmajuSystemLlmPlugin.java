package com.omaju.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Stub provider for CI / devices without ML Kit GenAI wired in.
 * JS androidProvider still calls probe/generate; always reports unavailable → LITE mode.
 *
 * Full AICore (Gemini Nano) implementation is kept out of the default APK build
 * until the GenAI dependency is re-enabled in app/build.gradle.
 */
@CapacitorPlugin(name = "OmajuSystemLlm")
public class OmajuSystemLlmPlugin extends Plugin {

    @PluginMethod
    public void probe(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", false);
        ret.put("reason", "stub_ci");
        ret.put("provider", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void generate(PluginCall call) {
        call.reject("model_unavailable");
    }
}
