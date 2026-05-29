"use client";

import Link from "next/link";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NavbarProps {
  loginLabel?: string;
  startBuyingLabel?: string;
  startSellingLabel?: string;
  languageLabel?: string;
  language?: string;
  languageOptions?: Array<{ value: string; label: string }>;
  onLanguageChange?: (value: string) => void;
}

export function Navbar({
  loginLabel = "Login",
  startBuyingLabel = "Start Buying",
  startSellingLabel = "Start Selling",
  languageLabel = "Language",
  language = "en",
  languageOptions,
  onLanguageChange,
}: NavbarProps) {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setIsLanguageOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectedLanguageLabel =
    languageOptions?.find((option) => option.value === language)?.label ||
    "English";

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-black tracking-tight text-emerald-800"
        >
          SukiGo
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {onLanguageChange && languageOptions?.length ? (
            <div className="relative" ref={languageMenuRef}>
              <button
                type="button"
                onClick={() => setIsLanguageOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 sm:px-3"
              >
                <Languages className="h-4 w-4 text-emerald-700" />
                <span className="hidden font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 sm:inline">
                  {languageLabel}
                </span>
                <span className="font-sans text-sm font-semibold text-slate-700">
                  {selectedLanguageLabel}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition ${isLanguageOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isLanguageOpen ? (
                <div className="absolute right-0 mt-2 min-w-40 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-1 shadow-xl sm:min-w-44">
                  {languageOptions.map((option) => {
                    const isSelected = option.value === language;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onLanguageChange(option.value);
                          setIsLanguageOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-sans text-sm transition ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-800"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
          <Link
            href="/login"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {loginLabel}
          </Link>
          <Link
            href="/register/buyer"
            className="hidden rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:inline-flex"
          >
            {startBuyingLabel}
          </Link>
          <Link
            href="/register/seller"
            className="hidden rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 sm:inline-flex"
          >
            {startSellingLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
