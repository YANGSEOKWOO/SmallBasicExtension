// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// plz 'npm install' initial of cloneproject
import * as vscode from "vscode";
import * as path from "path";
import OpenAI from "openai";
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
let sbSnippetGenerator: SbSnippetGenerator | null = null; // 변경된 부분
let linePrefix: string;
let resulted_prefix: string;

type CompletionItem = {
  key: string;
  value: number;
  sortText: string;
};

// -- ChatGPT API Code --
const openai = new OpenAI({
  organization: "",
  apiKey: "",
});

// (Temporary) Fine Tuning Code
async function generativeAIcommunication(message: string) {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: message }],
    model: "",
  });

  const response = completion.choices[0].message.content;
  return response;
}

export function activate(context: vscode.ExtensionContext) {
  console.log("VSC Extension 실행");
  sbSnippetGenerator = new SbSnippetGenerator("", "", "");

  // --- Candidate Code Completion Code ---
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
              // Completion에 대한 documentation 작성
              completion.documentation = completionDocs;
              // Code suggestion이  prefix에 의해 필터링되는 것을 막는 코드
              completion.filterText = linePrefix;
              completionItems.push(completion);
            }
            ``;
            return completionItems;
          },
          async resolveCompletionItem(item: vscode.CompletionItem) {
            console.log("resolve함수 실행");

            // Graphics.Window 같은 경우 Window만 prefix가 되어야 한다.
            // 그에 따른 '.'위치 이후까지를 prefix로 가져온다.

            if (item && sbSnippetGenerator !== null) {
              const lastIndex = linePrefix.length - 1;
              let insertText: string | null;
              // linePrefix : 치고있는 코드가 없는경우
              if (linePrefix[lastIndex] === " ") {
                insertText = await sbSnippetGenerator.getInsertText(
                  item.label,
                  "codecompletion"
                );
              } else {
                const lastDotIndex = linePrefix.lastIndexOf(".");
                if (lastDotIndex !== -1) {
                  linePrefix = linePrefix.slice(lastDotIndex + 1).trim();
                }
                insertText =
                  linePrefix +
                  (await sbSnippetGenerator.getInsertText(
                    item.label,
                    "codecompletion"
                  ));
              }
              if (insertText === null) {
                insertText = "";
              }
              item.insertText = new vscode.SnippetString(insertText.trim());
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

  // --- ChatGPT Code Completion Code ---
  let currentDocument: vscode.TextDocument | undefined = undefined;
  let disposable = vscode.commands.registerCommand(
    "extension.completeCode",
    async () => {
      const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath; // 첫 번째 작업영역 폴더 경로 가져오기
      const untitledUri = vscode.Uri.parse(
        "untitled:" + path.join("SuggestedCode.sb")
      ); // 코드를 보여줄 제목이 지정되지 않은 문서에 대한 URI 생성
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

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
          },
          async progress => {
            progress.report({
              message: "ChatGPT SmallBasic Completion is generating code...",
            });
            const response = await generativeAIcommunication(entireText);
            progress.report({ message: "Updating editor now..." });

            // 사이드 웹뷰 화면에 작성했던 코드 + 응답 표시
            await newEditor.edit(editBuilder => {
              // 웹뷰의 기존 내용을 전부 삭제(초기화)
              const lastLine = newEditor.document.lineAt(
                newEditor.document.lineCount - 1
              );
              const range = new vscode.Range(
                new vscode.Position(0, 0),
                lastLine.range.end
              );
              editBuilder.delete(range);

              // 새롭게 받은 내용을 웹뷰에 출력
              editBuilder.insert(
                new vscode.Position(0, 0),
                "[입력한 코드]\n" +
                  entireText +
                  "\n\n" +
                  "==\n\n" +
                  "[제안된 코드]\n" +
                  response
              );
            });

            // 유저 화면 편집기에 바로 결과를 업데이트
            await userEditor.edit(editBuilder => {
              // 활성 편집기의 내용을 전부 삭제
              const lastLine = document.lineAt(document.lineCount - 1);
              const range = new vscode.Range(
                new vscode.Position(0, 0),
                lastLine.range.end
              );
              editBuilder.delete(range);

              // 새롭게 받은 내용을 활성 편집기에 출력
              editBuilder.insert(new vscode.Position(0, 0), "" + response);
            });

            progress.report({
              message:
                "ChatGPT SmallBasic Completion has completed generating code!",
            });
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 동안 완료 메시지 출력
            return;
          }
        );
      }
    }
  );

  // --- Prompt Code ---
  const promptCommand = vscode.commands.registerCommand(
    "extension.subpromptkey",
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

              resulted_prefix = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
              );

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
              // Completion에 대한 documentation 작성
              completion.documentation = completionDocs;
              // Code suggestion이  prefix에 의해 필터링되는 것을 막는 코드
              completion.filterText = linePrefix;
              completionItems.push(completion);
            }
            ``;
            return completionItems;
          },
          async resolveCompletionItem(item: vscode.CompletionItem) {
            // 사용자가 현재까지 작성한 코드의 내용이 들어가야 한다. (resulted_prefix)
            // 이 함수는 선택되면, 선택된 것 : item이라고 불림
            // prompt에 줘야하는 값 : 언어, resulted_prefix, item이겠네
            console.log("resolve함수 실행");

            // Graphics.Window 같은 경우 Window만 prefix가 되어야 한다.
            // 그에 따른 '.'위치 이후까지를 prefix로 가져온다.
            const lastDotIndex = linePrefix.lastIndexOf(".");
            if (lastDotIndex !== -1) {
              linePrefix = linePrefix.slice(lastDotIndex + 1).trim();
            }

            if (item && sbSnippetGenerator !== null) {
              const lastIndex = linePrefix.length - 1;
              let insertText: string | null;
              console.log("linePrefix[lastIndex] = ", linePrefix[lastIndex]);
              console.log("linePrefix : ", linePrefix);
              if (linePrefix[lastIndex] === " ") {
                insertText = await sbSnippetGenerator.getInsertText(
                  item.label,
                  resulted_prefix
                );
              } else {
                insertText =
                  linePrefix +
                  (await sbSnippetGenerator.getInsertText(
                    item.label,
                    resulted_prefix
                  ));
              }
              if (insertText === null) {
                insertText = ""; // insertText가 null인 경우 빈 문자열로 설정
              }
              item.insertText = new vscode.SnippetString(insertText);
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
  const PromptKeyProvider = vscode.commands.registerCommand(
    "extension.promptkey",
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
          vscode.commands.executeCommand("extension.subpromptkey");
        });
      } else {
        console.log("현재 열려있는 편집기가 없습니다.");
      }
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(
    hotKeyProvider,
    completionCommand,
    codeTrigger,
    promptCommand,
    PromptKeyProvider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
