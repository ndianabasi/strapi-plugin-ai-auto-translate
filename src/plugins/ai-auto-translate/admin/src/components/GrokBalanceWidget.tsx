import { useEffect, useState } from 'react';
import { Box, Typography, Loader } from '@strapi/design-system';
import { useFetchClient } from '@strapi/admin/strapi-admin';
import { PLUGIN_ID } from '../pluginId';

const GrokBalanceWidget = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchClient = useFetchClient();

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const { data } = await fetchClient.get(`/${PLUGIN_ID}/balance/grok`);
        setBalance(data.balance);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadBalance();
  }, [fetchClient]);

  return (
    <Box padding={4} background="neutral0" borderRadius="4px" borderColor="neutral200">
      <Typography variant="sigma">Grok AI Balance</Typography>
      {loading ? (
        <Loader />
      ) : (
        <Typography variant="alpha" textColor="success600">
          ${balance?.toFixed(2) || '0.00'}
        </Typography>
      )}
    </Box>
  );
};

export default GrokBalanceWidget;