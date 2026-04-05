import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
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

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
