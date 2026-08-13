# 复刻模板 t35 · 旅行感悟（一键排版）

源文章：[旅行感悟一键排版](https://mp.weixin.qq.com/s?__biz=MzI2Mzc5Nzk4OQ==&mid=2247486889)（135 编辑器风格）

## 配色方案（从原文内联样式提取）
| 角色 | 色值 | 用途 |
|---|---|---|
| 暖橙点缀 | `#ffd5b2` / `#ffb373` | 装饰圆点、边框、END、标题底线 |
| 天蓝辅色 | `#b1cff3` / `#eaf4ff` | 标签描边、浅蓝底、二维码块 |
| 深蓝紫标题 | `#5f7ad2` | h1 / h2 文字 |

## 实现
- `src/themes.ts`：新增主题 `travel`（旅行感悟）。
- `src/layoutTemplates.ts`：
  - USAGES 新增 `travelnote`（旅途拾光）— 含「关注引导条 + END + 感谢语 + 二维码」外壳与示例骨架；
  - TEMPLATES 新增 `t35`（styleId `travel` / usageId `travelnote` / 行业 旅游·媒体）；
  - STYLE_ORDER 注册 `travel`。

## 真机验证（puppeteer 走完整用户流）
- 复制产物 h1 = `rgb(95,122,210)` 深蓝紫 + 暖橙底线 `rgb(255,179,115)`；h2 = 同色字 + 浅蓝底 `rgb(234,244,255)` + 淡蓝左边 `rgb(177,207,243)`；
- 主色命中：暖橙 7 / 深蓝紫 10 / 浅蓝底 7 次；
- 无 `data-meipi-shell` / `display:flex` / `transform` 残留（微信兼容）；
- END 与二维码齐全；无默认文艺色泄漏。

## 交付物
- `/Users/leichen/Downloads/复刻-t35.html` — 「一键复制」真实产物，可直接浏览器打开核对
- 源改文件：`src/themes.ts`、`src/layoutTemplates.ts`

> 仍未 git 提交（项目非 git 仓库，按规矩不自动 push）。如需本地 commit 可告知。
