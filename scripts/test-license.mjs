#!/usr/bin/env node
/**
 * License 系统本地测试工具
 * 用法: node scripts/test-license.mjs
 */

import { createHmac, randomUUID } from "crypto";

// ============ 配置 ============
const CONFIG = {
  baseUrl: "https://fk.263362.xyz",
  productCode: "1002",
  apiKey: "26CBCDC86D23BF796AC0C98FE4C34A78",
  deviceId: "test-device-001",
  fingerprint: "test-fingerprint-abc123",
};
// ==============================

function sign(params, apiKey) {
  // 服务端格式: productCode|key|deviceId|timestamp|nonce
  const canonical = [
    params.productCode,
    params.key || params.licenseId,
    params.deviceId,
    params.timestamp,
    params.nonce
  ].join("|");
  return createHmac("sha256", apiKey).update(canonical).digest("hex");
}

async function apiCall(path, body) {
  const res = await fetch(`${CONFIG.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function activate(key) {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = sign(
    { productCode: CONFIG.productCode, key, deviceId: CONFIG.deviceId, timestamp, nonce },
    CONFIG.apiKey
  );

  return apiCall("/api/license/activate", {
    productCode: CONFIG.productCode,
    key,
    deviceId: CONFIG.deviceId,
    platform: "windows",
    fingerprint: CONFIG.fingerprint,
    appVersion: "1.0.0",
    timestamp,
    nonce,
    signature,
  });
}

async function verify(licenseId) {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = sign(
    { productCode: CONFIG.productCode, licenseId, deviceId: CONFIG.deviceId, timestamp, nonce },
    CONFIG.apiKey
  );

  return apiCall("/api/license/verify", {
    productCode: CONFIG.productCode,
    licenseId,
    deviceId: CONFIG.deviceId,
    fingerprint: CONFIG.fingerprint,
    timestamp,
    nonce,
    signature,
  });
}

async function heartbeat(licenseId) {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = sign(
    { productCode: CONFIG.productCode, licenseId, deviceId: CONFIG.deviceId, timestamp, nonce },
    CONFIG.apiKey
  );

  return apiCall("/api/license/heartbeat", {
    productCode: CONFIG.productCode,
    licenseId,
    deviceId: CONFIG.deviceId,
    timestamp,
    nonce,
    signature,
  });
}

async function deactivate(licenseId) {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = sign(
    { productCode: CONFIG.productCode, licenseId, deviceId: CONFIG.deviceId, timestamp, nonce },
    CONFIG.apiKey
  );

  return apiCall("/api/license/deactivate", {
    productCode: CONFIG.productCode,
    licenseId,
    deviceId: CONFIG.deviceId,
    reason: "测试解绑",
    timestamp,
    nonce,
    signature,
  });
}

// ============ 测试用例 ============

async function testActivate(key) {
  console.log("\n=== 测试激活 ===");
  console.log(`Key: ${key}`);
  const result = await activate(key);
  console.log(`结果: ${result.code === 0 ? "成功" : "失败"}`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function testVerify(licenseId) {
  console.log("\n=== 测试验证 ===");
  const result = await verify(licenseId);
  console.log(`结果: ${result.code === 0 && result.data?.valid ? "有效" : "无效"}`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function testHeartbeat(licenseId) {
  console.log("\n=== 测试心跳 ===");
  const result = await heartbeat(licenseId);
  console.log(`结果: ${result.code === 0 ? "成功" : "失败"}`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function testDeactivate(licenseId) {
  console.log("\n=== 测试解绑 ===");
  const result = await deactivate(licenseId);
  console.log(`结果: ${result.code === 0 ? "成功" : "失败"}`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function testFullFlow(key) {
  console.log("========================================");
  console.log("License 系统完整流程测试");
  console.log("========================================");

  // 1. 激活
  const activateResult = await testActivate(key);
  if (activateResult.code !== 0) {
    console.log("\n❌ 激活失败，终止测试");
    return;
  }

  const licenseId = activateResult.data.licenseId;
  console.log(`\n✅ 激动成功，License ID: ${licenseId}`);

  // 2. 验证
  await testVerify(licenseId);

  // 3. 心跳
  await testHeartbeat(licenseId);

  // 4. 解绑
  await testDeactivate(licenseId);

  // 5. 再次验证（应该失败）
  console.log("\n=== 再次验证（应该失败） ===");
  const verifyAfterDeactivate = await testVerify(licenseId);
  if (!verifyAfterDeactivate.data?.valid) {
    console.log("\n✅ 解绑后验证失败，符合预期");
  }

  console.log("\n========================================");
  console.log("测试完成");
  console.log("========================================");
}

// ============ 主程序 ============

const args = process.argv.slice(2);
const command = args[0];
const key = args[1];

if (!CONFIG.apiKey) {
  console.error("错误: 请先在 CONFIG.apiKey 填入产品 API Key");
  console.error("获取方式: 后台 /admin/licenses → 产品管理 → 复制 API Key");
  process.exit(1);
}

switch (command) {
  case "activate":
    if (!key) { console.error("用法: node scripts/test-license.mjs activate <key>"); process.exit(1); }
    testActivate(key);
    break;
  case "verify":
    if (!key) { console.error("用法: node scripts/test-license.mjs verify <licenseId>"); process.exit(1); }
    testVerify(Number(key));
    break;
  case "heartbeat":
    if (!key) { console.error("用法: node scripts/test-license.mjs heartbeat <licenseId>"); process.exit(1); }
    testHeartbeat(Number(key));
    break;
  case "deactivate":
    if (!key) { console.error("用法: node scripts/test-license.mjs deactivate <licenseId>"); process.exit(1); }
    testDeactivate(Number(key));
    break;
  case "full":
    if (!key) { console.error("用法: node scripts/test-license.mjs full <key>"); process.exit(1); }
    testFullFlow(key);
    break;
  default:
    console.log("License 系统本地测试工具");
    console.log("");
    console.log("用法:");
    console.log("  node scripts/test-license.mjs activate <key>     激活 Key");
    console.log("  node scripts/test-license.mjs verify <id>       验证 License");
    console.log("  node scripts/test-license.mjs heartbeat <id>    心跳保活");
    console.log("  node scripts/test-license.mjs deactivate <id>   解绑设备");
    console.log("  node scripts/test-license.mjs full <key>        完整流程测试");
    console.log("");
    console.log("示例:");
    console.log("  node scripts/test-license.mjs full TRIAL-EDGE-A1B2C3D4");
}
