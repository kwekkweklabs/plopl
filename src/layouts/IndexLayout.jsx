import { Outlet } from "react-router";

export default function IndexLayout() {
  return (
    <div className="light">
      <Outlet />
    </div>
  );
}
