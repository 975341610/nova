# Release Notes

## [0.16.1] - 2026-04-13

### 修复
- **UI**: 修复了黑胶播放器播放列表弹出框在滚动内部内容时会自动关闭的问题。
- **具体实现**: 
  - 在 `PlaylistPopover.tsx` 中为容器增加了 `playlist-popover-container` 类名。
  - 在 `MusicContext.tsx` 的全局滚动监听中，增加了对该类名的点击/滚动拦截，确保用户在查看长播放列表时能够顺畅滚动。
