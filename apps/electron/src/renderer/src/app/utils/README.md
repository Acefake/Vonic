
# HTTP helper (轻量封装)

位置

`apps/electron/src/renderer/src/app/utils/http.ts`

简介

提供一个最小化、可直接使用的 Axios 实例和便捷函数：`get`、`post`、`put`、`del`。默认不配置 `baseURL`，返回 `response.data`。

快速使用

在 renderer 组件中导入：

```ts
import { get, post, createHttp } from '@/app/utils/http'
```

示例：

```ts
const list = await get('/api/items')
const res = await post('/api/upload', { name: 'x' })
```

自定义 baseURL

如果你需要为特定服务配置 baseURL：

```ts
const api = createHttp('https://api.example.com')
const data = await api.get('/v1/ping')
```

错误处理

封装会在 axios 错误时抛出 Error 对象，并在可用时附加 `status` 和 `data` 字段。

注意

- 仅用于 renderer（前端）请求。如果需要在主进程中发起 HTTP 请求，请在主进程中创建独立实例。
- 若需在请求中携带 token，可在 `window.app.auth.getToken()` 中返回 token，封装会自动尝试读取并设置 `Authorization` 头。
