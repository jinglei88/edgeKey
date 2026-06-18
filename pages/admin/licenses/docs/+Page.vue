<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-6">
      <div>
        <h1 class="text-2xl font-bold">开发文档</h1>
        <p class="text-sm text-base-content/70">License 授权系统 API 文档和 SDK 接入指南。</p>
      </div>

      <!-- API 接口文档 -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" checked />
        <div class="collapse-title text-lg font-semibold">API 接口</div>
        <div class="collapse-content space-y-4">
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>接口</th>
                  <th>方法</th>
                  <th>路径</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>激活</td>
                  <td><code>POST</code></td>
                  <td><code>/api/license/activate</code></td>
                  <td>绑定设备，首次激活开始倒计时</td>
                </tr>
                <tr>
                  <td>验证</td>
                  <td><code>POST</code></td>
                  <td><code>/api/license/verify</code></td>
                  <td>校验有效性，返回 token</td>
                </tr>
                <tr>
                  <td>心跳</td>
                  <td><code>POST</code></td>
                  <td><code>/api/license/heartbeat</code></td>
                  <td>保活，刷新 lastSeenAt</td>
                </tr>
                <tr>
                  <td>解绑</td>
                  <td><code>POST</code></td>
                  <td><code>/api/license/deactivate</code></td>
                  <td>仅非 TRIAL 可用</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 签名算法 -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">签名算法</div>
        <div class="collapse-content space-y-3">
          <p class="text-sm">所有请求使用 HMAC-SHA256 签名验证：</p>
          <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto"><code>signature = HMAC-SHA256(secret, canonicalString)</code></pre>
          <p class="text-sm font-medium">Canonical String 格式：</p>
          <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto"><code>激活：productCode|key|deviceId|timestamp|nonce
验证/心跳/解绑：productCode|licenseId|deviceId|timestamp|nonce</code></pre>
        </div>
      </div>

      <!-- 错误码 -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">错误码</div>
        <div class="collapse-content">
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>code</th>
                  <th>含义</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>0</td><td>成功</td></tr>
                <tr><td>1001</td><td>Key 不存在</td></tr>
                <tr><td>1002</td><td>Key 已失效/过期</td></tr>
                <tr><td>1003</td><td>设备不匹配</td></tr>
                <tr><td>1004</td><td>试用已用完</td></tr>
                <tr><td>1005</td><td>签名校验失败</td></tr>
                <tr><td>1006</td><td>请求过期/重放</td></tr>
                <tr><td>1007</td><td>参数错误</td></tr>
                <tr><td>1008</td><td>试用不支持解绑</td></tr>
                <tr><td>1009</td><td>产品不存在或已禁用</td></tr>
                <tr><td>1010</td><td>Key 与产品不匹配</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 激活请求示例 -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">激活请求示例</div>
        <div class="collapse-content space-y-3">
          <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto"><code>{
  "productCode": "edgekey",
  "key": "TRIAL-EDGE-A1B2C3D4",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "windows",
  "fingerprint": "a1b2c3d4e5f6...",
  "appVersion": "1.0.0",
  "timestamp": 1718788800000,
  "nonce": "random-string",
  "signature": "hmac-sha256-signature"
}</code></pre>
          <p class="text-sm font-medium">响应示例：</p>
          <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto"><code>{
  "code": 0,
  "data": {
    "licenseId": 1001,
    "productCode": "edgekey",
    "licenseType": "TRIAL",
    "status": "ACTIVE",
    "activatedAt": "2026-06-19T12:00:00Z",
    "expireAt": "2026-06-19T12:10:00Z",
    "leftSeconds": 600,
    "verifyToken": "abc123..."
  },
  "message": "success"
}</code></pre>
        </div>
      </div>

      <!-- Windows C# SDK -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">Windows C# SDK</div>
        <div class="collapse-content space-y-3">
          <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto"><code>// 1. 创建客户端
var config = new LicenseConfig
{
    BaseUrl = "https://your-domain.com",
    ProductCode = "edgekey",
    Secret = "your-auth-secret"
};
using var client = new LicenseClient(config);

// 2. 激活
var activateResult = await client.ActivateAsync("TRIAL-EDGE-A1B2C3D4");
if (activateResult.Code != 0)
{
    Console.WriteLine($"激活失败: {activateResult.Message}");
    return;
}

// 3. 验证
var verifyResult = await client.VerifyAsync(activateResult.Data.LicenseId);

// 4. 心跳（每 5 分钟）
var timer = new System.Threading.Timer(async _ =>
{
    await client.HeartbeatAsync(activateResult.Data.LicenseId);
}, null, TimeSpan.Zero, TimeSpan.FromMinutes(5));</code></pre>
        </div>
      </div>

      <!-- Android Kotlin SDK -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">Android Kotlin SDK</div>
        <div class="collapse-content space-y-3">
          <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto"><code>// 1. 创建客户端
val config = LicenseConfig(
    baseUrl = "https://your-domain.com",
    productCode = "edgekey",
    secret = "your-auth-secret"
)
val client = LicenseClient(context, config)

// 2. 激活
val result = client.activate("TRIAL-EDGE-A1B2C3D4")
if (result.code != 0) {
    println("激活失败: ${result.message}")
    return
}

// 3. 验证
val verifyResult = client.verify(result.data?.licenseId ?: 0)

// 4. 心跳（每 5 分钟）
lifecycleScope.launch {
    while (true) {
        delay(5 * 60 * 1000)
        client.heartbeat(result.data?.licenseId ?: 0)
    }
}</code></pre>
        </div>
      </div>

      <!-- Key 类型说明 -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">Key 类型说明</div>
        <div class="collapse-content">
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>默认时长</th>
                  <th>设备绑定</th>
                  <th>换绑</th>
                  <th>续期</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>TRIAL</td><td>10 分钟</td><td>必须</td><td>不允许</td><td>不允许</td></tr>
                <tr><td>DAY</td><td>24 小时</td><td>必须</td><td>允许</td><td>允许</td></tr>
                <tr><td>MONTH</td><td>30 天</td><td>必须</td><td>允许</td><td>允许</td></tr>
                <tr><td>YEAR</td><td>365 天</td><td>必须</td><td>允许</td><td>允许</td></tr>
                <tr><td>PERMANENT</td><td>永久</td><td>必须</td><td>允许</td><td>不需要</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 客户端实现要点 -->
      <div class="collapse collapse-plus bg-base-200">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-semibold">客户端实现要点</div>
        <div class="collapse-content space-y-2 text-sm">
          <p><strong>1. 签名计算：</strong>使用 HMAC-SHA256，secret 从安全配置读取</p>
          <p><strong>2. 时间戳校验：</strong>服务端校验时间窗为 ±5 分钟</p>
          <p><strong>3. Nonce 生成：</strong>使用 UUID 或随机字符串，确保每次请求唯一</p>
          <p><strong>4. 心跳策略：</strong>间隔 5-10 分钟，失败重试 3 次</p>
          <p><strong>5. Token 缓存：</strong>缓存 verifyToken，有效期 5-15 分钟</p>
          <p><strong>6. 离线策略：</strong>首次激活必须在线，验证后缓存 token 短期可用</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>
