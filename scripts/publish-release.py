import urllib.request
import urllib.error
import json
import os

TOKEN = "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"
REPO = "abashash/HallyCafe-OS"
RELEASE_ID = 421877235

headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Fars-Company-Deployer"
}

def upload_asset(file_path, asset_name):
    upload_url = f"https://uploads.github.com/repos/{REPO}/releases/{RELEASE_ID}/assets?name={asset_name}"
    with open(file_path, 'rb') as f:
        file_data = f.read()
    
    req = urllib.request.Request(
        upload_url,
        data=file_data,
        headers={
            "Authorization": f"token {TOKEN}",
            "Content-Type": "application/zip",
            "Content-Length": str(len(file_data)),
            "User-Agent": "Fars-Company-Deployer"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            print(f"Successfully uploaded {asset_name}: {result.get('browser_download_url')}")
            return result
    except urllib.error.HTTPError as e:
        print(f"Error uploading {asset_name}: {e.code} - {e.read().decode()}")

# 1. Upload HallyCafe-OS.zip
upload_asset("/app/applet/public/HallyCafe-OS.zip", "HallyCafe-OS.zip")

# 2. Upload hally-cafe.zip
upload_asset("/app/applet/public/hally-cafe.zip", "hally-cafe.zip")

# 3. Publish release (draft=False)
patch_url = f"https://api.github.com/repos/{REPO}/releases/{RELEASE_ID}"
patch_data = {
    "name": "HallyCafe OS v2.0.0 - Native WordPress Plugin",
    "tag_name": "v2.0.0",
    "draft": False,
    "prerelease": False,
    "body": """## 🚀 HallyCafe OS v2.0.0 — افزونه کاملاً بومی و مستقل وردپرس

این نسخه شامل سیستم ۱۰۰٪ بومی مدیریت کافه و رستوران در وردپرس بدون هیچ‌گونه نیاز به سرور یا آی‌فریم خارجی می‌باشد.

### 📦 فایل‌های آماده نصب وردپرس:
- **`HallyCafe-OS.zip`**: فایل استاندارد زیپ برای نصب مستقیم در پیشخوان وردپرس (**پیشنهادی**)
- **`hally-cafe.zip`**: نسخه فشرده جایگزین با اسلاگ کوتاه

### 🛠️ نحوه نصب در وردپرس:
1. فایل `HallyCafe-OS.zip` را دانلود کنید.
2. در پیشخوان وردپرس به بخش **افزونه‌ها > افزودن افزونه > بارگذاری افزونه** بروید.
3. فایل را انتخاب و دکمه **نصب و فعال‌سازی** را بزنید.
4. منوی **کافه هالی (HallyCafe OS)** با تمام قابلیت‌های دیتابیس بومی، منو، پوز و کیچن فعال خواهد شد.

### ✨ قابلیت‌ها:
- ایجاد جداول مستقل در پایگاه‌داده وردپرس (`$wpdb`) به همراه دیتای اولیه
- شورت‌کدهای بومی `[hally_menu]`, `[hally_pos]`, `[hally_kitchen]`, `[hally_reserve]`, `[hally_dashboard]`
- سازگاری ۱۰۰٪ با المنتور (Elementor) و گوتنبرگ (Gutenberg)
- مسیرهای استاندارد REST API تحت `/wp-json/hally/v1/`

---
توسعه‌داده شده توسط تیم مهندسی **Fars.Company**
"""
}

req = urllib.request.Request(
    patch_url,
    data=json.dumps(patch_data).encode(),
    headers=headers,
    method="PATCH"
)

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print(f"Release published successfully! URL: {result.get('html_url')}")
except urllib.error.HTTPError as e:
    print(f"Error publishing release: {e.code} - {e.read().decode()}")
