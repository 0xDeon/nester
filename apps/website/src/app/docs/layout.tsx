"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon, Menu, X, ChevronDown, ChevronRight, Sparkles, Github } from "lucide-react";
import { docsNav, docsContent } from "./content";
import { cn } from "@/lib/utils";

/* ──────────────────────────── Search Modal ──────────────────────────── */

function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const results = query.length >= 2
        ? Object.entries(docsContent)
            .filter(([, doc]) =>
                doc.title.toLowerCase().includes(query.toLowerCase()) ||
                doc.content.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 8)
            .map(([slug, doc]) => ({ slug, title: doc.title }))
        : [];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-white/10">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search documentation..."
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                    />
                    <kbd className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded">
                        ESC
                    </kbd>
                </div>
                {results.length > 0 && (
                    <div className="max-h-80 overflow-y-auto py-2">
                        {results.map((r) => (
                            <Link
                                key={r.slug}
                                href={`/docs/${r.slug}`}
                                onClick={onClose}
                                className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                {r.title}
                            </Link>
                        ))}
                    </div>
                )}
                {query.length >= 2 && results.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        No results found for &quot;{query}&quot;
                    </div>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────── Sidebar ──────────────────────────── */

function Sidebar({ currentSlug, onNavigate }: { currentSlug: string; onNavigate?: () => void }) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Auto-expand the section containing the current page
    useEffect(() => {
        const initial: Record<string, boolean> = {};
        for (const section of docsNav) {
            if (section.children?.some((c) => c.slug === currentSlug)) {
                initial[section.slug] = true;
            }
        }
        setExpanded((prev) => ({ ...prev, ...initial }));
    }, [currentSlug]);

    const toggle = (slug: string) => setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));

    return (
        <nav className="py-6 pr-4 space-y-1 text-[13px]">
            {docsNav.map((section) => (
                <div key={section.slug} className="mb-2">
                    <button
                        onClick={() => toggle(section.slug)}
                        className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold tracking-[0.12em] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors uppercase"
                    >
                        {section.title}
                        {expanded[section.slug] ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                        )}
                    </button>
                    {expanded[section.slug] && section.children && (
                        <div className="ml-2 border-l border-gray-200 dark:border-white/10 pl-2 space-y-0.5">
                            {section.children.map((child) => (
                                <Link
                                    key={child.slug}
                                    href={`/docs/${child.slug}`}
                                    onClick={onNavigate}
                                    className={cn(
                                        "block px-3 py-1.5 rounded-md transition-colors",
                                        currentSlug === child.slug
                                            ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium"
                                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                                    )}
                                >
                                    {child.title}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </nav>
    );
}

/* ──────────────────────────── Layout ──────────────────────────── */

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const slug = pathname.replace("/docs/", "").replace("/docs", "") || "introduction";

    const [dark, setDark] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Dark mode
    useEffect(() => {
        const saved = localStorage.getItem("nester-docs-dark");
        if (saved === "true") {
            setDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleDark = () => {
        setDark((d) => {
            const next = !d;
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("nester-docs-dark", String(next));
            return next;
        });
    };

    // Ctrl+K search
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            setSearchOpen((o) => !o);
        }
        if (e.key === "Escape") setSearchOpen(false);
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Close mobile menu on navigation
    useEffect(() => setMobileMenuOpen(false), [pathname]);

    return (
        <div className={cn("min-h-screen bg-white dark:bg-[#0f0f23] text-gray-900 dark:text-gray-100 transition-colors")}>
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/80 dark:bg-[#0f0f23]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
                <div className="h-full max-w-[1600px] mx-auto px-4 flex items-center justify-between">
                    {/* Left: Logo + title */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <Link href="/docs" className="flex items-center gap-2.5">
                            <Image src="/logo.png" alt="Nester" width={28} height={28} className="rounded-lg" />
                            <span className="font-heading font-bold text-[15px] tracking-tight">
                                Nester <span className="text-gray-400 dark:text-gray-500 font-normal">Documentation</span>
                            </span>
                        </Link>
                    </div>

                    {/* Right: Search + icons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            <span>Search</span>
                            <kbd className="ml-4 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-white/10 rounded border border-gray-200 dark:border-white/10">
                                Ctrl K
                            </kbd>
                        </button>
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="sm:hidden p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        <a
                            href="https://github.com/Suncrest-Labs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title="GitHub"
                        >
                            <Github className="w-5 h-5" />
                        </a>

                        <button
                            onClick={toggleDark}
                            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title={dark ? "Light mode" : "Dark mode"}
                        >
                            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile sidebar overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute left-0 top-14 bottom-0 w-72 bg-white dark:bg-[#0f0f23] border-r border-gray-200 dark:border-white/10 overflow-y-auto">
                        <Sidebar currentSlug={slug} onNavigate={() => setMobileMenuOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main layout */}
            <div className="flex max-w-[1600px] mx-auto pt-14">
                {/* Desktop sidebar */}
                <aside className="hidden lg:block w-64 flex-shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto border-r border-gray-200 dark:border-white/10">
                    <Sidebar currentSlug={slug} />
                </aside>

                {/* Content */}
                <main className="flex-1 min-w-0 px-6 md:px-12 lg:px-16 py-10 max-w-4xl">
                    {children}
                </main>
            </div>

            {/* AI Chat Button (Prometheus) */}
            <button
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all font-medium text-sm"
                title="Ask Prometheus AI"
            >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Prometheus AI</span>
            </button>

            {/* Search Modal */}
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}
