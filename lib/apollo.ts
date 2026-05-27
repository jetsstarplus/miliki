import { ApolloClient, InMemoryCache, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUploadLink } from 'apollo-upload-client';
import { createClient } from 'graphql-ws';
import { ACTIVE_COMPANY_KEY, API_URL, TOKEN_KEY, WS_API_URL } from '../constants/api';

const httpLink = createUploadLink({ uri: API_URL });

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
    url: WS_API_URL,
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
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // DashboardType is non-normalized; merge to avoid cache replacement warnings.
          dashboard: { merge: true },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
