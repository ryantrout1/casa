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
              <a href="/brunch">Brunch</a>
            </li>
            <li>
              <a href="/rewards">Casa Rewards</a>
            </li>
            <li>
              <a href="/#find">Find Us</a>
            </li>
          </ul>
        </nav>
        <div className="soc">
          <a
            href="https://www.facebook.com/61571150047771"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            f
          </a>
          <a
            href="https://www.instagram.com/casadeleyva/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            ig
          </a>
          <a
            href="https://www.yelp.com/biz/casa-de-leyva-buckeye"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Yelp"
          >
            Y
          </a>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Casa+de+Leyva+Buckeye+AZ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Google"
          >
            G
          </a>
        </div>
        <div className="info">
          424 E Monroe Ave, Buckeye, AZ 85326{" \u00A0·\u00A0 "}
          <a href="tel:6233062386">623-306-2386</a>
          {" \u00A0·\u00A0 "}
          <a href="/">www.casadeleyva.com</a>
        </div>
        <div className="legal-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </div>
        <div className="cr">
          © 2026 Casa de Leyva · ¡Donde cada día es una fiesta!
        </div>
      </div>
    </footer>
  );
}
