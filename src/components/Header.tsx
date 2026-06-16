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
                  <a href="#">Menu</a>
                </li>
                <li>
                  <a href="#">Events</a>
                </li>
                <li>
                  <a href="#">Taco Tuesday</a>
                </li>
                <li>
                  <a href="#">Brunch</a>
                </li>
                <li>
                  <a href="#">Happy Hour</a>
                </li>
                <li>
                  <a href="#">Find Us</a>
                </li>
              </ul>
            </nav>
            <a className="join" href="#">
              Join Rewards
            </a>
          </div>
        </div>
      </header>
      <div className="rule"></div>
    </div>
  );
}
