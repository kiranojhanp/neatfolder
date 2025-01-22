# NeatFolder

**NeatFolder** is an advanced file organization utility built with Bun that intelligently categorizes and arranges files in your directories. It offers multiple organization strategies, parallel processing for performance, and extensive customization options to keep your filesystem neat and efficient.

---

## Features

- Multiple Organization Methods:

  - **Extension-based**: Organizes by file type categories (images, documents, etc.)
  - **Name-based**: Groups by filename patterns
  - **Date-based**: Sorts by modification date
  - **Size-based**: Categorizes by file size ranges

- Advanced Capabilities:

  - Parallel processing for improved performance
  - Recursive directory traversal with depth control
  - Comprehensive error handling and reporting
  - Dry-run mode for safe testing
  - File size filtering
  - Detailed progress tracking and statistics

- Smart File Categorization:
  - Intelligent category detection for various file types
  - Handles name collisions automatically
  - Preserves file hierarchies
  - Supports dotfile filtering

---

## Installation

Ensure you have Bun installed on your system (https://bun.sh).

1. Install NeatFolder globally:

   ```bash
   bun install -g neatfolder
   ```

2. Verify the installation:
   ```bash
   neatfolder --version
   ```

---

## Usage

Basic syntax:

```bash
neatfolder [directory] [options]
```

### Organization Methods

Choose one of the following organization methods:

```bash
# Organize by file type categories
neatfolder ~/Downloads -m extension

# Group by filename patterns
neatfolder ~/Documents -m name

# Sort by modification date
neatfolder ~/Pictures -m date

# Categorize by file size
neatfolder ~/Videos -m size
```

### Available Options

- `-m, --method <method>`: Organization method (extension|name|date|size)
- `-r, --recursive`: Process subdirectories recursively
- `-d, --max-depth <number>`: Maximum recursion depth (default: 5)
- `--min-size <bytes>`: Minimum file size to process
- `--max-size <bytes>`: Maximum file size to process
- `--ignore-dotfiles`: Skip hidden files
- `--dry-run`: Preview changes without executing them
- `-v, --verbose`: Show detailed progress and statistics

---

## Examples

### Organize Media Files by Type

```bash
neatfolder ~/Media -m extension -r
```

Output:

```
Organization Summary:
Files processed: 156
Total data moved: 1.2 GB
Time taken: 3.45 seconds
Directories created: 4

Created categories:
- images/ (45 files)
- videos/ (28 files)
- audio/ (83 files)
```

### Sort Documents by Date

```bash
neatfolder ~/Documents -m date -v
```

Output:

```
Organization Summary:
Files processed: 83
Total data moved: 256.7 MB
Time taken: 1.23 seconds
Directories created: 3

Created directories:
- 2024/01/ (32 files)
- 2024/02/ (28 files)
- 2024/03/ (23 files)
```

### Filter Large Files

```bash
neatfolder ~/Downloads -m size --min-size 100000000
```

Output:

```
Organization Summary:
Files processed: 12
Total data moved: 2.3 GB
Time taken: 5.67 seconds
Directories created: 2

Size categories:
- large/ (12 files)
```

### Preview Changes

```bash
neatfolder ~/Projects -m name --dry-run -v
```

Output:

```
DRY RUN - No changes will be made

Would organize:
- project-a/ (15 files)
- project-b/ (23 files)
- misc/ (7 files)

Total files to process: 45
Estimated data to move: 345.6 MB
```

---

## File Categories

When using extension-based organization, files are automatically sorted into the following categories:

- **images/**: jpg, jpeg, png, gif, bmp, webp, svg, ico
- **documents/**: pdf, doc, docx, txt, md, rtf, odt, xlsx, xls, csv
- **audio/**: mp3, wav, flac, m4a, aac, ogg, wma
- **video/**: mp4, avi, mkv, mov, wmv, flv, webm
- **archives/**: zip, rar, 7z, tar, gz, bz2
- **code/**: js, ts, py, java, cpp, cs, php, html, css, json, xml
- **executables/**: exe, msi, app, dmg, apk
- **fonts/**: ttf, otf, woff, woff2
- **others/**: uncategorized files

---

## Development

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/neatfolder.git
   ```

2. Install dependencies:

   ```bash
   cd neatfolder
   bun install
   ```

3. Build the project:

   ```bash
   bun run build
   ```

4. Run locally:
   ```bash
   bun run start [directory] [options]
   ```

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add a new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Author

**NeatFolder** is developed and maintained by [Kiran Ojha](https://github.com/kiranojhanp).

---

Stay organized! 🗂️
