

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

### Enpoints needed

# Chat API Endpoints

## 1. Create New Chat Session
**Endpoint:** `POST /api/chat/sessions`  
**Description:** Creates a new chat session

### Request
```json
{
  "title": "New Chat"  // Optional
}
```

### Response
```json
{
  "id": "1234567890",
  "title": "New Chat",
  "messages": [],
  "created": "2024-03-20T10:00:00Z",
  "lastUpdated": "2024-03-20T10:00:00Z"
}
```

## 2. Send Message
**Endpoint:** `POST /api/chat/messages`  
**Description:** Send a message in a chat session

### Request
```json
{
  "sessionId": "1234567890",
  "message": {
    "role": "user",
    "content": "What is the weather today?",
    "attachments": []  // Optional
  }
}
```

### Response
```json
{
  "sessionId": "1234567890",
  "message": {
    "role": "assistant",
    "content": "Today's forecast: Partly cloudy with a high of 72°F.",
    "id": "msg_1234567890",
    "createdAt": "2024-03-20T10:00:05Z"
  }
}
```

## 3. Get Chat Session
**Endpoint:** `GET /api/chat/sessions/{sessionId}`  
**Description:** Get details of a specific chat session

### Response
```json
{
  "id": "1234567890",
  "title": "Weather Discussion",
  "messages": [
    {
      "id": "msg_1234567890",
      "role": "user",
      "content": "What is the weather today?",
      "createdAt": "2024-03-20T10:00:00Z"
    },
    {
      "id": "msg_1234567891",
      "role": "assistant",
      "content": "Today's forecast: Partly cloudy with a high of 72°F.",
      "createdAt": "2024-03-20T10:00:05Z"
    }
  ],
  "created": "2024-03-20T10:00:00Z",
  "lastUpdated": "2024-03-20T10:00:05Z"
}
```

## 4. List All Chat Sessions
**Endpoint:** `GET /api/chat/sessions`  
**Description:** Get all chat sessions

### Query Parameters
- `limit`: Number of sessions to return (default: 20)
- `offset`: Number of sessions to skip (default: 0)
- `sort`: Sort order ("created" or "updated", default: "updated")

### Response
```json
{
  "sessions": [
    {
      "id": "1234567890",
      "title": "Weather Discussion",
      "messageCount": 2,
      "created": "2024-03-20T10:00:00Z",
      "lastUpdated": "2024-03-20T10:00:05Z"
    },
    {
      "id": "0987654321",
      "title": "Project Planning",
      "messageCount": 5,
      "created": "2024-03-20T09:00:00Z",
      "lastUpdated": "2024-03-20T09:30:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

## 5. Update Chat Session
**Endpoint:** `PUT /api/chat/sessions/{sessionId}`  
**Description:** Update chat session details

### Request
```json
{
  "title": "Updated Chat Title"
}
```

### Response
```json
{
  "id": "1234567890",
  "title": "Updated Chat Title",
  "messageCount": 2,
  "created": "2024-03-20T10:00:00Z",
  "lastUpdated": "2024-03-20T10:05:00Z"
}
```

## 6. Delete Chat Session
**Endpoint:** `DELETE /api/chat/sessions/{sessionId}`  
**Description:** Delete a chat session

### Response
```json
{
  "success": true,
  "message": "Chat session deleted successfully"
}
```

## 7. Get Session Messages
**Endpoint:** `GET /api/chat/sessions/{sessionId}/messages`  
**Description:** Get messages from a specific chat session

### Query Parameters
- `limit`: Number of messages to return (default: 50)
- `before`: Get messages before this timestamp
- `after`: Get messages after this timestamp

### Response
```json
{
  "sessionId": "1234567890",
  "messages": [
    {
      "id": "msg_1234567890",
      "role": "user",
      "content": "What is the weather today?",
      "createdAt": "2024-03-20T10:00:00Z"
    },
    {
      "id": "msg_1234567891",
      "role": "assistant",
      "content": "Today's forecast: Partly cloudy with a high of 72°F.",
      "createdAt": "2024-03-20T10:00:05Z"
    }
  ],
  "total": 2,
  "limit": 50
}
```

## Error Response Format
All endpoints may return the following error response:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {} // Optional additional error details
  }
}
```

