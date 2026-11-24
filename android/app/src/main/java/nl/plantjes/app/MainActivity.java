package nl.plantjes.app;

import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Capacitor 8 has no built-in hardware back handler. Ask the web shell
        // first so it can close a dialog, menu or screen before the app exits.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                    "(function(){"
                        + "var e=new CustomEvent('plantjes:back',{cancelable:true});"
                        + "window.dispatchEvent(e);"
                        + "return e.defaultPrevented;"
                        + "})()",
                    handled -> {
                        if (!"true".equals(handled)) {
                            moveTaskToBack(true);
                        }
                    }
                );
            }
        });
    }
}
