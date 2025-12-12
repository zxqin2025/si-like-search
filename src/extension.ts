/*
 * VSCode extension: si-like-symbol-search
 * Function: Support word-prefix, ignore-case, non-sequential matching VSCode file symbols
 */

import * as vscode from 'vscode';
import * as path from 'path';


export function activate(context: vscode.ExtensionContext) {
	let disposable0 = vscode.commands.registerCommand('si_like_search.search_doc_symbols', search_cmd_in_current_file);
	let disposable1 = vscode.commands.registerCommand('si_like_search.search_workspace_symbols', search_cmd_in_workspace);
	let disposable2 = vscode.commands.registerCommand('si_like_search.jia_gen_compdb', gen_compdb_for_multiple_root_dirs);
	context.subscriptions.push(disposable0);
	context.subscriptions.push(disposable1);
	context.subscriptions.push(disposable2);

	register_symbol_tree_view(context);
}

const enum SearchType {
	SearchInCurrentFile,
	SearchInWorkspace,
}

async function search_cmd_in_current_file() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		// vscode.window.showInformationMessage('No active editor.');
		vscode.window.showInformationMessage('没有打开的文件');
		return;
	}

	/* get the symbols in current file */
	const doc_symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		editor.document.uri
	);

	search_main(doc_symbols, SearchType.SearchInCurrentFile);
}

async function search_cmd_in_workspace() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		// vscode.window.showInformationMessage('No active editor.');
		vscode.window.showInformationMessage('没有打开的文件');
		return;
	}
	let workspace_symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
		'vscode.executeWorkspaceSymbolProvider',
		'' /* empty string to get all symbols */
	);
	if (!workspace_symbols || workspace_symbols.length == 0) {
		workspace_symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
			'vscode.executeWorkspaceSymbolProvider',
			'*' /* if empty string can't get any symbols, try using `*` to match all */
		);
	}
	search_main(workspace_symbols, SearchType.SearchInWorkspace);
}


function truncate_to_src_dir(filePath: string): string {
  let currentPath = filePath;

  // if cur path is src or root path, stop the loop
  while (path.basename(currentPath) !== 'src' && currentPath !== path.dirname(currentPath)) {
    currentPath = path.dirname(currentPath);
  }

  // if find src dir, return; Or else return the original path
  return path.basename(currentPath) === 'src' ? currentPath : filePath;
}

function gen_compdb_for_multiple_root_dirs() {
	const root_dirs = vscode.workspace.workspaceFolders;
	if (!root_dirs || root_dirs.length === 0) {
		// vscode.window.showInformationMessage('No root directories found.');
		vscode.window.showInformationMessage('没有找到根目录');
		return;
	}

	// let jia_a_cmd = "bash 'D:\\Program Files\\Git\\usr\\bin\\jia' a"; /* for test on windonws */
	let jia_a_cmd = "jia a";
	/* the last-up-level dir as the terminal's work directory */
	// const terminal_workpath = root_dirs[0].uri.fsPath + '/..';

	// please input your workspace root dir
	// choose src as the default workspace root dir
	let default_workspace_root_dir = truncate_to_src_dir(root_dirs[0].uri.fsPath);
	const terminal_workpath_theenable = vscode.window.showInputBox({
		// prompt: 'Please input your workspace root dir',
		prompt: '请输入工作空间根目录',
		// placeHolder: root_dirs[0].uri.fsPath,
		value: default_workspace_root_dir,
	});
	if (!terminal_workpath_theenable) {
		// vscode.window.showInformationMessage('No workspace root dir input.');
		vscode.window.showInformationMessage('没有输入工作空间根目录');
		return;
	}

	terminal_workpath_theenable.then((workpath) => {
		let terminal_workpath: string;
		if (workpath === undefined) {
			// vscode.window.showInformationMessage('Has not input workspace root dir yet');
			vscode.window.showInformationMessage('没有输入工作空间根目录');
			return;
		}

		terminal_workpath = workpath;
		const terminal = vscode.window.createTerminal({
			name: `Jia Gen compdb for ${vscode.workspace.name}`,
			cwd: terminal_workpath,
		});
		for (const root_dir of root_dirs) {
			jia_a_cmd = jia_a_cmd + " " + root_dir.uri.fsPath;
		}

		terminal.sendText(jia_a_cmd);
		terminal.show();

		// vscode.window.showInformationMessage('Execute CMD: ' + jia_a_cmd);
		vscode.window.showInformationMessage('执行命令: ' + jia_a_cmd);
	});
}

const get_icon_by_sym_kind = (kind: number) => {
	// Refenrence: vscode.SymbolKind
	const map: {[key: number]: { icon: string }} = {
		0 : { icon: '$(symbol-file)' },
		1 : { icon: '$(symbol-module)' },
		2 : { icon: '$(symbol-namespace)' },
		3 : { icon: '$(symbol-package)' },
		4 : { icon: '$(symbol-class)' },
		5 : { icon: '$(symbol-method)' },
		6 : { icon: '$(symbol-property)' },
		7 : { icon: '$(symbol-field)' },
		8 : { icon: '$(symbol-constructor)' },
		9 : { icon: '$(symbol-enum)' },
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

function search_main(symbols: vscode.DocumentSymbol[] | vscode.SymbolInformation[], search_type: SearchType) {
	if (!symbols) {
		// vscode.window.showInformationMessage('No symbols found.');
		vscode.window.showInformationMessage('没有找到符号，点开左侧大纲试试');
		return;
	}

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		// vscode.window.showInformationMessage('No active editor.');
		vscode.window.showInformationMessage('没有打开的文件');
		return;
	}

	/* create a quickpick component */
	const quick_pick = vscode.window.createQuickPick();
	if (search_type === SearchType.SearchInCurrentFile) {
		// quick_pick.placeholder = 'Type to search symbols (Scope Accessible View)';
		quick_pick.placeholder = '在当前文件中搜索符号';
	} else {
		quick_pick.placeholder = '在工作空间中搜索符号';
	}
	// quick_pick.matchOnDescription = false; /* default is false */
	// quick_pick.matchOnDetail = false; /* default is false */
	// quick_pick.canSelectMany = false; /* default is falase */
	// quick_pick.ignoreFocusOut = true; /* Optional：to prevent closing on focus out */
	quick_pick.items = [];

	/* quickpick will do fuzzy match by default, and there is no way to disable it */

	/* monitor user's inputting action, for the real-time searching  */
	quick_pick.onDidChangeValue((value) => {
		if (search_type === SearchType.SearchInCurrentFile) {
			// const matches = (symbols as vscode.DocumentSymbol[]).filter(sym => search_match_symbol_name(value, sym.name));
			const flatten_symbols: vscode.DocumentSymbol[] = flattenSymbols(symbols as vscode.DocumentSymbol[]);
			const matches: vscode.DocumentSymbol[] = (flatten_symbols).filter(sym => search_match_symbol_name(value, sym.name));
			/*
			 * add "dom" to "lib" option in tsconfig.json to use console.log.
			 * "lib": ["es2019", "DOM"],
			 */
			// console.log(`User input: "${value}"`);
			// console.log('Matching symbols:', matches);
			quick_pick.items = matches.map(sym => ({
				label: `${get_icon_by_sym_kind(sym.kind)} ${sym.name}`,
				// detail: `Line ${sym.range.start.line + 1}`, /* show the line number */
				// description: " 😂" + vscode.SymbolKind[sym.kind] + ` 👉Line ${sym.range.start.line + 1}`,
				symbol: sym,
				/*
				* !!! make sure to set "alwaysShow" to true, to eliminate the default fuzzy search effect.
				* !!!确保每个符号始终显示，这里是为了消除掉quickPick默认的模糊搜索效果
				*/
				alwaysShow: true
			}));
		} else {
			const matches = (symbols as vscode.SymbolInformation[]).filter(sym => search_match_symbol_name(value, sym.name));
			quick_pick.items = matches.map(sym => ({
				// label: "😎" + sym.name,
				label: `${get_icon_by_sym_kind(sym.kind)} ${sym.name}`,
				// description: (sym.containerName || '') + ' ' + sym.location.uri.fsPath,
				// description: " 👉" + shortenPath(sym.location.uri.fsPath) + ` line ${sym.location.range.start.line + 1}`,
				description: "",
				symbol: sym,
				alwaysShow: true
			}));
		}
	});

	/* when user presses Enter or clicks an item */
	quick_pick.onDidAccept(() => {
		const selected = quick_pick.selectedItems[0];
		if (selected && 'symbol' in selected) {
			/* get DocumentSymbol */
			let sym: vscode.DocumentSymbol | vscode.SymbolInformation;
			let pos: vscode.Position;
			if (search_type === SearchType.SearchInCurrentFile) {
				sym = (selected as any).symbol as vscode.DocumentSymbol;
				pos = sym.selectionRange.start;
			} else {
				sym = (selected as any).symbol as vscode.SymbolInformation;
				pos = sym.location.range.start;
			}
			const range = new vscode.Range(pos, pos);
			/* jump to the location of the symbol in this file */
			editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
			/* set currnet cursor and scroll view */
			editor.selection = new vscode.Selection(pos, pos);
			/* hide the QuickPick popup window */
			quick_pick.hide();
		}
	});

	/* if click other area, hide the quickpick (dispose it) */
	// quick_pick.onDidHide(() => {
	// 	quick_pick.dispose();
	// 	vscode.window.showInformationMessage('QuickPick hidden zxqin test!');
	// });

	/* if no input (such as the first time), show all symbols */
	if (!quick_pick.value) {
		if (search_type === SearchType.SearchInCurrentFile) {
			quick_pick.items = (symbols as vscode.DocumentSymbol[]).map(sym => ({
				label: `${get_icon_by_sym_kind(sym.kind)} ${sym.name}`,
				// description: " 😂" + vscode.SymbolKind[sym.kind] + ` 👉Line ${sym.range.start.line + 1}`,
				description: "",
				symbol: sym,
			}));
		} else {
			quick_pick.items = (symbols as vscode.SymbolInformation[]).map(sym => ({
				label: `${get_icon_by_sym_kind(sym.kind)} ${sym.name}`,
				// description: " 😂" + (sym.containerName || '') + ' 👉' + shortenPath(sym.location.uri.fsPath),
				description: "",
				symbol: sym,
			}));
		}
	}
	quick_pick.show();
}

// not used now
function search_match_symbol_name0(search_str: string, symbol_str: string): boolean {
	/* splite string with <space>, get a word array */
	const search_words = search_str.toLowerCase().trim().split(/\s+/);
	/* splite symbol string with '_', get a word array */
	const symbol_words = symbol_str
		.toLowerCase()
		/*
		 * Use the regular expression /[_\W]+/ to split the string.
		 * '_' indicates an underscore.
		 * '\W' stands for "non-word characters", that is, characters that are not letters, numbers, or underscores (such as Spaces, punctuation marks, etc.).
		 * '+' indicates matching one or more such characters.
		 * So the meaning of this regular expression is: to split by "underline" or "any non-word character".
		 *
		 * Convert a string like "my_Var_Name_In_Camel_Case123" into an array composed of words, and the result is:
		 * ["my", "var", "name", "in", "camel", "case123"]
		 */
		.split(/[_\W]+/);

	/*
	 * for every word (such as 'aaa') in search_str, must meet the following conditoin:
	 * there exists as least one item in symbol_str's words, and this item start with 'aaa'.
	 */
	return search_words.every(word =>
		symbol_words.some(dst_word => dst_word.startsWith(word))
	);
}

function search_match_symbol_name(search_str: string, symbol_str: string): boolean {
	/* splite string with <space>, get a word array */
	const search_words = search_str.toLowerCase().trim().split(/\s+/);

	/* symbol item should include all the keywords */
	return search_words.every(word =>
		symbol_str.toLowerCase().includes(word)
	);
}

function flattenSymbols(symbols: readonly vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
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

function shortenPath(path: string): string {
	if (path.length > 48) {
		return "......" + path.substring(path.length - 48);
	}
	return path;
}

function register_symbol_tree_view(context: vscode.ExtensionContext) {
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

	filter(query: string): void {
		this.filtered = this.allSymbols.filter(item => {
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

