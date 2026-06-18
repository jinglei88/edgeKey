# Android Kotlin SDK 示例

## 概述

本文档提供 Android 应用接入 License 授权系统的 Kotlin 示例代码。

## 核心类

### LicenseClient.kt

```kotlin
package com.example.licensesdk

import android.content.Context
import android.os.Build
import android.provider.Settings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class LicenseConfig(
    val baseUrl: String = "https://your-domain.com",
    val productCode: String = "your-product",
    val secret: String = ""
)

data class LicenseActivateResult(
    val code: Int,
    val data: LicenseActivateData?,
    val message: String
)

data class LicenseActivateData(
    val licenseId: Int,
    val productCode: String,
    val licenseType: String,
    val status: String,
    val activatedAt: String,
    val expireAt: String?,
    val leftSeconds: Int?,
    val verifyToken: String
)

data class LicenseVerifyResult(
    val code: Int,
    val data: LicenseVerifyData?,
    val message: String
)

data class LicenseVerifyData(
    val valid: Boolean,
    val productCode: String,
    val licenseType: String,
    val status: String,
    val expireAt: String?,
    val leftSeconds: Int?,
    val verifyToken: String
)

data class LicenseHeartbeatResult(
    val code: Int,
    val data: LicenseHeartbeatData?,
    val message: String
)

data class LicenseHeartbeatData(
    val ok: Boolean,
    val lastSeenAt: String
)

data class LicenseDeactivateResult(
    val code: Int,
    val data: LicenseDeactivateData?,
    val message: String
)

data class LicenseDeactivateData(
    val ok: Boolean,
    val message: String
)

class LicenseClient(
    private val context: Context,
    private val config: LicenseConfig
) {
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val deviceId: String by lazy { getDeviceId() }
    private val fingerprint: String by lazy { getDeviceFingerprint() }

    /**
     * 激活 License
     */
    suspend fun activate(key: String): LicenseActivateResult = withContext(Dispatchers.IO) {
        val timestamp = System.currentTimeMillis()
        val nonce = UUID.randomUUID().toString()
        val canonical = "${config.productCode}|$key|$deviceId|$timestamp|$nonce"
        val signature = computeHmacSha256(config.secret, canonical)

        val request = JSONObject().apply {
            put("productCode", config.productCode)
            put("key", key)
            put("deviceId", deviceId)
            put("platform", "android")
            put("fingerprint", fingerprint)
            put("appVersion", getAppVersion())
            put("timestamp", timestamp)
            put("nonce", nonce)
            put("signature", signature)
        }

        post("/api/license/activate", request) { json ->
            LicenseActivateResult(
                code = json.getInt("code"),
                data = json.optJSONObject("data")?.let {
                    LicenseActivateData(
                        licenseId = it.getInt("licenseId"),
                        productCode = it.getString("productCode"),
                        licenseType = it.getString("licenseType"),
                        status = it.getString("status"),
                        activatedAt = it.getString("activatedAt"),
                        expireAt = it.optString("expireAt"),
                        leftSeconds = if (it.isNull("leftSeconds")) null else it.getInt("leftSeconds"),
                        verifyToken = it.getString("verifyToken")
                    )
                },
                message = json.getString("message")
            )
        }
    }

    /**
     * 验证 License
     */
    suspend fun verify(licenseId: Int): LicenseVerifyResult = withContext(Dispatchers.IO) {
        val timestamp = System.currentTimeMillis()
        val nonce = UUID.randomUUID().toString()
        val canonical = "${config.productCode}|$licenseId|$deviceId|$timestamp|$nonce"
        val signature = computeHmacSha256(config.secret, canonical)

        val request = JSONObject().apply {
            put("productCode", config.productCode)
            put("licenseId", licenseId)
            put("deviceId", deviceId)
            put("fingerprint", fingerprint)
            put("timestamp", timestamp)
            put("nonce", nonce)
            put("signature", signature)
        }

        post("/api/license/verify", request) { json ->
            LicenseVerifyResult(
                code = json.getInt("code"),
                data = json.optJSONObject("data")?.let {
                    LicenseVerifyData(
                        valid = it.getBoolean("valid"),
                        productCode = it.getString("productCode"),
                        licenseType = it.getString("licenseType"),
                        status = it.getString("status"),
                        expireAt = it.optString("expireAt"),
                        leftSeconds = if (it.isNull("leftSeconds")) null else it.getInt("leftSeconds"),
                        verifyToken = it.getString("verifyToken")
                    )
                },
                message = json.getString("message")
            )
        }
    }

    /**
     * 心跳保活
     */
    suspend fun heartbeat(licenseId: Int): LicenseHeartbeatResult = withContext(Dispatchers.IO) {
        val timestamp = System.currentTimeMillis()
        val nonce = UUID.randomUUID().toString()
        val canonical = "${config.productCode}|$licenseId|$deviceId|$timestamp|$nonce"
        val signature = computeHmacSha256(config.secret, canonical)

        val request = JSONObject().apply {
            put("productCode", config.productCode)
            put("licenseId", licenseId)
            put("deviceId", deviceId)
            put("timestamp", timestamp)
            put("nonce", nonce)
            put("signature", signature)
        }

        post("/api/license/heartbeat", request) { json ->
            LicenseHeartbeatResult(
                code = json.getInt("code"),
                data = json.optJSONObject("data")?.let {
                    LicenseHeartbeatData(
                        ok = it.getBoolean("ok"),
                        lastSeenAt = it.getString("lastSeenAt")
                    )
                },
                message = json.getString("message")
            )
        }
    }

    /**
     * 解绑设备（仅非 TRIAL）
     */
    suspend fun deactivate(licenseId: Int, reason: String = ""): LicenseDeactivateResult = withContext(Dispatchers.IO) {
        val timestamp = System.currentTimeMillis()
        val nonce = UUID.randomUUID().toString()
        val canonical = "${config.productCode}|$licenseId|$deviceId|$timestamp|$nonce"
        val signature = computeHmacSha256(config.secret, canonical)

        val request = JSONObject().apply {
            put("productCode", config.productCode)
            put("licenseId", licenseId)
            put("deviceId", deviceId)
            put("reason", reason)
            put("timestamp", timestamp)
            put("nonce", nonce)
            put("signature", signature)
        }

        post("/api/license/deactivate", request) { json ->
            LicenseDeactivateResult(
                code = json.getInt("code"),
                data = json.optJSONObject("data")?.let {
                    LicenseDeactivateData(
                        ok = it.getBoolean("ok"),
                        message = it.getString("message")
                    )
                },
                message = json.getString("message")
            )
        }
    }

    /**
     * 获取设备 ID
     */
    private fun getDeviceId(): String {
        return Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            ?: UUID.randomUUID().toString()
    }

    /**
     * 获取设备指纹（多维度硬件信息组合）
     */
    private fun getDeviceFingerprint(): String {
        val components = listOf(
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "",
            Build.BOARD,
            Build.DEVICE,
            Build.MODEL,
            Build.MANUFACTURER,
            Build.HARDWARE
        )

        val combined = components.joinToString("|")
        return computeSha256(combined)
    }

    private fun getAppVersion(): String {
        return try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    private fun <T> post(path: String, body: JSONObject, parser: (JSONObject) -> T): T {
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = body.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url("${config.baseUrl}$path")
            .post(requestBody)
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body?.string() ?: throw Exception("Empty response")

        val json = JSONObject(responseBody)
        return parser(json)
    }

    companion object {
        private fun computeHmacSha256(secret: String, message: String): String {
            val mac = Mac.getInstance("HmacSHA256")
            val secretKeySpec = SecretKeySpec(secret.toByteArray(), "HmacSHA256")
            mac.init(secretKeySpec)
            val hash = mac.doFinal(message.toByteArray())
            return hash.joinToString("") { "%02x".format(it) }
        }

        private fun computeSha256(input: String): String {
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(input.toByteArray())
            return hash.joinToString("") { "%02x".format(it) }
        }
    }
}
```

## 使用示例

### MainActivity.kt

```kotlin
package com.example.myapplication

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.licensesdk.LicenseClient
import com.example.licensesdk.LicenseConfig
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var licenseClient: LicenseClient
    private var licenseId: Int? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 初始化 License Client
        val config = LicenseConfig(
            baseUrl = "https://your-domain.com",
            productCode = "edgekey",
            secret = "your-auth-secret"
        )
        licenseClient = LicenseClient(this, config)

        val keyInput = findViewById<EditText>(R.id.keyInput)
        val activateButton = findViewById<Button>(R.id.activateButton)
        val statusText = findViewById<TextView>(R.id.statusText)

        // 激活按钮
        activateButton.setOnClickListener {
            val key = keyInput.text.toString()
            if (key.isBlank()) {
                statusText.text = "请输入 Key"
                return@setOnClickListener
            }

            lifecycleScope.launch {
                try {
                    val result = licenseClient.activate(key)
                    if (result.code != 0) {
                        statusText.text = "激活失败: ${result.message}"
                        return@launch
                    }

                    licenseId = result.data?.licenseId
                    statusText.text = buildString {
                        appendLine("激活成功!")
                        appendLine("License ID: ${result.data?.licenseId}")
                        appendLine("类型: ${result.data?.licenseType}")
                        appendLine("过期时间: ${result.data?.expireAt ?: "永久"}")
                        appendLine("剩余时间: ${result.data?.leftSeconds?.toString() ?: "无限"} 秒")
                    }

                    // 启动心跳
                    startHeartbeat(licenseId!!)
                } catch (e: Exception) {
                    statusText.text = "激活异常: ${e.message}"
                }
            }
        }
    }

    private fun startHeartbeat(licenseId: Int) {
        lifecycleScope.launch {
            while (true) {
                delay(5 * 60 * 1000) // 5 分钟
                try {
                    val result = licenseClient.heartbeat(licenseId)
                    if (result.code != 0) {
                        // 心跳失败，可能需要重新验证
                        break
                    }
                } catch (e: Exception) {
                    // 网络异常，继续重试
                }
            }
        }
    }
}
```

## Gradle 依赖

```groovy
dependencies {
    implementation "com.squareup.okhttp3:okhttp:4.12.0"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
}
```

## 权限配置

### AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## 注意事项

1. **Secret 安全**：不要将 Secret 硬编码在代码中，建议使用 BuildConfig 或加密存储
2. **设备指纹**：使用多维度硬件信息组合，确保稳定性
3. **心跳间隔**：建议 5-10 分钟
4. **错误处理**：网络异常时使用本地缓存的 token 短期可用
5. **token 存储**：使用 EncryptedSharedPreferences
6. **协程使用**：所有网络操作都在协程中执行，避免阻塞主线程
