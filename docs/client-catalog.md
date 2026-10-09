# Luma Theme · 自定义客户端与图标

Luma 的订阅导入区域现在支持在 **TXBoard → 主题管理 → Luma Theme → 设置 → 客户端图标与目录** 中修改。

- 每个默认客户端都可以单独设置 PNG / WebP / SVG 等图片的 URL，替换原来的首字母图标。
- 可调节图标大小（22–64 px，默认 30px）；图片将使用 `object-fit: contain`，加载失败会回退到首字母。
- 可以改名、停用、重排默认客户端，也可以增加其他客户端。
- 按 `windows`、`mac`、`ios`、`android` 分平台展示。
- 新客户端可以配置**安全的自定义 URI 导入协议**，或者一个公开 HTTPS 下载/说明页面。

## 只需要换图标

直接在后台填写「Clash 图标图片 URL」「Hiddify 图标图片 URL」等字段即可，无需编辑 JSON。

例如：

```text
Clash 图标图片 URL: https://static.example.com/icons/clash.webp
Hiddify 图标图片 URL: /images/hiddify.png
```

这类图标是浏览器可访问的资源 URL。支持 HTTPS 图片，或当前站点以 `/` 开始的图片路径；不支持 `data:`、`javascript:`、不安全的外部 HTTP URL。图片远程服务器需能正常访问，建议放到可信 CDN 或本站资源目录。修改不会影响客户端名称及实际导入协议。

## 自定义支持的客户端

编辑「自定义客户端列表 JSON」。它是一个数组，每个元素代表一个新增客户端或对内置客户端的覆盖。**默认目录模式是「保留默认客户端并合并配置」**：未被覆盖的预设继续展示。

下面是一个完整示例：

```json
[
  {
    "id": "clash",
    "enabled": false
  },
  {
    "id": "hiddify",
    "name": "Hiddify Next",
    "platforms": ["windows", "mac", "ios", "android"],
    "iconUrl": "https://static.example.com/hiddify.png",
    "order": 10
  },
  {
    "id": "my-client",
    "name": "My Client",
    "platforms": ["windows", "android"],
    "iconUrl": "https://static.example.com/my-client.webp",
    "action": "scheme",
    "template": "my-client://import?url={urlEncoded}&name={nameEncoded}",
    "order": 1
  },
  {
    "id": "download",
    "name": "客户端官方下载",
    "platforms": ["mac", "ios"],
    "action": "download",
    "url": "https://example.com/download",
    "order": 20
  }
]
```

内置的客户端 ID：

`clash`、`hiddify`、`sing-box`、`shadowrocket`、`quantumult-x`、`surge`、`stash`、`nekobox`、`surfboard`。

对内置客户端只指定 `id` 和展示字段（例如图标、名称、平台、排序），就会保留经过验证的内置导入协议。

如果想完全决定有哪些客户端，把「客户端目录模式」设为 **仅显示自定义配置客户端**，这样未列出的内置客户端不会出现。只有 JSON 内容**有效**时才执行替换；格式错误时会安全回退到内置目录，避免配置错误导致全部导入方式消失。

## 可用字段

| 字段 | 含义 |
| --- | --- |
| `id` | 唯一标识，只接受小写字母、数字和连字符，字母开头 |
| `name` | 展示名称，最多 42 字符 |
| `enabled` | `false` 关闭指定 ID，默认为启用 |
| `platforms` | 至少选择一个支持平台 |
| `iconUrl` | HTTPS 图片或本站相对路径 |
| `order` | 排序数字，越小越靠前 |
| `action` | `preset`（内置）、`scheme`（自定义导入 URI）、`download`（官方公开链接） |
| `template` | 使用 `scheme` 时的客户端导入 URI 模板 |
| `url` | 使用 `download` 时的公开 HTTPS 地址 |

每次最多 24 个自定义条目，重复 ID、非法 JSON 都会被安全拒绝。图标地址、客户端链接不会接受脚本协议。

## 导入链接安全约束

**`scheme`** 仅供明确支持自定义 URI 的客户端使用。例如某客户端官方文档指定：

```text
my-client://import?url={urlEncoded}&name={nameEncoded}
```

支持的占位符：
- `{urlEncoded}`：订阅链接 URL 编码
- `{urlBase64}`：订阅链接 Base64 编码
- `{nameEncoded}`：站点名称 URL 编码

必须包含 `{urlEncoded}` 或 `{urlBase64}`；禁用原始未编码的 `{url}`，以免订阅凭证破坏 URI 参数结构。只接受合法的自定义 `scheme://` URI，不接受 `javascript:`、`data:`、`file:`、`intent:`、`http:` 或 `https:` 作为导入模板协议。

**`download`** 则仅接受静态 HTTPS URL。下载链接不会自动附带私人订阅 URL，避免泄露订阅令牌。没有有效订阅的用户仍可使用管理员配置的官网下载入口。

平台选择和浏览器会决定哪些客户端显示；自定义 URI 能否实际唤起客户端，仍取决于该客户端有没有注册对应协议。请以各客户端官方文档为准。

## 验证与发布

自动测试覆盖预设兼容、双模式、平台筛选、URL 安全、非法配置回退和移动端布局。修改源码后需推送新的版本标签，才会创建含这些配置字段的新安装包 `luma-theme.zip`。
