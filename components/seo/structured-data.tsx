import * as React from "react";

export function StudioStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": "https://studioslavie.com/#organization",
        name: "Lavie Studios Ltd",
        alternateName: ["Lavie Studios", "Studios Lavie"],
        url: "https://studioslavie.com",
        logo: "https://studioslavie.com/icon",
        image: "https://studioslavie.com/icon",
        description:
          "Premier event branding, corporate identity systems, spatial scenography, stage production, print collateral, and out-of-home (OOH) advertising agency in Nigeria.",
        areaServed: [
          { "@type": "Country", name: "Nigeria" },
          { "@type": "City", name: "Lagos" },
          { "@type": "City", name: "Abuja" },
          { "@type": "City", name: "Ibadan" },
          { "@type": "City", name: "Ogbomoso" },
        ],
        knowsAbout: [
          "Event Branding & Experiential Scenography",
          "Corporate Identity & Brand Strategy",
          "Stage Design & Spatial Fabrication",
          "Craft Productions — Custom Exhibition Desks, Branded Tents & Kiosks",
          "Event Media, Documentary & Photography",
          "Out-of-Home (OOH) Advertising & Signage",
          "Design, Print Production & Corporate Souvenirs",
        ],
        sameAs: [
          "https://www.instagram.com/studioslavie",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://studioslavie.com/#website",
        url: "https://studioslavie.com",
        name: "Lavie Studios",
        publisher: {
          "@id": "https://studioslavie.com/#organization",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
