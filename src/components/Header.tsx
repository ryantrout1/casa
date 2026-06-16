export default function Header() {
  return (
    <div className="v6src">
      <header>
        <div className="wrap">
          <div className="bar">
            <img src="/images/LOGO.png" alt="Casa de Leyva" />
            <input
              className="navtog"
              type="checkbox"
              id="ht-v8"
              aria-label="Toggle menu"
            />
            <label className="hamb" htmlFor="ht-v8" aria-label="Menu"></label>
            <nav>
              <ul>
                <li>
                  <a href="/menu">Menu</a>
                </li>
                <li>
                  <a href="#events">Events</a>
                </li>
                <li>
                  <a href="#specials">Taco Tuesday</a>
                </li>
                <li>
                  <a href="#specials">Brunch</a>
                </li>
                <li>
                  <a href="#specials">Happy Hour</a>
                </li>
                <li>
                  <a href="#find">Find Us</a>
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
