---
type: reference
section: api
---

# API Error Catalogue

## Standard Errors

| Code | Name | Description | HTTP Status |
|------|------|-------------|-------------|
| E001 | UNKNOWN_ERROR | Unexpected server error | 500 |
| E002 | UNAUTHORIZED | Missing or invalid auth | 401 |
| E003 | FORBIDDEN | Insufficient permissions | 403 |
| E004 | NOT_FOUND | Resource not found | 404 |
| E005 | VALIDATION_ERROR | Request validation failed | 400 |
| E006 | RATE_LIMITED | Too many requests | 429 |

## Module-Specific Errors

<!-- Add module-specific error codes as they are defined -->

## Related

- [[03-API/_API-MOC|API MOC]]
- [[03-API/Doc-20-API-Design|API Design]]
- [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]
