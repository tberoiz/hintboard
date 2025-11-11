import * as React from "react";
import AppHeader from "@/shared/layouts/header/app-header";
import { CustomerViewBanner } from "@/shared/layouts/header/customer-view-banner";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full flex flex-col">
      <CustomerViewBanner />
      <AppHeader />
      <main className="overflow-hidden max-h-full">{children}</main>
    </div>
  );
}
