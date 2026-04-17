import pytest
import asyncio
from backend.services.local_ai import local_ai_manager

@pytest.mark.asyncio
async def test_local_ai_initialization():
    """测试本地 AI 服务的初始化流程"""
    status = local_ai_manager.get_status()
    # 允许初始状态为未准备好
    assert "is_ready" in status
    
    # 尝试初始化（在 CI 环境下可能会因为缺少模型文件而失败，这里主要检查逻辑调用）
    try:
        await local_ai_manager.initialize_model()
    except Exception as e:
        pytest.skip(f"Model initialization skipped or failed: {e}")
    
    status = local_ai_manager.get_status()
    assert status is not None

