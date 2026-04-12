import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { URL } from "./config";

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext();

const ContextProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(true);
  const [latest, setLatest] = useState(null);
  const [past, setPast] = useState([]);
  const [lastSynced, setLastSynced] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState("");

  const fetchLatest = useCallback(async () => {
    const res = await axios.get(`${URL}/api/crowd/latest`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    setLatest(res.data.latest ?? null);
    return res.data.latest ?? null;
  }, []);

  const fetchPast = useCallback(async () => {
    const res = await axios.get(`${URL}/api/crowd/past`);
    setPast(Array.isArray(res.data.quarters) ? res.data.quarters : []);
    return res.data.quarters ?? [];
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    setError("");

    try {
      await Promise.all([fetchLatest(), fetchPast()]);
      setLastSynced(new Date());
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to load crowd data.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchLatest, fetchPast]);

  useEffect(() => {
    refreshAll();

    const intervalId = setInterval(() => {
      refreshAll();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshAll]);

  const contextValue = useMemo(
    () => ({
      isLogged,
      setIsLogged,
      latest,
      past,
      lastSynced,
      isRefreshing,
      error,
      refreshAll,
    }),
    [error, isLogged, isRefreshing, lastSynced, latest, past, refreshAll],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export default ContextProvider;
