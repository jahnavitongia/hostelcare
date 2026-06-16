const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Issue {
    id: ID!
    title: String!
    description: String!
    status: String!
    reporter: String!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    username: String!
    role: String!
  }

  type Query {
    me: String
    issues: [Issue!]!
    issue(id: ID!): Issue
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!
    createIssue(title: String!, description: String!): Issue!
    updateIssue(id: ID!, status: String!): Issue
    deleteIssue(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
