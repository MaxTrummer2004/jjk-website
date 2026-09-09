import type { ReactNode } from "react";
import { MitgliederTransition } from "./transition-wrapper";

export default function MitgliederLayout({ children }: { children: ReactNode }) {
  return <MitgliederTransition>{children}</MitgliederTransition>;
}
