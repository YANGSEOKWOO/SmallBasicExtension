import { WebSocket } from "ws";
import * as vscode from "vscode";
import * as net from "net";
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

let CompletionProvider: any;
let stateNumber: number[] | null;
let candidates: Item[];
const path = require("path");

type Item = {
  key: string;
  value: number;
  sortText: string;
};

/**
 * state값을 통해 DB에 있는 state번호의 candidate를 가져와 key value형식으로 배열로 반환하는 함수
 * @param {string} string: state값
 * @returns key value 형태의 candidates배열 key: Completion name, value: frequency
 */
function getCandidatesForStates(states: number[]) {
  console.log("_dirname", __dirname);
  const fileName = path.join(
    __dirname,
    "../src/smallbasic-syntax-completion-candidates-results.txt"
  );
  let fileContent = fs.readFileSync(fileName, "utf8");
  const result: Item[] = [];

  for (const state of states) {
    const start = `State ${state}`;
    const end = `State ${state + 1}`;
    const startIdx = fileContent.indexOf(start);
    const endIdx = fileContent.indexOf(end);
    const Text = fileContent.substring(startIdx, endIdx);
    console.log("Text :", Text);
    const lines = Text.split("\n");
    for (const line of lines) {
      // State 문장 삭제
      if (line[0] !== "[") {
        continue;
      }
      const parts = line.split(":");
      const key = parts[0].trim();
      const value = parseInt(parts[1].trim());
      const sortText = value.toString();
      result.push({ key, value, sortText });
    }
  }
  console.log("result", result);
  return result;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sb" is now active!');

  // 서버와 통신 후 받은 candidates를 가지고 후보목록을 보여주는 Command
  const completionCommand = vscode.commands.registerCommand(
    "sb.subhotkey",
    () => {
      // 기존의 Completion 삭제
      const disposable = vscode.Disposable.from(CompletionProvider);
      disposable.dispose();

      // 후보군에 Ranking 설정을 위한 sortText값 설정
      candidates.sort((a, b) => b.value - a.value);
      candidates.forEach((item, index) => {
        item.sortText = (index + 1).toString().padStart(3, "0"); // 순위는 1부터 시작
      });

      // 새로운 Completion 등록
      CompletionProvider = vscode.languages.registerCompletionItemProvider(
        "smallbasic",
        {
          provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position
          ): vscode.ProviderResult<
            vscode.CompletionItem[] | vscode.CompletionList
          > {
            const CompletionItems: vscode.CompletionItem[] = [];
            const targetStrings = ["[", "T", "N", "NT", "]", ","];

            // 후보군을 completion에 등록하는 절차
            for (const { key, value, sortText } of candidates) {
              let completionWord = key;

              // targetStrings 삭제 (ex. N, NT, [,])
              targetStrings.forEach(targetString => {
                while (completionWord.includes(targetString)) {
                  completionWord = completionWord.replace(targetString, "");
                }
              });

              console.log(completionWord);
              if (/\bFor\b/.test(completionWord)) {
                const documentText = document.getText();
                const variableFound = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
                let match;
                let variableNames = [];
                while ((match = variableFound.exec(documentText)) !== null) {
                  variableNames.push(match[1]);
                }
                console.log("variableName:", variableNames);
                const forLoopSnippet = new vscode.SnippetString(
                  `For \${1|${variableNames.join(
                    ","
                  )}|} = \${2:lower} To \${3:upper} Step \${4:stepsize}\n` +
                    `\t$0\n` +
                    "EndFor" +
                    "${TM_FILENAME/(.*)\\..+$/$1/}"
                );
                const completion = new vscode.CompletionItem(
                  "For ID = Expr To Expr OptStep CRStmtCRs EndFor"
                );
                const completionDocs = new vscode.MarkdownString(
                  "빈도수 : " + value
                );
                completion.documentation = completionDocs;
                completion.insertText = forLoopSnippet;
                completion.sortText = sortText.toString();
                CompletionItems.push(completion);
              } else {
                const completion = new vscode.CompletionItem(completionWord);

                const linePrefix = document
                  .lineAt(position)
                  .text.slice(0, position.character);
                // prefix 설정
                completion.filterText = linePrefix;

                // docs 설정 : Rank
                const completionDocs = new vscode.MarkdownString(
                  "빈도수 : " + value
                );
                completion.documentation = completionDocs;
                completion.sortText = sortText.toString();

                CompletionItems.push(completion);
              }
            }
            return CompletionItems;
          },
        }
      );
      // Triggest Suggest 실행
      vscode.commands.executeCommand("editor.action.triggerSuggest");
    }
  );

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

  let codeTrigger = vscode.commands.registerCommand("sb.Triggertest", () => {
    vscode.commands.executeCommand("editor.action.triggerSuggest");
  });

  context.subscriptions.push(hotKeyProvider, completionCommand, codeTrigger);
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
        stateNumber = [0];
      } else {
        const extractedNumbers = decodedString.match(/\d+/g);
        stateNumber = extractedNumbers ? extractedNumbers.map(Number) : [];
        console.log("stateNumber", stateNumber);
      }

      candidates = getCandidatesForStates(stateNumber);
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
  }
}
/**
 * 서버연결을 종료하는 함수
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
