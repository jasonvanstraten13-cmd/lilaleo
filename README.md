# Lilahleo

A static website for Lilahleo wedding and event hire. Bookings work like this: the customer sends an enquiry, the owner confirms availability, then the customer pays a deposit online through Yoco. Server-side work runs as Netlify Functions, bookings are saved in Netlify Blobs, and emails go out through Resend.

## Run locally

```powershell
npm install
npm start
```

Open `http://localhost:8888/`. Copy `.env.example` to `.env` first if you want emails, payments or the admin page to work locally. Local bookings are saved as JSON files in `.data/bookings/`.

```powershell
npm test
```

runs the booking, deposit and webhook tests.

## How bookings work

1. **Enquiry.** The customer adds items to their booking list (`/shop/booking.html`), enters their event date, details and notes, and sends it. `POST /api/booking-enquiry` checks the items and works out prices from `shop/data/products.json`, ignoring any prices sent by the browser. It saves the booking and emails both the owner and the customer.
2. **Confirm.** The owner logs in at `/admin/` with `ADMIN_PASSWORD`. Each enquiry shows a suggested deposit (`depositPercent` of the hire subtotal), which she can change. She can add a message, then click **Approve & send deposit link**, or **Decline**. Either way the customer is emailed.
3. **Deposit.** The approval email contains a private link to `/shop/pay.html` (booking reference plus a secret token). That page shows the booking and a **Pay deposit** button. `POST /api/pay-deposit` creates a Yoco checkout for the deposit amount saved on the booking, and the customer pays on Yoco's hosted page.
4. **Secured.** Yoco sends a signed `payment.succeeded` webhook to `/api/yoco-webhook`. The booking is marked **Deposit paid**, and the owner and customer get confirmation emails. If Yoco sends the same webhook again, no duplicate emails go out. If a payment can't be matched to a booking, the owner gets an alert to check it in Yoco.

The contact form posts to `/api/contact`, which emails the owner.

## Editing

- Products, hire prices (in **cents**: `65000` = R650.00) and availability (`inStock`): `shop/data/products.json`
- Deposit percentage, minimum notice in days, and maximum quantity per item: `shop/data/booking.json`
- Functions: `netlify/functions/`. Shared code: `netlify/lib/`

## Going live

1. **Resend**: create an account at resend.com, verify the `lilahleo.co.za` domain (DNS records), and create an API key.
2. **Yoco**: copy the secret keys from the Yoco portal, under Selling Online > Payment Gateway. Start with the `sk_test_...` key.
3. **Netlify**: connect this Git repository. Use build command `npm install` (or leave it empty, since Netlify installs dependencies automatically) and publish directory `.`. Point the domain at Netlify. Under Site configuration > Environment variables, add everything in `.env.example` except `LOCAL_STORE_DIR`. Netlify Blobs needs no setup.
4. **Webhook**: once the site is live on https, run this once and save the printed secret as `YOCO_WEBHOOK_SECRET` in Netlify, then redeploy:

   ```powershell
   $env:YOCO_SECRET_KEY="sk_test_..."; $env:SITE_URL="https://www.lilahleo.co.za"; npm run register-webhook
   ```

5. **Test**: send an enquiry, approve it in `/admin/`, open the emailed link, and pay with Yoco's test card. Check that the booking moves to **Secured** and both emails arrive.
6. Switch to the live Yoco key, register the webhook again with it, and update `YOCO_WEBHOOK_SECRET`.

## Limitations

- Availability isn't checked automatically. The owner confirms each date by hand before sending a deposit link.
- The balance and the refundable damage deposit, if she charges one, are arranged outside the site. Note them in the approval message.
- Anyone with the admin password can see all bookings, so use a strong password and don't share it.
