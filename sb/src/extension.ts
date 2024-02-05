// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

// 추가항목 Text라는 함수?
// 그에 따른 GetCharacter
import { WebSocket } from "ws";
import * as vscode from "vscode";
import * as net from "net";
import * as readline from "readline";
// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
const PORT = 50000;
let socket: WebSocket;

let link: net.Socket | null;
let input: readline.ReadLine;
let output: NodeJS.WritableStream;
let connect: boolean;
// sendMessage : 텍스트 길이
// cursorindex : 커서 위치
// textArea : 전체 텍스트

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sb" is now active!');
  // accessServer1("localhost");

  const testProvider = vscode.commands.registerCommand("sb.test", () => {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      // 현재 열려있는 편집기의 문서 가져오기
      const document = activeEditor.document;
      // 문서의 텍스트 출력
      // console.log("텍스트:", document.getText());

      // 텍스트 길이 출력
      // console.log("텍스트 길이:", document.getText().length);

      // 커서 위치 가져오기
      const cursorPosition = activeEditor.selection.active;
      const cursorOffset = document.offsetAt(cursorPosition);
      // 커서 위치 출력
      // console.log("커서 위치:", cursorOffset);

      serverConnect(
        document.getText().length.toString(),
        cursorOffset,
        document.getText()
      );
    } else {
      console.log("현재 열려있는 편집기가 없습니다.");
    }
  });
  const Completionprovider = vscode.languages.registerCompletionItemProvider(
    "smallbasic",
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
      ) {
        // Text Object Completion
        const TextsnippetCompletion = new vscode.CompletionItem("Text");
        // TextsnippetCompletion.insertText = new vscode.SnippetString("Text");
        const Textdocs: any = new vscode.MarkdownString(
          "Text 함수입니다. [link](com) ."
        );
        TextsnippetCompletion.documentation = Textdocs;
        Textdocs.baseUri = vscode.Uri.parse("https://naver");

        // TextWindow에 대한 Completion
        const TextWindowSnippetCompletion = new vscode.CompletionItem(
          "TextWindow"
        );
        // TextWindowSnippetCompletion.insertText = new vscode.SnippetString(
        //   "TextWindow"
        // );
        const docs: any = new vscode.MarkdownString("Text Window 객체");

        return [TextsnippetCompletion, TextWindowSnippetCompletion];
      },
    }
  );
  const variableCompletionProvider =
    vscode.languages.registerCompletionItemProvider("smallbasic", {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const completionItems: vscode.CompletionItem[] = [];

        const documentText = document.getText();
        const variableFound = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
        let match;
        while ((match = variableFound.exec(documentText)) !== null) {
          const variableName = match[1];

          // 각 변수에 대한 코드 완성항목 생성
          const variableCompletionItem = new vscode.CompletionItem(
            variableName,
            vscode.CompletionItemKind.Variable
          );
          completionItems.push(variableCompletionItem);
        }

        return completionItems;
      },
    });
  // TextWindow에 대한 메서드 정의
  const TextWindowMethodprovider =
    vscode.languages.registerCompletionItemProvider(
      "smallbasic",
      {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position
        ) {
          // return [...textWindowCompletionItems, ...textCompletionItems];
          // TextWindow 메서드 및 속성에 대한 코드 완성 항목 생성
          const textWindowCompletionItems: vscode.CompletionItem[] = [
            new vscode.CompletionItem(
              "WriteLine",
              vscode.CompletionItemKind.Method
            ),
            new vscode.CompletionItem(
              "Write",
              vscode.CompletionItemKind.Method
            ),
            new vscode.CompletionItem("Read", vscode.CompletionItemKind.Method),
            new vscode.CompletionItem(
              "ReadNumber",
              vscode.CompletionItemKind.Method
            ),
          ];
          const textCompletionItems: vscode.CompletionItem[] = [
            new vscode.CompletionItem(
              "Append",
              vscode.CompletionItemKind.Method
            ),
            new vscode.CompletionItem(
              "GetLength",
              vscode.CompletionItemKind.Method
            ),
            new vscode.CompletionItem(
              "IsSubText",
              vscode.CompletionItemKind.Method
            ),
            new vscode.CompletionItem(
              "GetCharacter",
              vscode.CompletionItemKind.Method
            ),
          ];

          const linePrefix = document
            .lineAt(position)
            .text.slice(0, position.character);
          if (linePrefix.endsWith("Text.")) {
            return textCompletionItems;
          } else if (linePrefix.endsWith("TextWindow.")) {
            return textWindowCompletionItems;
          }
          return undefined;
        },
      },
      "."
    );

  let disposable = vscode.commands.registerCommand("sb.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from SB!");
  });

  context.subscriptions.push(
    disposable,
    Completionprovider,
    TextWindowMethodprovider,
    variableCompletionProvider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function serverConnect(
  sendMessage: string,
  cursorindex: number,
  textArea: string
) {
  if (link === null) {
    return;
  }
  await accessServer1("localhost");
  // 커서 앞 텍스트 길이 보내기
  console.log("커서 앞 텍스트 길이", sendMessage);
  link.write(`${sendMessage} True`);
  link.end();
  await closingConnecting1();

  // 커서 앞 텍스트 보내기
  await accessServer1("localhost");
  const frontMessage = textArea.substring(0, cursorindex);
  console.log(" 커서 앞 텍스트 :", frontMessage);
  link.write(frontMessage);
  // link.write("For i = 1 ");
  link.end();
  await closingConnecting1();

  // 커서 뒤 텍스트 보내기
  await accessServer1("localhost");
  const backMessage = textArea.substring(cursorindex, textArea.length);
  console.log("커서 뒤 텍스트", backMessage);
  link.write(backMessage);
  // link.write("");
  link.end();
  await closingConnecting1();

  // 구문 완성 결과를 문사열로 받기
  await accessServer1("localhost");
}
async function accessServer1(host: string): Promise<void> {
  try {
    // 서버에 소켓 연결
    await new Promise<void>(resolve => {
      link = new net.Socket();
      if (link === null) {
        return;
      }
      link.connect(PORT, host, () => {
        console.log("Client connected");
        resolve();
      });

      link.on("data", data => {
        const decodedString = data.toString("utf-8");
        console.log("서버에서 받은 데이터:", decodedString);
      });

      link.on("end", () => {
        console.log("Client disconnected");
      });
    });
  } catch (error: any) {
    // 연결이 거부될 경우 예외 처리
    console.log("서버 연결 거부");
    console.error(error.message);
    connect = false;
  }
}

function closingConnecting1() {
  try {
    if (link != null) {
      console.log("연결종료");
      link.end();
      link = null;
    }
  } catch (error: any) {
    console.error(error.message);
  }
}
