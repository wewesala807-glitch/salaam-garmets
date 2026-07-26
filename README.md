# Shop image uploader (Cloudflare Worker + R2)

This lets your shop.html upload photos straight to your own storage instead of
you pasting image links by hand. Only someone with your secret key can upload;
anyone can view the resulting image links (that's what makes them work on the site).

## 1. Install the tools
You need Node.js installed. Then, in a terminal, from this folder:

```
npm install -g wrangler
wrangler login
```

`wrangler login` opens a browser window to connect your free Cloudflare account.

## 2. Create the storage bucket
```
wrangler r2 bucket create shop-images
```

## 3. Set your upload secret
Pick a long random password — this is what proves it's really you uploading.

```
wrangler secret put UPLOAD_SECRET
```

It will prompt you to paste the secret. Keep it somewhere safe (a notes app / password manager) — you'll paste it into the shop's admin panel once.

## 4. Deploy
```
wrangler deploy
```

This prints a URL like:
```
https://shop-images.<your-subdomain>.workers.dev
```
That's your **worker URL** — copy it.

## 5. Connect it to your shop
Open shop.html → **Admin → Settings**:
- **Image upload endpoint**: paste the worker URL from step 4
- **Upload secret**: paste the secret from step 3 (this stays only on your device, not shared with visitors)

Now, in the "Add product" form, you'll see an **Upload photos** option — pick files
straight from your phone or computer and they'll be stored in R2 and linked in automatically.

## Notes
- Free Cloudflare accounts include a generous R2 free tier (10GB storage, no egress fees) — plenty for a clothing catalog.
- If you ever want to rotate the secret, run `wrangler secret put UPLOAD_SECRET` again with a new value, then update it in the shop's admin settings too.
- To see everything you've uploaded: `wrangler r2 object list shop-images`
