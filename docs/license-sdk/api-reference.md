# License API 参考文档

## 概述

本文档描述 License 授权系统的 API 接口规范，供客户端开发者对接使用。

## 基础信息

- **Base URL**: `https://your-domain.com`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8
- **时间格式**: ISO8601 (UTC)

## 鉴权方式

所有请求使用 HMAC-SHA256 签名验证。

### 签名算法

```
signature = HMAC-SHA256(secret, canonicalString)
```

### Canonical String 格式

**激活接口**:
```
productCode|key|deviceId|timestamp|nonce
```

**验证/心跳/解绑接口**:
```
productCode|licenseId|deviceId|timestamp|nonce
```

## 错误码

| code | 含义 |
|---|---|
| 0 | 成功 |
| 1001 | Key 不存在 |
| 1002 | Key 已失效/过期 |
| 1003 | 设备不匹配 |
| 1004 | 试用已用完 |
| 1005 | 签名校验失败 |
| 1006 | 请求过期/重放 |
| 1007 | 参数错误 |
| 1008 | 试用不支持解绑 |
| 1009 | 产品不存在或已禁用 |
| 1010 | Key 与产品不匹配 |

---

## API 接口

### 1. 激活 License

**POST** `/api/license/activate`

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| productCode | string | 是 | 产品编码 |
| key | string | 是 | License Key |
| deviceId | string | 是 | 设备唯一标识 |
| platform | string | 是 | 平台：`windows` / `android` |
| fingerprint | string | 是 | 设备指纹（SHA256） |
| appVersion | string | 否 | 应用版本号 |
| domain | string | 否 | 绑定域名 |
| timestamp | number | 是 | 请求时间戳（毫秒） |
| nonce | string | 是 | 随机字符串 |
| signature | string | 是 | HMAC-SHA256 签名 |

#### 请求示例

```json
{
  "productCode": "edgekey",
  "key": "TRIAL-EDGE-A1B2C3D4",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "windows",
  "fingerprint": "a1b2c3d4e5f6...",
  "appVersion": "1.0.0",
  "timestamp": 1718788800000,
  "nonce": "random-string",
  "signature": "hmac-sha256-signature"
}
```

#### 响应参数

| 字段 | 类型 | 说明 |
|---|---|---|
| code | number | 状态码，0 表示成功 |
| data | object | 响应数据 |
| data.licenseId | number | License ID |
| data.productCode | string | 产品编码 |
| data.licenseType | string | Key 类型 |
| data.status | string | 状态 |
| data.activatedAt | string | 激活时间 |
| data.expireAt | string | 过期时间（永久卡为 null） |
| data.leftSeconds | number | 剩余秒数（永久卡为 null） |
| data.verifyToken | string | 验证 token（短期有效） |
| message | string | 状态消息 |

#### 响应示例

```json
{
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
}
```

---

### 2. 验证 License

**POST** `/api/license/verify`

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| productCode | string | 是 | 产品编码 |
| licenseId | number | 是 | License ID |
| deviceId | string | 是 | 设备唯一标识 |
| fingerprint | string | 是 | 设备指纹（SHA256） |
| timestamp | number | 是 | 请求时间戳（毫秒） |
| nonce | string | 是 | 随机字符串 |
| signature | string | 是 | HMAC-SHA256 签名 |

#### 响应参数

| 字段 | 类型 | 说明 |
|---|---|---|
| code | number | 状态码 |
| data.valid | boolean | 是否有效 |
| data.productCode | string | 产品编码 |
| data.licenseType | string | Key 类型 |
| data.status | string | 状态 |
| data.expireAt | string | 过期时间 |
| data.leftSeconds | number | 剩余秒数 |
| data.verifyToken | string | 验证 token |
| message | string | 状态消息 |

---

### 3. 心跳保活

**POST** `/api/license/heartbeat`

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| productCode | string | 是 | 产品编码 |
| licenseId | number | 是 | License ID |
| deviceId | string | 是 | 设备唯一标识 |
| timestamp | number | 是 | 请求时间戳（毫秒） |
| nonce | string | 是 | 随机字符串 |
| signature | string | 是 | HMAC-SHA256 签名 |

#### 响应参数

| 字段 | 类型 | 说明 |
|---|---|---|
| code | number | 状态码 |
| data.ok | boolean | 是否成功 |
| data.lastSeenAt | string | 最后心跳时间 |
| message | string | 状态消息 |

---

### 4. 解绑设备

**POST** `/api/license/deactivate`

> 注意：TRIAL 类型不支持解绑，会返回错误码 1008

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| productCode | string | 是 | 产品编码 |
| licenseId | number | 是 | License ID |
| deviceId | string | 是 | 设备唯一标识 |
| reason | string | 否 | 解绑原因 |
| timestamp | number | 是 | 请求时间戳（毫秒） |
| nonce | string | 是 | 随机字符串 |
| signature | string | 是 | HMAC-SHA256 签名 |

#### 响应参数

| 字段 | 类型 | 说明 |
|---|---|---|
| code | number | 状态码 |
| data.ok | boolean | 是否成功 |
| data.message | string | 操作结果消息 |
| message | string | 状态消息 |

---

## 客户端实现要点

### 1. 签名计算

```javascript
// JavaScript 示例
const canonical = `${productCode}|${key}|${deviceId}|${timestamp}|${nonce}`;
const signature = CryptoJS.HmacSHA256(canonical, secret).toString();
```

```csharp
// C# 示例
var canonical = $"{productCode}|{key}|{deviceId}|{timestamp}|{nonce}";
using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical));
var signature = BitConverter.ToString(hash).Replace("-", "").ToLower();
```

```kotlin
// Kotlin 示例
val canonical = "$productCode|$key|$deviceId|$timestamp|$nonce"
val mac = Mac.getInstance("HmacSHA256")
mac.init(SecretKeySpec(secret.toByteArray(), "HmacSHA256"))
val hash = mac.doFinal(canonical.toByteArray())
val signature = hash.joinToString("") { "%02x".format(it) }
```

### 2. 时间戳校验

服务端校验时间窗为 ±5 分钟。客户端应确保系统时间准确。

### 3. Nonce 生成

使用 UUID 或随机字符串，确保每次请求唯一。

### 4. 心跳策略

- 间隔：5-10 分钟
- 失败重试：3 次，间隔递增
- 连续失败：重新验证

### 5. Token 缓存

- 缓存 verifyToken，减少在线验证次数
- Token 有效期：5-15 分钟
- 过期后自动重新验证

### 6. 离线策略

- 首次激活必须在线
- 验证后缓存 token，短期可用
- 建议每日至少在线验证一次

---

## 测试用例

### 正常流程

1. 激活 → 成功
2. 验证 → 有效
3. 心跳 → 成功
4. 到期 → 验证失败

### 异常流程

1. 重复激活 → 返回已激活信息
2. 换设备激活 → 返回 1003
3. 试用到期 → 返回 1002
4. 签名错误 → 返回 1005
5. 请求过期 → 返回 1006
6. 产品不匹配 → 返回 1010
7. TRIAL 解绑 → 返回 1008
