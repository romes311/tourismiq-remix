import { useMatches } from "@remix-run/react";
import type { User } from "./auth.server";
import type { SerializeFrom } from "@remix-run/node";
import type { loader as rootLoader } from "~/root";

export function useUser(): User | null {
  const matches = useMatches();
  const rootMatch = matches.find((match) => match.id === "root");
  return (
    (rootMatch?.data as SerializeFrom<typeof rootLoader> | undefined)?.user ??
    null
  );
}
