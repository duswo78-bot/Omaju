package com.omaju.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OmajuSystemLlmPlugin.class);
        registerPlugin(OmajuKakaoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
