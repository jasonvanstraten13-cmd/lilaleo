# Hasies en Gansies Website Design System

Use this document as the design and implementation brief when recreating the Hasies en Gansies website in a new project or chat.

## Brand Direction

Create a website that feels:

- Gentle, playful, warm and wholesome.
- Child-friendly, natural and handcrafted.
- Soft, nostalgic and inspired by classic children's storybooks.
- Calm rather than bright, noisy or overstimulating.
- Considered and trustworthy enough for parents and gift buyers.

Avoid:

- Corporate, clinical or tech-focused layouts.
- Neon or highly saturated colour.
- Harsh black-and-white contrast.
- Angular industrial interfaces.
- Flat modern-vector cartoon styling.
- Dense card grids with little breathing room.
- Generic ecommerce templates that do not feel personal.

## Brand Assets

Use the supplied logo asset as the primary brand mark:

```text
hasies-en-gansies-logo.jpg
```

Logo rules:

- Keep the logo on a white or very light neutral background.
- Preserve its proportions and whitespace.
- Do not stretch, recolour, redraw, add shadows, or place it over busy photography.
- Reserve its layout dimensions before the image loads to prevent header movement.
- Use the rabbit and goose as recurring brand characters where suitable.

## Approved Palette

Use these CSS variables as the central design tokens:

```css
:root {
  --brand-sage: #878F60;
  --brand-pink: #F3D2D9;
  --brand-blue: #CAD7E8;
  --brand-white: #FFFFFF;

  --brand-cream: #FAF7F1;
  --brand-beige: #EDE4D8;
  --brand-taupe: #B9AA98;
  --brand-brown-light: #A9876A;
  --brand-text: #4B463F;

  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 28px;
  --radius-pill: 999px;
}
```

Colour balance:

- 55% to 65% white or warm cream.
- 15% to 20% sage.
- 10% to 15% blush pink.
- 5% to 10% powder blue.
- Small amounts of beige, taupe and natural brown.

Use sage for functional actions and brand accents. Use blush and powder blue for supporting backgrounds, highlights and gentle variation. Use charcoal brown for body text rather than pure black.

## Typography

Use rounded sans-serif typography only:

- Headings and display: `Fredoka`, weights 600 or 700.
- Body and UI: `Nunito`, weights 400, 500, 600 or 700.

Recommended CSS:

```css
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap');

:root {
  --font-heading: 'Fredoka', sans-serif;
  --font-body: 'Nunito', sans-serif;
}

body {
  font-family: var(--font-body);
  color: var(--brand-text);
  font-size: 1rem;
  line-height: 1.65;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: 600;
  line-height: 1.05;
}
```

Use sentence case. Keep headings friendly and substantial. Do not use formal serif typography for the interface.

## Layout Language

Use a mobile-first responsive layout:

- Mobile first, then tablet and desktop.
- Use a centered content shell with a maximum width around 1160px.
- Use generous whitespace and clear vertical rhythm.
- Avoid horizontal overflow at every viewport width.
- Use CSS grid for major layouts and flexbox for compact rows.
- Use stable image aspect ratios so loading never shifts layout.
- Keep touch targets comfortable on mobile.

Recommended page rhythm:

1. White sticky header with logo and simple navigation.
2. Soft coloured hero or page-introduction band.
3. Spacious editorial content sections.
4. Product or value cards with generous padding.
5. Full-width invitation or CTA band.
6. Sage footer with legal links and the small StratStudios credit.

Do not replace the existing site with a generic dashboard or marketing template. Preserve the warm, editorial, storybook feeling.

## Header

The header should:

- Use a white background so the logo blends into the page.
- Be sticky or fixed at the top.
- Have a large initial presence and shrink slightly on scroll.
- Reserve the logo dimensions before loading to prevent snapping.
- Use spacious, sage-toned navigation.
- Include a mobile menu button with an accessible label.
- Include a visible Shop link when ecommerce exists.
- Use a rounded cart control with a live item-count badge.

Logo implementation should set width and height before assigning `src`:

```js
logo.width = 246;
logo.height = 90;
logo.style.width = '246px';
logo.style.height = '90px';
logo.style.objectFit = 'contain';
```

## Buttons

Primary button:

- Sage background: `#878F60`.
- White text.
- Pill shape.
- Nunito, bold.
- Subtle lift on hover.

Secondary buttons:

- Blush background with charcoal-brown text.
- Powder-blue background with charcoal-brown text.
- White background with sage border.

Use familiar icons inside action buttons where helpful. Use text plus icon for clear commands. Add visible `:focus-visible` states.

## Cards and Forms

Cards should use:

```css
background: #FFFFFF;
border: 1px solid #EDE4D8;
border-radius: 18px;
box-shadow: 0 8px 24px rgba(75, 70, 63, 0.06);
```

Use generous padding and simple information hierarchy. Avoid card nesting.

Forms should use:

- White fields on warm cream pages.
- Beige borders.
- Rounded corners around 12px.
- Clear labels and visible focus rings.
- Accessible error messages.
- Correct input types and autocomplete attributes.

## Backgrounds and Decoration

Use white, warm cream, pale blush and pale powder blue as the main section surfaces.

A suitable global background treatment is a very subtle fixed dot pattern using powder blue and blush with low opacity. Keep it barely visible. It must never reduce text contrast.

Suitable decorative elements:

- Tiny flowers, leaves and soft dots.
- Watercolour foliage.
- Gentle clouds.
- Rabbit or goose footprints used sparingly.
- Rounded image frames.
- Small botanical accents in the hero.

Avoid large gradient blobs, neon shapes, strong shadows or decorative elements that compete with products.

## Imagery

Photography should be:

- Natural, bright but soft and warm.
- Calm and lightly styled.
- Shown on linen, cotton, light timber, baskets, blankets or nursery settings.
- Framed with rounded corners.

Illustrations should use a soft watercolour or hand-painted treatment with natural muted colours. Do not use flat-vector animals, thick black outlines, glossy 3D characters or generic clip art.

Prefer local assets over random remote image URLs. Give every image useful descriptive alt text. Use local placeholder illustrations until real product photography is supplied.

## Motion

Use a few meaningful, gentle animations:

- Staggered page and card reveals.
- Soft vertical rise on load.
- Very slow floating botanical accents.
- Gentle image drift in secondary image rails.
- Small hover lift on cards and buttons.
- Header shrink on downward scroll.

Motion must be understated. Avoid bouncing, flashing, aggressive parallax, spinning or excessive micro-interactions.

Always include reduced-motion support:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Contact Experience

The contact page should include:

- Phone link using `tel:`.
- Email link using `mailto:`.
- WhatsApp link using `wa.me` with a prewritten message.
- Inline accessible icons for phone, email and WhatsApp.
- Social icon links in a small rounded icon row.
- Formspark-compatible POST form where configured.
- Clear required field validation.
- A thank-you route after successful submission.

Current contact details:

```text
Phone display: +27 74 361 7756
Phone href: tel:+27743617756
WhatsApp href: https://wa.me/27743617756
Email: info@hasiesengansies.co.za
```

Do not invent social profile URLs. Use editable placeholders until the client supplies the actual Instagram and Facebook accounts.

## Ecommerce Direction

The shop should feel like the same brand, not a pasted third-party template.

Required ecommerce behavior:

- Product catalogue.
- Search across product name and description.
- Category filtering.
- Price low-to-high sorting.
- Price high-to-low sorting.
- Name sorting.
- Empty-results state.
- Product detail pages or views.
- Quantity selector.
- Add, remove, increase, decrease and clear cart controls.
- Thumbnail, unit price, line total, subtotal and item count.
- Persistent localStorage cart.
- Mobile-friendly catalogue and cart.
- Disabled Add to Cart for unavailable products.
- Accessible labels and focus states.

For a static site, namespace storage:

```text
site_ecommerce_cart_v1
```

Keep product data separate from UI code. Use a JSON file with fields such as:

```json
{
  "id": "product-001",
  "name": "Example Product",
  "slug": "example-product",
  "description": "Example description.",
  "price": 99900,
  "currency": "ZAR",
  "category": "General",
  "image": "assets/example.svg",
  "inStock": true
}
```

Store ZAR prices in cents. Use one central currency configuration value.

Current product categories:

- Dummy Chains.
- BIBS Dummies.
- Bespoke Customised Baby Toys.

Do not claim live card payments unless a secure server-side Stripe integration or valid Stripe Payment Links have been configured and tested. For a static fallback, use an order-enquiry flow and clearly explain that payment is confirmed personally.

## Footer

Every page should include:

- Brand/logo treatment.
- Short warm tagline.
- Explore links.
- Privacy policy link.
- Terms of use link.
- Small rounded “Designed by StratStudios” credit linking to `https://stratstudios.co.za` in a new tab.

The footer should use sage as its main background and white/light text, while keeping the credit button compact and subtle.

## Accessibility

Always include:

- Semantic headings in order.
- Descriptive image alt text.
- Accessible button names.
- Keyboard-accessible controls.
- Visible focus-visible states.
- Labels for form controls.
- `aria-live` status feedback after cart or form actions.
- `prefers-reduced-motion` support.
- Sufficient colour contrast using charcoal brown rather than black.
- No content that depends on hover alone.

## SEO and Metadata

Every page should have:

- A unique title.
- A useful meta description.
- One clear H1.
- Descriptive product page titles.
- Product image alt text.
- Canonical URLs or Open Graph data if the project already uses them.

## Static Project Conventions

For a plain HTML/CSS/JS implementation:

- Keep root pages as existing HTML routes.
- Keep ecommerce pages in `shop/`.
- Keep product data in `shop/data/products.json`.
- Keep ecommerce behavior in `shop/shop.js`.
- Keep ecommerce styles in `shop/shop.css`.
- Keep global brand overrides in `brand.css`.
- Keep shared behavior in `script.js`.
- Use local SVG placeholders for sample products.
- Do not add a second frontend framework.
- Do not put secrets in client-side files.
- Keep `.env` and `.env.local` ignored.

## Review Checklist

Before handing the site to a client, verify:

- The supplied logo is used and does not jump during load.
- Header is white and aligned on all pages.
- Brand colours match the guide.
- Fredoka and Nunito load or have rounded fallbacks.
- Mobile navigation works.
- No horizontal overflow at mobile widths.
- Contact phone, WhatsApp and email links are correct.
- Social URLs are real or clearly marked as placeholders.
- Shop search, filtering and sorting work.
- Product detail links work.
- Cart persists after refresh.
- Empty cart works.
- No console errors appear.
- All local links and assets resolve.
- Legal placeholders are replaced before launch.
- Formspark ID is replaced before launch.
- Payment limitations are explained honestly.

## Existing Reference Files

The implementation was guided by:

- `Hasies_and_Gansies_Website_Brand_Guide.md`
- `hasies-en-gansies-logo.jpg`
- `styles.css`
- `brand.css`
- `script.js`
- `shop/shop.css`
- `shop/shop.js`
- `shop/data/products.json`

This document is a reusable design brief, not a substitute for the client’s final legal details, real social profile URLs, Formspark ID, product photography or payment credentials.
