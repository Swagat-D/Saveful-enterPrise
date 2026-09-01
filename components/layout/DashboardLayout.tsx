"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar, SidebarBody, SidebarLink, collectNavHrefs } from "./sidebar";
import { AppHeader } from "./AppHeader";
import { LogOut } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { DashboardLayoutProps } from "@/types/sidebar";

export function DashboardLayout({ config, children }: DashboardLayoutProps) {
  const [open, setOpen] = useState(false);
  const navHrefs = collectNavHrefs(config.links);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-saveful-cream">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar
          open={open}
          setOpen={setOpen}
          animate={false}
          persistent
          brandLabel={config.role === "admin" ? "Admin" : config.role === "business" ? "Business" : "Enterprise"}
        >
          <SidebarBody className="justify-between gap-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-6 shrink-0 px-2">
                <Logo
                  href={
                    config.homeHref ??
                    (config.role === "admin"
                      ? "/admin/dashboard"
                      : config.role === "business"
                        ? "/business/home"
                        : "/dashboard")
                  }
                />
              </div>

              <div className="relative mb-6 shrink-0 px-3">
                <div className="h-0.5 bg-gradient-to-r from-transparent via-saveful-purple/40 to-transparent shadow-sm" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-saveful-cream p-1"
                >
                  <div className="relative h-5 w-5">
                    <Image
                      src="/food.png"
                      alt="Decoration"
                      fill
                      sizes="20px"
                      className="object-contain"
                    />
                  </div>
                </motion.div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-saveful-purple/30 scrollbar-track-transparent hover:scrollbar-thumb-saveful-purple/50">
                <div className="flex flex-col gap-1 px-1 pb-2">
                  {config.links.map((link, idx) => (
                    <SidebarLink key={idx} link={link} navHrefs={navHrefs} />
                  ))}
                </div>
              </div>

              {config.onLogout ? (
                <div className="shrink-0 border-t border-saveful-purple/15 px-1 pt-3">
                  <button
                    type="button"
                    onClick={config.onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-saveful-semibold text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>

          </SidebarBody>
        </Sidebar>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-40 shrink-0">
            <AppHeader
              userName={config.userName}
              userEmail={config.userEmail}
              roleLabel={
                config.roleLabel ||
                (config.role === "admin" ? "Platform admin" : config.role === "business" ? "Business" : "Enterprise admin")
              }
              organization={config.organization}
              organizationLogo={config.organizationLogo}
              portalCaption={
                config.portalCaption ??
                (config.role === "admin" ? "Admin" : config.role === "business" ? "Business" : "Enterprise")
              }
              profileHref={
                config.profileHref ??
                (config.role === "admin" ? "/admin/account" : config.role === "business" ? "/business/account" : "/account")
              }
              onLogout={config.onLogout}
              showAppDownload={config.showAppDownload ?? config.role === "business"}
            />
          </div>
          <div className="relative z-0 min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-saveful-purple/30 scrollbar-track-transparent hover:scrollbar-thumb-saveful-purple/50">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const Logo = ({ href }: { href: string }) => {
  return (
    <Link
      href={href}
      className="group relative z-20 flex items-center justify-center rounded-lg py-3 transition-all hover:bg-white/50"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex w-full items-center justify-center px-2"
      >
        <div className="relative h-14 w-36">
          <Image
            src="/logo.png"
            alt="Saveful Logo"
            fill
            sizes="144px"
            className="object-contain"
            priority
          />
        </div>
      </motion.div>
    </Link>
  );
};

