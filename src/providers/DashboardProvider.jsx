import { CHAINS } from "@/config";
import { createContext, useContext, useState } from "react";

const DashboardContext = createContext({
  chain: CHAINS[0],
  setChain: () => { },
});

export default function DashboardProvider({ children }) {
  const [chain, setChain] = useState(CHAINS[0]);

  return (
    <DashboardContext.Provider
      value={{
        chain,
        setChain
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  return useContext(DashboardContext);
}