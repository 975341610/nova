import subprocess
import sys
import os

def install_llama_cpp():
    print("[*] Installing llama-cpp-python for Windows CPU...")
    # Using the official pre-compiled wheels for Windows CPU
    # Source: https://abetlen.github.io/llama-cpp-python/whl/cpu
    whl_source = "https://abetlen.github.io/llama-cpp-python/whl/cpu"
    
    command = [
        sys.executable, "-m", "pip", "install", "llama-cpp-python",
        "--extra-index-url", whl_source,
        "--force-reinstall", "--no-cache-dir"
    ]
    
    print(f"[*] Command: {' '.join(command)}")
    
    try:
        subprocess.check_call(command)
        print("\n[✔] llama-cpp-python (CPU) installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n[✘] Installation failed with error code {e.returncode}")
        return False

if __name__ == "__main__":
    if install_llama_cpp():
        print("\n[*] You can now start the Nova backend.")
    else:
        print("\n[!] Please ensure you have a stable internet connection.")
        sys.exit(1)
