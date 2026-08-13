# 复刻第 6 篇微信文章 → 模板 t37（立秋）

## 源文
https://mp.weixin.qq.com/s/uRDD8dVJFHDo9ZFrRGEQCw（135 编辑器「立秋一键排版」）

## 提炼配色
| 角色 | 色值 |
|---|---|
| 嫩绿（主色/关注条/标题线） | `#a6bb30` |
| 鹅黄（装饰线/边框） | `#ffeb9a` |
| 浅鹅黄底（标题块底） | `#f7fbc4` |
| 嫩黄绿（标题左条） | `#e0e25e` |
| 深绿（标题文字） | `#5c6b2e` |

## 改动文件
- **src/themes.ts**：新增主题 `solar-autumn`（立秋）—— h1 嫩绿+鹅黄底线居中；h2 深绿字 + 浅鹅黄底 + 嫩黄绿左条 + 鹅黄下划线（完整复刻原文标题块）。
- **src/layoutTemplates.ts**：
  - `STYLE_ORDER` 注册 `solar-autumn`
  - `USAGES` 新增 `liqiu`（秋日时光）：绿色关注条 + END（绿框）+ 浅鹅黄感谢框 + 二维码外壳，及一篇立秋散文骨架
  - `TEMPLATES` 新增 `t37`（solar-autumn + liqiu）

> 注：`themes.ts` 已有 `solar`（节气·秋香黄绿）与 `solar-summer`（盛夏），本篇配色更亮，故独立建主题。

## 验证（puppeteer 走完整用户流）
- 标题色正确归属：**h1** 嫩绿 `rgb(166,187,48)`+鹅黄底线；**h2** 深绿字 `rgb(92,107,46)`+浅鹅黄底 `rgb(247,251,196)`+嫩黄绿左条 `rgb(224,226,94)`+鹅黄下划线；
- 主色/辅色命中：嫩绿 12 / 鹅黄 13 / 浅鹅黄底 10 / 深绿字 6 次；
- 无 `data-meipi-shell` / `display:flex` / `transform` 残留（微信兼容）；
- END 与二维码齐全；无默认文艺（literary）色泄漏。

## 交付物
- `/Users/leichen/Downloads/复刻-t37.html` —— 「一键复制」真实产物预览
