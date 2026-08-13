# 复刻模板 t36 · 咖啡店（一键排版）

源文章：[咖啡店介绍一键排版](https://mp.weixin.qq.com/s?__biz=MzI2Mzc5Nzk4OQ==&mid=2247485964)（135 编辑器风格）

## 配色方案（从原文内联样式提取）
| 角色 | 色值 | 用途 |
|---|---|---|
| 文字 | `#3f3f3f` | 正文深灰 |
| 暖黄点缀 | `#f8e1ab` / `#e8c98a` | 装饰圆点、边框、标题底线、END 框、二维码区底色 |
| 蓝灰 | `#7fa6cf` | h1 标题、END 框描边、标签描边 |
| 浅蓝白底 | `#f5f9fc` | h2 底、二维码块 |

## 实现
- `src/themes.ts`：新增主题 `cafe`（咖啡店）。
- `src/layoutTemplates.ts`：
  - USAGES 新增 `cafetime`（咖啡时光）— 含「关注引导条 + END（蓝灰圆角框）+ 感谢语 + 二维码」外壳与示例骨架；
  - TEMPLATES 新增 `t36`（styleId `cafe` / usageId `cafetime` / 行业 餐饮·生活）；
  - STYLE_ORDER 注册 `cafe`。

## 真机验证（puppeteer 走完整用户流）
- 复制产物 h1 = `rgb(127,166,207)` 蓝灰 + 暖黄底线 `rgb(248,225,171)`；h2 = 深蓝灰 `rgb(90,123,166)` 字 + 浅蓝白底 `rgb(245,249,252)` + 蓝灰左边；
- 主色命中：暖黄 11 / 蓝灰 25 / 浅蓝白底 7 次；
- 无 `data-meipi-shell` / `display:flex` / `transform` 残留（微信兼容）；
- END 与二维码齐全；无默认文艺色泄漏。

## 交付物
- `/Users/leichen/Downloads/复刻-t36.html` — 「一键复制」真实产物，可直接浏览器打开核对
- 源改文件：`src/themes.ts`、`src/layoutTemplates.ts`

> 仍未 git 提交（项目非 git 仓库，按规矩不自动 push）。如需本地 commit 可告知。
