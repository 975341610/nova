import os
import urllib.request
import zipfile
import sys
import shutil

def download_with_progress(url, dest):
    print(f"[*] Downloading Ollama engine from {url}...")
    def reporthook(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size) if total_size > 0 else 0
        sys.stdout.write(f"\r[*] Progress: {percent}%")
        sys.stdout.flush()
        
    urllib.request.urlretrieve(url, dest, reporthook=reporthook)
    print("\n[*] Download completed.")

def install_ollama():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    bin_dir = os.path.join(base_dir, "bin")
    os.makedirs(bin_dir, exist_ok=True)
    ollama_exe = os.path.join(bin_dir, "ollama.exe")
    
    version_file = os.path.join(bin_dir, "ollama_version.txt")
    current_version = "v0.5.7"

    if os.path.exists(ollama_exe):
        # 检查是否为旧版本，如果是旧版本，我们需要重新下载
        if os.path.exists(version_file):
            with open(version_file, "r") as f:
                if f.read().strip() == current_version:
                    print("[*] Integrated Ollama engine is ready.")
                    return
        print("[*] Upgrading integrated Ollama engine...")
    else:
        print("[*] Setting up integrated Ollama engine (First time only)...")
        
    url = f"https://github.com/ollama/ollama/releases/download/{current_version}/ollama-windows-amd64.zip"
    zip_path = os.path.join(bin_dir, "ollama.zip")
    
    try:
        download_with_progress(url, zip_path)
        print("[*] Extracting Ollama engine...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for item in zip_ref.namelist():
                # 跳过根目录，直接解压到 bin_dir
                target_path = os.path.join(bin_dir, item)
                if item.endswith('/'):
                    os.makedirs(target_path, exist_ok=True)
                    continue
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                source = zip_ref.open(item)
                target = open(target_path, "wb")
                with source, target:
                    shutil.copyfileobj(source, target)
        os.remove(zip_path)
        with open(version_file, "w") as f:
            f.write(current_version)
        print("[*] Ollama engine successfully integrated into Nova.")
    except Exception as e:
        print(f"[!] Failed to download or extract Ollama: {e}")
        if os.path.exists(zip_path):
            os.remove(zip_path)
        sys.exit(1)

if __name__ == "__main__":
    install_ollama()
