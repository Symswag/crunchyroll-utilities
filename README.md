# ⚙️ Crunchyroll Utilities (Supabase SQL Edition)

![Version](https://img.shields.io/badge/version-8.0.1-orange.svg)
![Platform](https://img.shields.io/badge/platform-Tampermonkey-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A lightweight, powerful, and secure "Swiss Army knife" userscript for Crunchyroll. 
Now featuring a **Cloud-Synced Auto-Skip system via Supabase SQL**, allowing you to seamlessly share your custom timecodes (intro, outro, recap, preview) across all your devices (PC, tablet, smartphone).

---

## ✨ Features

* ⏭️ **Smart Auto-Skip:** Automatically skips intros, outros, recaps, and previews based on your saved timecodes. Stops exactly 2 seconds before the end of the video to perfectly trigger Crunchyroll's native "Next Episode" countdown.
* ☁️ **Local-First Cloud Sync:** Edits apply instantly using local storage, while syncing to your Supabase SQL database in the background.
* ⌨️ **Customizable Hotkeys:** Control everything from the keyboard (Forward, Backward, Quick Add Intro/Outro, Play/Pause, Fullscreen, Reload, Open Menu).
* 🔒 **Secure Configuration:** API keys are never hardcoded in the script. They are entered via a dedicated UI menu and securely stored in your browser's local storage.
* 🌍 **Bilingual Support (i18n):** The interface automatically detects your browser's language (Currently supports **English** and **French**).
* 🎨 **Visual Highlights:** Displays colored markers directly on the video progress bar (Green = Intro, Red = Outro, Yellow = Recap, Blue = Preview).
* ⏱️ **Smart Auto-Fill:** Opening the menu automatically detects your position in the video and pre-fills the start/end timecodes by guessing the segment type.
* 🚀 **SPA Ready & Robust UI:** Fully compatible with Crunchyroll's Single Page Application navigation (no need to refresh the page between episodes). The menu icon injects cleanly into the player.

---

## 🚀 Installation

### 1. Prerequisites
You need a userscript manager installed in your browser. We recommend **[Tampermonkey](https://www.tampermonkey.net/)** (available for Chrome, Firefox, Edge, Safari, and Kiwi Browser on Android).

### 2. Install the Script
1. Click on the **`crunchyroll-utilities.user.js`** file in this repository.
2. Click the **"Raw"** button at the top right of the code block.
3. Tampermonkey will automatically detect the script and prompt you to install it. Click **Install**.

---

## ☁️ Cloud Sync Setup (Supabase SQL)

To share your saved skips across multiple devices, you need to set up a Supabase database (replaces the old JSONBin system).

### Step 1: Create the Supabase Project and Table
1. Go to **[Supabase](https://supabase.com/)** and create a free account.
2. Create a **New Project**.
3. In the SQL Editor of your project, run the following query to create the necessary table for synchronization:
   ```sql
   create table episode_skips (
     episode_id text not null,
     skip_type text not null check (skip_type in ('intro', 'outro', 'recap', 'preview')),
     start_time real not null,
     end_time real not null,
     updated_at timestamptz default now(),
     primary key (episode_id, skip_type)
   );
   ```
4. *Security note:* Remember to disable RLS (Row Level Security) on this table if you use it strictly for a personal project, or configure appropriate insert/select policies.

### Step 2: Link the script to Supabase
1. Go to your Supabase **Project Overview** (located just under your project name).
2. Copy the **Project URL** and the **API Key (anon / public)**.
3. Play any video on Crunchyroll. Click the Gear Icon (⚙️) in the bottom right to open the CR Utilities menu.
4. Click the small gear (⚙️ Advanced Settings) at the top of the menu to open the Cloud Configuration.
5. Paste your **Supabase URL** and **API Key** into the respective fields and click **Save & Return**.
6. Repeat the operation on your other devices. Your data is now synced in real time!

---

## 🎮 How to Use

1. Start watching any episode on Crunchyroll.
2. Look for the new Gear Icon (⚙️) in the bottom right corner of the video player controls.
3. Click it (or use the default `M` hotkey) to open the CR Utilities Menu.
4. Navigate to the start of an Intro, Outro, recap, or preview. The menu will automatically capture your timecode and try to guess the segment type.
5. Click **Save Segment**. The script will highlight the segment on the progress bar and silently save it to your cloud.
6. Use the cross (✖) next to any saved segment in the list to delete it globally.
7. Modify your keyboard shortcuts in the advanced settings to add timecodes on the fly without even opening the menu!