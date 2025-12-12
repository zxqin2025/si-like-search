# User Guideline

- Ctrl-Shift-P to call out command panel.
- Input `si`，choose `SI-like Symbol Search`，press Enter to search symbols。

Search seems like `Source Insight`: 
You can input searval words which split with whitespaces, and the symbol should match every keyword's prefix.

This plugin can serve as a supplement to the default `Ctrl-Shift-O` search method in VSCode.


Now we have to keybindings:

1. <mark>Ctrl+'</mark> Search in current file(Accessible View）.
2. <mark>Alt+'</mark> Search global symbols(Workspace Scope).


# TO be fixed

- Now 'Search in Workspace' action dose not cover all symbols, but I don't know why.


# Delevelopent

Install vsce tool first:
```bash
npm install -g vsce
vsce --version
```

Install project's dependencies:
```bash
npm install
```

Package and generate vsix file:
```bash
vsce package
```

Install the extension with cli(Optional):
```bash
code --install-extension si-symbol-search-*vsix
```

