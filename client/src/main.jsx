import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  createHttpLink
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import App from './App.jsx';
import './styles.css';

function resolveGraphQLEndpoint(value) {
  const fallback = 'http://localhost:4000/graphql';

  if (!value) {
    return fallback;
  }

  try {
    const url = new URL(value);

    if (url.pathname === '/' || !url.pathname) {
      url.pathname = '/graphql';
    }

    return url.toString();
  } catch (error) {
    return value.endsWith('/') ? `${value}graphql` : value;
  }
}

const httpLink = createHttpLink({
  uri: resolveGraphQLEndpoint(import.meta.env.VITE_GRAPHQL_URL)
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
