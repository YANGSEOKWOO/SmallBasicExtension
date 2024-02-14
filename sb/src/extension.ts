// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

// 추가항목 Text라는 함수?
// 그에 따른 GetCharacter
import { WebSocket } from "ws";
import * as vscode from "vscode";
import * as net from "net";
import * as readline from "readline";
import * as fs from "fs";
// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
// sendMessage : 텍스트 길이
// cursorindex : 커서 위치
// textArea : 전체 텍스트
const PORT = 50000;
let socket: WebSocket;

let link: net.Socket | null;
let input: readline.ReadLine;
let output: NodeJS.WritableStream;
let connect: boolean;
let CompletionProvider: any;
let stateNumber: string | null;
let candidates: Item[];
const path = require("path");

type Item = {
  key: string;
  value: number;
};

/**
 * state값을 통해 DB에 있는 state번호의 candidate를 가져와 key value형식으로 배열로 반환하는 함수
 * @param {string} string: state값
 * @returns key value 형태의 candidates배열 key: Completion name, value: frequency
 */
function readFile(state: string) {
  console.log("_dirname", __dirname);
  const fileName = path.join(
    __dirname,
    "../src/smallbasic-syntax-completion-candidates-results.txt"
  );
  let fileContent = fs.readFileSync(fileName, "utf8");

  const start = `State ${state}`;
  const end = `State ${parseInt(state) + 1}`;
  const startIdx = fileContent.indexOf(start);
  const endIdx = fileContent.indexOf(end);
  const Text = fileContent.slice(startIdx, endIdx);

  const result: Item[] = [];
  const lines = Text.split("\n");
  for (const line of lines) {
    // State 문장 삭제
    if (line[0] !== "[") {
      continue;
    }
    const parts = line.split(":");
    const key = parts[0].trim();
    const value = parseInt(parts[1].trim());
    result.push({ key, value });
  }
  return result;
}
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sb" is now active!');

  // 서버와 통신 후 받은 candidates를 가지고 후보목록을 보여주는 Command
  const completionTest = vscode.commands.registerCommand("sb.subhotkey", () => {
    // 기존의 Completion 삭제
    const disposable = vscode.Disposable.from(CompletionProvider);
    disposable.dispose();

    candidates.sort((a, b) => b.value - a.value);
    // 새로운 Completion 등록
    CompletionProvider = vscode.languages.registerCompletionItemProvider(
      "smallbasic",
      {
        provideCompletionItems(): vscode.ProviderResult<
          vscode.CompletionItem[] | vscode.CompletionList
        > {
          const CompletionItems: vscode.CompletionItem[] = [];
          for (const { key, value } of candidates) {
            const completion = new vscode.CompletionItem(key);
            const completionDocs = new vscode.MarkdownString(value.toString());
            completion.documentation = completionDocs;
            CompletionItems.push(completion);
          }
          return CompletionItems;
        },
      },
      "."
    );
    // Triggest Suggest 실행
    vscode.commands.executeCommand("editor.action.triggerSuggest");
  });

  // hot key를 누르면 시작되는 command
  // Server에게 값을 준다.
  const hotKeyProvider = vscode.commands.registerCommand("sb.hotkey", () => {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      // 현재 열려있는 편집기의 문서 가져오기
      const document = activeEditor.document;
      // 커서 위치 가져오기
      const cursorPosition = activeEditor.selection.active;
      const cursorOffset = document.offsetAt(cursorPosition);
      serverConnect(cursorOffset, document.getText());
    } else {
      console.log("현재 열려있는 편집기가 없습니다.");
    }
  });

  let disposable = vscode.commands.registerCommand("sb.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from SB!");
  });
  let test = vscode.commands.registerCommand("sb.test", () => {
    vscode.commands.executeCommand("editor.action.triggerSuggest");
  });

  context.subscriptions.push(disposable, hotKeyProvider, completionTest, test);
}

/**
 * 서버와 통신하는 함수
 * @param {number}cursorindex 커서의 현재 위치
 * @param {string}textArea 열려있는 문서의 전체 텍스트
 *  */
async function serverConnect(cursorindex: number, textArea: string) {
  if (link === null) {
    return;
  }
  accessServer1("localhost");
  // 커서 앞 텍스트 길이 보내기
  console.log("커서 앞 텍스트 길이", textArea.length.toString());
  link.write(`${textArea.length.toString()} True`);
  link.end();
  closingConnecting1();

  // 커서 앞 텍스트 보내기
  accessServer1("localhost");
  const frontMessage = textArea.substring(0, cursorindex);
  console.log(" 커서 앞 텍스트 :", frontMessage);
  link.write(frontMessage);
  // link.write("For i = 1 ");
  link.end();
  closingConnecting1();

  // 커서 뒤 텍스트 보내기
  accessServer1("localhost");
  const backMessage = textArea.substring(cursorindex, textArea.length);
  console.log("커서 뒤 텍스트", backMessage);
  link.write(backMessage);
  // link.write("");
  link.end();
  closingConnecting1();

  // 구문 완성 결과를 문사열로 받기
  accessServer1("localhost");
}
/**
 * 서버에서 데이터를 받으면, state값으로 DB값을 읽어온 후 sb.completion명령어를 실행한다.
 * @param {string} 포트번호
 */
function accessServer1(host: string) {
  try {
    // 서버에 소켓 연결
    link = new net.Socket();
    if (link === null) {
      return;
    }
    link.connect(PORT, host, () => {
      console.log("Client connected");
    });

    link.on("data", data => {
      const decodedString = data.toString("utf-8");
      if (decodedString === "SuccessfullyParsed") {
        stateNumber = "0";
      } else {
        stateNumber = decodedString.replace("white Terminal ", "").trim();
      }
      candidates = readFile(stateNumber);
      console.log("name", candidates);
      console.log("서버에서 받은 데이터:", decodedString);
      vscode.commands.executeCommand("sb.subhotkey");
    });

    link.on("end", () => {
      console.log("Client disconnected");
    });
  } catch (error: any) {
    // 연결이 거부될 경우 예외 처리
    console.log("서버 연결 거부");
    console.error(error.message);
    connect = false;
  }
}
/**
 * 연결을 종료하는 함수
 */
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

// This method is called when your extension is deactivated
export function deactivate() {}

//  // Text Object Completion
//  const TextsnippetCompletion = new vscode.CompletionItem("Text");
//  // TextsnippetCompletion.insertText = new vscode.SnippetString("Text");
//  const Textdocs: any = new vscode.MarkdownString(
//    "Text 함수입니다. [link](com) ."
//  );
//  TextsnippetCompletion.documentation = Textdocs;
//  Textdocs.baseUri = vscode.Uri.parse("https://naver");

//  // TextWindow에 대한 Completion
//  const TextWindowSnippetCompletion = new vscode.CompletionItem(
//    "TextWindow"
//  );
//  // TextWindowSnippetCompletion.insertText = new vscode.SnippetString(
//  //   "TextWindow"
//  // );
//  const docs: any = new vscode.MarkdownString("Text Window 객체");

//  return [TextsnippetCompletion, TextWindowSnippetCompletion];

// TextWindow에 대한 메서드 정의
// const TextWindowMethodprovider =
//   vscode.languages.registerCompletionItemProvider(
//     "smallbasic",
//     {
//       provideCompletionItems(
//         document: vscode.TextDocument,
//         position: vscode.Position
//       ) {
//         // return [...textWindowCompletionItems, ...textCompletionItems];
//         // TextWindow 메서드 및 속성에 대한 코드 완성 항목 생성
//         const textWindowCompletionItems: vscode.CompletionItem[] = [
//           new vscode.CompletionItem(
//             "WriteLine",
//             vscode.CompletionItemKind.Method
//           ),
//           new vscode.CompletionItem(
//             "Write",
//             vscode.CompletionItemKind.Method
//           ),
//           new vscode.CompletionItem("Read", vscode.CompletionItemKind.Method),
//           new vscode.CompletionItem(
//             "ReadNumber",
//             vscode.CompletionItemKind.Method
//           ),
//         ];
//         const textCompletionItems: vscode.CompletionItem[] = [
//           new vscode.CompletionItem(
//             "Append",
//             vscode.CompletionItemKind.Method
//           ),
//           new vscode.CompletionItem(
//             "GetLength",
//             vscode.CompletionItemKind.Method
//           ),
//           new vscode.CompletionItem(
//             "IsSubText",
//             vscode.CompletionItemKind.Method
//           ),
//           new vscode.CompletionItem(
//             "GetCharacter",
//             vscode.CompletionItemKind.Method
//           ),
//         ];

//         const linePrefix = document
//           .lineAt(position)
//           .text.slice(0, position.character);
//         if (linePrefix.endsWith("Text.")) {
//           return textCompletionItems;
//         } else if (linePrefix.endsWith("TextWindow.")) {
//           return textWindowCompletionItems;
//         }
//         return undefined;
//       },
//     },
//     "."
//   );

// const variableCompletionProvider =
//   vscode.languages.registerCompletionItemProvider("smallbasic", {
//     provideCompletionItems(
//       document: vscode.TextDocument,
//       position: vscode.Position
//     ) {
//       const completionItems: vscode.CompletionItem[] = [];

//       const documentText = document.getText();
//       const variableFound = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
//       let match;
//       while ((match = variableFound.exec(documentText)) !== null) {
//         const variableName = match[1];

//         // 각 변수에 대한 코드 완성항목 생성
//         const variableCompletionItem = new vscode.CompletionItem(
//           variableName,
//           vscode.CompletionItemKind.Variable
//         );
//         completionItems.push(variableCompletionItem);
//       }

//       return completionItems;
//     },
//   });
