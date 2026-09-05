---
title: MUSHIN Documentation Conventions
type: meta
date: {{date}}
tags: [meta, conventions]
---
# Documentation Conventions

## File Naming
- Use kebab-case for all filenames
- Prefix MOC files with underscore: `_Topic-MOC.md`
- Prefix templates with `tpl-`

## Frontmatter
Every note must have YAML frontmatter with: title, type, date, status, tags

## Linking
- Use `[[wikilinks]]` for internal references
- Use relative paths for nested references
- All database tables link to [[02-Database/_Database-MOC|Database MOC]]
- All API endpoints link to [[03-API/_API-MOC|API MOC]]
- All functions link to [[04-Functions/_Functions-MOC|Functions MOC]]

## Templates
- [[00-Meta/Templates/tpl-architecture|Architecture Template]]
- [[00-Meta/Templates/tpl-database-schema|Database Schema Template]]
- [[00-Meta/Templates/tpl-api-endpoint|API Endpoint Template]]
- [[00-Meta/Templates/tpl-bugfix|Bugfix Template]]
- [[00-Meta/Templates/tpl-adr|ADR Template]]
