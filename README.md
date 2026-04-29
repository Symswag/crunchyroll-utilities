# ⚙️ Crunchyroll Utilities

![Version](https://img.shields.io/badge/version-6.0.1-orange.svg)
![Platform](https://img.shields.io/badge/platform-Tampermonkey-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A lightweight, powerful, and secure "Swiss Army knife" userscript for Crunchyroll. 
Currently featuring a **Local-First Cloud-Synced Auto-Skip** system, allowing you to seamlessly share your custom intro/outro skip times across all your devices (PC, tablet, smartphone).

---

## ✨ Features

* ⏭️ **Smart Auto-Skip:** Automatically skips intros and outros based on your saved timecodes. Stops exactly 2 seconds before the end of the video to perfectly trigger Crunchyroll's native "Next Episode" countdown.
* ☁️ **Local-First Cloud Sync:** Edits apply instantly using local storage, while syncing to the cloud (via JSONBin.io) in the background. Never lose your skips when switching from your PC to your tablet!
* 🔒 **Secure Configuration:** API keys are never hardcoded in the script. They are entered via a dedicated UI menu and securely stored in your browser's local storage.
* 🌍 **Bilingual Support (i18n):** The interface automatically detects your browser's language and adapts seamlessly (Currently supports **English** and **French**).
* 🎨 **Visual Highlights:** Displays colored markers directly on the Crunchyroll video progress bar (Green for Intros, Red for Outros).
* ⏱️ **Smart Auto-Fill:** Opening the menu automatically detects whether you are in the first or second half of the episode and pre-fills the start/end timecodes based on your current position.
* 🚀 **SPA Ready & Robust UI:** Fully compatible with Crunchyroll's Single Page Application navigation (no need to refresh the page between episodes). The menu button is injected cleanly as the very first icon in the player controls.

---

## 🚀 Installation

### 1. Prerequisites
You need a userscript manager installed in your browser. We recommend **[Tampermonkey](https://www.tampermonkey.net/)** (available for Chrome, Firefox, Edge, Safari, and Kiwi Browser on Android).

### 2. Install the Script
1. Click on the **`crunchyroll-utilities.user.js`** file in this repository.
2. Click the **"Raw"** button at the top right of the code block.
3. Tampermonkey will automatically detect the script and prompt you to install it. Click **Install**.

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
6. Open any video on Crunchyroll, click the Gear Icon (⚙️) to open the CR Utilities menu, then click the Mini Gear Icon in the header to open the Cloud Config Menu.
7. Paste your Bin ID and Master Key into the respective fields and click Save.
8. Repeat the installation and configuration on your other devices. You're now fully synced!

---

## 🎮 How to Use

1. Start watching any episode on Crunchyroll.
2. Look for the new Gear Icon (⚙️) in the bottom right corner of the video player controls (it should be the first button on the left of the control group).
3. Click it to open the CR Utilities Menu.
4. Navigate to the start of an Intro or Outro. The menu will automatically grab your current timecode and guess the segment type.
5. Click Save Segment. The script will highlight the segment on the progress bar and silently back it up to your cloud.
6. Use the ✖ button next to any saved segment in the list to delete it globally.