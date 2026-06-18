# Windows C# SDK 示例

## 概述

本文档提供 Windows 桌面应用接入 License 授权系统的 C# 示例代码。

## 核心类

### LicenseClient.cs

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Microsoft.Win32;

namespace LicenseSdk
{
    public class LicenseConfig
    {
        public string BaseUrl { get; set; } = "https://your-domain.com";
        public string ProductCode { get; set; } = "your-product";
        public string Secret { get; set; } = "";
    }

    public class LicenseClient : IDisposable
    {
        private readonly LicenseConfig _config;
        private readonly HttpClient _httpClient;
        private readonly string _deviceId;
        private readonly string _fingerprint;

        public LicenseClient(LicenseConfig config)
        {
            _config = config;
            _httpClient = new HttpClient { BaseAddress = new Uri(config.BaseUrl) };
            _deviceId = GetDeviceId();
            _fingerprint = GetDeviceFingerprint();
        }

        /// <summary>
        /// 激活 License
        /// </summary>
        public async Task<LicenseActivateResult> ActivateAsync(string key)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nonce = Guid.NewGuid().ToString();
            var canonical = $"{_config.ProductCode}|{key}|{_deviceId}|{timestamp}|{nonce}";
            var signature = ComputeHmacSha256(_config.Secret, canonical);

            var request = new
            {
                productCode = _config.ProductCode,
                key,
                deviceId = _deviceId,
                platform = "windows",
                fingerprint = _fingerprint,
                appVersion = GetAppVersion(),
                timestamp,
                nonce,
                signature
            };

            var response = await PostAsync<LicenseActivateResult>("/api/license/activate", request);
            return response;
        }

        /// <summary>
        /// 验证 License
        /// </summary>
        public async Task<LicenseVerifyResult> VerifyAsync(int licenseId)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nonce = Guid.NewGuid().ToString();
            var canonical = $"{_config.ProductCode}|{licenseId}|{_deviceId}|{timestamp}|{nonce}";
            var signature = ComputeHmacSha256(_config.Secret, canonical);

            var request = new
            {
                productCode = _config.ProductCode,
                licenseId,
                deviceId = _deviceId,
                fingerprint = _fingerprint,
                timestamp,
                nonce,
                signature
            };

            var response = await PostAsync<LicenseVerifyResult>("/api/license/verify", request);
            return response;
        }

        /// <summary>
        /// 心跳保活
        /// </summary>
        public async Task<LicenseHeartbeatResult> HeartbeatAsync(int licenseId)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nonce = Guid.NewGuid().ToString();
            var canonical = $"{_config.ProductCode}|{licenseId}|{_deviceId}|{timestamp}|{nonce}";
            var signature = ComputeHmacSha256(_config.Secret, canonical);

            var request = new
            {
                productCode = _config.ProductCode,
                licenseId,
                deviceId = _deviceId,
                timestamp,
                nonce,
                signature
            };

            var response = await PostAsync<LicenseHeartbeatResult>("/api/license/heartbeat", request);
            return response;
        }

        /// <summary>
        /// 解绑设备（仅非 TRIAL）
        /// </summary>
        public async Task<LicenseDeactivateResult> DeactivateAsync(int licenseId, string reason = "")
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var nonce = Guid.NewGuid().ToString();
            var canonical = $"{_config.ProductCode}|{licenseId}|{_deviceId}|{timestamp}|{nonce}";
            var signature = ComputeHmacSha256(_config.Secret, canonical);

            var request = new
            {
                productCode = _config.ProductCode,
                licenseId,
                deviceId = _deviceId,
                reason,
                timestamp,
                nonce,
                signature
            };

            var response = await PostAsync<LicenseDeactivateResult>("/api/license/deactivate", request);
            return response;
        }

        /// <summary>
        /// 获取设备 ID（基于硬件信息）
        /// </summary>
        private string GetDeviceId()
        {
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
                var machineGuid = key?.GetValue("MachineGuid")?.ToString() ?? "";
                return machineGuid;
            }
            catch
            {
                return Environment.MachineName;
            }
        }

        /// <summary>
        /// 获取设备指纹（多维度硬件信息组合）
        /// </summary>
        private string GetDeviceFingerprint()
        {
            var components = new[]
            {
                GetMachineGuid(),
                GetCpuId(),
                GetBoardSerial(),
                GetDiskSerial()
            };

            var combined = string.Join("|", components);
            return ComputeSha256(combined);
        }

        private string GetMachineGuid()
        {
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
                return key?.GetValue("MachineGuid")?.ToString() ?? "";
            }
            catch
            {
                return "";
            }
        }

        private string GetCpuId()
        {
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor");
                foreach (var obj in searcher.Get())
                {
                    return obj["ProcessorId"]?.ToString() ?? "";
                }
            }
            catch { }
            return "";
        }

        private string GetBoardSerial()
        {
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard");
                foreach (var obj in searcher.Get())
                {
                    return obj["SerialNumber"]?.ToString() ?? "";
                }
            }
            catch { }
            return "";
        }

        private string GetDiskSerial()
        {
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher("SELECT VolumeSerialNumber FROM Win32_LogicalDisk WHERE DeviceID='C:'");
                foreach (var obj in searcher.Get())
                {
                    return obj["VolumeSerialNumber"]?.ToString() ?? "";
                }
            }
            catch { }
            return "";
        }

        private string GetAppVersion()
        {
            return System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "1.0.0";
        }

        private static string ComputeHmacSha256(string secret, string message)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

        private static string ComputeSha256(string input)
        {
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }

        private async Task<T> PostAsync<T>(string path, object request)
        {
            var json = JsonConvert.SerializeObject(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(path, content);
            response.EnsureSuccessStatusCode();
            var responseJson = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<T>(responseJson);
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }

    // 响应模型
    public class LicenseActivateResult
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public LicenseActivateData Data { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class LicenseActivateData
    {
        [JsonProperty("licenseId")]
        public int LicenseId { get; set; }

        [JsonProperty("productCode")]
        public string ProductCode { get; set; }

        [JsonProperty("licenseType")]
        public string LicenseType { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("activatedAt")]
        public string ActivatedAt { get; set; }

        [JsonProperty("expireAt")]
        public string ExpireAt { get; set; }

        [JsonProperty("leftSeconds")]
        public int? LeftSeconds { get; set; }

        [JsonProperty("verifyToken")]
        public string VerifyToken { get; set; }
    }

    public class LicenseVerifyResult
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public LicenseVerifyData Data { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class LicenseVerifyData
    {
        [JsonProperty("valid")]
        public bool Valid { get; set; }

        [JsonProperty("productCode")]
        public string ProductCode { get; set; }

        [JsonProperty("licenseType")]
        public string LicenseType { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("expireAt")]
        public string ExpireAt { get; set; }

        [JsonProperty("leftSeconds")]
        public int? LeftSeconds { get; set; }

        [JsonProperty("verifyToken")]
        public string VerifyToken { get; set; }
    }

    public class LicenseHeartbeatResult
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public LicenseHeartbeatData Data { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class LicenseHeartbeatData
    {
        [JsonProperty("ok")]
        public bool Ok { get; set; }

        [JsonProperty("lastSeenAt")]
        public string LastSeenAt { get; set; }
    }

    public class LicenseDeactivateResult
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public LicenseDeactivateData Data { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class LicenseDeactivateData
    {
        [JsonProperty("ok")]
        public bool Ok { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }
}
```

## 使用示例

### Program.cs

```csharp
using System;
using System.Threading.Tasks;
using LicenseSdk;

class Program
{
    static async Task Main(string[] args)
    {
        var config = new LicenseConfig
        {
            BaseUrl = "https://your-domain.com",
            ProductCode = "edgekey",
            Secret = "your-auth-secret"
        };

        using var client = new LicenseClient(config);

        // 1. 激活
        Console.Write("请输入 License Key: ");
        var key = Console.ReadLine();

        var activateResult = await client.ActivateAsync(key);
        if (activateResult.Code != 0)
        {
            Console.WriteLine($"激活失败: {activateResult.Message}");
            return;
        }

        Console.WriteLine($"激活成功!");
        Console.WriteLine($"  License ID: {activateResult.Data.LicenseId}");
        Console.WriteLine($"  类型: {activateResult.Data.LicenseType}");
        Console.WriteLine($"  过期时间: {activateResult.Data.ExpireAt ?? "永久"}");
        Console.WriteLine($"  剩余时间: {activateResult.Data.LeftSeconds?.ToString() ?? "无限"} 秒");

        // 2. 验证
        var verifyResult = await client.VerifyAsync(activateResult.Data.LicenseId);
        if (verifyResult.Code != 0 || !verifyResult.Data.Valid)
        {
            Console.WriteLine($"验证失败: {verifyResult.Message}");
            return;
        }

        Console.WriteLine("验证通过，软件可以正常运行");

        // 3. 心跳（每 5 分钟）
        var heartbeatTimer = new System.Threading.Timer(async _ =>
        {
            var heartbeatResult = await client.HeartbeatAsync(activateResult.Data.LicenseId);
            Console.WriteLine($"心跳: {heartbeatResult.Data?.Ok}");
        }, null, TimeSpan.Zero, TimeSpan.FromMinutes(5));

        // 4. 等待用户退出
        Console.WriteLine("按任意键退出...");
        Console.ReadKey();

        // 5. 解绑（可选）
        // var deactivateResult = await client.DeactivateAsync(activateResult.Data.LicenseId, "用户主动解绑");
    }
}
```

## NuGet 依赖

```xml
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
```

## 注意事项

1. **Secret 安全**：不要将 Secret 硬编码在代码中，建议从配置文件或环境变量读取
2. **设备指纹**：使用多维度硬件信息组合，确保稳定性
3. **心跳间隔**：建议 5-10 分钟
4. **错误处理**：网络异常时使用本地缓存的 token 短期可用
5. **token 存储**：使用加密存储（如 Windows Credential Manager）
