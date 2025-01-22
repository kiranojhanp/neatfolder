# NeatFolder

A fast CLI tool to organize files into useful categories.

## Features

- Organize by:
  - **Extension**: File types (images, docs, etc.)
  - **Name**: Filename patterns
  - **Date**: Modification date
  - **Size**: File size
- Blazingly fast with parallel processing
- Supports subfolders (recursive)
- Dry-run preview tree
- No external dependencies

## Installation

```bash
npm install -g neatfolder
```

## Usage

```bash
neatfolder [directory] [options]

# Examples
neatfolder ~/Downloads                  # Sort by extension
neatfolder ~/Documents -m name          # Sort by name
neatfolder ~/Pictures -m date -r        # Sort by date (recursive)
neatfolder . --dry-run                  # Preview changes
```

### Options

- `-m, --method <type>`: extension|name|date|size
- `-r, --recursive`: Include subfolders
- `-d, --max-depth <n>`: Max folder depth
- `--min-size <bytes>`: Minimum file size
- `--max-size <bytes>`: Maximum file size
- `--ignore-dotfiles`: Skip hidden files
- `--dry-run`: Preview without changes
- `-v, --verbose`: Show more details

## File Categories

- **images/**: jpg, jpeg, png, gif, bmp, webp, svg, ico
- **documents/**: pdf, doc, docx, txt, md, rtf, odt, xlsx, xls, csv
- **audio/**: mp3, wav, flac, m4a, aac, ogg, wma
- **video/**: mp4, avi, mkv, mov, wmv, flv, webm
- **archives/**: zip, rar, 7z, tar, gz, bz2
- **code/**: js, ts, py, java, cpp, cs, php, html, css, json, xml
- **executables/**: exe, msi, app, dmg, apk
- **fonts/**: ttf, otf, woff, woff2
- **others/**: uncategorized files

## License

MIT License

## Author

[Kiran Ojha](https://github.com/kiranojhanp)
