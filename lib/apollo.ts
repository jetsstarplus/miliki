import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from 'graphql-ws';
import { ACTIVE_COMPANY_KEY, API_URL, TOKEN_KEY, WS_URL } from '../constants/api';

const httpLink = createHttpLink({ uri: API_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const activeCompany = await AsyncStorage.getItem(ACTIVE_COMPANY_KEY);
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `JWT ${token}` } : {}),
      ...(activeCompany ? { 'X-COMPANY-ID': JSON.parse(activeCompany).id } : {}),
    },
  };
});

/**
 * Error link — handles GraphQL and network errors per Section 21.
 * Emits events on a simple bus so screens/context can react.
 */
type ErrorHandler = (code: string) => void;
const errorHandlers: ErrorHandler[] = [];

export function onGraphQLError(handler: ErrorHandler) {
  errorHandlers.push(handler);
  return () => {
    const idx = errorHandlers.indexOf(handler);
    if (idx > -1) errorHandlers.splice(idx, 1);
  };
}

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const code = (err.extensions?.code as string) ?? '';
      if (code) errorHandlers.forEach(h => h(code));
    }
  }
  if (networkError) {
    console.warn('[Apollo] Network error:', networkError);
  }
});

/**
 * WebSocket link for real-time subscriptions (Section 20 & 21).
 */
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return { Authorization: token ? `JWT ${token}` : '' };
    },
    retryAttempts: 5,
    on: {
      error: (err) => {
        console.warn('[Apollo WS] Connection error:', err);
      },
      closed: (event) => {
        if ((event as CloseEvent).code !== 1000) {
          console.warn('[Apollo WS] Connection closed unexpectedly:', (event as CloseEvent).code);
        }
      },
    },
  }),
);

/**
 * Route subscriptions to the WebSocket link, everything else to HTTP.
 */
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink),
);

export const apolloClient = new ApolloClient({
  link: from([errorLink, splitLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
