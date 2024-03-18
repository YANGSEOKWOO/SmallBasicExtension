import * as vscode from "vscode";
import { WebSocket } from "ws";
import * as net from "net";
import * as fs from "fs";
//
const PORT = 50000;
let socket: WebSocket;

let link: net.Socket | null;
let stateNumber: number[] | null;
let candidates: CompletionItem[];
type CompletionItem = {
  key: string;
  value: number;
  sortText: string;
};
const path = require("path");

export class SbSnippetGenerator {
  private readonly frontCursorTextLength: string;
  private readonly frontCursorText: string;
  private readonly backCursorText: string;

  constructor(
    frontCursorTextLength: string,
    frontCursorText: string,
    backCursorText: string
  ) {
    this.frontCursorTextLength = frontCursorTextLength;
    this.frontCursorText = frontCursorText;
    this.backCursorText = backCursorText;
  }
  public getCandidatesForStates(states: number[]) {
    console.log("_dirname", __dirname);
    const fileName = path.join(
      __dirname,
      "../src/smallbasic-syntax-completion-candidates-results.txt"
    );
    let fileContent = fs.readFileSync(fileName, "utf8");
    const result: CompletionItem[] = [];

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
  public onDataReceived(callback: (data: any) => void) {
    this.dataReceivedCallback = callback;
  }
  private dataReceivedCallback: ((data: any) => void) | null = null;
  public accessServer1(host: string) {
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
        const a = 1;
        candidates = this.getCandidatesForStates(stateNumber);
        console.log("서버에서 받은 데이터:", decodedString);

        // 후보군에 Ranking 설정을 위한 sortText값 설정
        candidates.sort((a, b) => b.value - a.value);
        candidates.forEach((item, index) => {
          item.sortText = (index + 1).toString().padStart(3, "0"); // 순위는 1부터 시작
        });

        if (this.dataReceivedCallback) {
          let completionItems: CompletionItem[] = [];
          for (const { key, value, sortText } of candidates) {
            let completionWord = key;
            completionWord = completionWord
              .replace(/\[|\]/g, "") // 대괄호 삭제
              .replace(/,/g, "") // 쉼표 삭제
              .replace(/\s+\bT\b/g, " ") // 'T'를 공백으로 대체
              .replace(/\bT\b/g, "") // 'T' 삭제
              .replace(/\bNT\b/g, "") // 'NT' 삭제
              .replace(/\s+/g, " ") // 여러 개의 공백을 1칸으로 변경
              .replace(/\s+\./g, ".") // '.' 양옆의 공백 삭제
              .replace(/\.\s+/g, ".") // '.' 양옆의 공백 삭제
              .replace(/\bTO\b/g, " TO ");
            completionItems.push({
              key: completionWord,
              value: value,
              sortText: sortText,
            });
          }
          this.dataReceivedCallback(completionItems);
        }
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
  public closingConnecting1() {
    try {
      if (link !== null) {
        console.log("연결종료");
        link.end();
        link = null;
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }
  public getCompletionItems() {
    if (link === null) {
      return;
    }
    this.accessServer1("localhost");
    link.write(`${this.frontCursorTextLength}`);
    link.end();
    this.closingConnecting1();

    this.accessServer1("localhost");
    link.write(`${this.frontCursorText}`);
    link.end();
    this.closingConnecting1();

    this.accessServer1("localhost");
    link.write(`${this.backCursorText}`);
    link.end();
    this.closingConnecting1();

    this.accessServer1("localhost");
  }
  public getInsertText(completionItem: string | vscode.CompletionItemLabel) {
    // 문자열 단어로 분리
    const itemString =
      typeof completionItem === "string"
        ? completionItem
        : completionItem.label;
    const words = itemString.split(" ");

    // 각 단어에 TabStop을 추가하여 새로운 문자열 생성
    const placeholders = words
      .map((word, index) => `\${${index + 1}:${word}}`)
      .join(" ");
    console.log("placeholders", placeholders);
    return placeholders;
  }
}
