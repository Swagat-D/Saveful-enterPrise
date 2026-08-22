"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar, SidebarBody, SidebarLink, collectNavHrefs } from "./sidebar";
import { AppHeader } from "./AppHeader";
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
          brandLabel="Enterprise"
        >
          <SidebarBody className="justify-between gap-0">
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="mb-6 px-2">
                <Logo />
              </div>

              <div className="relative mb-6 px-3">
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

              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-saveful-purple/30 scrollbar-track-transparent hover:scrollbar-thumb-saveful-purple/50">
                <div className="flex flex-col gap-2 px-1">
                  {config.links.map((link, idx) => (
                    <SidebarLink key={idx} link={link} navHrefs={navHrefs} />
                  ))}
                </div>
              </div>
            </div>

          </SidebarBody>
        </Sidebar>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-40 shrink-0">
            <AppHeader
              userName={config.userName}
              userEmail={config.userEmail}
              roleLabel={config.roleLabel || "Enterprise admin"}
              organization={config.organization}
              onLogout={config.onLogout}
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

const Logo = () => {
  return (
    <Link
      href="/dashboard"
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

