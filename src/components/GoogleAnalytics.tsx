// Google Analytics 4 tag for casadeleyva.com. The Miloe engine reads
// visitor totals from this property.
//
// The measurement ID is public by design (it ships in every page's HTML), so
// it lives here rather than in an env var. Page views on client-side route
// changes are covered by GA4's enhanced measurement ("page changes based on
// browser history events"), which is on for this stream.
import Script from "next/script";

const MEASUREMENT_ID = "G-CBMHCKPE37";

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
