# os-automation

A CLI tool to **automate OS updates in GitHub Actions workflows**.  
Its main role is to **add missing OS entries** to workflow matrices and apply respective changes to prevent errors related to unsupported or missing OS configurations.

---

## Features

- Adds missing **OS entries** to GitHub Actions workflow matrices.
- Applies **Windows-specific fixes** where required.
- Ensures **Maven logs and artifacts** are properly configured.
- Works across multiple YAML files via glob patterns.
- Supports **dry-run** mode to preview changes before applying.

---

## Tested Environment

- Windows 11 Pro
- Node JS v22

---

## Installation

```bash
# Using npm
npm install -g os-automation
```

For local development:

```bash
npm install
npm run build
node dist/index.js --help
```

---

## Usage

```bash
osm [options]
```

### Options

| Option                 | Description                                    | Default                                        |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `-p, --pattern <glob>` | Glob pattern for workflow files to process     | `{.github/workflows,src/test}/**/*.{yml,yaml}` |
| `-d, --dry-run`        | Show what would change, but do not write files | `false`                                        |
| `-l, --list`           | List matching files and exit                   | `false`                                        |

---

### Examples

#### List all matching workflow files

```bash
osm --list
```

#### Preview changes without writing (dry run)

```bash
osm --dry-run
```

#### Update all workflows in default paths

```bash
osm
```

#### Update workflows in a custom path

```bash
osm --pattern "workflows/**/*.yml"
```

---

## Example

Suppose you have the following workflow:

**Before:**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java: [17]

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}

      - name: Build with Maven
        run: mvn -B package --file pom.xml
```

Running `os-automation` will add missing OS configurations:

**After:**

```yaml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        java:
          - 17
        os:
          - ubuntu-latest
          - macos-latest
          - windows-latest
      fail-fast: false
    steps:
      - name: "Windows: Git Long Paths"
        if: runner.os == 'Windows'
        run: git config --system core.longpaths true

      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}

      - name: Build with Maven
        run: mvn -B package --file pom.xml -l "maven-build-java${{ matrix.java }}-${{ matrix.os }}.log"

      - name: Upload Maven logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: build-logs-${{ matrix.os }}-${{ matrix.java }}
          path: "*.log"
          if-no-files-found: ignore

      - name: Upload Surefire/Failsafe reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-reports-${{ matrix.os }}-${{ matrix.java }}
          path: |-
            **/surefire-reports/**/*
            **/failsafe-reports/**/*
          if-no-files-found: ignore
    name: "Build - ${{ matrix.os }} - Java: ${{ matrix.java }}"
```

This ensures the workflow runs across all major GitHub Actions environments without errors.

---

## Development

Clone the repo and install dependencies:

```bash
git clone https://github.com/PrabeenGautam/os-automation
cd os-automation
npm install
```

Run locally with:

```bash
npm run build
node dist/index.js --dry-run
```

---

## Project Structure

```
src/
 ├── test/               # Test workflows
 │   └── test.yml
 │
 ├── types/              # Shared TypeScript types
 │   └── index.ts
 │
 ├── utils/              # Utility modules
 │   ├── artifacts.ts    # Handles artifact setup for workflows
 │   ├── checker.ts      # Boolean checks
 │   ├── maven.ts        # Maven logs and artifact logic
 │   ├── os.ts           # OS handling logic (e.g. add missing OS)
 │   ├── yaml.ts         # YAML read/write helpers
 │   └── cli.ts          # CLI entrypoint (commander setup)
 │
 ├── index.ts            # Main export
 └── mutator.ts          # Core workflow mutator logic
```

---

## License

MIT © 2025 Prabin Gautam
