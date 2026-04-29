# ⚙️ Crunchyroll Utilities

![Version](https://img.shields.io/badge/version-6.0.0-orange.svg)
![Platform](https://img.shields.io/badge/platform-Tampermonkey-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A modular, lightweight, and powerful "Swiss Army knife" userscript for Crunchyroll. 
Currently featuring a **Local-First Cloud-Synced Auto-Skip** system, allowing you to seamlessly share your custom intro/outro skip times across all your devices (PC, tablet, smartphone).

---

## ✨ Features

* ⏭️ **Smart Auto-Skip:** Automatically skips intros and outros based on your saved timecodes. Stops exactly 2 seconds before the end of the video to perfectly trigger Crunchyroll's native "Next Episode" countdown.
* ☁️ **Local-First Cloud Sync:** Edits apply instantly using local storage, while syncing to the cloud (via JSONBin.io) in the background. Never lose your skips when switching from your PC to your tablet!
* 🎨 **Visual Highlights:** Displays colored markers directly on the Crunchyroll video progress bar (Green for Intros, Red for Outros).
* ⏱️ **Smart Auto-Fill:** Opening the menu automatically detects whether you are in the first or second half of the episode and pre-fills the start/end timecodes based on your current position.
* 🧩 **Modular Architecture:** Built with developers in mind. The code is cleanly split into logical modules (`ui`, `data`, `skip`, etc.), making it incredibly easy to add new features in the future.

---

## 🚀 Installation

### 1. Prerequisites
You need a userscript manager installed in your browser. We recommend **[Tampermonkey](https://www.tampermonkey.net/)** (available for Chrome, Firefox, Edge, Safari, and Kiwi Browser on Android).

### 2. Install the Script
1. Click on the **`crunchyroll-utilities.user.js`** file in this repository.
2. Click the **"Raw"** button at the top right of the code block.
3. Tampermonkey will automatically detect the script and prompt you to install it. Click **Install**.

*(Note: Ensure you update the `@require` links inside the main script to match your actual GitHub username if you fork or clone this repository).*

---

## ☁️ Cloud Sync Setup (JSONBin.io)

To share your saved skips across multiple devices, you need to set up a free JSON database.

1. Go to **[JSONBin.io](https://jsonbin.io/)** and create a free account.
2. Go to your Dashboard and create a **New Bin**.
3. Inside the bin, paste the following dummy data (this is required to initialize it):
   ```json
   {
     "init": "ok"
   }
4. Click Create and copy your Bin ID (found in the URL or the Bin settings).
5. Go to the API Keys section in your JSONBin settings and copy your Master Key (it should start with $2a$10$...).
6. Open your **`src/config.js`** file (or edit the script directly in Tampermonkey) and paste your credentials:
    ```js
    {
        window.CRUtil.Config = {
            cloud: {
                BIN_ID: "YOUR_BIN_ID_HERE",
                API_KEY: "YOUR_MASTER_KEY_HERE",
                // ...
            }
        }
    }
7. Repeat the installation and configuration on your other devices. You're now fully synced!

## 🎮 How to Use

1. Start watching any episode on Crunchyroll.
2. Look for the new Gear Icon (⚙️) in the bottom right corner of the video player controls.
3. Click it to open the CR Utilities Menu.
4. Navigate to the start of an Intro or Outro. The menu will automatically grab your current timecode.
5. Click Save. The script will highlight the segment on the progress bar and silently back it up to your cloud.

## 📂 Project Structure

This script uses a modular approach loaded via Tampermonkey's @require tags.

    ```Plaintext
    📦 crunchyroll-utilities
    ┣ 📜 crunchyroll-utilities.user.js  # Main entry point (loads modules)
    ┗ 📂 src
    ┣ 📜 config.js                    # Global variables and API keys
    ┣ 📜 utils.js                     # Time math and formatting functions
    ┣ 📜 data.js                      # LocalStorage and JSONBin.io logic
    ┣ 📜 skip.js                      # Video player hooking and skipping logic
    ┗ 📜 ui.js                        # DOM manipulation, CSS, and Menu creation