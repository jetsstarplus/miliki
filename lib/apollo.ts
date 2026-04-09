import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { createClient } from 'graphql-ws';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACTIVE_COMPANY_KEY, API_URL, TOKEN_KEY } from '../constants/api';

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

const wsLink = new GraphQLWsLink(
  createClient({
    url: API_URL.replace(/^http/, (m) => (m === 'https' ? 'wss' : 'ws')),
    connectionParams: async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const activeCompany = await AsyncStorage.getItem(ACTIVE_COMPANY_KEY);
      return {
        ...(token ? { Authorization: `JWT ${token}` } : {}),
        ...(activeCompany ? { 'X-COMPANY-ID': JSON.parse(activeCompany).id } : {}),
      };
    },
  }),
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  from([authLink, httpLink]),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
