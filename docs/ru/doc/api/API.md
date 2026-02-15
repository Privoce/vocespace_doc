# Документация VoceSpace API

## Обзор

API VoceSpace позволяет сторонним платформам интегрироваться с аудио/видео сервисами VoceSpace через единый интерфейс. В этом документе описано, как формировать токен подключения, задавать роли пользователей и выполнять быструю интеграцию.

## Эндпоинты

### 1. Получение данных подключения (GET)

Получение данных подключения через параметры URL — удобно для простых сценариев с перенаправлением.

#### Адрес

```
GET https://vocespace.com/api/connection-details?auth=${AuthType}&token=${Token}
```

#### Параметры запроса

| Название | Тип | Обязат. | Описание |
|----------|-----|---------|----------|
| auth | string | Нет | Тип аутентификации |
| token | string | Да | JWT токен |

### 2. Получение данных подключения (POST)

Рекомендуется для серверной интеграции — передаётся в теле запроса.

#### Адрес

```
POST https://vocespace.com/api/connection-details
```

#### Заголовки

```
Content-Type: application/json
```

#### Тело запроса

Тело должно содержать JSON-объект, соответствующий структуре `TokenResult` (см. раздел "Структуры данных").

## Структуры данных

### RoomType — Тип комнаты

| Значение | Описание |
|---------:|----------|
| `$empty` | Любая пустая комната — система автоматически выделит свободную комнату |
| `$space` | Главная комната пространства — пользователь войдёт в главную комнату пространства |
| строка (имя) | Конкретное имя комнаты — пользователь войдёт в указанную комнату (создается, если не существует) |

Примечание: если указан `room`, пользователь при каждом входе будет попадать именно в эту комнату. Не используйте без необходимости.

### IdentityType — Роль/идентичность пользователя

| Роль | Описание | Права |
|-----|----------|-------|
| `owner` | Владелец пространства | Полные права: управление пространством, пользователями, доступ к AI-функциям и т.д. |
| `manager` | Менеджер пространства | Большинство прав, предоставляется владельцем |
| `participant` | Участник пространства | Обычный пользователь, подключённый через платформу; базовые права участника |
| `guest` | Гость | Ограниченные права; без боковой панели и AI-функций; по умолчанию при отсутствии `auth` |
| `assistant` | Оператор/саппорт | Для сценариев поддержки (auth=c_s); имеет управление комнатами в панели, но без AI-функций |
| `customer` | Клиент/покупатель | Для сценариев поддержки (auth=c_s); может только присоединяться к комнатам |

Замечания:
- При отсутствии параметра `auth` роль по умолчанию — `guest`.
- `manager`, `owner` и `participant` должны создаваться через интеграцию платформы.
- Роль `guest` нельзя повысить до роли управления.
- Гость, создавший пространство и ставший владельцем, всё равно не получит доступа к боковой панели и AI-функциям.

### TokenResult — Структура токена

| Поле | Тип | Обязат. | Описание |
|------|-----|---------|----------|
| id | string | Да | Уникальный идентификатор пользователя |
| username | string | Да | Отображаемое имя пользователя |
| avatar | string | Нет | URL аватара |
| space | string | Да | Имя пространства |
| room | RoomType | Нет | Выбор комнаты — если не указано, пользователь может выбрать комнату самостоятельно |
| identity | IdentityType | Нет | Роль пользователя — по умолчанию `guest` |
| preJoin | boolean | Нет | Показывать ли экран предварительного подключения (true = показывать) |
| iat | number | Да | Время выдачи токена (Unix timestamp) |
| exp | number | Да | Время истечения токена (Unix timestamp) |

## Примеры интеграции

### Пример Node.js

```javascript
const axios = require('axios');

// Формируем полезную нагрузку токена
const tokenData = {
  id: 'user_12345',
  username: 'Zhang San',
  avatar: 'https://example.com/avatar.jpg',
  space: 'my-workspace',
  room: '$empty', // опционально: автоматически назначить пустую комнату
  identity: 'participant',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600 // срок действия 1 час
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

### Пример Python

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

### Пример перенаправления на фронтенде

```javascript
// Клиентское перенаправление (токен должен выдать ваш бэкенд)
function redirectToVoceSpace(signedToken) {
  const url = `https://vocespace.com/api/connection-details?token=${encodeURIComponent(signedToken)}`;
  window.location.href = url;
}

// Использование
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // получить с бэкенда
redirectToVoceSpace(token);
```

## Типичные сценарии

### Сценарий 1: Интеграция поддержки клиентов

```javascript
// Оператор поддержки
const assistantToken = {
  id: 'assistant_001',
  username: 'Support Wang',
  space: 'customer-service',
  identity: 'assistant',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 28800 // 8 часов
};

// Клиент
const customerToken = {
  id: 'customer_12345',
  username: 'User12345',
  space: 'customer-service',
  room: 'room_urgent_001', // вход в конкретную комнату поддержки
  identity: 'customer',
  preJoin: false,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
```

### Сценарий 2: Рабочее пространство для совместной работы

```javascript
const collaboratorToken = {
  id: 'user_jane',
  username: 'Jane Doe',
  avatar: 'https://example.com/jane.jpg',
  space: 'project-alpha',
  identity: 'participant',
  preJoin: true, // показать страницу предварительного подключения для проверки устройств
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 // 24 часа
};
```

## Обработка ошибок

Частые коды ответа:

| Код | Значение | Как исправить |
|-----|---------|---------------|
| 401 | Токен недействителен или истёк | Переиздать токен |
| 403 | Отказано в доступе / недостаточно прав | Проверить поле `identity` |
| 400 | Неверные параметры запроса | Проверить обязательные поля в запросе |

## Рекомендации по безопасности

1. Подпись токена: всегда формируйте и подписывайте токены на сервере; не раскрывайте секреты подписи на клиенте.
2. Срок действия: задавайте разумное время жизни токена согласно сценарию использования.
3. HTTPS: в продакшене используйте HTTPS для защиты передачи токенов.
4. Принцип наименьших привилегий: выдавайте минимально необходимые права для каждой роли.
