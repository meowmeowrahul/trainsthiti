import { createContext, useEffect, useState } from "react";
import App from "./App";
import axios from "axios";

export const URL = "http://localhost:3000";

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext();

const ContextProvider = () => {
  const [isLogged, setIsLogged] = useState(true);
  const [latest, setLatest] = useState({});
  const [past, setPast] = useState({});
  async function getLatest() {
    try {
      const res = await axios.get(`${URL}/api/crowd/latest`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setLatest(res.data.latest);
      console.log("from API:", res.data.latest); // will show correct fresh data
    } catch (err) {
      console.error("Latest:", err);
    }
  }

  async function getPast() {
    try {
      const res = await axios.get(`${URL}/api/crowd/past`);
      setPast(res.data.quarters);
    } catch (error) {
      console.error("Latest:", error);
    }
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      getLatest();
    }, 5000);

    return () => {
      // Cleanup function to clear the interval when the component unmounts
      clearInterval(intervalId);
    };
  }, []);
  useEffect(() => {
    const intervalId = setInterval(() => {
      getPast();
    }, 5000);

    return () => {
      // Cleanup function to clear the interval when the component unmounts
      clearInterval(intervalId);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLogged,
        setIsLogged,
        latest,
        past,
      }}
    >
      <App />
    </AppContext.Provider>
  );
};

export default ContextProvider;
