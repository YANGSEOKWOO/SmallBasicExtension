"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
// 추가항목 Text라는 함수?
// 그에 따른 GetCharacter
// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
function activate(context) {
    console.log('Congratulations, your extension "sb" is now active!');
    const Completionprovider = vscode.languages.registerCompletionItemProvider("smallbasic", {
        provideCompletionItems(document, position, token, context) {
            // Text Object Completion
            const TextsnippetCompletion = new vscode.CompletionItem("Text");
            // TextsnippetCompletion.insertText = new vscode.SnippetString("Text");
            const Textdocs = new vscode.MarkdownString("Text 함수입니다. [link](com) .");
            TextsnippetCompletion.documentation = Textdocs;
            Textdocs.baseUri = vscode.Uri.parse("https://naver");
            // TextWindow에 대한 Completion
            const TextWindowSnippetCompletion = new vscode.CompletionItem("TextWindow");
            // TextWindowSnippetCompletion.insertText = new vscode.SnippetString(
            //   "TextWindow"
            // );
            const docs = new vscode.MarkdownString("Text Window 객체");
            return [TextsnippetCompletion, TextWindowSnippetCompletion];
        },
    });
    const variableCompletionProvider = vscode.languages.registerCompletionItemProvider("smallbasic", {
        provideCompletionItems(document, position) {
            const completionItems = [];
            const documentText = document.getText();
            const variableFound = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
            let match;
            while ((match = variableFound.exec(documentText)) !== null) {
                const variableName = match[1];
                // 각 변수에 대한 코드 완성항목 생성
                const variableCompletionItem = new vscode.CompletionItem(variableName, vscode.CompletionItemKind.Variable);
                completionItems.push(variableCompletionItem);
            }
            return completionItems;
        },
    });
    // TextWindow에 대한 메서드 정의
    const TextWindowMethodprovider = vscode.languages.registerCompletionItemProvider("smallbasic", {
        provideCompletionItems(document, position) {
            // return [...textWindowCompletionItems, ...textCompletionItems];
            // TextWindow 메서드 및 속성에 대한 코드 완성 항목 생성
            const textWindowCompletionItems = [
                new vscode.CompletionItem("WriteLine", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("Write", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("Read", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("ReadNumber", vscode.CompletionItemKind.Method),
            ];
            const textCompletionItems = [
                new vscode.CompletionItem("Append", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("GetLength", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("IsSubText", vscode.CompletionItemKind.Method),
                new vscode.CompletionItem("GetCharacter", vscode.CompletionItemKind.Method),
            ];
            const linePrefix = document
                .lineAt(position)
                .text.slice(0, position.character);
            if (linePrefix.endsWith("Text.")) {
                return textCompletionItems;
            }
            else if (linePrefix.endsWith("TextWindow.")) {
                return textWindowCompletionItems;
            }
            return undefined;
        },
    }, ".");
    let disposable = vscode.commands.registerCommand("sb.helloWorld", () => {
        vscode.window.showInformationMessage("Hello World from SB!");
    });
    context.subscriptions.push(disposable, Completionprovider, TextWindowMethodprovider, variableCompletionProvider);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map