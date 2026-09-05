---
type: function
name: jwt-verification
status: active
created: 2026-07-05
tags: [middleware, auth, security]
---

# JWT Verification Middleware

## Purpose

Extract and verify Bearer tokens from the `Authorization` header. Validates token signature against JWKS endpoint and extracts user identity (`sub` claim).

## Flow

1. Extract `Authorization` header from request
2. Parse `Bearer <token>` format
3. Verify token signature using [[04-Functions/edge/jwt-verification|JwksClient]]
4. Validate claims: `exp`, `iss`, `sub`
5. Attach decoded payload to request context

## Implementation

```typescript
// packages/shared/src/middleware/jwt-verification.ts
interface JwksClient {
  verifyToken(token: string): Promise<JwtPayload>;
}
```

### Mock Implementation (Local Dev)
- Accepts hardcoded test token: `mushin-test-token-2026`
- Returns test user payload for development

### Production Implementation (TODO)
- OQ-20-01: BaaS provider not yet selected
- Will fetch JWKS from provider endpoint
- Will verify signature against published keys

## Error Responses

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing header, malformed token, invalid signature |
| AUTH_TOKEN_EXPIRED | 401 | Token `exp` < current time |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part B: Authentication
- [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]
- [[04-Functions/edge/tenancy-middleware|Tenancy Middleware]] - Next step after JWT verification

## Related

- [[03-API/endpoints/m1-identity/get-workspaces|GET /workspaces]] - First protected endpoint
- [[03-API/error-catalogue|Error Catalogue]] - AUTH_TOKEN_INVALID, AUTH_TOKEN_EXPIRED
