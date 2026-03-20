
# Blog API - INF222 TAF1

## Installation

```bash
npm install
node app.js
```

Server runs on:

http://localhost:3000

Swagger documentation:

http://localhost:3000/api-docs

## Endpoints

Create article

POST /api/articles

Get all articles

GET /api/articles

Get article by id

GET /api/articles/{id}

Update article

PUT /api/articles/{id}

Delete article

DELETE /api/articles/{id}

Search article

GET /api/articles/search?query=text
