# Python SDK 示例

## 概述

本文档提供 Python 应用接入 License 授权系统的示例代码，支持 Windows/Linux/macOS。

## 核心类

### license_client.py

```python
import hashlib
import hmac
import json
import platform
import time
import uuid
from dataclasses import dataclass
from typing import Optional
import requests


@dataclass
class LicenseConfig:
    base_url: str = "https://your-domain.com"
    product_code: str = "your-product"
    secret: str = ""


@dataclass
class LicenseActivateData:
    license_id: int
    product_code: str
    license_type: str
    status: str
    activated_at: str
    expire_at: Optional[str]
    left_seconds: Optional[int]
    verify_token: str


@dataclass
class LicenseVerifyData:
    valid: bool
    product_code: str
    license_type: str
    status: str
    expire_at: Optional[str]
    left_seconds: Optional[int]
    verify_token: str


@dataclass
class LicenseHeartbeatData:
    ok: bool
    last_seen_at: str


@dataclass
class LicenseDeactivateData:
    ok: bool
    message: str


class LicenseClient:
    def __init__(self, config: LicenseConfig):
        self.config = config
        self.session = requests.Session()
        self.device_id = self._get_device_id()
        self.fingerprint = self._get_device_fingerprint()

    def activate(self, key: str) -> dict:
        """激活 License"""
        timestamp = int(time.time() * 1000)
        nonce = str(uuid.uuid4())
        canonical = f"{self.config.product_code}|{key}|{self.device_id}|{timestamp}|{nonce}"
        signature = self._compute_hmac_sha256(self.config.secret, canonical)

        payload = {
            "productCode": self.config.product_code,
            "key": key,
            "deviceId": self.device_id,
            "platform": platform.system().lower(),
            "fingerprint": self.fingerprint,
            "appVersion": "1.0.0",
            "timestamp": timestamp,
            "nonce": nonce,
            "signature": signature,
        }

        response = self.session.post(
            f"{self.config.base_url}/api/license/activate",
            json=payload,
        )
        return response.json()

    def verify(self, license_id: int) -> dict:
        """验证 License"""
        timestamp = int(time.time() * 1000)
        nonce = str(uuid.uuid4())
        canonical = f"{self.config.product_code}|{license_id}|{self.device_id}|{timestamp}|{nonce}"
        signature = self._compute_hmac_sha256(self.config.secret, canonical)

        payload = {
            "productCode": self.config.product_code,
            "licenseId": license_id,
            "deviceId": self.device_id,
            "fingerprint": self.fingerprint,
            "timestamp": timestamp,
            "nonce": nonce,
            "signature": signature,
        }

        response = self.session.post(
            f"{self.config.base_url}/api/license/verify",
            json=payload,
        )
        return response.json()

    def heartbeat(self, license_id: int) -> dict:
        """心跳保活"""
        timestamp = int(time.time() * 1000)
        nonce = str(uuid.uuid4())
        canonical = f"{self.config.product_code}|{license_id}|{self.device_id}|{timestamp}|{nonce}"
        signature = self._compute_hmac_sha256(self.config.secret, canonical)

        payload = {
            "productCode": self.config.product_code,
            "licenseId": license_id,
            "deviceId": self.device_id,
            "timestamp": timestamp,
            "nonce": nonce,
            "signature": signature,
        }

        response = self.session.post(
            f"{self.config.base_url}/api/license/heartbeat",
            json=payload,
        )
        return response.json()

    def deactivate(self, license_id: int, reason: str = "") -> dict:
        """解绑设备（仅非 TRIAL）"""
        timestamp = int(time.time() * 1000)
        nonce = str(uuid.uuid4())
        canonical = f"{self.config.product_code}|{license_id}|{self.device_id}|{timestamp}|{nonce}"
        signature = self._compute_hmac_sha256(self.config.secret, canonical)

        payload = {
            "productCode": self.config.product_code,
            "licenseId": license_id,
            "deviceId": self.device_id,
            "reason": reason,
            "timestamp": timestamp,
            "nonce": nonce,
            "signature": signature,
        }

        response = self.session.post(
            f"{self.config.base_url}/api/license/deactivate",
            json=payload,
        )
        return response.json()

    def _get_device_id(self) -> str:
        """获取设备 ID"""
        system = platform.system()

        if system == "Windows":
            try:
                import winreg
                key = winreg.OpenKey(
                    winreg.HKEY_LOCAL_MACHINE,
                    r"SOFTWARE\Microsoft\Cryptography",
                )
                machine_guid, _ = winreg.QueryValueEx(key, "MachineGuid")
                winreg.CloseKey(key)
                return machine_guid
            except Exception:
                return str(uuid.getnode())

        elif system == "Darwin":
            try:
                import subprocess
                result = subprocess.run(
                    ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                    capture_output=True,
                    text=True,
                )
                for line in result.stdout.split("\n"):
                    if "IOPlatformUUID" in line:
                        return line.split('"')[-2]
            except Exception:
                pass

        else:
            try:
                with open("/etc/machine-id", "r") as f:
                    return f.read().strip()
            except Exception:
                pass

        return str(uuid.getnode())

    def _get_device_fingerprint(self) -> str:
        """获取设备指纹"""
        components = [
            self._get_device_id(),
            platform.node(),
            platform.machine(),
            platform.processor(),
        ]

        if platform.system() == "Windows":
            try:
                import wmi
                c = wmi.WMI()
                cpu_id = c.Win32_Processor()[0].ProcessorId
                board_sn = c.Win32_BaseBoard()[0].SerialNumber
                components.extend([cpu_id, board_sn])
            except Exception:
                pass

        combined = "|".join(str(c) for c in components)
        return hashlib.sha256(combined.encode()).hexdigest()

    @staticmethod
    def _compute_hmac_sha256(secret: str, message: str) -> str:
        """计算 HMAC-SHA256 签名"""
        return hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
```

## 使用示例

### main.py

```python
import time
import threading
from license_client import LicenseClient, LicenseConfig


def main():
    # 1. 创建客户端
    config = LicenseConfig(
        base_url="https://fk.263362.xyz",
        product_code="edgekey",
        secret="your-auth-secret",
    )
    client = LicenseClient(config)

    # 2. 激活
    key = input("请输入 License Key: ")
    result = client.activate(key)

    if result["code"] != 0:
        print(f"激活失败: {result['message']}")
        return

    data = result["data"]
    license_id = data["licenseId"]
    print(f"激活成功!")
    print(f"  License ID: {license_id}")
    print(f"  类型: {data['licenseType']}")
    print(f"  过期时间: {data.get('expireAt', '永久')}")
    print(f"  剩余时间: {data.get('leftSeconds', '无限')} 秒")

    # 3. 验证
    verify_result = client.verify(license_id)
    if verify_result["code"] != 0 or not verify_result["data"]["valid"]:
        print(f"验证失败: {verify_result['message']}")
        return

    print("验证通过，软件可以正常运行")

    # 4. 启动心跳（每 5 分钟）
    def heartbeat_loop():
        while True:
            time.sleep(5 * 60)
            try:
                heartbeat_result = client.heartbeat(license_id)
                print(f"心跳: {heartbeat_result['data']['ok']}")
            except Exception as e:
                print(f"心跳失败: {e}")

    heartbeat_thread = threading.Thread(target=heartbeat_loop, daemon=True)
    heartbeat_thread.start()

    # 5. 等待用户退出
    input("按回车键退出...")

    # 6. 解绑（可选）
    # deactivate_result = client.deactivate(license_id, "用户主动解绑")


if __name__ == "__main__":
    main()
```

## 依赖安装

```bash
pip install requests
```

> Windows 用户如需更精确的设备指纹，可选安装：
> ```bash
> pip install wmi pywin32
> ```

## 注意事项

1. **Secret 安全**：不要将 Secret 硬编码在代码中，建议从配置文件或环境变量读取
2. **设备指纹**：使用多维度硬件信息组合，确保稳定性
3. **心跳间隔**：建议 5-10 分钟
4. **错误处理**：网络异常时使用本地缓存的 token 短期可用
5. **token 存储**：建议加密存储到本地文件

## 配置文件示例

### config.json

```json
{
  "base_url": "https://fk.263362.xyz",
  "product_code": "edgekey",
  "secret": "your-auth-secret"
}
```

### 从配置文件读取

```python
import json

with open("config.json", "r") as f:
    config_data = json.load(f)

config = LicenseConfig(**config_data)
client = LicenseClient(config)
```

## 错误处理

```python
def activate_with_retry(client: LicenseClient, key: str, max_retries: int = 3):
    """带重试的激活"""
    for i in range(max_retries):
        try:
            result = client.activate(key)
            if result["code"] == 0:
                return result
            print(f"激活失败: {result['message']}")
            return result
        except requests.exceptions.RequestException as e:
            print(f"网络错误 (重试 {i + 1}/{max_retries}): {e}")
            if i < max_retries - 1:
                time.sleep(2 ** i)
    return {"code": -1, "message": "网络异常，请检查网络连接"}
```
