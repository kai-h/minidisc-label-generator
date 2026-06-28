# MiniDisc Label Generator

A static web app for laying out printable MiniDisc labels on an A4 sheet with crop marks and bleed.
This app does not collect any data, and all processing is done in your browser.

You can also download the source code to run it locally:

## Run Locally

```sh
cd ~/Documents
git clone https://github.com/kai-h/minidisc-label-generator.git
cd minidisc-label-generator/
python3 -m http.server 8123 --directory app
```

Then open <http://127.0.0.1:8123/> in your web browser. To quit the app, go back into the Terminal app and type Control+C

If you want to update your local copy after this version on Github has been updated:
```sh
cd ~/Documents/minidisc-label-generator
git pull
python3 -m http.server 8123 --directory app
```

## Deploy To GitHub Pages

This repo includes a GitHub Actions workflow that publishes the `app/` folder to GitHub Pages.

1. Create a GitHub repository.
2. Add it as this repo's `origin` remote.
3. Push the `main` branch.
4. In GitHub, open **Settings > Pages**.
5. Set **Source** to **GitHub Actions**.

After the workflow finishes, GitHub will show the public Pages URL in the deployment summary.

If you find this tool useful and want to donate something, feel free to buy me a hot chocolate on Ko-fi
<https://ko-fi.com/kaiserh>
