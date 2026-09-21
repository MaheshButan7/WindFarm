import { clsx, type ClassValue } from 'clsx';
// import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  // If we had tailwind, we would return twMerge(clsx(inputs))
  return clsx(inputs);
}
