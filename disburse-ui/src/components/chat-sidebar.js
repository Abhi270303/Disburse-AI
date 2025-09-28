// ChatSidebar.jsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusIcon,
  MessageCircleIcon,
  FolderIcon,
  ChevronDownIcon,
  TrashIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  CreditCardIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownHeader,
  DropdownBody,
  DropdownButton,
} from "@/components/ui/motion-dropdown";

export function ChatSidebar({
  sidebarCollapsed: initialSidebarCollapsed = false,
  setSidebarCollapsed: setInitialSidebarCollapsed,
  chatSessions,
  currentChatId,
  createNewChat,
  selectChat,
  deleteChat,
  userDropdownOpen,
  setUserDropdownOpen,
  messages = [],
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialSidebarCollapsed
  );
  const [isMobile, setIsMobile] = useState(false);

  // Handle mounting and storage
  useEffect(() => {
    const initializeSidebar = async () => {
      setMounted(true);
      try {
        const savedState = localStorage.getItem("sidebarCollapsed");
        if (savedState !== null) {
          setSidebarCollapsed(savedState === "true");
        }
      } catch (error) {
        console.error("Error loading sidebar state from localStorage:", error);
      }
    };

    initializeSidebar();
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save to storage whenever the state changes
  useEffect(() => {
    const saveSidebarState = async () => {
      if (mounted) {
        try {
          localStorage.setItem("sidebarCollapsed", sidebarCollapsed);
          if (setInitialSidebarCollapsed) {
            setInitialSidebarCollapsed(sidebarCollapsed);
          }
        } catch (error) {
          console.error("Error saving sidebar state to localStorage:", error);
        }
      }
    };

    saveSidebarState();
  }, [sidebarCollapsed, setInitialSidebarCollapsed, mounted]);

  const handleChatSelect = (chatId) => {
    selectChat(chatId);
    router.push(`/chat/${chatId}`);
  };

  const handleNewChat = async () => {
    router.push("/", { scroll: false });
  };

  // Don't render anything until after mounting
  if (!mounted) {
    return null;
  }

  // Mobile hamburger menu trigger
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <PanelLeftIcon className="h-5 w-5" />
        </Button>
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-200 ease-in-out bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-border/20",
            sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center justify-between w-full">
                <Link href={"/"} className="flex items-center gap-2.5">
                  <Image
                    src={"/logo/main.svg"}
                    width={24}
                    height={24}
                    alt="Disburse logo"
                    className={cn(
                      "transition-colors",
                      theme === "light" && "invert"
                    )}
                  />
                  <span className="text-xl font-medium tracking-tight">
                    Disburse
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <PanelLeftCloseIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation section */}
            <div className="flex flex-col space-y-1 p-3">
              <Button
                variant="secondary"
                className="bg-secondary/60 hover:bg-secondary/80 flex items-center justify-start px-3 py-3 h-auto rounded-xl text-base w-full shadow-sm transition-colors"
                onClick={handleNewChat}
              >
                <PlusIcon className="h-5 w-5 mr-3" />
                <span className="font-medium">New chat</span>
              </Button>
            </div>

            {/* Recents section */}
            <div className="px-4 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recents
              </h3>
            </div>

            <ScrollArea className="flex-1 px-3">
              {chatSessions.map((chat) => (
                <div key={chat?.id} className="group relative">
                  <div
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors",
                      currentChatId === chat?.id
                        ? "bg-accent/20 text-accent-foreground"
                        : "hover:bg-muted/10"
                    )}
                    onClick={() => {
                      handleChatSelect(chat?.id);
                      setSidebarCollapsed(true);
                    }}
                  >
                    <div className="truncate flex-1">
                      <div className="truncate text-sm font-medium">
                        {chat?.title || "Untitled"}
                      </div>
                    </div>

                    {/* Show delete button on hover */}
                    <button
                      className="hidden group-hover:flex items-center justify-center h-7 w-7 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={(e) => deleteChat(chat?.id, e)}
                      aria-label="Delete chat"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </ScrollArea>

            {/* User account area */}
            <div className="p-4 mt-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DropdownRoot>
                    <DropdownTrigger>
                      <div className="relative h-8 w-8 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                        <Image
                          src="https://pbs.twimg.com/profile_images/1895533022537269248/rNwE1gM6_400x400.jpg"
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownHeader>Quick Actions</DropdownHeader>
                      <DropdownBody>
                        <DropdownButton>
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </DropdownButton>
                        <DropdownButton>
                          <SettingsIcon className="h-4 w-4" />
                          <span>Settings</span>
                        </DropdownButton>
                        <DropdownButton>
                          <CreditCardIcon className="h-4 w-4" />
                          <span>Billing</span>
                        </DropdownButton>
                        <DropdownButton className="text-destructive">
                          <LogOutIcon className="h-4 w-4" />
                          <span>Log out</span>
                        </DropdownButton>
                      </DropdownBody>
                    </DropdownContent>
                  </DropdownRoot>
                  <div className="text-sm flex flex-col">
                    <span className="font-medium">Vivek Sahu</span>
                    <span className="text-xs text-muted-foreground">
                      Free plan
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <SunIcon className="h-5 w-5" />
                    ) : (
                      <MoonIcon className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-[calc(100vh-2rem)] my-4 ml-4 transition-all duration-200 ease-in-out bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-2xl border border-border/20 shadow-lg",
        sidebarCollapsed ? "w-16" : "w-80",
        isMobile &&
          "fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out",
        isMobile && sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      )}
    >
      {/* Sidebar header */}
      <div className="flex items-center justify-between p-4">
        {sidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
            onClick={() => setSidebarCollapsed(false)}
          >
            <PanelLeftIcon className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link href={"/"} className="flex items-center gap-2.5">
              <Image
                src={"/logo/main.svg"}
                width={24}
                height={24}
                alt="Disburse logo"
                className={cn(
                  "transition-colors",
                  theme === "light" && "invert"
                )}
              />
              <span className="text-xl font-medium tracking-tight">
                Disburse
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeftCloseIcon className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation section */}
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center py-4 space-y-6">
          <Button
            variant="default"
            size="icon"
            className="rounded-xl bg-secondary/60 hover:bg-secondary/80 text-foreground h-10 w-10 shadow-sm transition-colors"
            onClick={handleNewChat}
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
          >
            <MessageCircleIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
          >
            <FolderIcon className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col space-y-1 p-3">
          <Button
            variant="secondary"
            className="bg-secondary/60 hover:bg-secondary/80 flex items-center justify-start px-3 py-3 h-auto rounded-xl text-base w-full shadow-sm transition-colors"
            onClick={handleNewChat}
          >
            <PlusIcon className="h-5 w-5 mr-3" />
            <span className="font-medium">New chat</span>
          </Button>
        </div>
      )}

      {/* Recents section */}
      {!sidebarCollapsed && (
        <>
          <div className="px-4 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recents
            </h3>
          </div>

          <ScrollArea className="flex-1 px-3">
            {chatSessions.map((chat) => (
              <div key={chat?.id} className="group relative">
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors",
                    currentChatId === chat?.id
                      ? "bg-accent/20 text-accent-foreground"
                      : "hover:bg-muted/10"
                  )}
                  onClick={() => handleChatSelect(chat?.id)}
                >
                  <div className="truncate flex-1">
                    <div className="truncate text-sm font-medium">
                      {chat?.title || "Untitled"}
                    </div>
                  </div>

                  {/* Show delete button on hover */}
                  <button
                    className="hidden group-hover:flex items-center justify-center h-7 w-7 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={(e) => deleteChat(chat?.id, e)}
                    aria-label="Delete chat"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </ScrollArea>
        </>
      )}

      {/* User account area */}
      <div className={cn("mt-auto", sidebarCollapsed ? "p-3" : "p-4")}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </Button>
            <DropdownRoot>
              <DropdownTrigger>
                <div className="relative h-8 w-8 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                  <Image
                    src="https://pbs.twimg.com/profile_images/1886915553014767617/TMD28UZw_400x400.jpg"
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                </div>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownHeader>Quick Actions</DropdownHeader>
                <DropdownBody>
                  <DropdownButton>
                    <UserIcon className="h-4 w-4" />
                    <span>Profile</span>
                  </DropdownButton>
                  <DropdownButton>
                    <SettingsIcon className="h-4 w-4" />
                    <span>Settings</span>
                  </DropdownButton>
                  <DropdownButton>
                    <CreditCardIcon className="h-4 w-4" />
                    <span>Billing</span>
                  </DropdownButton>
                  <DropdownButton className="text-destructive">
                    <LogOutIcon className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownButton>
                </DropdownBody>
              </DropdownContent>
            </DropdownRoot>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DropdownRoot>
                <DropdownTrigger>
                  <div className="relative h-8 w-8 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                    <Image
                      src="https://pbs.twimg.com/profile_images/1886915553014767617/TMD28UZw_400x400.jpg"
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  </div>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownHeader>Quick Actions</DropdownHeader>
                  <DropdownBody>
                    <DropdownButton>
                      <UserIcon className="h-4 w-4" />
                      <span>Profile</span>
                    </DropdownButton>
                    <DropdownButton>
                      <SettingsIcon className="h-4 w-4" />
                      <span>Settings</span>
                    </DropdownButton>
                    <DropdownButton>
                      <CreditCardIcon className="h-4 w-4" />
                      <span>Billing</span>
                    </DropdownButton>
                    <DropdownButton className="text-destructive">
                      <LogOutIcon className="h-4 w-4" />
                      <span>Log out</span>
                    </DropdownButton>
                  </DropdownBody>
                </DropdownContent>
              </DropdownRoot>
              <div className="text-sm flex flex-col">
                <span className="font-medium">Abhishek Yadav</span>
                <span className="text-xs text-muted-foreground">Free plan</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </Button>
              <DropdownRoot>
                <DropdownTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors"
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </Button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownHeader>Quick Actions</DropdownHeader>
                  <DropdownBody>
                    <DropdownButton>
                      <UserIcon className="h-4 w-4" />
                      <span>Profile</span>
                    </DropdownButton>
                    <DropdownButton>
                      <SettingsIcon className="h-4 w-4" />
                      <span>Settings</span>
                    </DropdownButton>
                    <DropdownButton>
                      <CreditCardIcon className="h-4 w-4" />
                      <span>Billing</span>
                    </DropdownButton>
                    <DropdownButton className="text-destructive">
                      <LogOutIcon className="h-4 w-4" />
                      <span>Log out</span>
                    </DropdownButton>
                  </DropdownBody>
                </DropdownContent>
              </DropdownRoot>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
