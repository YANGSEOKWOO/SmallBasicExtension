import { WebSocket } from "ws";
import * as vscode from "vscode";
import * as net from "net";
import * as fs from "fs";
import { SbSnippetGenerator } from "./sbSnippetGenerator";
import { cSnippetGenerator } from "./cSnippetGenerator";
// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
// sendMessage : 텍스트 길이
// cursorindex : 커서 위치
// textArea : 전체 텍스트

let CompletionProvider: any;
let sbData: CompletionItem[];
let sbSnippetGenerator: SbSnippetGenerator;

type CompletionItem = {
  key: string;
  value: number;
  sortText: string;
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sb" is now active!');
  const testCommand = vscode.commands.registerCommand("sb.test", () => {
    console.log("작동완료");
  });
  sbSnippetGenerator = new SbSnippetGenerator("", "", "");
  // 서버와 통신 후 받은 candidates를 가지고 후보목록을 보여주는 Command
  const completionCommand = vscode.commands.registerCommand(
    "extension.subhotkey",
    () => {
      // 기존의 Completion 삭제
      const disposable = vscode.Disposable.from(CompletionProvider);
      disposable.dispose();

      // 새로운 Completion 등록
      CompletionProvider = vscode.languages.registerCompletionItemProvider(
        ["smallbasic", "c"],
        {
          provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position
          ): vscode.ProviderResult<
            vscode.CompletionItem[] | vscode.CompletionList
          > {
            const CompletionItems: vscode.CompletionItem[] = [];
            for (const { key, value, sortText } of sbData) {
              const completion = new vscode.CompletionItem(key.trim());
              console.log("completion 값:", completion);
              const linePrefix = document
                .lineAt(position)
                .text.slice(0, position.character);
              const lastIndex = linePrefix.length - 1;
              const words = key.split(" ");

              // 각 단어에 TabStop 추가
              const placeholders = words
                .map((word, index) => `\${${index + 1}:${word}}`)
                .join(" ");

              // if (linePrefix[lastIndex] == " ") {
              //   completion.insertText = new vscode.SnippetString(
              //     placeholders.trim()
              //   );
              // } else {
              //   completion.insertText = new vscode.SnippetString(
              //     (linePrefix + placeholders).trim()
              //   );
              // }
              completion.filterText = linePrefix;
              completion.sortText = sortText;
              const completionDocs = new vscode.MarkdownString(
                "빈도수 : " + value
              );
              completion.documentation = completionDocs;
              CompletionItems.push(completion);
            }
            return CompletionItems;
          },
          resolveCompletionItem(item: vscode.CompletionItem) {
            console.log("resolve함수 실행");
            if (item) {
              item.insertText = new vscode.SnippetString(
                sbSnippetGenerator.getInsertText(item.label)
              );
            }
            // item.insertText = new vscode.SnippetString("");
            return item;
          },
        }
      );
      // Triggest Suggest 실행
      vscode.commands.executeCommand("editor.action.triggerSuggest");
    }
  );

  // hot key를 누르면 시작되는 command
  // Server에게 값을 준다.
  const hotKeyProvider = vscode.commands.registerCommand(
    "extension.hotkey",
    () => {
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
        const sbSnippetGenerator = new SbSnippetGenerator(
          frontCursorTextLength,
          frontCursorText,
          backCursorText
        );

        const cSnippetGenerator = new SbSnippetGenerator(
          frontCursorTextLength,
          frontCursorText,
          backCursorText
        );

        let dataE;
        // dataE = sbSnippetGenerator.getCompletionItems();
        dataE = cSnippetGenerator.getCompletionItems();
        // sbSnippetGenerator.onDataReceived((data: any) => {
        //   sbData = data;
        //   vscode.commands.executeCommand("extension.subhotkey");
        // });
        console.log("dataE", dataE);
        cSnippetGenerator.onDataReceived((data: any) => {
          sbData = data;
          console.log("데이터 받음");
          vscode.commands.executeCommand("extension.subhotkey");
        });
      } else {
        console.log("현재 열려있는 편집기가 없습니다.");
      }
    }
  );

  let codeTrigger = vscode.commands.registerCommand(
    "extension.Triggertest",
    () => {
      vscode.commands.executeCommand("editor.action.triggerSuggest");
    }
  );

  context.subscriptions.push(
    hotKeyProvider,
    completionCommand,
    codeTrigger,
    testCommand
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
