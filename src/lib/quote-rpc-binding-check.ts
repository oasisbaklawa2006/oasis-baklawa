import ts from "typescript";

function visitNodes(node: ts.Node, visit: (node: ts.Node) => void): void {
  const walk = (current: ts.Node) => {
    visit(current);
    ts.forEachChild(current, walk);
  };
  walk(node);
}

/** Collect reachable callRpc and .rpc invocations with string-literal RPC names from source. */
export function collectGovernedRpcInvocations(source: string, fileName = "module.ts"): Set<string> {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const invocations = new Set<string>();

  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length === 0) return;
    const firstArg = node.arguments[0];
    if (!ts.isStringLiteral(firstArg) && !ts.isNoSubstitutionTemplateLiteral(firstArg)) return;

    const rpcName = firstArg.text;
    if (ts.isIdentifier(node.expression) && node.expression.text === "callRpc") {
      invocations.add(rpcName);
      return;
    }
    if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "rpc") {
      invocations.add(rpcName);
    }
  });

  return invocations;
}

/** Read `CORE_QUOTE_RPC_PREREQUISITES` from quote-contract source (single canonical set). */
export function readCoreQuoteRpcPrerequisites(quoteContractSource: string): readonly string[] {
  const sourceFile = ts.createSourceFile(
    "quote-contract.ts",
    quoteContractSource,
    ts.ScriptTarget.Latest,
    true
  );
  let prerequisites: string[] = [];

  visitNodes(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return;
    if (node.name.text !== "CORE_QUOTE_RPC_PREREQUISITES" || !node.initializer) return;

    const initializer = ts.isAsExpression(node.initializer)
      ? node.initializer.expression
      : node.initializer;
    if (!ts.isArrayLiteralExpression(initializer)) return;

    prerequisites = initializer.elements
      .filter((element): element is ts.StringLiteral => ts.isStringLiteral(element))
      .map((element) => element.text);
  });

  if (prerequisites.length === 0) {
    throw new Error("CORE_QUOTE_RPC_PREREQUISITES could not be read from quote-contract.ts");
  }

  return prerequisites;
}

export function missingExecutableQuoteRpcs(
  quoteContractSource: string,
  quotesApiSource: string
): string[] {
  const required = readCoreQuoteRpcPrerequisites(quoteContractSource);
  const invoked = collectGovernedRpcInvocations(quotesApiSource, "quotes.ts");
  return required.filter((rpc) => !invoked.has(rpc));
}
