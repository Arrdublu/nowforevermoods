import { useState, useEffect } from 'react';

export type Currency = 'USD' | 'JMD';

export function useGeoPricing() {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'JMD' : 'USD';
    setCurrency(newCurrency);
    localStorage.setItem('now_forever_currency', newCurrency);
    localStorage.setItem('now_forever_geo_time', Date.now().toString());
    window.dispatchEvent(new Event('currencyChange'));
  };

  useEffect(() => {
    const handleSync = () => {
      const updatedCurrency = localStorage.getItem('now_forever_currency') as Currency;
      if (updatedCurrency) setCurrency(updatedCurrency);
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('currencyChange', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('currencyChange', handleSync);
    };
  }, []);

  useEffect(() => {
    async function fetchLocation() {
      // Check cache
      const cachedCurrency = localStorage.getItem('now_forever_currency');
      const cacheTime = localStorage.getItem('now_forever_geo_time');
      const now = Date.now();

      // Cache valid for 24 hours
      if (cachedCurrency && cacheTime && now - parseInt(cacheTime) < 86400000) {
        setCurrency(cachedCurrency as Currency);
        setIsLoading(false);
        return;
      }

      try {
        // Use a faster or more reliable geo service if possible, or just skip if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        const newCurrency = data.country_code === 'JM' ? 'JMD' : 'USD';
        setCurrency(newCurrency);
        localStorage.setItem('now_forever_currency', newCurrency);
        localStorage.setItem('now_forever_geo_time', now.toString());
      } catch (error) {
        console.warn("Geo-pricing fetch stalled or failed, defaulting to USD.");
        setCurrency('USD');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocation();
  }, []);

  return { currency, isLoading, toggleCurrency };
}
