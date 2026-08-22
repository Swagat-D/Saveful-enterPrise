"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX, IconChevronDown } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
  children?: Links[];
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  brandLabel?: string;
  persistent: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  brandLabel,
  persistent = false,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  brandLabel?: string;
  persistent?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, animate, brandLabel, persistent }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  brandLabel,
  persistent,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  brandLabel?: string;
  persistent?: boolean;
}) => {
  return (
    <SidebarProvider
      open={open}
      setOpen={setOpen}
      animate={animate}
      brandLabel={brandLabel}
      persistent={persistent}
    >
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, persistent } = useSidebar();
  const expanded = persistent || open;

  return (
    <motion.div
      className={cn(
        "hidden h-full shrink-0 border-r-2 border-[#E8B4D9]/20 bg-saveful-cream py-4 md:flex md:flex-col md:w-[280px]",
        expanded ? "px-3" : "px-4",
        className
      )}
      animate={{
        width: persistent || !animate ? "280px" : open ? "280px" : "80px",
      }}
      onMouseEnter={persistent ? undefined : () => setOpen(true)}
      onMouseLeave={persistent ? undefined : () => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen, brandLabel } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "flex h-16 w-full flex-row items-center justify-between gap-3 border-b border-saveful-purple/10 bg-saveful-cream px-4 py-3 md:hidden"
        )}
        {...props}
      >
        <div className="z-20 flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative h-8 w-[112px] shrink-0">
            <Image
              src="/logo.png"
              alt="Saveful"
              fill
              sizes="112px"
              className="object-contain object-left"
              priority
            />
          </div>
          {brandLabel ? (
            <>
              <div className="h-6 w-px shrink-0 bg-gradient-to-b from-transparent via-saveful-green/35 to-transparent" />
              <div className="min-w-0">
                <p className="truncate font-saveful text-[10px] uppercase tracking-[0.2em] text-saveful-green">
                  {brandLabel}
                </p>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
          className="z-20 shrink-0 rounded-full p-1.5 text-saveful-green transition-colors hover:bg-white/60 hover:text-saveful-purple"
        >
          <IconMenu2 className="h-6 w-6" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-saveful-cream p-10",
                className
              )}
            >
              <button
                type="button"
                className="absolute right-10 top-10 z-50 text-saveful-green transition-colors hover:text-saveful-purple"
                onClick={() => setOpen(!open)}
                aria-label="Close menu"
              >
                <IconX className="h-6 w-6" />
              </button>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

const normalizePath = (value: string) => {
  if (!value) return "/";
  const trimmed = value.split("?")[0].split("#")[0] || "/";
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/$/, "");
};

/** Collect navigable hrefs so active state prefers the most specific match. */
export const collectNavHrefs = (links: Links[]): string[] => {
  const hrefs: string[] = [];
  for (const item of links) {
    if (item.href && item.href !== "#") {
      hrefs.push(normalizePath(item.href));
    }
    if (item.children?.length) {
      hrefs.push(...collectNavHrefs(item.children));
    }
  }
  return hrefs;
};

const getBestMatchingHref = (currentPath: string, navHrefs: string[]) => {
  let best: string | null = null;
  for (const href of navHrefs) {
    if (currentPath === href || currentPath.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) {
        best = href;
      }
    }
  }
  return best;
};

export const SidebarLink = ({
  link,
  className,
  navHrefs,
  ...props
}: {
  link: Links;
  className?: string;
  /** All sidebar hrefs; used so `/recipes` does not stay active on `/recipes/new`. */
  navHrefs?: string[];
}) => {
  const { open, animate, setOpen, persistent } = useSidebar();
  const pathname = usePathname();
  const expanded = persistent || open;
  const hasChildren = link.children && link.children.length > 0;
  const knownHrefs = navHrefs?.length
    ? navHrefs
    : collectNavHrefs([link]);

  const isPathActive = (targetHref: string) => {
    if (!targetHref || targetHref === "#") return false;
    const currentPath = normalizePath(pathname || "/");
    const targetPath = normalizePath(targetHref);
    const bestMatch = getBestMatchingHref(currentPath, knownHrefs);

    return bestMatch === targetPath;
  };

  const hasActiveChild = Boolean(link.children?.some((child) => isPathActive(child.href)));
  const isActive = isPathActive(link.href) || hasActiveChild;

  const [isExpanded, setIsExpanded] = useState(hasActiveChild);
  const shouldExpand = hasActiveChild || isExpanded;

  const handleNavigation = () => {
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const parentClassName = cn(
    "group/sidebar flex items-center gap-3 rounded-lg py-2.5 transition-all",
    expanded ? "justify-start px-3" : "justify-center px-2",
    isActive
      ? "bg-saveful-purple/15 text-saveful-purple"
      : "hover:bg-saveful-purple/10",
    className,
  );

  return (
    <div>
      {hasChildren ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={parentClassName}
          {...props}
        >
          {link.icon}

          <motion.span
            animate={{
              display: animate && !persistent ? (expanded ? "inline-block" : "none") : "inline-block",
              opacity: animate && !persistent ? (expanded ? 1 : 0) : 1,
            }}
            className="!m-0 inline-block flex-1 whitespace-pre !p-0 text-left font-saveful text-sm text-saveful-black transition duration-150 group-hover/sidebar:translate-x-1"
          >
            {link.label}
          </motion.span>

          {expanded && (
            <motion.div
              animate={{
                rotate: shouldExpand ? 180 : 0,
              }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <IconChevronDown className="h-4 w-4 text-saveful-gray" />
            </motion.div>
          )}
        </button>
      ) : link.onClick || link.href === "#" ? (
        <button
          type="button"
          onClick={() => {
            link.onClick?.();
            handleNavigation();
          }}
          className={parentClassName}
          {...props}
        >
          {link.icon}

          <motion.span
            animate={{
              display: animate && !persistent ? (expanded ? "inline-block" : "none") : "inline-block",
              opacity: animate && !persistent ? (expanded ? 1 : 0) : 1,
            }}
            className="!m-0 inline-block flex-1 whitespace-pre !p-0 text-left font-saveful text-sm text-saveful-black transition duration-150 group-hover/sidebar:translate-x-1"
          >
            {link.label}
          </motion.span>
        </button>
      ) : (
        <Link
          href={link.href}
          onClick={handleNavigation}
          className={parentClassName}
          {...props}
        >
          {link.icon}

          <motion.span
            animate={{
              display: animate && !persistent ? (expanded ? "inline-block" : "none") : "inline-block",
              opacity: animate && !persistent ? (expanded ? 1 : 0) : 1,
            }}
            className="!m-0 inline-block flex-1 whitespace-pre !p-0 text-left font-saveful text-sm text-saveful-black transition duration-150 group-hover/sidebar:translate-x-1"
          >
            {link.label}
          </motion.span>
        </Link>
      )}

      {hasChildren && (
        <AnimatePresence>
          {shouldExpand && expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-saveful-purple/20 pl-3">
                {link.children?.map((child, idx) => (
                  child.onClick || child.href === "#" ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        child.onClick?.();
                        handleNavigation();
                      }}
                      className={cn(
                        "group/child flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all",
                        isPathActive(child.href)
                          ? "bg-saveful-purple/15"
                          : "hover:bg-saveful-purple/10",
                      )}
                    >
                      <div className="shrink-0">{child.icon}</div>
                      <span className="font-saveful text-sm text-saveful-black transition group-hover/child:translate-x-1">
                        {child.label}
                      </span>
                    </button>
                  ) : (
                    <Link
                      key={idx}
                      href={child.href}
                      onClick={handleNavigation}
                      className={cn(
                        "group/child flex items-center gap-2 rounded-lg px-3 py-2 transition-all",
                        isPathActive(child.href)
                          ? "bg-saveful-purple/15"
                          : "hover:bg-saveful-purple/10",
                      )}
                    >
                      <div className="shrink-0">{child.icon}</div>
                      <span className="font-saveful text-sm text-saveful-black transition group-hover/child:translate-x-1">
                        {child.label}
                      </span>
                    </Link>
                  )
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
