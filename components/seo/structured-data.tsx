import * as React from "react";

export function StudioStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": [
          "Organization",
          "LocalBusiness",
          "ProfessionalService",
          "AdvertisingAgency",
        ],
        "@id": "https://studioslavie.com/#organization",
        name: "Lavie Studios Ltd",
        legalName: "Lavie Studios Ltd",
        alternateName: [
          "Lavie Studios",
          "Studios Lavie",
          "Lavie Studios Ogbomoso",
          "Lavie Studios Nigeria",
        ],
        taxID: "RC - 9210438",
        url: "https://studioslavie.com",
        logo: {
          "@type": "ImageObject",
          url: "https://studioslavie.com/icon?v=2026.2",
          width: 192,
          height: 192,
        },
        image: "https://studioslavie.com/opengraph-image?v=2026.2",
        telephone: "+2347073725374",
        email: "info@studioslavie.com",
        priceRange: "₦₦₦",
        slogan: "the life in every place",
        description:
          "Lavie Studios Ltd is Nigeria's premier event branding, corporate branding, stage design & scenography, event media coverage, custom craft fabrication, design & print production, and out-of-home (OOH) advertising agency headquartered in Ogbomoso, Oyo State, serving Lagos, Abuja, Ibadan, and all of Nigeria.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Along Old Ogbomoso-Ilorin Road, Yoaco Area",
          addressLocality: "Ogbomoso",
          addressRegion: "Oyo State",
          postalCode: "210101",
          addressCountry: "NG",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 8.1333,
          longitude: 4.25,
        },
        areaServed: [
          { "@type": "City", name: "Ogbomoso" },
          { "@type": "State", name: "Oyo State" },
          { "@type": "City", name: "Ibadan" },
          { "@type": "City", name: "Lagos" },
          { "@type": "City", name: "Abuja" },
          { "@type": "City", name: "Ilorin" },
          { "@type": "Country", name: "Nigeria" },
        ],
        knowsAbout: [
          "Event Branding in Ogbomoso and Nigeria",
          "Corporate Branding & Brand Identity Systems",
          "Events in Ogbomoso & Experiential Event Production",
          "Stage Design, Scenography & Venue Transformation",
          "Event Media, Documentary Filmmaking & Photography",
          "Custom Craft Fabrication, Exhibition Booths & Branded Kiosks",
          "Graphic Design, Print Production & Corporate Souvenirs",
          "Out-of-Home (OOH) Billboard Advertising & Wayfinding Signage",
          "Business Strategy & Corporate Communications",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Lavie Studios Branding, Event Production & Media Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Event Branding & Stage Scenography",
                description:
                  "End-to-end event branding, 3D stage design, backdrops, media walls, experiential tunnels, and venue branding for conferences, summits, and corporate events in Ogbomoso and across Nigeria.",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Corporate Branding & Visual Identity",
                description:
                  "Comprehensive corporate identity systems, brand strategy, brand guidelines, workspace branding, and visual communications for businesses and institutions.",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Event Media, Video Production & Photography",
                description:
                  "High-impact event media coverage, documentary production, aftermovies, livestreaming, and commercial photography for major events in Ogbomoso and Nigeria.",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Custom Craft Fabrication & Exhibition Booths",
                description:
                  "Bespoke carpentry, exhibition desks, branded tents, kiosks, stage props, and 3D fabricated installations.",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Design, Print Production, Souvenirs & OOH Advertising",
                description:
                  "Large-format printing, roll-up banners, corporate souvenirs, merch, wayfinding signage, and Out-of-Home (OOH) billboard advertising.",
              },
            },
          ],
        },
        sameAs: [
          "https://www.instagram.com/studioslavie",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://studioslavie.com/#website",
        url: "https://studioslavie.com",
        name: "Lavie Studios — Event Branding, Corporate Branding & Event Media in Ogbomoso, Nigeria",
        publisher: {
          "@id": "https://studioslavie.com/#organization",
        },
        inLanguage: "en-NG",
      },
      {
        "@type": "FAQPage",
        "@id": "https://studioslavie.com/#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: "Who is the best event branding and corporate branding agency in Ogbomoso and Nigeria?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Lavie Studios Ltd (studioslavie.com) is the leading event branding, corporate identity, stage scenography, custom fabrication, and event media agency based in Ogbomoso, Oyo State, executing high-impact corporate and experiential events across Ogbomoso, Ibadan, Lagos, Abuja, and all of Nigeria.",
            },
          },
          {
            "@type": "Question",
            name: "What services does Lavie Studios provide for events and businesses in Nigeria?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Lavie Studios provides Event Branding & Scenography, Corporate Branding & Identity Systems, Custom Craft Productions & Exhibition Booths, Event Media & Documentary Coverage, Photography, Corporate Souvenirs & Merch, Design & Print Production, and Out-of-Home (OOH) Advertising.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div id="lavie-seo-authority-index" className="sr-only" aria-hidden="false">
        <h1>Lavie Studios Ltd (Studios Lavie) — Event Branding, Corporate Branding, Design & Event Media Agency in Ogbomoso & Nigeria</h1>
        <p>
          Lavie Studios (studioslavie.com, RC - 9210438) is the premier event branding, corporate branding, stage design and scenography, custom craft fabrication, event media coverage, commercial photography, graphic design, print production, corporate souvenirs, and out-of-home (OOH) advertising agency in Ogbomoso, Oyo State, Nigeria.
        </p>
        <h2>Top Event Branding, Corporate Identity & Production Services in Ogbomoso, Ibadan, Lagos, Abuja & Nigeria</h2>
        <ul>
          <li><a href="https://studioslavie.com/">Lavie Studios Official Website — the life in every place</a></li>
          <li><a href="https://studioslavie.com/portfolio">Portfolio & Event Case Studies in Ogbomoso and Nigeria</a></li>
          <li><a href="https://studioslavie.com/services">Event Branding, Corporate Branding, Craft Fabrication & Event Media Services</a></li>
          <li><a href="https://studioslavie.com/pricing">Branding, Event Production & Media Packages</a></li>
          <li><a href="https://studioslavie.com/about">About Lavie Studios Ltd — Yoaco Area, Old Ogbomoso-Ilorin Road, Ogbomoso</a></li>
          <li><a href="https://studioslavie.com/contact">Contact Lavie Studios for Events and Corporate Branding in Nigeria</a></li>
        </ul>
      </div>
    </>
  );
}
