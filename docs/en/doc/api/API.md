# VoceSpace API Documentation

## Overview

The VoceSpace API allows third-party platforms to integrate with VoceSpace's audio/video services through a standardized interface. This document explains how to create connection tokens, configure user identities, and perform a quick integration.

## Endpoints

### 1. Get connection details (GET)

Retrieve connection details via URL parameters — useful for simple redirect flows.

#### Endpoint

```
GET https://vocespace.com/api/connection-details?auth=${AuthType}&token=${Token}
```

#### Query parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| auth | string | No | Authentication type |
| token | string | Yes | JWT token |

### 2. Get connection details (POST)

Retrieve connection details via POST — recommended for server-side integrations.

#### Endpoint

```
POST https://vocespace.com/api/connection-details
```

#### Headers

```
Content-Type: application/json
```

#### Request body

The request body should contain a JSON object that matches the `TokenResult` structure (see Data Structures below).

## Data Structures

### RoomType - Room selection

| Value | Description |
|-------|-------------|
| `$empty` | Any empty room — the system will assign an available room automatically |
| `$space` | The space's main room — users enter the main room of the space |
| custom string | Specific room name — user will enter this room (created if missing) |

Note: If `room` is provided, the user will always enter that specific room on each access. Avoid using it unless necessary.

### IdentityType - User identity

| Identity | Description | Permissions |
|----------|-------------|-------------|
| `owner` | Space owner | Full permissions: space management, user management, AI features, etc. |
| `manager` | Space manager | Most permissions; granted by an owner |
| `participant` | Space participant | Regular user via platform integration; basic participation permissions |
| `guest` | Visitor | Limited permissions; no sidebar or AI features; used when no `auth` provided |
| `assistant` | Support/agent | For customer-support scenarios (auth=c_s); has sidebar room management but no AI features |
| `customer` | Customer | For customer-support scenarios (auth=c_s); can join rooms only |

Notes:
- If no `auth` parameter is present, the identity defaults to `guest`.
- `manager`, `owner`, and `participant` must be created via platform integration.
- `guest` cannot be elevated to management roles.
- A `guest` who creates a space may act as an owner in that space but still cannot use sidebar or AI features.

### TokenResult - Token payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | User unique identifier |
| username | string | Yes | Display name |
| avatar | string | No | Avatar URL |
| space | string | Yes | Space name |
| room | RoomType | No | Room selection — omit to allow user choice |
| identity | IdentityType | No | User identity — defaults to `guest` if omitted |
| preJoin | boolean | No | Whether to show a pre-join page (true = show, false = join directly) |
| iat | number | Yes | Issued-at timestamp (Unix) |
| exp | number | Yes | Expiration timestamp (Unix) |

## Integration Examples

### Node.js example

```javascript
const axios = require('axios');

// Construct token payload
const tokenData = {
  id: 'user_12345',
  username: 'Zhang San',
  avatar: 'https://example.com/avatar.jpg',
  space: 'my-workspace',
  room: '$empty', // optional: assign an empty room automatically
  identity: 'participant',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600 // expires in 1 hour
};

async function getConnectionDetails() {
  try {
    const res = await axios.post(
      'https://vocespace.com/api/connection-details',
      tokenData,
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Connection details:', res.data);
    return res.data;
  } catch (err) {
    console.error('Failed to get connection details:', err.message);
  }
}

getConnectionDetails();
```

### Python example

```python
import requests
import time

token_data = {
    "id": "user_12345",
    "username": "Zhang San",
    "avatar": "https://example.com/avatar.jpg",
    "space": "my-workspace",
    "identity": "participant",
    "preJoin": False,
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600
}

resp = requests.post(
    'https://vocespace.com/api/connection-details',
    json=token_data,
    headers={'Content-Type': 'application/json'}
)

if resp.status_code == 200:
    print('Connection details:', resp.json())
else:
    print('Request failed:', resp.status_code)
```

### Frontend redirect example

```javascript
// Client-side redirect (token must be provided by your backend)
function redirectToVoceSpace(signedToken) {
  const url = `https://vocespace.com/api/connection-details?token=${encodeURIComponent(signedToken)}`;
  window.location.href = url;
}

// Usage
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // obtained from backend
redirectToVoceSpace(token);
```

## Common Scenarios

### Scenario 1: Customer support integration

```javascript
// Support agent
const assistantToken = {
  id: 'assistant_001',
  username: 'Support Wang',
  space: 'customer-service',
  identity: 'assistant',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 28800 // 8 hours
};

// Customer
const customerToken = {
  id: 'customer_12345',
  username: 'User12345',
  space: 'customer-service',
  room: 'room_urgent_001', // join a specific service room
  identity: 'customer',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
```

### Scenario 2: Collaboration workspace

```javascript
const collaboratorToken = {
  id: 'user_jane',
  username: 'Jane Doe',
  avatar: 'https://example.com/jane.jpg',
  space: 'project-alpha',
  identity: 'participant',
  preJoin: true, // show pre-join page to check devices
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
};
```

## Error Handling

Common status codes:

| Code | Meaning | Remedy |
|------|---------|--------|
| 401 | Invalid or expired token | Re-issue the token |
| 403 | Forbidden / insufficient permissions | Check the `identity` configuration |
| 400 | Bad request / invalid parameters | Verify required fields in the request |

## Security Recommendations

1. Token signing: Always generate and sign tokens server-side; never expose signing keys to clients.
2. Expiration: Set reasonable token expiration times according to your use case.
3. HTTPS: Use HTTPS in production to protect token transport.
4. Least privilege: Grant the minimal permissions required for each role.
