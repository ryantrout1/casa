"use client";

import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="v6src">
      <header>
        <div className="wrap">
          <div className="bar">
            <a href="/" aria-label="Casa de Leyva home">
              <img src="/images/LOGO.png" alt="Casa de Leyva" />
            </a>
            <input
              className="navtog"
              type="checkbox"
              id="ht-v8"
              aria-label="Toggle menu"
            />
            <label className="hamb" htmlFor="ht-v8" aria-label="Menu"></label>
            <nav>
              <ul>
                {!isHome && (
                  <li>
                    <a href="/">Home</a>
                  </li>
                )}
                <li>
                  <a href="/menu">Menu</a>
                </li>
                <li>
                  <a href="/#fiestas">Fiestas</a>
                </li>
                <li>
                  <a href="/catering">Events &amp; Catering</a>
                </li>
                <li>
                  <a href="/taco-tuesday">Taco Tuesday</a>
                </li>
                <li>
                  <a href="/#specials">Brunch</a>
                </li>
                <li>
                  <a href="/#specials">Happy Hour</a>
                </li>
                <li>
                  <a href="/#find">Find Us</a>
                </li>
              </ul>
            </nav>
            <a className="join" href="/rewards">
              Join Rewards
            </a>
          </div>
        </div>
      </header>
      <div className="rule"></div>
    </div>
  );
}
