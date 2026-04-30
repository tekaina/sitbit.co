# sitbit.co

Landing page + Android App Links verification for **SitBit** (`co.sitbit.sitbit`).

Hosted via GitHub Pages at [https://sitbit.co](https://sitbit.co)

## Setup Checklist

- [ ] Replace `REPLACE_WITH_YOUR_RELEASE_SHA256_FINGERPRINT` in `.well-known/assetlinks.json`
- [ ] Replace `REPLACE_WITH_YOUR_DEBUG_SHA256_FINGERPRINT` in `.well-known/assetlinks.json`  
- [ ] Enable GitHub Pages: Settings → Pages → Branch: main
- [ ] Point GoDaddy DNS to GitHub Pages (see below)
- [ ] Verify: `https://sitbit.co/.well-known/assetlinks.json` loads correctly

## GoDaddy DNS Setup

In GoDaddy DNS settings for `sitbit.co`, add these records:

| Type  | Name | Value                  | TTL  |
|-------|------|------------------------|------|
| A     | @    | 185.199.108.153        | 600  |
| A     | @    | 185.199.109.153        | 600  |
| A     | @    | 185.199.110.153        | 600  |
| A     | @    | 185.199.111.153        | 600  |
| CNAME | www  | tekaina.github.io      | 600  |

## Verify assetlinks.json

After deploy, test at:
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://sitbit.co&relation=delegate_permission/common.handle_all_urls
