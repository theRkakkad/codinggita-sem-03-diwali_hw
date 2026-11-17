"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SellerInfo } from "@/types";

export const DEMO_USERS: SellerInfo[] = [
  {
    id: "student-1",
    name: "Aarav Sharma",
    email: "aarav.sharma@campus.edu",
    phone: "+91 98765 43210",
    campus: "North Campus",
    contactPreference: "WhatsApp",
    bio: "3rd Year Computer Science student. Selling textbooks, drafter & electronics.",
    role: "seller",
  },
  {
    id: "student-2",
    name: "Priya Patel",
    email: "priya.patel@campus.edu",
    phone: "+91 98111 22334",
    campus: "South Campus",
    contactPreference: "Campus Meeting",
    bio: "2nd Year Electronics student looking for textbooks & dorm accessories.",
    role: "buyer",
  },
];

interface AppContextType {
  currentUser: SellerInfo;
  setCurrentUser: (user: SellerInfo) => void;
  isSeller: boolean;
  switchToSeller: () => void;
  switchToBuyer: () => void;
  favorites: string[];
  toggleFavorite: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SellerInfo>(DEMO_USERS[0]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load favorites from localStorage
    try {
      const storedFavs = localStorage.getItem("vidyabazaar_favorites");
      if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
      }
      const storedUser = localStorage.getItem("vidyabazaar_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        // Ensure user is valid demo user
        const matched = DEMO_USERS.find((u) => u.id === parsed.id);
        if (matched) {
          setCurrentUser(matched);
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const handleSetUser = (user: SellerInfo) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("vidyabazaar_user", JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const switchToSeller = () => {
    handleSetUser(DEMO_USERS[0]);
  };

  const switchToBuyer = () => {
    handleSetUser(DEMO_USERS[1]);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("vidyabazaar_favorites", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const isSeller = currentUser.role === "seller" || currentUser.id === "student-1";

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetUser,
        isSeller,
        switchToSeller,
        switchToBuyer,
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    // Return fallback for SSR
    return {
      currentUser: DEMO_USERS[0],
      setCurrentUser: () => {},
      isSeller: true,
      switchToSeller: () => {},
      switchToBuyer: () => {},
      favorites: [],
      toggleFavorite: () => {},
      isFavorite: () => false,
    };
  }
  return context;
}
