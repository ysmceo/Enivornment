import { useCallback, useEffect, useState } from 'react';

export default function useApiResource(loader, deps = []) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await loader();
      setData(next);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loading, error, data, refetch };
}
