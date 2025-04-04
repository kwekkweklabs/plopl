import { useRef } from "react";
import { useInView } from "framer-motion";

export function useElementInView(options) {
  const ref = useRef(null);
  const inView = useInView(ref, options);
  return { ref, inView };
}
