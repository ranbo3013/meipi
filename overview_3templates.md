# 新增 3 套公众号复刻模板

基于磊哥提供的 3 篇公众号文章，复刻为 meipi「一键排版」模板（沿用「提取配色 → 主题 + 用途 + 注册」流程）。

## 新增模板一览

| 模板ID | 风格 | 用途 | 主色 / 辅助色 | 标题色 |
|--------|------|------|---------------|--------|
| **t32 开学** | campus | 开学通知 | 暖黄 `#fec55c` · 米色 `#faf3e8` · 绿 `#5fa37e` | 深黄 `#d98f2a` |
| **t33 文艺清新** | freshblue | 文艺随笔 | 天蓝 `#59aae8` · 浅蓝 `#d4ebff` · 灰字 `#595959` | 天蓝 `#59aae8` |
| **t34 寒假旅行** | winter | 冬日出游 | 天蓝 `#80baf8` · 浅蓝 `#f6faff` · 暖黄 `#ffd88f` | 深蓝 `#2f7fd0` |

> 用途名刻意与风格名错开（文艺随笔 / 冬日出游），避免筛选器同名歧义。

## 改动文件

- `src/themes.ts`：新增 `campus` / `freshblue` / `winter` 三主题（含 h1/h2/p/blockquote/引用等完整配色）。
- `src/layoutTemplates.ts`：`STYLE_ORDER` 注册三风格；`USAGES` 加 `back2school` / `literaryfresh` / `wintertravel`（各含顶部关注引导条 + END + 二维码外壳，以及完整示例骨架）；`TEMPLATES` 加 `t32/t33/t34` 组合。
- `src/components/OneClickLayout.tsx`：**修复「插入示例结构」未切换编辑器主题**的问题 —— 之前插入骨架后标题色会沿用旧主题，现已在插入时同步切到所选模板风格，标题色正确归属。

## 验证（puppeteer 真实 UI 流）

走完整用户路径：一键排版 → 选风格 → 选用途 → 点模板卡片 → 插入示例结构 → 模板库「一键复制」，捕获真实复制产物：

- 三个模板的 h1/h2 标题色均匹配各自主题主色（深黄 / 天蓝 / 深蓝）。
- 复制产物无 `data-meipi-shell` / `display:flex` / `transform` 残留（微信兼容）。
- END 装饰与二维码卡片齐全，控制台零报错。

对照文件（可直接浏览器打开核对样式）：

- `/Users/leichen/Downloads/复刻-t32.html`（开学）
- `/Users/leichen/Downloads/复刻-t33.html`（文艺清新）
- `/Users/leichen/Downloads/复刻-t34.html`（寒假旅行）

## 备注

- 配色取自文章内联 `style`（避开微信夜间模式对 computed style 的干扰）。
- 仅修改文案/装饰结构不影响复制兼容性；新增模板装饰仍遵循「背景/边框/圆角用 table(td)/span 承载」的微信兼容规则。
- 仍未 git 提交，等磊哥确认后再本地 commit（不自动 push）。
