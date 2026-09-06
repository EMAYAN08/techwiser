import urllib.request
import zipfile
import os
import shutil

os.makedirs('mobile/assets/fonts', exist_ok=True)

def download_and_extract(url, font_name, desired_weights):
    print(f"Downloading {font_name}...")
    zip_path = f"{font_name}.zip"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response, open(zip_path, 'wb') as out_file:
        shutil.copyfileobj(response, out_file)
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        for file_info in z.infolist():
            if file_info.filename.endswith('.ttf') and 'Variable' not in file_info.filename:
                # E.g. ClashDisplay-Medium.ttf
                basename = os.path.basename(file_info.filename)
                for weight in desired_weights:
                    if weight in basename:
                        print(f"Extracting {basename}...")
                        source = z.open(file_info)
                        target = open(os.path.join('mobile/assets/fonts', basename), "wb")
                        with source, target:
                            shutil.copyfileobj(source, target)
                        break

download_and_extract('https://api.fontshare.com/v2/fonts/download/clash-display', 'clash-display', ['Medium', 'Semibold', 'Bold'])
download_and_extract('https://api.fontshare.com/v2/fonts/download/satoshi', 'satoshi', ['Regular', 'Medium', 'Bold'])

print("Done!")
