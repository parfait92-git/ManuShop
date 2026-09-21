"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, ShoppingBag, Store, X } from "lucide-react"
import { cn } from "cn"

import styles from "@/styles/SiteHeader.module.scss"

export type SiteHeaderProps = React.HTMLAttributes<HTMLElement>

// Scroll delta threshold to avoid flickering on micro-scrolls
const SCROLL_DELTA_THRESHOLD = 8;
// Offset from top under which the header is always visible
const TOP_OFFSET_THRESHOLD = 50;

export function SiteHeader({ className, style, ...props }: SiteHeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastScrollY;

          if (currentY <= TOP_OFFSET_THRESHOLD) {
            setVisible(true);
          } else if (Math.abs(diff) > SCROLL_DELTA_THRESHOLD) {
            // Scroll down hides, scroll up reveals
            setVisible(diff < 0);
          }

          lastScrollY = Math.max(0, currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false)

  const isVisible = visible || menuOpen;

  return (
    <header
      className={cn(styles.header, className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        pointerEvents: isVisible ? undefined : "none",
        ...style,
      }}
      {...props}
    >
      <div className={styles.header__inner}>
        <Link href="/" className={styles.logo}>
          <span aria-hidden className={styles.logo__mark}>
            <Store className="size-4" />
          </span>
          Manu Shop
        </Link>

        <nav aria-label="Navigation principale" className={styles.nav}>
          <Link className={styles.navLink} href="/catalogue">
            Boutique
          </Link>
          <a className={styles.navLink} href="#fonctionnalites">
            Fonctionnalités
          </a>
          <a className={styles.navLink} href="#apropos">
            À propos
          </a>
        </nav>

        <div className={styles.actions}>
          <Link className={styles.login} href="/login">
            Se connecter
          </Link>
          <form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchTerm.trim();
              router.push(
                query
                  ? `/catalogue?q=${encodeURIComponent(query)}`
                  : "/catalogue"
              );
            }}
          >
            <input
              className={styles.searchInput}
              type="search"
              name="q"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher un produit"
            />
          </form>
          <Link
            className={styles.cart}
            href="/catalogue"
            aria-label="Voir le panier"
          >
            <ShoppingBag className="size-4" />
          </Link>
          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
            <span className="sr-only">
              {menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Navigation mobile"
          className={styles.mobileNav}
        >
          <Link className={styles.navLink} href="/catalogue" onClick={closeMenu}>
            Boutique
          </Link>
          <a
            className={styles.navLink}
            href="#fonctionnalites"
            onClick={closeMenu}
          >
            Fonctionnalités
          </a>
          <a className={styles.navLink} href="#apropos" onClick={closeMenu}>
            À propos
          </a>
          <Link className={styles.navLink} href="/login" onClick={closeMenu}>
            Se connecter
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
