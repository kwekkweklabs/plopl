import { Spinner } from "@heroui/react";
import { lazy } from "react";
import Suspended from "./components/utils/Suspended";

const _LazyIndexLayout = lazy(() => import("./layouts/IndexLayout"));
const _LazyIndexPage = lazy(() => import("./pages/IndexPage"));

const LazyRouteLoadingSpinner = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
};

export const LazyIndexLayout = () => (
  <Suspended loading={<LazyRouteLoadingSpinner />}>
    <_LazyIndexLayout />
  </Suspended>
);

export const LazyIndexPage = () => (
  <Suspended loading={<LazyRouteLoadingSpinner />}>
    <_LazyIndexPage />
  </Suspended>
);
