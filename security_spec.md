# Sukhan AI — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Isolation**: Every `Chat` document in `/chats/{chatId}` and every `ChatMessage` document in `/chats/{chatId}/messages/{messageId}` must have `ownerId == request.auth.uid` and require `request.auth.token.email_verified == true`.
2. **Relational Master Gate**: A `ChatMessage` in `/chats/{chatId}/messages/{messageId}` can only be read, created, updated, or deleted if the parent `/chats/{chatId}` document exists and its `ownerId == request.auth.uid`, and `incoming().chatId == chatId`.
3. **Strict Schema & Volumetric Bounds**:
   - `Chat`: keys strictly `['ownerId', 'title', 'saved', 'createdAt', 'updatedAt']`; `title` is 1..200 chars; `saved` is boolean; `createdAt` and `updatedAt` are server `request.time` timestamps.
   - `ChatMessage`: keys strictly `['chatId', 'ownerId', 'role', 'content', 'feedback', 'createdAt', 'updatedAt']`; `role` in `['user', 'assistant']`; `content` is 1..20000 chars; `feedback` in `['none', 'up', 'down']`.
4. **Immutability**: `ownerId`, `chatId`, `role`, and `createdAt` cannot be modified after creation.
5. **Query Enforcer**: `allow list` on `/chats` and `/chats/{chatId}/messages` strictly requires `resource.data.ownerId == request.auth.uid` without any `get()` or `exists()` calls inside `list`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create a chat -> `PERMISSION_DENIED`.
2. **Cross-User Ownership Spoof**: User A creating a chat with `ownerId: "user_b"` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Create**: Creating a chat with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
4. **Title Overflow (Denial of Wallet)**: Creating a chat with a 5,000-character `title` -> `PERMISSION_DENIED`.
5. **Forged Client Timestamp**: Creating a chat where `createdAt != request.time` -> `PERMISSION_DENIED`.
6. **Immutable Field Mutation**: Updating `ownerId` or `createdAt` on an existing chat -> `PERMISSION_DENIED`.
7. **Unauthorized Action Keys on Update**: Updating a chat with an unapproved field combination -> `PERMISSION_DENIED`.
8. **Orphaned Message Creation**: Creating a message under `/chats/nonexistent_chat/messages/msg1` -> `PERMISSION_DENIED`.
9. **Cross-Chat ID Mismatch**: Creating a message in `/chats/chat_1/messages/msg1` with `chatId: "chat_2"` -> `PERMISSION_DENIED`.
10. **Invalid Role Enum**: Creating a message with `role: "system"` -> `PERMISSION_DENIED`.
11. **Message Content Overflow**: Updating a message with a 50,000-character `content` string -> `PERMISSION_DENIED`.
12. **Blanket List Query Scraping**: Listing `/chats` without filtering `ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
