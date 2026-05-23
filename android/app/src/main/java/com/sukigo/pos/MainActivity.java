package com.sukigo.pos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final int BLUETOOTH_PERMISSION_REQUEST_CODE = 12021;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		requestBluetoothPermissionsIfNeeded();
	}

	private void requestBluetoothPermissionsIfNeeded() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
			boolean scanGranted = ContextCompat.checkSelfPermission(
				this,
				Manifest.permission.BLUETOOTH_SCAN
			) == PackageManager.PERMISSION_GRANTED;

			boolean connectGranted = ContextCompat.checkSelfPermission(
				this,
				Manifest.permission.BLUETOOTH_CONNECT
			) == PackageManager.PERMISSION_GRANTED;

			if (!scanGranted || !connectGranted) {
				ActivityCompat.requestPermissions(
					this,
					new String[] {
						Manifest.permission.BLUETOOTH_SCAN,
						Manifest.permission.BLUETOOTH_CONNECT
					},
					BLUETOOTH_PERMISSION_REQUEST_CODE
				);
			}
			return;
		}

		boolean locationGranted = ContextCompat.checkSelfPermission(
			this,
			Manifest.permission.ACCESS_FINE_LOCATION
		) == PackageManager.PERMISSION_GRANTED;

		if (!locationGranted) {
			ActivityCompat.requestPermissions(
				this,
				new String[] { Manifest.permission.ACCESS_FINE_LOCATION },
				BLUETOOTH_PERMISSION_REQUEST_CODE
			);
		}
	}
}
