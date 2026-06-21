import { clsx, type ClassValue } from "clsx";

/** Conditional className joiner. Keeps component class composition declarative. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
