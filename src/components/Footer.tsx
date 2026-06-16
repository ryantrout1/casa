export default function Footer() {
  return (
    <footer className="sec">
      <div className="picado5"></div>
      <div className="wrap in">
        <div className="lchip">
          <img src="/images/LOGO.png" alt="Casa de Leyva" />
        </div>
        <div className="beat">
          <span className="a">FOOD</span>
          {" · "}
          <span className="b">FAMILY</span>
          {" · "}
          <span className="c">FIESTA</span>
        </div>
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
              <a href="#">Casa Rewards</a>
            </li>
            <li>
              <a href="#">Find Us</a>
            </li>
          </ul>
        </nav>
        <div className="soc">
          <a href="#">f</a>
          <a href="#">ig</a>
          <a href="#">Y</a>
          <a href="#">G</a>
        </div>
        <div className="info">
          {"424 E Monroe Ave, Buckeye, AZ 85326 \u00A0·\u00A0 623-306-2386 \u00A0·\u00A0 www.casadeleyva.com"}
        </div>
        <div className="cr">
          © 2026 Casa de Leyva · ¡Donde cada día es una fiesta!
        </div>
      </div>
    </footer>
  );
}
