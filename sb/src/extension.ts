// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
// 추가항목 Text라는 함수?
// 그에 따른 GetCharacter
//
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
          // const word = document.getText(
          //   document.getWordRangeAtPosition(position)
          // );

          // // 'TextWindow' 키워드가 있는 경우
          // if (word === "TextWindow.") {
          //   return textWindowCompletionItems;
          // }

          // // 'Text' 키워드가 있는 경우
          // if (word === "Text.") {
          //   return textCompletionItems;
          // }

          // 그 외의 경우
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
    TextWindowMethodprovider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
