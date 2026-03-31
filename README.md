# Etch-transfer
Export and import Etch pages, templates, patterns, and components, JSon Loops, WSForms between WordPress sites, complete with all classes and styles. 

Built for use with [Etch for WordPress](https://etchwp.com/).

## ⚠️ DISCLAIMER: USE AT YOUR OWN RISK
This plugin performs potentially destructive actions such as but not limited to overwriting and was created with the assistance of AI. It has been tested and confirmed working in my own environment, but every WordPress setup is different and issues may occur.

Create a full database backup before use and test in a staging environment. I am not liable for any damages, data loss, or site issues resulting from its use.

---

## The Problem

When copy-pasting Etch blocks between sites, the block markup transfers but the associated CSS class definitions do not. Etch stores its styles globally in `wp_options` rather than per-post, so standard WordPress export/import tools miss them entirely.

This plugin solves that by bundling the exact style definitions used by each exported item alongside the content, then merging them into the destination site on import.

---

## Features

- Export any combination of pages, posts, custom post types, FSE templates, patterns, and Etch components in a single bundle
- Automatically transfers all Etch class and style definitions used by exported content
- Imports directly to the matching destination by post type and slug — no manual ID mapping
- Creates new posts/pages on the destination if they don't exist yet
- Bypasses WordPress `kses` sanitization so Etch's block comment JSON is preserved exactly, including condition strings with `&&` and `"` operators
- Distinguishes Etch components from regular WordPress patterns in the UI
- Clean admin UI inside WordPress — no FTP, no PHP files to upload and delete

---

## Requirements

- WordPress 6.0+
- [Etch for WordPress](https://etchwp.com/) installed on both sites
- Administrator access on both sites

---

## Installation

1. Download the latest `etch-transfer.zip` from the [Releases](../../releases) page
2. In WordPress admin go to **Plugins → Add New → Upload Plugin**
3. Upload the zip file and click **Install Now**
4. Click **Activate Plugin**
5. Repeat on the destination site

**Etch Transfer** will appear in the left admin menu.

---

## Usage

### Exporting

1. Go to **Etch Transfer** in the WordPress admin menu on the **source site**
2. You'll see the **Export** tab with all content grouped by type:
   - Pages
   - Posts
   - Custom Post Types (any registered public CPT)
   - Templates (FSE block templates)
   - Etch Components (wp_block posts with `etch_component_html_key`)
   - Patterns (wp_block posts without that key)
3. Check the items you want to export — you can mix and match across any group
4. The selected count updates as you check items
5. Click **Download Bundle JSON** — a single `.json` file downloads containing all selected items and their Etch styles

### Importing

1. Go to **Etch Transfer** on the **destination site**
2. Click the **Import** tab
3. Drop or browse to select the `.json` bundle file
4. A summary appears showing the source site, item count, and content breakdown
5. Click **Import All**

Each item is automatically matched to its destination by **post type + slug**. If a matching post already exists it is updated. If it doesn't exist yet it is created as a new post with the same slug and post type.

---

## How Styles Are Transferred

Etch stores all CSS class definitions in a single `wp_options` entry called `etch_styles`. Each exported item's block content is scanned for style ID references (the short IDs inside `"styles":[...]` block attributes). Only the style definitions actually used by the exported content are included in the bundle.

On import, those style definitions are merged into the destination site's `etch_styles` option. Existing style IDs on the destination are never overwritten — only new ones are added.

---

## How Auto-Matching Works

The export file records the source post type and slug for every item. On import, the plugin runs a `get_posts()` query for each item using those two values. 

For FSE templates, slugs sometimes include a theme prefix (`theme-name//template-name`). The plugin handles this by trying the full slug first, then falling back to the part after `//`.

If no match is found, a new post is created with the same slug and post type, then the content is written into it.

---

## Notes

- The plugin writes post content directly via `$wpdb` rather than `wp_update_post()` to prevent WordPress from sanitizing Etch's block comment JSON, which would corrupt condition strings containing `"` and `&&`
- Style IDs that already exist on the destination site are skipped during merge — this prevents overwriting unrelated styles that happen to share an ID
- The import tab works with both single-item exports and multi-item bundles from the same upload UI

---

## File Structure

```
etch-transfer/
├── etch-transfer.php                        # Plugin bootstrap
├── assets/
│   ├── admin.css                            # Admin UI styles
│   └── admin.js                             # Export/import interactions
└── includes/
    ├── class-etch-transfer-admin.php        # Menu, UI, AJAX handlers
    ├── class-etch-transfer-exporter.php     # Export logic + style extraction
    └── class-etch-transfer-importer.php     # Import logic + style merging
```

---

## License

GPL-2.0+
