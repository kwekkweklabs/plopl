import { HeroUIProvider } from "@heroui/react";
import QueryProvider from "./QueryProvider";

export default function RootProvider({ children }) {
  return (
    <HeroUIProvider>
      <QueryProvider>{children}</QueryProvider>
    </HeroUIProvider>
  );
}
