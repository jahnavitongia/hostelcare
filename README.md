# Hostel Issue Reporting Platform

A minimal full-stack micro-project where hostel residents can report maintenance issues and administrators can update issue status. The backend uses Node.js, Express, Apollo GraphQL, JWT auth, an in-memory data store, and a Node.js `EventEmitter` notification flow. The frontend uses React, Vite, Apollo Client, and React Router.

For a deeper walkthrough of the codebase, setup, and deployment notes, see [LOCAL_README.md](LOCAL_README.md).

## Tech Stack

- Backend: Node.js, Express, Apollo Server, GraphQL, JWT, EventEmitter
- Frontend: React, Vite, Apollo Client, React Router, Lucide icons
- Tests: Jest
- Data store: In-memory array seeded with sample hostel issues

## Run Instructions

```bash
npm install
npm run install:all

npm run start:server
npm run start:client
```

Backend GraphQL API: `http://localhost:4000/graphql`

Frontend app: `http://localhost:3000`

Login accepts any username and password. Use a username beginning with `admin`, such as `admin-warden`, to enable admin status updates.

## Deployment Notes

- The frontend expects `VITE_GRAPHQL_URL` to point to the backend GraphQL endpoint, for example `https://hostelcare-vpdz.onrender.com/graphql`.
- If `VITE_GRAPHQL_URL` is set to the bare backend origin, the client now normalizes it to `/graphql`, but setting the full endpoint is still the safest option.
- The backend currently allows cross-origin requests with `cors()`, so no extra CORS change is required unless you want to restrict allowed origins later.
- For Netlify, make sure the build command targets the client workspace and the published site includes the built client bundle.

## Tests

```bash
npm test
```

The test suite includes one unit test for the `createIssue` GraphQL resolver and one unit test for the `issueCreated` event listener.

## Example GraphQL Operations

```graphql
mutation {
  login(username: "ria", password: "password") {
    token
    username
    role
  }
}
```

```graphql
mutation {
  createIssue(title: "Leaky Faucet", description: "In room 301") {
    id
    title
    status
    reporter
  }
}
```

```graphql
query {
  issues {
    id
    title
    description
    status
    reporter
  }
}
```

```graphql
mutation {
  updateIssue(id: "issue-1", status: "RESOLVED") {
    id
    title
    status
    updatedAt
  }
}
```


## Resume Bullet

- Built a full-stack hostel issue reporting platform with React, Apollo Client, Express, Apollo GraphQL, JWT authentication, in-memory issue tracking, EventEmitter-based notifications, and Jest coverage for resolver and event listener behavior.
