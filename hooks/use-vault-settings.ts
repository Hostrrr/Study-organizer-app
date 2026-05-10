import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const VAULT_ENABLED_KEY = 'vault_enabled';

export function useVaultSettings() {
  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(VAULT_ENABLED_KEY)
      .then(v => setVaultEnabled(v === 'true'))
      .finally(() => setLoading(false));
  }, []);

  const enableVault = useCallback(async () => {
    await AsyncStorage.setItem(VAULT_ENABLED_KEY, 'true');
    setVaultEnabled(true);
  }, []);

  const disableVault = useCallback(async () => {
    await AsyncStorage.setItem(VAULT_ENABLED_KEY, 'false');
    setVaultEnabled(false);
  }, []);

  return { vaultEnabled, loading, enableVault, disableVault };
}
