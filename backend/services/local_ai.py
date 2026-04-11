import os
import threading
from pathlib import Path
from typing import Optional, AsyncGenerator

# from huggingface_hub import hf_hub_download
try:
    from llama_cpp import Llama
except ImportError:
    Llama = None

from backend.config import get_settings

class LocalAIManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(LocalAIManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.settings = get_settings()
        self.model_dir = self.settings.data_root / "models"
        self.model_path: Optional[Path] = None
        self.llm: Optional[Llama] = None
        self.is_loading = False
        self.is_ready = False
        self.error = None
        
        # 默认模型配置
        self.repo_id = "bartowski/gemma-4-E2B-it-GGUF"
        self.filename = "gemma-4-E2B-it-Q4_K_M.gguf"
        
        self._initialized = True

    def get_status(self):
        return {
            "is_ready": self.is_ready,
            "is_loading": self.is_loading,
            "error": self.error,
            "model_path": str(self.model_path) if self.model_path else None
        }

    async def initialize_model(self):
        """异步初始化模型：直接加载本地预置模型"""
        if self.is_ready or self.is_loading:
            return
            
        self.is_loading = True
        self.error = None
        
        try:
            # 1. 检查本地模型是否存在 (预置路径)
            self.model_path = self.model_dir / self.filename
            print(f"[*] Checking pre-installed model: {self.model_path}")
            
            if not self.model_path.exists():
                # 如果不存在，报错提示需要预置
                raise FileNotFoundError(f"Pre-installed model not found at {self.model_path}")
            
            # 2. 加载模型 (增加 Mock 逻辑以应对占位文件)
            file_size = self.model_path.stat().st_size
            if file_size == 0:
                print("[*] Detected placeholder model file (0 bytes). Entering Mock Mode.")
                self.llm = "MOCK_LLM"
            else:
                print(f"[*] Loading real model from {self.model_path}...")
                if Llama is None:
                    raise ImportError("llama-cpp-python not installed")
                self.llm = Llama(
                    model_path=str(self.model_path),
                    n_ctx=2048,
                    n_threads=os.cpu_count() or 4,
                    verbose=False
                )
            
            self.is_ready = True
            print("[*] Local AI Model is ready (Instantly).")
            
        except Exception as e:
            self.error = str(e)
            print(f"[!] Local AI initialization failed: {self.error}")
        finally:
            self.is_loading = False

    async def generate_chat_stream(self, prompt: str, context: Optional[str] = None, action: str = "ask") -> AsyncGenerator[str, None]:
        print(f"[DEBUG] Local AI generating chat stream... action={action}, is_ready={self.is_ready}")
        """旧版接口兼容：支持 prompt, context, action 格式"""
        
        system_prompts = {
            "continue": "You are a writing assistant. Continue writing the following text naturally. Return only the new text.",
            "expand": "You are a writing assistant. Expand the following text with more details and depth. Return only the expanded version.",
            "summarize": "You are a writing assistant. Summarize the following text concisely. Return only the summary.",
            "rewrite": "You are a writing assistant. Rewrite the following text to be more professional and clear. Return only the rewritten text.",
            "translate": "You are a writing assistant. Translate the following text to Chinese (if it is English) or English (if it is Chinese). Return only the translation.",
            "outline": "You are a writing assistant. Generate a structured outline for the following topic or text. Return only the outline.",
            "ask": """You are a note-taking and personal knowledge base assistant. 
Based on the selected text and context, answer the user's intent or improve the text accordingly.

CRITICAL: You have the ability to call editor actions using special XML tags. 
- To set or update the note title: <Action type="set_title">New Title</Action>
- To update note tags: <Action type="set_tags">tag1, tag2, tag3</Action>

If the user asks to "set title", "rename", "give a title", or if the note is untitled and you're generating content, ALWAYS include the <Action type="set_title"> tag.
If the content suggests specific topics, include <Action type="set_tags">.

Return the text and any actions needed. Do not explain the actions to the user.
""",
            "search": "You are a helpful AI assistant with internet search capabilities. Analyze the user's question, and if it requires up-to-date or specific information not likely in your pre-training data, use your search ability to provide a comprehensive answer.",
        }
        
        messages = [
            {"role": "system", "content": system_prompts.get(action, "You are a helpful writing assistant.")},
        ]
        if context:
            messages.append({"role": "user", "content": f"Context:\n{context}\n\nTask/Question:\n{prompt}"})
        else:
            messages.append({"role": "user", "content": prompt})
        
        if action == "search":
            yield 'data: {"text": "[Searching the web for latest information...]\\n\\n"}\n\n'
            try:
                import urllib.parse
                import urllib.request
                import json
                search_query = urllib.parse.quote(prompt)
                req = urllib.request.Request(
                    f"https://html.duckduckgo.com/html/?q={search_query}",
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    html = response.read().decode('utf-8')
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(html, 'html.parser')
                    snippets = [a.text for a in soup.find_all('a', class_='result__snippet')]
                    search_context = "\n".join(snippets[:5])
                    messages = [
                        {"role": "system", "content": system_prompts.get(action)},
                        {"role": "user", "content": f"Based on the following search results, please summarize and answer the user's question:\n\n{prompt}\n\nSearch Results:\n{search_context}"}
                    ]
            except Exception as e:
                yield f'data: {{"text": "\\n[Web search failed: {str(e)}. Falling back to local knowledge...]\\n"}}\n\n'
        
        async for chunk in self.generate_chat_stream_messages(messages):
            import json
            yield f'data: {json.dumps({"text": chunk}, ensure_ascii=False)}\n\n'
            
        yield 'data: [DONE]\n\n'

    async def generate_chat_stream_messages(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """流式生成对话 (支持 Mock 模式)"""
        import asyncio
        if not self.is_ready or not self.llm:
            yield "Local AI model is not ready."
            return

        # Mock 模式下的响应
        if self.llm == "MOCK_LLM":
            mock_response = "你好！我是集成在本地的 Gemma 4 E2B IT 模型。由于当前处于演示环境，我正在使用 Mock 模式为您提供即时响应。我已经预置在系统中，可以帮您处理本地笔记和隐私数据。"
            for word in mock_response.split():
                yield word + " "
                await asyncio.sleep(0.05)
            return

        # 构造 prompt (针对 Gemma 4 / Gemma 2 格式)
        # <start_of_turn>user\n...<end_of_turn>\n<start_of_turn>model\n
        prompt = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt += f"<|im_start|>system\n{content}<|im_end|>\n"
            elif role == "user":
                prompt += f"<|im_start|>user\n{content}<|im_end|>\n"
            elif role == "assistant":
                prompt += f"<|im_start|>assistant\n{content}<|im_end|>\n"
        
        prompt += "<|im_start|>assistant\n"

        import asyncio
        loop = asyncio.get_running_loop()
        def sync_create_completion():
            return self.llm.create_completion(
                prompt=prompt,
                max_tokens=1024,
                stream=True,
                stop=["<|im_end|>", "user:", "System:"]
            )
            
        response = await loop.run_in_executor(None, sync_create_completion)

        iterator = iter(response)
        def next_chunk():
            try:
                return next(iterator)
            except StopIteration:
                return None
                
        while True:
            try:
                chunk = await loop.run_in_executor(None, next_chunk)
                if chunk is None:
                    break
                text = chunk["choices"][0]["text"]
                if text:
                    yield text
            except Exception as e:
                yield f"\n[Error: {str(e)}]"
                break

# 单例
local_ai_manager = LocalAIManager()
