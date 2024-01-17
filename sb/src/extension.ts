// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
// 추가항목 Text라는 함수?
// 그에 따른 GetCharacter

// document : VSCode에서 열려있는 텍스트 문서
// position : 현재 커서의 위치
// token : 작업이 취소되었는지 여부
// context : 코드 완성이 제공되는 맥락
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "sb" is now active!');
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
