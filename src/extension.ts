import { WebSocket } from "ws";
import * as vscode from "vscode";

import { SbSnippetGenerator } from "./sbSnippetGenerator";
// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
// sendMessage : 텍스트 길이
// cursorindex : 커서 위치
// textArea : 전체 텍스트

let CompletionProvider: any;
let candidatesData: CompletionItem[];
let sbSnippetGenerator: SbSnippetGenerator;
let linePrefix: string;

type CompletionItem = {
  key: string;
  value: number;
  sortText: string;
};

export function activate(context: vscode.ExtensionContext) {
  console.log("VSC Extension 실행");
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
        ["smallbasic"],
        {
          provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position
          ): vscode.ProviderResult<
            vscode.CompletionItem[] | vscode.CompletionList
          > {
            const completionItems: vscode.CompletionItem[] = [];
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
              const completionDocs = new vscode.MarkdownString(
                "빈도수 : " + value
              );
              completion.documentation = completionDocs;
              completionItems.push(completion);
            }
            return completionItems;
          },
          resolveCompletionItem(item: vscode.CompletionItem) {
            console.log("resolve함수 실행");

            if (item) {
              const lastIndex = linePrefix.length - 1;
              // linePrefix : 치고있는 코드가 없는경우
              if (linePrefix[lastIndex] === " ") {
                // inserText : 사용자가 후보군을 선택하면, 삽입할 Snippet
                item.insertText = new vscode.SnippetString(
                  sbSnippetGenerator.getInsertText(item.label)
                );
              } else {
                // 치고있는 코드가 있는 경우, 그 값 포함하여 insertText
                item.insertText = new vscode.SnippetString(
                  (
                    linePrefix + sbSnippetGenerator.getInsertText(item.label)
                  ).trim()
                );
              }
            }
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

        // 서버와의 통신할 정보를 가지고 SBSnippet Generator 객체 생성
        const sbSnippetGenerator = new SbSnippetGenerator(
          frontCursorTextLength,
          frontCursorText,
          backCursorText
        );

        // CompletionItems를 가져오는 메서드
        sbSnippetGenerator.getCompletionItems();

        // CompletionItems를 가져오면, 발생하는 메서드
        sbSnippetGenerator.onDataReceived((data: any) => {
          // c
          candidatesData = data;
          console.log("completionData : ", candidatesData);
          vscode.commands.executeCommand("extension.subhotkey");
        });
      } else {
        console.log("현재 열려있는 편집기가 없습니다.");
      }
    }
  );

  // TriggerSuggest가 잘 작동하는지 테스트하는 Command
  let codeTrigger = vscode.commands.registerCommand(
    "extension.Triggertest",
    () => {
      vscode.commands.executeCommand("editor.action.triggerSuggest");
    }
  );

  context.subscriptions.push(hotKeyProvider, completionCommand, codeTrigger);
}

// This method is called when your extension is deactivated
export function deactivate() {}
