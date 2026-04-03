import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TOKEN_KEY } from '../constants/api';

const httpLink = createHttpLink({ uri: API_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `JWT ${token}` } : {}),
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
