# 复刻第 7 篇微信文章 → 模板 t38（系列报道）

## 源文
https://mp.weixin.qq.com/s?__biz=MzI2Mzc5Nzk4OQ==&mid=2247487484&idx=1&sn=7b57d036f8340148ced940cb7a22a9dd（135 编辑器「系列报道一键排版」）

## 提炼配色
| 角色 | 色值 |
|---|---|
| 深蓝（主色/标题块/关注条） | `#0867a6` |
| 亮蓝（序号块/小标题） | `#296cd4` |
| 浅蓝底（标签/边框/二维码区） | `#d4e5ff` |
| 暖黄（装饰方块/标题底线） | `#ffc149` |
| 深灰（正文） | `#333` |

## 改动文件
- **src/themes.ts**：新增主题 `reportblue`（报道蓝）—— h1 深蓝+暖黄底线居中；h2 白字+深蓝底圆角胶囊（复刻原文深蓝胶囊白字标题块）。
- **src/layoutTemplates.ts**：
  - `STYLE_ORDER` 注册 `reportblue`
  - `USAGES` 新增 `seriesreport`（系列报道）：深蓝胶囊关注条 + END（深蓝框）+ 浅蓝感谢框 + 二维码外壳，及一篇系列报道散文骨架
  - `TEMPLATES` 新增 `t38`（reportblue + seriesreport）

## 验证（puppeteer 走完整用户流）
- 标题色正确归属：**h1** 深蓝 `rgb(8,103,166)`+暖黄底线；**h2** 白字+深蓝底 `rgb(8,103,166)` 圆角胶囊；
- 主色/辅色命中：深蓝 19 / 亮蓝 1 / 浅蓝底 12 / 暖黄 3 次；
- 无 `data-meipi-shell` / `display:flex` / `transform` 残留（微信兼容）；
- END 与二维码齐全；无默认文艺（literary）色泄漏。

## 交付物
- `/Users/leichen/Downloads/复刻-t38.html` —— 「一键复制」真实产物预览
