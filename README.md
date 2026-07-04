# SillyTavern 剧情生图

一个 SillyTavern 第三方扩展，用当前聊天剧情生成图片。

扩展会读取最近几轮聊天剧情，使用 SillyTavern 当前聊天模型，或插件内单独配置的 OpenAI 兼容聊天 API，将剧情改写成生图提示词，然后发送给选中的生图 API 配置。

## 功能

- 保存多个生图 API 配置，并随时切换。
- 当前已实现 OpenAI 兼容的 `/v1/images/generations`。
- 默认使用 SillyTavern 当前聊天模型改写剧情。
- 可选单独配置提示词改写 API 地址、密钥和模型。
- 可调整读取最近几轮剧情。
- 显示图片预览、生成提示词，并支持复制提示词。

## 安装

在 SillyTavern 的第三方扩展安装界面中输入本仓库 URL。

本地开发时，可以复制或软链接到：

```text
data/default-user/extensions/sillytavern-scene-image-generator
```

然后刷新 SillyTavern 页面。

## 生图 API 配置

OpenAI 兼容生图 API 通常需要填写：

- API 地址：`https://api.example.com/v1`
- 模型：`gpt-image-1` 或供应商提供的生图模型名
- API 密钥：供应商密钥
- 图片尺寸：例如 `1024x1024`
- 返回格式：`b64_json` 或 `url`

额外参数必须是 JSON 对象，会合并进生图请求。

## 后续计划

- 支持 Stable Diffusion WebUI。
- 支持 ComfyUI。
- 将生成图片插入当前聊天。
- 支持按角色保存提示词预设。
