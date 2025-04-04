import { Spinner } from "@heroui/react";
import { Suspense } from "react";

export default function Suspended({ children, loading }) {
  return <Suspense fallback={loading || <Spinner />}>{children}</Suspense>;
}
