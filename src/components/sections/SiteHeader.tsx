"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, ShoppingBag, Store, X } from "lucide-react"
import { cn } from "cn"

import styles from "@/styles/SiteHeader.module.scss"

export type SiteHeaderProps = React.HTMLAttributes<HTMLElement>

export function SiteHeader({ className, ...props }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={cn(styles.header, className)} {...props}>
      <div className={styles.header__inner}>
        <Link href="/" className={styles.logo}>
          <span aria-hidden className={styles.logo__mark}>
            <Store className="size-4" />
          </span>
          Manu Shop
        </Link>

        <nav aria-label="Navigation principale" className={styles.nav}>
          <a className={styles.navLink} href="#boutique">
            Boutique
          </a>
          <a className={styles.navLink} href="#fonctionnalites">
            Fonctionnalités
          </a>
          <a className={styles.navLink} href="#apropos">
            À propos
          </a>
        </nav>

        <div className={styles.actions}>
          <a className={styles.login} href="#connexion">
            Se connecter
          </a>
          <form
            className={styles.search}
            action="#boutique"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("boutique")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            <input
              className={styles.searchInput}
              type="search"
              name="q"
              placeholder="Rechercher"
              aria-label="Rechercher un produit"
            />
          </form>
          <a
            className={styles.cart}
            href="#boutique"
            aria-label="Voir le panier"
          >
            <ShoppingBag className="size-4" />
          </a>
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
          <a className={styles.navLink} href="#boutique" onClick={closeMenu}>
            Boutique
          </a>
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
          <a className={styles.navLink} href="#connexion" onClick={closeMenu}>
            Se connecter
          </a>
        </nav>
      ) : null}
    </header>
  );
}
