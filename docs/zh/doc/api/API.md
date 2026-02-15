# VoceSpace API 文档

## 概述

VoceSpace API 允许第三方平台通过标准化接口接入 VoceSpace 音视频服务。本文档详细说明了如何生成访问令牌、配置用户身份以及实现快速集成。

## 接口列表

### 1. 获取连接详情（GET）

通过 URL 参数获取连接详情，适用于简单的跳转场景。

#### 接口地址

```
GET https://vocespace.com/api/connection-details?auth=${AuthType}&token=${Token}
```

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| auth | string | 否 | 认证类型 |
| token | string | 是 | JWT 令牌 |

### 2. 获取连接详情（POST）

通过 POST 请求获取连接详情，推荐用于服务端集成。

#### 接口地址

```
POST https://vocespace.com/api/connection-details
```

#### 请求头

```
Content-Type: application/json
```

#### 请求体

请求体应包含符合 `TokenResult` 接口的 JSON 数据（详见下方数据结构）。

## 数据结构

### RoomType - 房间类型

| 值 | 说明 |
|--------|------|
| `$empty` | 任意空房间，系统会自动分配一个空闲房间 |
| `$space` | 空间主房间，用户直接进入空间的主房间 |
| 自定义字符串 | 具体房间名，用户将直接进入该房间，如果不存在则创建 |

:::tip 注意
只要设置了 `room` 参数，用户每次访问都会进入指定房间。如无特殊需求，请勿使用该参数。
:::

### IdentityType - 用户身份类型

| 身份类型 | 说明 | 权限说明 |
|----------|------|----------|
| `owner` | 空间所有者 | 拥有所有权限，包括空间管理、用户管理、AI功能等 |
| `manager` | 空间管理员 | 拥有大部分权限，由 owner 授权 |
| `participant` | 空间参与者 | 通过平台接入的普通用户，拥有基础参与权限 |
| `guest` | 访客 | 未通过平台接入的访客，权限受限，无侧边栏和AI功能 |
| `assistant` | 客服人员 | 用于客服场景（auth=c_s），拥有侧边栏房间管理，无AI功能 |
| `customer` | 顾客 | 用于客服场景（auth=c_s），仅有加入房间功能 |

:::info 身份说明
- 没有 `auth` 参数时，默认为 `guest` 身份
- `manager`、`owner`、`participant` 三种身份必须通过平台接入
- `guest` 身份无法被授予管理权限
- `guest` 虽可创建空间成为 owner，但仍无法使用侧边栏和AI功能
:::

### TokenResult - 令牌数据结构

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 用户唯一标识符 |
| username | string | 是 | 用户显示名称 |
| avatar | string | 否 | 用户头像 URL |
| space | string | 是 | 空间名称 |
| room | RoomType | 否 | 房间类型，不设置则用户可自由选择房间 |
| identity | IdentityType | 否 | 用户身份类型，不设置默认为 guest |
| preJoin | boolean | 否 | 是否显示预加入页面，true=显示，false=直接进入 |
| iat | number | 是 | 令牌签发时间（Unix 时间戳） |
| exp | number | 是 | 令牌过期时间（Unix 时间戳） |

## 集成示例

### Node.js 示例

```javascript
const axios = require('axios');

// 生成 Token 数据
const tokenData = {
  id: 'user_12345',
  username: '张三',
  avatar: 'https://example.com/avatar.jpg',
  space: 'my-workspace',
  room: '$empty', // 可选：自动分配空房间
  identity: 'participant',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
};

// 方式1: POST 请求
async function getConnectionDetails() {
  try {
    const response = await axios.post(
      'https://vocespace.com/api/connection-details',
      tokenData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('连接详情:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取连接详情失败:', error.message);
  }
}

getConnectionDetails();
```

### Python 示例

```python
import requests
import time

# 生成 Token 数据
token_data = {
    "id": "user_12345",
    "username": "张三",
    "avatar": "https://example.com/avatar.jpg",
    "space": "my-workspace",
    "identity": "participant",
    "preJoin": False,
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600  # 1小时后过期
}

# POST 请求
response = requests.post(
    'https://vocespace.com/api/connection-details',
    json=token_data,
    headers={'Content-Type': 'application/json'}
)

if response.status_code == 200:
    print('连接详情:', response.json())
else:
    print('请求失败:', response.status_code)
```

### 前端跳转示例

```javascript
// 客户端生成跳转链接（需要后端提供签名的 token）
function redirectToVoceSpace(signedToken) {
  const url = `https://vocespace.com/api/connection-details?token=${encodeURIComponent(signedToken)}`;
  window.location.href = url;
}

// 使用示例
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // 从后端获取
redirectToVoceSpace(token);
```

## 常见场景

### 场景1: 客服系统集成

```javascript
// 客服人员
const assistantToken = {
  id: 'assistant_001',
  username: '客服小王',
  space: 'customer-service',
  identity: 'assistant',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 28800 // 8小时
};

// 顾客
const customerToken = {
  id: 'customer_12345',
  username: '用户12345',
  space: 'customer-service',
  room: 'room_urgent_001', // 直接进入指定服务房间
  identity: 'customer',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
```

### 场景2: 协作空间

```javascript
const collaboratorToken = {
  id: 'user_jane',
  username: 'Jane Doe',
  avatar: 'https://example.com/jane.jpg',
  space: 'project-alpha',
  identity: 'participant',
  preJoin: true, // 显示预加入页面，检查设备
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 // 24小时
};
```

## 错误处理

常见错误码：

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 401 | 令牌无效或已过期 | 重新生成令牌 |
| 403 | 权限不足 | 检查 identity 配置 |
| 400 | 参数错误 | 检查请求参数是否完整 |

## 安全建议

1. **令牌签名**: 始终在服务端生成和签名令牌，不要在客户端暴露签名密钥
2. **过期时间**: 根据实际场景设置合理的过期时间，避免过长
3. **HTTPS**: 生产环境必须使用 HTTPS 传输
4. **权限控制**: 根据业务需求分配最小必要权限