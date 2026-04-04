import { DocumentNode, OperationVariables, useQuery } from '@apollo/client';
import { useCallback, useRef, useState } from 'react';

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Generic hook for Relay-style cursor-based pagination with infinite scroll.
 *
 * @param query  - The GQL document. Must accept `$first: Int` and `$after: String`.
 * @param rootField - The top-level field name returned by the query, e.g. "tenants" or "buildings".
 * @param pageSize - Number of items per page. Defaults to 50.
 * @param variables - Extra query variables (other than first/after).
 *
 * Usage:
 *   const { nodes, loading, error, refreshing, onRefresh, onEndReached, hasMore } =
 *     usePaginatedQuery(TENANTS_QUERY, 'tenants', 50);
 */
export function usePaginatedQuery<T = any>(
  query: DocumentNode,
  rootField: string,
  pageSize = 50,
  variables?: OperationVariables,
) {
  const [nodes, setNodes] = useState<T[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasNextPage: false, endCursor: null });
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingMore = useRef(false);

  const { loading, error, fetchMore, refetch } = useQuery(query, {
    variables: { first: pageSize, after: null, ...variables },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    onCompleted(data) {
      const connection = data?.[rootField];
      if (!connection) return;
      const newNodes: T[] = connection.edges?.map((e: any) => e.node) ?? [];
      setNodes(newNodes);
      setPageInfo(connection.pageInfo ?? { hasNextPage: false, endCursor: null });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch({ first: pageSize, after: null, ...variables });
    } finally {
      setRefreshing(false);
    }
  }, [refetch, pageSize, variables]);

  const onEndReached = useCallback(() => {
    if (!pageInfo.hasNextPage || isFetchingMore.current || loading) return;
    isFetchingMore.current = true;

    fetchMore({
      variables: { first: pageSize, after: pageInfo.endCursor, ...variables },
    }).then((result) => {
      const connection = result.data?.[rootField];
      if (!connection) return;
      const newNodes: T[] = connection.edges?.map((e: any) => e.node) ?? [];
      setNodes(prev => [...prev, ...newNodes]);
      setPageInfo(connection.pageInfo ?? { hasNextPage: false, endCursor: null });
    }).finally(() => {
      isFetchingMore.current = false;
    });
  }, [pageInfo.hasNextPage, pageInfo.endCursor, loading, fetchMore, pageSize, rootField, variables]);

  return {
    nodes,
    loading,
    error,
    refreshing,
    onRefresh,
    onEndReached,
    hasMore: pageInfo.hasNextPage,
    refetch,
  };
}
