export default function FindUs() {
  return (
    <section className="find sec" id="find">
      <div className="wrap">
        <div className="grid">
          <div>
            <div className="scr">¡vente a festejar con nosotros!</div>
            <h2>FIND THE HIDDEN GEM</h2>
            <div className="gem">
              Look for the red-roofed building behind Chase Bank &amp; the Elks
              Lodge.
            </div>
            <p>Entrance on E Butler Ave, between 4th and 5th Street.</p>
            <div className="addr">424 E Monroe Ave, Buckeye, AZ 85326</div>
            <div className="ctas">
              <a
                className="btn btn-p"
                href="https://www.google.com/maps/dir/?api=1&destination=424+E+Monroe+Ave%2C+Buckeye%2C+AZ+85326"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
              <a className="btn btn-t" href="tel:6233062386">
                Call 623-306-2386
              </a>
            </div>
          </div>
          <div className="mp">
            <img src="/images/DOOR.jpg" alt="Casa de Leyva front entrance" />
          </div>
        </div>
      </div>
    </section>
  );
}
