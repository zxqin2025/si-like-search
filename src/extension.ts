/*
 * VSCode extension: si-like-symbol-search
 * Function: Support multiple-words, ignore-case, non-sequential matching VSCode file symbols
 */

import * as vscode from 'vscode';
import * as path from 'path';


/**
 * Extends QuickPickItem.
 */
interface DocumentSymbolPickItem extends vscode.QuickPickItem {
	range: vscode.Range;
}

export function activate(context: vscode.ExtensionContext) {
	const disposable0 = vscode.commands.registerCommand('si_like_search.search_doc_symbols', searchCmdInCurrentFile);
	const disposable1 = vscode.commands.registerCommand('si_like_search.search_workspace_symbols', searchCmdInWorkspace);
	const disposable2 = vscode.commands.registerCommand('si_like_search.jia_gen_compdb', genCompdbForMultipleRootDirs);
	context.subscriptions.push(disposable0);
	context.subscriptions.push(disposable1);
	context.subscriptions.push(disposable2);

	registerSymbolTreeView(context);
}

const enum SearchType {
	SearchInCurrentFile,
	SearchInWorkspace,
}

async function searchCmdInCurrentFile() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No active editor.');
		return;
	}

	/* get the symbols in current file */
	const docSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		editor.document.uri
	);

	pickSymbol(docSymbols, SearchType.SearchInCurrentFile);
}

async function searchCmdInWorkspace() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No active editor.');
		return;
	}
	let workspaceSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
		'vscode.executeWorkspaceSymbolProvider',
		'' /* empty string to get all symbols */
	);
	if (!workspaceSymbols || workspaceSymbols.length == 0) {
		workspaceSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
			'vscode.executeWorkspaceSymbolProvider',
			'*' /* if empty string can't get any symbols, try using `*` to match all */
		);
	}
	pickSymbol(workspaceSymbols, SearchType.SearchInWorkspace);
}


function truncateToSrcDir(filePath: string): string {
	let currentPath = filePath;

	/* if current path is already src or root path, stop loop */
	while (path.basename(filePath) !== 'src' && filePath !== path.dirname(filePath)) {
		currentPath = path.dirname(filePath);
	}

	/* if curresrc path found, return src path; otherwise return original path */
	return path.basename(currentPath) === 'src' ? currentPath : filePath;
}

function genCompdbForMultipleRootDirs() {
	const rootDirs = vscode.workspace.workspaceFolders;
	if (!rootDirs || rootDirs.length === 0) {
		vscode.window.showInformationMessage('No root directories found.');
		return;
	}

	let jiaCmdAll = "jia all";

	/* choose src as the default workspace root dir */
	const defaultWorkspaceRootDir = truncateToSrcDir(rootDirs[0].uri.fsPath);
	const terminalWorkpath = vscode.window.showInputBox({
		prompt: 'Please input the root directory',
		value: defaultWorkspaceRootDir,
	});
	if (!terminalWorkpath) {
		vscode.window.showInformationMessage('Has not input root directory');
		return;
	}

	terminalWorkpath.then((workpath) => {
		if (workpath === undefined) {
			vscode.window.showInformationMessage('Has not input root directory');
			return;
		}

		const terminalWorkpath: string = workpath;
		const terminal = vscode.window.createTerminal({
			name: `Jia Gen compdb for ${vscode.workspace.name}`,
			cwd: terminalWorkpath,
		});
		for (const rootDir of rootDirs) {
			jiaCmdAll = jiaCmdAll + " " + rootDir.uri.fsPath;
		}

		terminal.sendText(jiaCmdAll);
		terminal.show();

		vscode.window.showInformationMessage('Execute Command: ' + jiaCmdAll);
	});
}

/**
 * Gets the icon name for a document symbol.
 *
 * @param symbol - document symbol
 *
 * @returns icon name
 */
function getSymbolIcon(symbol: vscode.DocumentSymbol | vscode.SymbolInformation) {
	const kind = symbol.kind;
	// See vscode.SymbolKind (0-based)
	const map: { [key: number]: { icon: string } } = {
		0: { icon: '$(symbol-file)' },
		1: { icon: '$(symbol-module)' },
		2: { icon: '$(symbol-namespace)' },
		3: { icon: '$(symbol-package)' },
		4: { icon: '$(symbol-class)' },
		5: { icon: '$(symbol-method)' },
		6: { icon: '$(symbol-property)' },
		7: { icon: '$(symbol-field)' },
		8: { icon: '$(symbol-constructor)' },
		9: { icon: '$(symbol-enum)' },
		10: { icon: '$(symbol-interface)' },
		11: { icon: '$(symbol-function)' },
		12: { icon: '$(symbol-variable)' },
		13: { icon: '$(symbol-constant)' },
		14: { icon: '$(symbol-string)' },
		15: { icon: '$(symbol-number)' },
		16: { icon: '$(symbol-boolean)' },
		17: { icon: '$(symbol-array)' },
		18: { icon: '$(symbol-object)' },
		19: { icon: '$(symbol-key)' },
		20: { icon: '$(symbol-null)' },
		21: { icon: '$(symbol-enum-member)' },
		22: { icon: '$(symbol-struct)' },
		23: { icon: '$(symbol-event)' },
		24: { icon: '$(symbol-operator)' },
		25: { icon: '$(symbol-type-parameter)' },
	};

	if (kind < 0 || kind >= 25) {
		return '$(symbol-misc)';
	} else {
		return map[kind].icon;
	}
};

/**
 * Creates the QuickPick items from the document symbols.
 *
 * @param symbols - document symbols
 *
 * @returns QuickPick items
 */
function getDocumentSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
	if (!symbols?.length) {
		return [];
	}

	const flatSymbols = flattenDocSymbols(symbols);

	flatSymbols.sort((a, b) => {
		return (a.range.start.line - b.range.start.line);
	});

	return flatSymbols;
}

function pickSymbol(symbols: vscode.DocumentSymbol[] | vscode.SymbolInformation[], searchType: SearchType) {
	if (!symbols) {
		vscode.window.showInformationMessage('Cannot find symbols. Try click Outmap-View on the sidebar.');
		return;
	}

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No active editor');
		return;
	}

	let flatSymbols: vscode.DocumentSymbol[] = [];
	/* create a quickpick component */
	const quickPick = vscode.window.createQuickPick<DocumentSymbolPickItem>();
	quickPick.items = [];
	if (searchType === SearchType.SearchInCurrentFile) {
		quickPick.placeholder = 'Search symbols in current file";

		flatSymbols = getDocumentSymbols(symbols as vscode.DocumentSymbol[]);
	} else {
		quickPick.placeholder = 'Search symbols in Workspace';
	}

	/* quickpick will do fuzzy match by default, and there is no way to disable it */

	const config = vscode.workspace.getConfiguration('si_like_search');
	const enablePreview = config.get<boolean>('enablePreview', true);

	const originalRange = new vscode.Range(editor.selection.active, editor.selection.active);
	let firstChangeActive = true;
	let didAccept = false;
	let decoration: vscode.TextEditorDecorationType | undefined;

	if (enablePreview && searchType === SearchType.SearchInCurrentFile) {
		// vscode.window.showInformationMessage('Preview mode enabled');
		quickPick.onDidChangeActive((items) => {
			if (!items?.length) {
				return;
			}
			if (!firstChangeActive) {
				if (decoration) decoration.dispose();
				decoration = previewSymbol(items[0], editor);
			}

			firstChangeActive = false;
		});
	} else {
		// vscode.window.showInformationMessage('Preview mode disabled');
	}

	/* monitor user's inputting action, for the real-time searching  */
	quickPick.onDidChangeValue((value) => {
		/* splite the input string with <space> */
		const searchWordsList = value.toLowerCase().trim().split(/\s+/);

		if (searchType === SearchType.SearchInCurrentFile) {
			const matches: vscode.DocumentSymbol[] = (flatSymbols).filter(sym => {
				const oneSymbol = sym.name.toLowerCase();
				/* symbol should include all the keywords */
				return searchWordsList.every(word =>
					oneSymbol.includes(word)
				);
			});
			quickPick.items = matches.map(sym => ({
				label: `${getSymbolIcon(sym)} ${sym.name}`,
				symbol: sym,
				alwaysShow: true,
				range: sym.range
			}));
		} else {
			const matches = (symbols as vscode.SymbolInformation[]).filter(sym => {
				const oneSymbol = sym.name.toLowerCase();
				/* symbol should include all the keywords */
				return searchWordsList.every(word =>
					oneSymbol.includes(word)
				);
			});
			quickPick.items = matches.map(sym => ({
				label: `${getSymbolIcon(sym)} ${sym.name}`,
				symbol: sym,
				alwaysShow: true,
				range: sym.location.range
			}));
		}
	});

	/* when user presses Enter or clicks an item */
	quickPick.onDidAccept(() => {
		if (quickPick.selectedItems.length === 0) {
			return;
		}
		didAccept = true;

		const selected = quickPick.selectedItems[0];
		const range = new vscode.Range(selected.range.start, selected.range.end);

		/* scroll the specified text range into view within the viewport. */
		editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
		/* set the cursor/selection range of the current editor */
		editor.selection = new vscode.Selection(selected.range.start, selected.range.start /* selected.range.end */);
		/* hide the QuickPick popup window */
		quickPick.dispose();
	});

	/* if click other area, hide the quickpick, and restore the original location */
	quickPick.onDidHide(() => {
		if (enablePreview && originalRange && !didAccept) {
			editor.revealRange(originalRange, vscode.TextEditorRevealType.InCenter);
		}
		quickPick.dispose();
	});

	/* if no input (such as the first time), show all symbols */
	if (!quickPick.value) {
		if (searchType === SearchType.SearchInCurrentFile) {
			quickPick.items = flatSymbols.map(sym => ({
				label: `${getSymbolIcon(sym)} ${sym.name}`,
				description: "",
				symbol: sym,
				alwaysShow: true,
				range: sym.range
			}));
		} else {
			quickPick.items = (symbols as vscode.SymbolInformation[]).map(sym => ({
				label: `${getSymbolIcon(sym)} ${sym.name}`,
				description: "",
				symbol: sym,
				alwaysShow: true,
				range: sym.location.range
			}));
		}
	}
	quickPick.show();
}

function flattenDocSymbols(symbols: readonly vscode.DocumentSymbol[]):
	vscode.DocumentSymbol[] {
	const result: vscode.DocumentSymbol[] = [];
	const stack: vscode.DocumentSymbol[] = [...symbols].reverse();

	while (stack.length > 0) {
		const symbol = stack.pop()!;
		result.push(symbol);
		if (symbol.children && symbol.children.length > 0) {
			stack.push(...[...symbol.children].reverse());
		}
	}

	return result;
}

function previewSymbol(symbol: DocumentSymbolPickItem, editor: vscode.TextEditor): vscode.TextEditorDecorationType {
	const decoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: new vscode.ThemeColor('editor.rangeHighlightBackground'),
		isWholeLine: true,
	});

	editor.setDecorations(decoration, [symbol.range]);
	editor.revealRange(symbol.range);

	return decoration;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getConfigSource(section: string, key: string) {
	const config = vscode.workspace.getConfiguration(section);
	const inspected = config.inspect(key);

	if (!inspected) return { source: 'default', value: config.get(key) };

	// priority: folder > workspace > global > default
	if (inspected.workspaceFolderValue !== undefined) {
		return { source: 'workspaceFolder', value: inspected.workspaceFolderValue };
	}
	if (inspected.workspaceValue !== undefined) {
		return { source: 'workspace', value: inspected.workspaceValue };
	}
	if (inspected.globalValue !== undefined) {
		return { source: 'user', value: inspected.globalValue };
	}

	return { source: 'default', value: inspected.defaultValue };
}

function registerSymbolTreeView(context: vscode.ExtensionContext) {
	const provider = new SymbolTreeProvider();
	const view = vscode.window.createTreeView('si_like_search_view', {
		treeDataProvider: provider,
		showCollapseAll: true
	});
	context.subscriptions.push(view);

	context.subscriptions.push(
		vscode.commands.registerCommand('si_like_search.refresh', () => provider.refresh())
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('si_like_search.search', async () => {
			const query = await vscode.window.showInputBox({ prompt: 'Search symbols...' });
			provider.filter(query || '');
		})
	);
}

class SymbolTreeProvider implements vscode.TreeDataProvider<SymbolItem> {
	private _onDidChange = new vscode.EventEmitter<SymbolItem | undefined>();
	readonly onDidChangeTreeData = this._onDidChange.event;
	private allSymbols: SymbolItem[] = [];
	private filtered: SymbolItem[] = [];

	constructor() {
		this.loadSymbols();
		this.filtered = this.allSymbols;
	}

	refresh(): void {
		this.loadSymbols();
		this._onDidChange.fire(undefined);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	filter(_query: string): void {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		this.filtered = this.allSymbols.filter(_item => {
			return true;
			// if (item.label === undefined) {
			// 	return false;
			// }
			// if (item.label is string) {
			// 	return item.label.toLowerCase().includes(query.toLowerCase())
			// }
			// if (item.label is string) {
			// 	return item.label.toLowerCase().includes(query.toLowerCase())
			// }
			// return false;
		});
		this._onDidChange.fire(undefined);
	}

	getTreeItem(element: SymbolItem): vscode.TreeItem {
		return element;
	}

	getChildren(): SymbolItem[] {
		return this.filtered;
	}

	private loadSymbols() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			this.allSymbols = [];
			return;
		}
		const doc = editor.document;
		const doc_symbols = vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			doc.uri
		);
		doc_symbols.then((symbols) => {
			this.allSymbols = (symbols || []).map(s => new SymbolItem(s.name));
			this.filtered = this.allSymbols;
			this._onDidChange.fire(undefined);
		});
	}
}

class SymbolItem extends vscode.TreeItem {
	constructor(label: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
	}
	// iconPath = 'resources/icons/dark/search-view.svg'
}

export function deactivate() { }
