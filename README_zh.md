# 用户指南

Ctrl-Shift-P 调出 命令面版，输入si，选择`SI-like Symbol Search`，回车即可搜索符号。
效果类似source insight：可以输入空格分开的多个单词，匹配符号的单词前缀。

可以作为vscode默认的`ctrl-shift-o`的搜索方式的一个补充。

该搜索命令目前添加了快捷键绑定：
1. <mark>ctrl+'</mark> 搜索文件内符号(Accessible View）。
2. <mark>alt+'</mark> 搜索全局符号（工作区）， 可自行修改。

两张示例截图：

![](https://github.com/zxqin2025/si-like-search/blob/master/vscode_command.png)

![](https://github.com/zxqin2025/si-like-search/blob/master/search_demo.png)


# Release

+- version 1.1.11: feature: 搜索和选择符号时，支持预览符号。
+- version 1.1.10: feature: 扩大搜索快捷键和搜索命令的生效范围（不再局限于 "when": "editorTextFocus"）。
- version 1.1.9: feature: 修改符号方式为关键词匹配；符号图标使用vscode内建的图标；去掉quick pick里多余的信息显示（代码行号、符号类型等）。
- version 1.1.8: feature: 提示使用中文；添加一个简单的view示图（未完成）
- version 1.1.7: feature: 新增命令，支持通过jia工具为多个workspace folder生成compdb
- version 1.1.6: fix: 更新符号图标；修改注释语言
- version 1.1.5: fix: 修复文档内符号搜索不到符号的字符号问题
- version 1.1.4: feature: 符号显示时添加两个可爱的符号图标
- version 1.1.3: feature: 工作区搜索符号时，文件名绝对路径太长时，只显示其中三级目录
- version 1.1.2: fix bug: 局部搜索无quickPick box弹出；是否全局搜索判断不生效问题
- version 1.1.1: fix 逻辑错误
- version 1.1.0: fix 问题：
    - 全局符号搜索不同平台可能为空的问题， 增加兼容性
    - 全局符号选择后无法跳转的问题修复
- version 1.0.1: 支持文件内符号搜索；新增支持**全局符号搜索**！
- version 1.0.0: 修复搜索使用的是默认的quickPick的模糊搜索功能， 使用自定义搜索功能！
- version 0.0.2: 支持实时搜索显示符号信息
- version 0.0.1：输入框回车后才显示搜索结果

# TODO

- 目前工作区符号搜索不完整，可能是因为vscode的api限制，或者没有递归搜索工作区符号（树结构）。


# 开发指南

如果没有安装vsce，需要先安装（到全局）：
```bash
npm install -g vsce
vsce --version
```

安装项目依赖：
```bash
npm install
```

确保 `out/extension.js` 被正确生成。


打包生成vsix文件：
```bash
vsce package
```

结果：
```bash
$ vsce package
Executing prepublish script 'npm run vscode:prepublish'...

> si-symbol-search@0.0.1 vscode:prepublish
> tsc -p ./

 WARNING  A 'repository' field is missing from the 'package.json' manifest file.
Do you want to continue? [y/N] y
 WARNING  LICENSE.md, LICENSE.txt or LICENSE not found
Do you want to continue? [y/N] y
 DONE  Packaged: D:\code\js\gpt-si-search-extension\si-symbol-search-0.0.1.vsix (10 files, 6.5KB)

```
需要指定 package.json中的 repo 地址， 需要添加license文件。


命令 或 UI 安装：
```bash
code --install-extension si-symbol-search*.vsix
```

