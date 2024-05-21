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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// plz 'npm install' initial of cloneproject
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const openai_1 = __importDefault(require("openai"));
const sbSnippetGenerator_1 = require("./sbSnippetGenerator");
// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
// sendMessage : 텍스트 길이
// cursorindex : 커서 위치
// textArea : 전체 텍스트
let CompletionProvider;
let candidatesData;
let sbSnippetGenerator;
let linePrefix;
// -- ChatGPT API Code --
const openai = new openai_1.default({
    organization: "YOUR-ORGANIZATION-NAME",
    apiKey: "YOUR-API-KEY",
});
// (Temporary) Fine Tuning Code
async function generativeAIcommunication(message) {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: message }],
        model: "YOUR-GPT-MODEL",
    });
    const response = completion.choices[0].message.content;
    return response;
}
function activate(context) {
    console.log("VSC Extension 실행");
    sbSnippetGenerator = new sbSnippetGenerator_1.SbSnippetGenerator("", "", "");
    // --- Candidate Code Completion Code ---
    // 서버와 통신 후 받은 candidates를 가지고 후보목록을 보여주는 Command
    const completionCommand = vscode.commands.registerCommand("extension.subhotkey", () => {
        // 기존의 Completion 삭제
        const disposable = vscode.Disposable.from(CompletionProvider);
        disposable.dispose();
        // 새로운 Completion 등록
        CompletionProvider = vscode.languages.registerCompletionItemProvider(["smallbasic"], {
            provideCompletionItems(document, position) {
                const completionItems = [];
                for (const { key, value, sortText } of candidatesData) {
                    // completion : candidate 하나를 의미한다.
                    const completion = new vscode.CompletionItem(key.trim());
                    console.log("completion 값:", completion);
                    // 사용자의 커서위치 전~ 띄어쓰기 까지의 값
                    // ex) 'IF a = 10' 이라면, 10이 된다, 'IF a = 10 '이라면, ''이 된다.
                    linePrefix = document
                        .lineAt(position)
                        .text.slice(0, position.character);
                    // 구문후보군들을 빈도순으로 정렬하기 위한 sortText
                    completion.sortText = sortText;
                    // 각 구문부호군에 빈도수를 Docs로 출력하도록 설정
                    const completionDocs = new vscode.MarkdownString("빈도수 : " + value);
                    completion.documentation = completionDocs;
                    completionItems.push(completion);
                }
                return completionItems;
            },
            resolveCompletionItem(item) {
                console.log("resolve함수 실행");
                if (item) {
                    const lastIndex = linePrefix.length - 1;
                    // linePrefix : 치고있는 코드가 없는경우
                    if (linePrefix[lastIndex] === " ") {
                        // inserText : 사용자가 후보군을 선택하면, 삽입할 Snippet
                        item.insertText = new vscode.SnippetString(sbSnippetGenerator.getInsertText(item.label));
                    }
                    else {
                        // 치고있는 코드가 있는 경우, 그 값 포함하여 insertText
                        item.insertText = new vscode.SnippetString((linePrefix + sbSnippetGenerator.getInsertText(item.label)).trim());
                    }
                }
                return item;
            },
        });
        // Triggest Suggest 실행
        vscode.commands.executeCommand("editor.action.triggerSuggest");
    });
    // hot key를 누르면 시작되는 command
    // Server에게 값을 준다.
    const hotKeyProvider = vscode.commands.registerCommand("extension.hotkey", () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            // 현재 열려있는 편집기의 문서 가져오기
            const document = activeEditor.document;
            // 커서 위치 가져오기
            const cursorPosition = activeEditor.selection.active;
            const cursorOffset = document.offsetAt(cursorPosition);
            const frontCursorTextLength = `${document
                .getText()
                .length.toString()} True`;
            const frontCursorText = document.getText().substring(0, cursorOffset);
            const backCursorText = document
                .getText()
                .substring(cursorOffset, document.getText().length);
            // 서버와의 통신할 정보를 가지고 SBSnippet Generator 객체 생성
            const sbSnippetGenerator = new sbSnippetGenerator_1.SbSnippetGenerator(frontCursorTextLength, frontCursorText, backCursorText);
            // CompletionItems를 가져오는 메서드
            sbSnippetGenerator.getCompletionItems();
            // CompletionItems를 가져오면, 발생하는 메서드
            sbSnippetGenerator.onDataReceived((data) => {
                // c
                candidatesData = data;
                console.log("completionData : ", candidatesData);
                vscode.commands.executeCommand("extension.subhotkey");
            });
        }
        else {
            console.log("현재 열려있는 편집기가 없습니다.");
        }
    });
    // TriggerSuggest가 잘 작동하는지 테스트하는 Command
    let codeTrigger = vscode.commands.registerCommand("extension.Triggertest", () => {
        vscode.commands.executeCommand("editor.action.triggerSuggest");
    });
    // --- ChatGPT Code Completion Code ---
    let currentDocument = undefined;
    let disposable = vscode.commands.registerCommand("extension.completeCode", async () => {
        const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath; // 첫 번째 작업영역 폴더 경로 가져오기
        const untitledUri = vscode.Uri.parse("untitled:" + path.join("SuggestedCode.sb")); // 코드를 보여줄 제목이 지정되지 않은 문서에 대한 URI 생성
        const document = await vscode.workspace.openTextDocument(untitledUri); // URI에서 문서 열기 또는 만들기
        const userEditor = vscode.window.activeTextEditor; // 사용자가 '현재 작업 중인' 활성 텍스트 편집기 가져오기
        // 사용자가 '현재 작업 중인' 활성 텍스트 편집기 옆에 새 텍스트 문서(document, 임시로만든 SuggestedCode.sb 파일) 열기
        const newEditor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false,
        });
        // 현재 작업영역이 열려있지 않다면 에러 메시지 출력
        if (!folderPath) {
            vscode.window.showErrorMessage("Workspace is not open");
            return;
        }
        // 사용자가 '현재 작업 중인' 활성 텍스트 편집기가 있다면 코드를 가져와서 ChatGPT API에 전달
        if (userEditor) {
            const document = userEditor.document;
            const entireText = document.getText(); // 문서의 전체 내용(코드)을 가져온다.
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
            }, async (progress) => {
                progress.report({
                    message: "ChatGPT SmallBasic Completion is generating code...",
                });
                const response = await generativeAIcommunication(entireText);
                progress.report({ message: "Updating editor now..." });
                await newEditor.edit((editBuilder) => {
                    // 웹뷰의 기존 내용을 전부 삭제(초기화)
                    const lastLine = newEditor.document.lineAt(newEditor.document.lineCount - 1);
                    const range = new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);
                    editBuilder.delete(range);
                    // 새롭게 받은 내용을 웹뷰에 출력
                    editBuilder.insert(new vscode.Position(0, 0), "[입력한 코드]\n" +
                        entireText +
                        "\n\n" +
                        "==\n\n" +
                        "[제안된 코드]\n" +
                        response);
                });
                progress.report({
                    message: "ChatGPT SmallBasic Completion has completed generating code!",
                });
                await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 동안 완료 메시지 출력
                return;
            });
        }
    });
    context.subscriptions.push(disposable);
    context.subscriptions.push(hotKeyProvider, completionCommand, codeTrigger);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map