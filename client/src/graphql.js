import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      username
      role
    }
  }
`;

export const ISSUES_QUERY = gql`
  query Issues {
    issues {
      id
      title
      description
      status
      reporter
      createdAt
      updatedAt
    }
  }
`;

export const ISSUE_QUERY = gql`
  query Issue($id: ID!) {
    issue(id: $id) {
      id
      title
      description
      status
      reporter
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ISSUE_MUTATION = gql`
  mutation CreateIssue($title: String!, $description: String!) {
    createIssue(title: $title, description: $description) {
      id
      title
      description
      status
      reporter
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ISSUE_MUTATION = gql`
  mutation UpdateIssue($id: ID!, $status: String!) {
    updateIssue(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;
