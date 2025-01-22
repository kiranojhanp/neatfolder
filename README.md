# NeatFolder

A high-performance file organization CLI tool that automatically sorts files into meaningful categories.

## Features

- Four organization methods:
  - **Extension**: Groups by file types (images, docs, etc.)
  - **Name**: Groups by filename patterns
  - **Date**: Sorts by modification date
  - **Size**: Categorizes by file size
- Parallel processing for speed
- Recursive directory support
- Dry-run mode

## Installation

```bash
bun install -g neatfolder
```

## Usage

```bash
neatfolder [directory] [options]

# Basic examples
neatfolder ~/Downloads                   # Organize current directory by extension
neatfolder ~/Documents -m name           # Group by filename
neatfolder ~/Pictures -m date -r         # Sort recursively by date
neatfolder . --dry-run                   # Preview changes
```

### Options

- `-m, --method <type>`: extension|name|date|size
- `-r, --recursive`: Include subdirectories
- `-d, --max-depth <n>`: Max recursion depth
- `--min-size <bytes>`: Minimum file size
- `--max-size <bytes>`: Maximum file size
- `--ignore-dotfiles`: Skip hidden files
- `--dry-run`: Preview only
- `-v, --verbose`: Show details

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
