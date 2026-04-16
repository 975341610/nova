import { test, expect } from '@playwright/test';

test.describe('NovaBlock UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 假设 dev server 运行在 http://localhost:5173
    await page.goto('http://localhost:5173');
    // 等待编辑器加载
    await page.waitForSelector('.novablock-editor');
  });

  test('1. Heading toggle and drag handle should not overlap', async ({ page }) => {
    // 在编辑器中找到一个 H1 标题（如果没有，则插入一个）
    const h1 = page.locator('.novablock-editor h1').first();
    if (await h1.count() === 0) {
      await page.click('.novablock-editor');
      await page.keyboard.type('# Heading Test');
      await page.keyboard.press('Enter');
    }

    // 悬停在 H1 上以触发拖拽手柄和折叠三角的显示
    await h1.hover();

    // 定位折叠三角按钮（HeadingView 中的按钮）
    // 根据代码，折叠按钮在 absolute -left-9 top-0 bottom-0 w-8 z-[40] 的 div 内
    const toggleButton = page.locator('.group\\/heading div[title="收起"], .group\\/heading div[title="展开"]').first();
    await expect(toggleButton).toBeVisible();

    // 定位拖拽手柄（DragHandle 插件渲染的）
    // 根据代码，拖拽手柄有 .drag-handle 类
    const dragHandle = page.locator('.drag-handle').first();
    await expect(dragHandle).toBeVisible();

    const toggleRect = await toggleButton.boundingBox();
    const dragRect = await dragHandle.boundingBox();

    if (toggleRect && dragRect) {
      const hasOverlap = !(
        toggleRect.x + toggleRect.width <= dragRect.x ||
        dragRect.x + dragRect.width <= toggleRect.x ||
        toggleRect.y + toggleRect.height <= dragRect.y ||
        dragRect.y + dragRect.height <= toggleRect.y
      );

      console.log('Toggle Rect:', toggleRect);
      console.log('Drag Rect:', dragRect);
      expect(hasOverlap, 'Heading toggle and drag handle are overlapping!').toBe(false);
    } else {
      throw new Error('Could not find bounding boxes for elements');
    }
  });

  test('2. Slash Menu should stay visible when typing fast', async ({ page }) => {
    const editor = page.locator('.novablock-editor');
    await editor.click();
    
    // 清除可能的内容并确保光标在开头
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);

    await page.keyboard.type('/');

    const slashMenu = page.locator('.notion-slash-menu');
    // 等待菜单出现，Tiipytap Suggestion 可能有延迟
    await expect(slashMenu).toBeVisible({ timeout: 10000 });

    // 模拟快速输入
    await page.keyboard.type('h1');
    
    // 断言 Slash Menu 仍然存在并可见
    await expect(slashMenu).toBeVisible({ timeout: 5000 });
    
    // 检查是否有匹配项显示
    const firstItem = slashMenu.locator('button').first();
    await expect(firstItem).toBeVisible({ timeout: 5000 });
  });
});
