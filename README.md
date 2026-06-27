# MiniDisc Label Generator

A static web app for laying out printable MiniDisc labels on an A4 sheet with crop marks and bleed.

## Run Locally

```sh
python3 -m http.server 4322 --directory app
```

Then open <http://127.0.0.1:4322/>.

## Deploy To GitHub Pages

This repo includes a GitHub Actions workflow that publishes the `app/` folder to GitHub Pages.

1. Create a GitHub repository.
2. Add it as this repo's `origin` remote.
3. Push the `main` branch.
4. In GitHub, open **Settings > Pages**.
5. Set **Source** to **GitHub Actions**.

After the workflow finishes, GitHub will show the public Pages URL in the deployment summary.
