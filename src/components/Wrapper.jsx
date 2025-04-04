import { cnm } from "@/utils/style";

export default function Wrapper({ children, className }) {
  return (
    <div
      className={cnm(
        "min-h-screen bg-color-default relative overflow-hidden",
        className
      )}
    >
      <img
        src="/bg-accent-green.svg"
        alt="accent green"
        className="absolute -left-10 top-0 z-0"
      />
      <img
        src="/bg-accent-blue.svg"
        alt="accent blue"
        className="absolute -right-10 bottom-0 z-0"
      />
      <div className="z-10">{children}</div>
    </div>
  );
}