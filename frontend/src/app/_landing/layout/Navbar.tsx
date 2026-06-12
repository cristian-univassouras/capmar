"use client";

import Link from "next/link";
import { Globe, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Custom buttery smooth easing curve
const smoothEase = [0.16, 1, 0.3, 1] as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 120);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <div className="w-full max-w-7xl relative flex items-center justify-between h-[72px] px-6 pointer-events-none">
        
        {/* BACKGROUND ANIMATION */}
        {/* When not scrolled: covers the whole navbar (100% width, 72px height, right 0) */}
        {/* When scrolled: covers only the burger menu (48px width, 48px height, right 24px because of px-6) */}
        <motion.div 
          className="absolute bg-white shadow-sm rounded-full pointer-events-auto z-0"
          initial={false}
          animate={{
            width: scrolled ? 48 : "100%",
            height: scrolled ? 48 : 72,
            right: scrolled ? 24 : 0,
            top: scrolled ? 12 : 0,
          }}
          transition={{ duration: 0.8, ease: smoothEase }}
        />

        {/* LEFT SIDE: Logo + Nav */}
        <motion.div
          animate={{ 
            opacity: scrolled ? 0 : 1,
            maxWidth: scrolled ? 0 : 800,
          }}
          transition={{ duration: 0.8, ease: smoothEase }}
          className="relative z-10 flex items-center overflow-hidden whitespace-nowrap shrink-0 pointer-events-auto"
        >
          <Link href="/" className="font-heading font-black text-2xl leading-none tracking-tighter block mr-8">
            CAP<br />MAR
          </Link>

          <nav className="items-center gap-8 text-sm font-semibold text-gray-800 hidden md:flex">
            <Link href="/" className="hover:text-black transition-colors">Bem Vindo</Link>
            <Link href="/#features" className="hover:text-black transition-colors">Destaques</Link>
            <Link href="/ajuda" className="hover:text-black transition-colors">Ajuda</Link>
            <Link href="/sobre" className="hover:text-black transition-colors">Sobre</Link>
          </nav>
        </motion.div>

        {/* RIGHT SIDE: Globe + Button + Burger */}
        <div className="relative z-10 flex items-center shrink-0">
          {/* Globe */}
          <motion.div
            animate={{ 
              opacity: scrolled ? 0 : 1,
              width: scrolled ? 0 : 40,
              scale: scrolled ? 0.5 : 1,
              marginRight: scrolled ? 0 : 16
            }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="overflow-hidden hidden sm:flex items-center justify-center shrink-0 pointer-events-auto h-10"
          >
            <button className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-gray-700" />
            </button>
          </motion.div>
          
          {/* Button (Loose when scrolled) */}
          <div className="shrink-0 pointer-events-auto">
            <Link
              href="/start"
              className="group relative overflow-hidden bg-black border border-black px-5 sm:px-6 py-3 rounded-full text-sm font-bold transition-all duration-700 hover:bg-white shrink-0 whitespace-nowrap block"
            >
              <div className="relative flex items-center justify-center">
                <span className="text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[-150%]">
                  COMECE JÁ
                </span>
                <span className="absolute text-black transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[150%] group-hover:translate-y-0">
                  COMECE JÁ
                </span>
              </div>
            </Link>
          </div>

          {/* Burger Menu Button + Dropdown */}
          <motion.div
            animate={{
              opacity: scrolled ? 1 : 0,
              width: scrolled ? 48 : 0,
              scale: scrolled ? 1 : 0.5,
              marginLeft: scrolled ? 8 : 0,
            }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="relative flex items-center justify-center shrink-0 h-12 overflow-visible pointer-events-auto"
          >
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            >
              {menuOpen
                ? <X className="w-6 h-6 text-gray-900" />
                : <Menu className="w-6 h-6 text-gray-900" />
              }
            </button>

            {/* Dropdown */}
            <motion.div
              initial={false}
              animate={menuOpen ? { opacity: 1, y: 0, pointerEvents: "auto" } : { opacity: 0, y: -8, pointerEvents: "none" }}
              transition={{ duration: 0.25, ease: smoothEase }}
              className="absolute top-14 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-44 flex flex-col"
            >
              {[
                { href: "/",         label: "Bem Vindo"  },
                { href: "/#features", label: "Destaques" },
                { href: "/ajuda",    label: "Ajuda"      },
                { href: "/sobre",    label: "Sobre"      },
              ].map(({ href, label }) => (
                <Link
                  key={href + label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="px-5 py-3 text-sm font-semibold text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
