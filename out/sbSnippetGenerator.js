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
exports.SbSnippetGenerator = void 0;
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: "",
});
//
const PORT = 50000;
let socket;
let link;
let stateNumber;
let candidates;
const path = require("path");
class SbSnippetGenerator {
    frontCursorTextLength;
    frontCursorText;
    backCursorText;
    constructor(frontCursorTextLength, frontCursorText, backCursorText) {
        this.frontCursorTextLength = frontCursorTextLength;
        this.frontCursorText = frontCursorText;
        this.backCursorText = backCursorText;
    }
    getCandidatesForStates(states) {
        console.log("_dirname", __dirname);
        const fileName = path.join(__dirname, "../src/smallbasic-syntax-completion-candidates-results.txt");
        let fileContent = fs.readFileSync(fileName, "utf8");
        const result = [];
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
    onDataReceived(callback) {
        this.dataReceivedCallback = callback;
    }
    dataReceivedCallback = null;
    accessServer1(host) {
        try {
            // 서버에 소켓 연결
            link = new net.Socket();
            if (!link) {
                return;
            }
            link.connect(PORT, host, () => {
                console.log("Client connected");
            });
            link.on("data", data => {
                const decodedString = data.toString("utf-8");
                if (decodedString === "SuccessfullyParsed") {
                    stateNumber = [0];
                }
                else {
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
                    let completionItems = [];
                    for (const { key, value, sortText } of candidates) {
                        let completionWord = key;
                        completionWord = completionWord
                            .replace(/^\[/, "") // 시작 대괄호 삭제
                            .replace(/\]$/, "") // 끝 대괄호 삭제
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
        }
        catch (error) {
            // 연결이 거부될 경우 예외 처리
            console.log("서버 연결 거부");
            console.error(error.message);
        }
    }
    /**
     * 서버연결을 종료하는 함수
     */
    closingConnecting1() {
        try {
            if (link) {
                console.log("연결종료");
                link.end();
                link = null;
            }
        }
        catch (error) {
            console.error(error.message);
        }
    }
    // sbparser서버에 전달해야하는 값을 전달해주는 함수
    getCompletionItems() {
        if (link === null) {
            return;
        }
        this.accessServer1("localhost");
        link.write(`${this.frontCursorTextLength}`);
        console.log("커서 앞 텍스트 길이 :", this.frontCursorTextLength);
        link.end();
        this.closingConnecting1();
        this.accessServer1("localhost");
        link.write(`${this.frontCursorText}`);
        console.log("커서 앞 텍스트 :", this.frontCursorText);
        link.end();
        this.closingConnecting1();
        this.accessServer1("localhost");
        link.write(`${this.backCursorText}`);
        console.log("뒤 텍스트 :", this.backCursorText);
        link.end();
        this.closingConnecting1();
        this.accessServer1("localhost");
    }
    /**
     * completionItem을 받아, SmallBasic 문법에 맞춘 code snippet을 반환하는 함수
     * @param completionItem
     * @returns placeholders
     */
    async getInsertText(completionItem, resulted_prefix) {
        // 문자열 단어로 분리
        const itemString = typeof completionItem === "string"
            ? completionItem
            : completionItem.label;
        // 정규식을 사용하여 공백, 괄호로 문자열을 분리하되, 괄호는 유지하고 공백 요소는 제외
        const words = itemString
            .split(/(\s+|(?<=\()|(?=\()|(?<=\))|(?=\)))/g)
            .filter(word => word.trim());
        console.log("words:", words);
        const modifiedWords = words.map(word => {
            if (word === "ID") {
                return "Identifier";
            }
            else if (word === "STR") {
                return "String";
            }
            else if (word === "Exprs" || word === "Expr") {
                return "Expression";
            }
            else {
                return word;
            }
        });
        if (resulted_prefix === "codecompletion") {
            let placeholders = words
                .map((word, index) => {
                let placeholder;
                switch (word) {
                    case "CR":
                        placeholder = `\n`;
                        break;
                    case "TheRest":
                        placeholder = "";
                        break;
                    case "OrExpr":
                        placeholder = `\${${index + 1}:OR}`;
                        break;
                    case "AndExpr":
                        placeholder = `\${${index + 1}:AND}`;
                        break;
                    case "EqNeqExpr":
                        placeholder = `\${${index + 1}:==}`;
                        break;
                    case "OptStep":
                        placeholder = `\${${index + 1}:Step}`;
                        break;
                    case "CRStmtCRs":
                        placeholder = `\n\${${index + 1}:body}\n`;
                        break;
                    default:
                        // 괄호와 =를 포함한 경우 TabStop 적용 안함
                        if (word.trim() === "(" ||
                            word.trim() === ")" ||
                            word.trim() === "=") {
                            placeholder = word.trim();
                        }
                        else {
                            placeholder = `\${${index + 1}:${word.trim()}}`;
                        }
                }
                // 해당 원소에 \n이 포함되어 있지 않으면 공백을 추가
                return placeholder.includes("\n") ? placeholder : placeholder + " ";
            })
                .join("");
            placeholders = placeholders.replace(/\s+\(/g, "(");
            console.log("placeholders", placeholders);
            return placeholders;
        }
        else {
            const modifiedStructCandi = modifiedWords.join(" ");
            console.log("modifiedWords:", modifiedWords);
            console.log("modifiedStructCandi:", modifiedStructCandi);
            const prompt = `
                This is the incomplete SmallBasic programming language code:
                ${resulted_prefix}
                '${modifiedStructCandi}'
                Complete the '${modifiedStructCandi}' part of the code in the SmallBasic programming language. Just show your answer in place of '${modifiedStructCandi}'. 
                `;
            const chat_completion = await openai.chat.completions.create({
                model: "",
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            });
            const response = chat_completion.choices[0].message.content;
            console.log("response:", response);
            return response;
        }
        // 각 단어에 TabStop을 추가하여 새로운 문자열 생성
    }
}
exports.SbSnippetGenerator = SbSnippetGenerator;
//# sourceMappingURL=sbSnippetGenerator.js.map