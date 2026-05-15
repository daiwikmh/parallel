import { AppShell } from "@/components/layout/AppShell";
import { WalletProvider } from "@/components/wallet/WalletProvider";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
