"use client";
import { Button } from "./Button";
import { AUTH_ENABLED, AUTH_LOGIN_PATH, API_BASE } from "@/lib/config";

interface AuthButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AuthButton({ className, size = "sm" }: AuthButtonProps) {
  if (!AUTH_ENABLED) return null;

  const href = `${API_BASE}${AUTH_LOGIN_PATH}`;
  return (
    <a href={href}>
      <Button variant="ghost-light" size={size} className={className}>
        Sign in with Google
      </Button>
    </a>
  );
}
