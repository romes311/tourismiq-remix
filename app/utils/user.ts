import { useMatches } from "@remix-run/react";
import type { User } from "./auth.server";
import type { RootLoaderData } from "~/root";

export function useUser(): User | null {
  const matches = useMatches();
  const rootMatch = matches.find((match) => match.id === "root");
  return (rootMatch?.data as RootLoaderData | undefined)?.user ?? null;
}
